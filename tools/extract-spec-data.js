/*******************************************************************************
Helper script that parses data files and fetches additional information from
the W3C API for TR specs and from Specref for other specs.

To parse files:
node tools/extract-spec-data.js data/3dcamera.json data/webvtt.json
*******************************************************************************/

const fetch = require('fetch-filecache-for-crawling');
const path = require('path');
const fs = require('fs');
const https = require('https');


/**
 * Possible maturity levels for specifications
 *
 * The list only exists to perform a sanity check on data.
 */
const maturities = [
  'ED',
  'WD',
  'LS',
  'CR',
  'PR',
  'REC',
  'Retired',
  'NOTE'
];

/**
 * Mapping for some maturity status values
 */
const maturityMapping = {
  'Working Draft': 'WD',
  'Candidate Recommendation': 'CR',
  'Proposed Recommendation': 'PR',
  'Recommendation': 'REC',
  'LastCall': 'WD',
  'Unofficial Draft': 'ED',
  'Draft Community Group Report': 'ED',
  'Living Standard': 'LS',
  'Group Note': 'NOTE'
};

/**
 * Well-known publishers and URL pattern of the specs they publish
 * (Note the w3c.github.io is not restricted to WICG in practice, but the
 * code associates a WICG spec with W3C in any case, so that's good enough
 * for now and avoids having to handle arrays of patterns)
 */
const publishers = {
  'W3C': {
    label: 'W3C',
    url: 'https://www.w3.org/',
    urlPattern: '.w3.org'
  },
  'WHATWG': {
    label: 'WHATWG',
    url: 'https://whatwg.org',
    urlPattern: '.spec.whatwg.org'
  },
  'IETF': {
    label: 'IETF',
    url: 'https://ietf.org',
    urlPattern: '.ietf.org'
  },
  'WICG': {
    label: 'Web Platform Incubator Community Group',
    url: 'https://www.w3.org/community/wicg/',
    urlPattern: 'w3c.github.io',
    parentPublisher: 'W3C'
  }
};


/**
 * Wrapper around the "require" function to require files relative to the
 * current working directory (CWD), instead of relative to the current JS
 * file.
 *
 * This is typically needed to be able to use "require" to load JSON config
 * files provided as command-line arguments.
 *
 * @function
 * @param {String} filename The path to the file to require
 * @return {Object} The result of requiring the file relative to the current
 *   working directory.
 */
function requireFromWorkingDirectory(filename) {
    return require(path.resolve(filename));
}


/**
 * Return true if given spec is a TR document.
 *
 * The current spec is considered to be a TR document when:
 * 1. it defines its URL in a "TR" property
 * 2. the URL it defines looks like a TR URL
 * 3. it does not define any URL (filename is considered to be the TR shortname
 * when that happens)
 *
 * @function
 * @param {Object} spec The spec object to parse
 * @return {Boolean} True if spec should be considered to be a TR spec
 */
function isTRSpec(spec) {
  let data = spec.data || {};
  let specUrl = data.url || data.TR || data.edDraft || data.editors || data.ls;
  return (!!data.TR || !specUrl || specUrl.toLowerCase().includes('w3.org/tr/'));
}


/**
 * Return the shortname for the spec.
 *
 * If the spec is a TR spec, that shortname is after /TR/ in the URL. Otherwise
 * we'll consider that the file name is the shortname.
 *
 * @function
 * @param {Object} spec The spec object to parse
 * @return {String} The spec's shortname
 */
function getShortname(spec) {
  let data = spec.data || {};
  let specUrl = data.url || data.TR || data.edDraft || data.editors || data.ls;
  return (isTRSpec(spec) && specUrl) ?
    specUrl.split('/')[4] :
    spec.id;
}


/**
 * Return the URL of spec as entered in the data file
 *
 * @function
 * @param {Object} spec The spec object to parse
 * @return {String} The URL of the spec
 */
function getSpecUrl(spec) {
  return spec.data.url || spec.data.TR || spec.data.edDraft ||
    spec.data.editors || spec.data.ls;
}


/**
 * Return the URL to use to search for additional info about the given spec in
 * Specref.
 *
 * Note the returned URL is not meant to be used to fetch the spec. The logic
 * may "break" the initial URL in particular.
 *
 * @function
 * @param {Object} spec The spec object to parse
 * @return {String} The Specref lookup URL to use
 */
