/*******************************************************************************
Helper script that parses data files and fetches additional information from
the W3C API.

To parse files:
node tools/extract-spec-data.js data/3dcamera.json data/webvtt.json
*******************************************************************************/

const fetch = require('fetch-filecache-for-crawling');
const path = require('path');
const DOMParser = require('xmldom').DOMParser;
const xpath = require('xpath');

const namespaces = {
  'c': 'http://www.w3.org/2000/10/swap/pim/contact#',
  'o': 'http://www.w3.org/2001/04/roadmap/org#',
  'd': 'http://www.w3.org/2000/10/swap/pim/doc#',
  'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'rec': 'http://www.w3.org/2001/02pd/rec54#',
  'dc': 'http://purl.org/dc/elements/1.1/'
};
const xselect = xpath.useNamespaces(namespaces);

const maturities = ['LastCall', 'WD', 'CR', 'PR', 'REC', 'Retired', 'NOTE'];


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


async function fetchXml(url) {
  let response = await fetch(url);
  let text = await response.text();
  return new DOMParser().parseFromString(text);
}


async function extractSpecData(files) {
  files = (files || []).map(file => {
    return {
      id: file.split('/').pop().split('.')[0],
      file
    };
  });

  let trsXml = await fetchXml('http://www.w3.org/2002/01/tr-automation/tr.rdf');
  let wgsXml = await fetchXml('http://www.w3.org/2000/04/mem-news/public-groups.rdf');
  let closedWgsXml = await fetchXml('http://www.w3.org/2000/04/mem-news/closed-groups.rdf');

  // XPath implementation is slow, so let's index what we need
  // (generation takes ~1s with the indexation, >1 min without it)
  let trs = {};
  xselect('/rdf:RDF/*/d:versionOf[@rdf:resource]', trsXml)
    .map(element => {
      let attr = xselect('string(@rdf:resource)', element);
      if (!trs[attr]) trs[attr] = element.parentNode;
    });

  let wgs = {};
  xselect('/rdf:RDF/*[c:homePage/@rdf:resource]', wgsXml)
    .map(element => {
      let homePageUrl = xselect('string(c:homePage/@rdf:resource)', element, true);
      if (!wgs[homePageUrl]) wgs[homePageUrl] = element;
    });
  xselect('/rdf:RDF/*[c:homePage/@rdf:resource]', closedWgsXml)
    .map(element => {
      let homePageUrl = xselect('string(c:homePage/@rdf:resource)', element, true);
      if (!wgs[homePageUrl]) wgs[homePageUrl] = element;
    });


  async function parseDataFile(spec) {
    let data = requireFromWorkingDirectory(spec.file);
    if (!data.TR) {
      return;
    }

    let urlParts = (data.TR || '').split('/');
    if (urlParts.length === 1) {
      return;
    }

    let trLatest = 'http:/' + urlParts.slice(1, 5).join('/');
    let trLatestHttps = 'https:/' + urlParts.slice(1, 5).join('/');

    //let tr = xselect(`/rdf:RDF/*[d:versionOf/@rdf:resource='${trLatest}' or d:versionOf/@rdf:resource='${trLatest}/' or d:versionOf/@rdf:resource='${trLatestHttps}' or d:versionOf/@rdf:resource='${trLatestHttps}/']`, trs, true);
    let tr = trs[trLatest] || trs[trLatest + '/'] ||
      trs[trLatestHttps] || trs[trLatestHttps + '/'];
    if (!tr) {
      throw new Error(`${spec.id}: ${trLatest} not found in tr.rdf`);
    }

    let title = xselect('string(dc:title/text())', tr, true);
    let maturityUrls = xselect('rdf:type/@rdf:resource', tr);
    let maturityTypes = maturityUrls
      .map(attr => attr.value)
      .map(url => url.split('#')[1])
      .filter(type => !!type);
    maturityTypes.push(tr.tagName);

    let maturity = maturityTypes.reduce((mat1, mat2) =>
      (!maturities.includes(mat2) ||
        (maturities.includes(mat1) && (maturities.indexOf(mat1) < maturities.indexOf(mat2)))) ?
      mat1 : mat2);

    let wgsUrls = xselect('o:deliveredBy/c:homePage/@rdf:resource', tr)
      .map(attr => attr.value);

    let specData = {
      title,
      maturity,
      wgs: wgsUrls.map(url => {
        let label = (wgs[url] ? xselect('string(o:name/text())', wgs[url]) : null);
        if (!label) {
          // TODO: ignored for the time being but we should probably do something about it
          // such as complete the list of closed groups
          console.error(`${spec.id}: No group with home page ${url} found in public-groups.rdf nor closed-groups.rdf`);
        }
        let wg = {};
        if (label) {
          wg.label = label;
        }
        wg.url = url;
        return wg;
      })
    };

    return {
      id: spec.id,
      data: specData
    };
  }

  return Promise.all(
    files.map(file => parseDataFile(file).catch(err => console.error(err)))
  ).then(results => {
    let res = {};
    results.forEach(spec => {
      if (!spec) return;
      res[spec.id] = spec.data;
    });
    return res;
  });
}

module.exports.extractSpecData = extractSpecData;

if (require.main === module) {
  const files = process.argv.slice(2);
  extractSpecData(files)
    .then(data => console.log(JSON.stringify(data, null, 2)));
}