function getUrlForReverseLookup(spec) {
  let data = spec.data;
  if (!data) return;

  let specUrl = getSpecUrl(spec);
  if (isTRSpec(spec)) {
    if (specUrl) {
      return 'https:/' + specUrl.split('/').slice(1, 5).join('/');
    }
    else {
      return 'https://www.w3.org/TR/' + getShortname(spec);
    }
  }
  else {
    let parts = specUrl.split('#')[0].split('/');
    if (parts[parts.length - 1].endsWith('.html')) {
      parts = parts.slice(0, -1);
    }
    return parts.join('/');
  }
}


/**
 * Fetch a JSON resource on the network.
 *
 * @function
 * @param {String} url URL to fetch
 * @param {Object} options Fetch options
 * @return {Promise<Object>} Promise to get the JSON result. The promise gets
 *  rejected when a network error occurs or when the server returns an HTTP
 *  status code different from 200.
 */
async function fetchJson(url, options) {
  let response = await fetch(url, options);
  if (response.status !== 200) {
    throw new Error(`Fetch returned a non OK HTTP status code (url: ${url})`);
  }
  return response.json();
}


/**
 * Take a list of data files, fetch and return info about the underlying spec
 * using the W3C API or Specref.
 *
 * @function
 * @public
 * @param {Array<String>} files The list of data files to process.
 * @param {Object} config Configuration settings, "w3cApiKey" property required
 * @return {Promise<Object>} Promise to get an object that contains additional
 *   information about specs referenced by the data files
 */
async function extractSpecData(files, config) {
  let specs = (files || []).map(file => Object.assign({
    file,
    id: file.split(/\/|\\/).pop().split('.')[0],
    data: requireFromWorkingDirectory(file)
  }));

  // Create a dedicated HTTP agent with socket pooling enabled for requests to
  // the W3C API server as it does not like being bothered too much at once
  let w3cHttpOptions = {
    agent: new https.Agent({ maxSockets: 5 }),
    keepAlive: true,
    headers: {
      'Authorization': `W3C-API apikey="${config.w3cApiKey}"`,
      'Origin': 'https://www.w3.org'
    }
  };

  // Fetch spec info from Specref when spec is not a TR spec.
  // (Proceed in chunks not to end up with a URL that is thousands of bytes
  // long, and only fetch a given lookup URL once)
  let lookupUrls = specs
    .filter(spec => !isTRSpec(spec))
    .map(spec => encodeURIComponent(getUrlForReverseLookup(spec)))
    .filter((url, index, self) => self.indexOf(url) === index);
  let lookupChunks = [];
  let chunkSize = 10;
  for (let i = 0, j = lookupUrls.length; i < j; i += chunkSize) {
    let chunk = lookupUrls.slice(i, i + chunkSize);
    lookupChunks.push(chunk);
  }

  let specsInfo = {};
  for (let chunk of lookupChunks) {
    let info = await fetchJson(
      `https://api.specref.org/reverse-lookup?urls=${chunk.join(',')}`);
    specsInfo = Object.assign(specsInfo, info);
  }

  async function fetchSpecInfo(spec) {
    let trInfo = {};
    let lookupInfo = {};

    if (isTRSpec(spec)) {
      // For TR specs, retrieve spec and group info from W3C API
      let shortname = getShortname(spec);
      let latestInfo = await fetchJson(
        `https://api.w3.org/specifications/${shortname}/versions/latest`,
        w3cHttpOptions);
      trInfo = {
        url: latestInfo.shortlink,
        edDraft: latestInfo['editor-draft'],
        title: latestInfo.title,
        status: latestInfo.status,
        publisher: 'W3C'
      };
      let deliverersJson = await fetchJson(
        latestInfo._links.deliverers.href + `?embed=1`,
        w3cHttpOptions);
      trInfo.deliveredBy = deliverersJson._embedded.deliverers.map(deliverer => Object.assign({
        label: deliverer.name,
        url: deliverer._links.homepage.href
      }));
    }
    else {
      // For other specs, use info returned by Specref
      lookupInfo = specsInfo[getUrlForReverseLookup(spec)] || {};
    }

    let info = {
      url: getSpecUrl(spec) || trInfo.url || lookupInfo.href,
      edDraft: spec.data.edDraft || spec.data.editors || trInfo.edDraft || lookupInfo.edDraft,
      title: spec.data.title || trInfo.title || lookupInfo.title,
      status: spec.data.status || trInfo.status || lookupInfo.status || 'ED',
      deliveredBy: spec.data.wgs || trInfo.deliveredBy || lookupInfo.deliveredBy || [],
      publisher: spec.data.publisher || trInfo.publisher || lookupInfo.publisher
    };

    // Spec must have a title, either retrieved from Specref or defined in
    // the data file. Throw an error if that is not the case so that someone
    // completes the data.
    if (!info.title) {
      throw new Error(`No title found for ${spec.id}`);
    }

    // Maturity status must be a known value. Throw an error if that is not the
    // case so that someone investigates.
    if (maturityMapping[info.status]) {
      info.status = maturityMapping[info.status];
    }
    if (!maturities.includes(info.status)) {
      throw new Error(`- ${spec.id}: Unknown maturity status (status: ${info.status})`);
    }

    // Groups that deliver the spec should have friendly labels
    if (info.deliveredBy && (info.deliveredBy.length > 0)) {
      info.deliveredBy = info.deliveredBy.map(group => {
        let label = group.label || info.publisher || group.shortname;
        if (label && label.startsWith('W3C ')) {
          label = label.slice(4);
        }
        if (!label) {
          console.warn(`- ${spec.id}: No group label found (home page: ${group.url})`);
        }
        return { url: group.url, label };
      });
    }
    else if (info.publisher && (info.publisher in publishers)) {
      let publisher = publishers[info.publisher];
      info.deliveredBy = [{ url: publisher.url, label: publisher.label }];
    }
    if (!info.deliveredBy) {
      info.deliveredBy = [];
    }

    // Spec should have a well-known publisher, try to find one
    if (info.publisher) {
      if (info.publisher.startsWith('W3C ')) {
        info.publisher = 'W3C';
      }
      if (!(info.publisher in publishers)) {
        console.warn(`- ${spec.id}: Unknown publisher "${info.publisher}"`);
      }
    }
    if (!info.publisher) {
      if (info.deliveredBy && (info.deliveredBy.length > 0)) {
        let groupUrl = info.deliveredBy[0].url || '';
        info.publisher = Object.keys(publishers)
          .find(id => groupUrl.includes(publishers[id].urlPattern));
      }
      if (!info.publisher) {
        info.publisher = Object.keys(publishers)
          .find(id => info.url.includes(publishers[id].urlPattern));
      }
      if (!info.publisher) {
        console.warn(`- ${spec.id}: No publisher found`);
      }
    }

    // Consider that the publisher is the parent organization of the group
    // that develops the spec
    if (info.publisher && publishers[info.publisher] && publishers[info.publisher].parentPublisher) {
      info.publisher = publishers[info.publisher].parentPublisher;
    }

    return { id: spec.id, data: spec.data, info };
  }


  let resultsArray = await Promise.all(specs.map(fetchSpecInfo));
  let results = {};
  for (let result of resultsArray) {
    results[result.id] = result.info;

    // Complete spec info with other properties of interest from data file
    Object.keys(result.data).forEach(key => {
      if (['impl', 'TR', 'editors', 'ls', 'wgs', 'polyfills'].includes(key) ||
          results[result.id].hasOwnProperty(key)) {
        return;
      }
      results[result.id][key] = result.data[key];
    });
  }
  return results;
}


/*******************************************************************************
Export main function to allow use as a module
*******************************************************************************/
module.exports.extractSpecData = extractSpecData;


/*******************************************************************************
If run from the command-line, process the list of files provided
*******************************************************************************/
if (require.main === module) {
  let config = {};
  try {
    config = requireFromWorkingDirectory('config.json');
  }
  catch (err) {}

  // Read the W3C API key from the environment if defined there
  if (process.env.W3C_API_KEY) {
    config.w3cApiKey = process.env.W3C_API_KEY;
  }

  if (!config.w3cApiKey) {
    // Cannot retrieve the information without an API key!
    console.error('No key found to access the W3C API.' +
      ' Define a W3C_API_KEY environment variable' +
      ' or create a config.json file with a "w3cApiKey" property');
    process.exit(1);
  }

  const files = process.argv.slice(2).map(file => {
    let stat = fs.statSync(file);
    if (stat.isDirectory()) {
      let contents = fs.readdirSync(file);
      return contents.filter(f => f.endsWith('.json'))
        .map(f => path.join(file, f));
    }
    else {
      return file;
    }
  }).reduce((res, files) => res.concat(files), []);
  extractSpecData(files, config)
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error(err));
}
