/*******************************************************************************
Helper script that parses data files and fetches implementation information from
Web status platforms such as Can I use and those provided by browser vendors

To parse files:
node tools/extract-impl-data.js dta/3dcamera.json data/webvtt.json
*******************************************************************************/

const fetch = require('fetch-filecache-for-crawling');
const path = require('path');


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
 * Map User Agent name returned by a source to an internal name shared across
 * sources.
 *
 * @function
 * @param {String} ua The User-Agent name to normalize
 * @param {String} sourceName The name of the source
 * @return {String} The normalized User-Agent name
 */
function normalizeUA(ua, sourceName) {
  // No specific logic for now
  return ua;
}


/**
 * Implementation data sources
 *
 * Some of these sources are maintained by browser vendors, and thus contain
 * "more accurate" data for some user agents. These UA appear in the "coreua"
 * property.
 */
let sources = {
  caniuse: {
    url: "https://caniuse.com/data.json",
    getImplStatus: function (key) {
      let source = 'caniuse';
      let sourcedata = sources[source].data;
      let impl = [];
      let impldata = sourcedata.data[key].stats;
      Object.keys(impldata).forEach(ua => {
        let uadata = impldata[ua];
        let latestUAVersion = sourcedata.agents[ua].versions.slice(-4, -3);
        let experimentalUAversions = sourcedata.agents[ua].versions.slice(-3);

        ua = normalizeUA(ua, source);
        if (uadata[latestUAVersion].startsWith('y') ||
            uadata[latestUAVersion].startsWith('a')) {
          impl.push({ ua, status: 'shipped', source });
        }
        else if (uadata[latestUAVersion].startsWith('n d')) {
          impl.push({ ua, status: 'experimental', source });
        }
        else {
          experimentalUAversions.forEach(version => {
            if (!version) return;
            if (uadata[version].startsWith('y') ||
                uadata[version].startsWith('n d')) {
              impl.push({ ua, status: 'experimental', source});
            }
          })
        }
      });
      return impl;
    }
  },
  chromestatus: {
    url: "https://www.chromestatus.com/features.json",
    coreua: ["chrome"],
    getImplStatus: function (key) {
      let source = 'chromestatus';
      let sourcedata = sources[source].data;
      let ua = 'chrome';
      let impl = [];
      let matchingData = sourcedata.find(feature => feature.id === key);
      let implstatus = {
        chrome: null,
        firefox: null,
        edgestatus: null,
        safaristatus: null
      };
      if (matchingData) {
        let impldata = matchingData.browsers;
        implstatus.chrome = impldata.chrome.status.text;
        implstatus.firefox = impldata.ff.view.text;
        implstatus.edge = impldata.edge.view.text;
        implstatus.safari = impldata.safari.view.text;
      }
      else {
        console.error(`Unknown Chrome feature ${key}`);
        // TODO: throw an error
      }

      Object.keys(implstatus).forEach(ua => {
        switch (implstatus[ua]) {
          case 'Enabled by default':
          case 'Shipped':
            impl.push({ ua, status: 'shipped', source });
            break;
          case 'Behind a flag':
          case 'Origin trial':
            impl.push({ ua, status: 'experimental', source });
            break;
          case 'In development':
            impl.push({ ua, status: 'indevelopment', source });
            break;
          case 'Proposed':
          case 'Public support':
            impl.push({ ua, status: 'consideration', source });
            break;
        };
      });

      return impl;
    }
  },
  edgestatus: {
    url: "https://raw.githubusercontent.com/MicrosoftEdge/Status/production/status.json",
    coreua: ["edge"],
    getImplStatus: function (key) {
      let property = (typeof key === 'string') ? 'name' : 'id';
      let source = 'edgestatus';
      let ua = 'edge';
      let sourcedata = sources[source].data;
      let impl = [];
      let impldata = sourcedata.find(feature => feature[property] === key);
      let edgestatus = '';
      if (impldata) {
        edgestatus = impldata.ieStatus.text;
      }
      else if (property === 'name') {
        console.error(`Unknown Edge feature ${key} (property ${property})`);
        // TODO throw an error
      }
      switch (edgestatus) {
        case 'Shipped':
        case 'Prefixed':
          impl.push({ ua, status: 'shipped', source });
          break;
        case 'Preview Release':
          impl.push({ ua, status: 'experimental', source });
          break;
        case 'In Development':
          impl.push({ ua, status: 'indevelopment', source });
          break;
        case 'Under Consideration':
          impl.push({ ua, status: 'consideration', source });
          break;
      }
      return impl;
    }
  },
  webkitstatus: {
    url: "https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json",
    coreua: ["webkit", "safari"],
    getImplStatus: function (key) {
      let property = (typeof key === 'string') ? 'name' : 'id';
      let source = 'webkitstatus';
      let ua = 'webkit';
      let sourcedata = sources[source].data;
      let impl = [];
      let keyType = key.split('-')[0];
      if (keyType === 'feature') {
        keyType = 'features';
      }
      let keyName = key.split('-').slice(1).join(' ');
      let impldata = sourcedata[keyType].find(feature => feature.name.toLowerCase() === keyName);
      let webkitstatus = (impldata.status || {}).status;
      switch (webkitstatus) {
        case 'Done':
        case 'Partial Support':
          impl.push({ ua, status: 'shipped', source });
          break;
        case 'In Development':
          impl.push({ ua, status: 'indevelopment', source });
          break;
        case 'Under Consideration':
          impl.push({ ua, status: 'consideration', source });
          break;
      }
      return impl;
    }
  },
  other: {
    getImplStatus: function (impldata) {
      let source = 'other';
      let impl = [];
      if (Array.isArray(impldata)) {
        impldata.forEach(d => {
          let implstatus = {
            ua: d.ua,
            status: d.status,
            source: d.source || 'other'
          };
          if (d.date) {
            implstatus.date = d.date;
          }
          if (d.comment) {
            implstatus.comment = d.comment;
          }
          impl.push(implstatus);
        });
      }
      else {
        Object.keys(impldata).forEach(ua => {
          impl.push({ ua, status: impldata[ua], source: 'other' });
        });
      }
      return impl;
    }
  }
};


async function fetchImplData() {
  return Promise.all(Object.keys(sources).map(async function (source) {
    if (sources[source].url) {
      let response = await fetch(sources[source].url)
      let data = await response.json();
      sources[source].data = data;
    }
    else {
      sources[source].data = {};
    }

    if (!sources[source].coreua) {
      sources[source].coreua = [];
    }
  }));
}


async function extractImplData(files) {
  await fetchImplData();

  // Loop through files and compute the implementation status for each of them
  let impldata = {};
  files.forEach(file => {
    let id = file.split('/').slice(-1)[0].split('.')[0];
    let feature = requireFromWorkingDirectory(file);
    let implementations = [];

    // Compute implementation status only when we know where to look in the
    // implementation data
    if (!feature.impl) return;

    let chromeid = feature.impl.chromestatus;
    if (chromeid && !sources.chromestatus.data.find(f => f.id === chromeid)) {
      chromeid = null;
    }

    Object.keys(sources).forEach(source => {
      // Assemble the implementation info that we expect
      if (feature.impl[source]) {
        implementations = implementations.concat(
          sources[source].getImplStatus(feature.impl[source]));
      }

      // If we have the id returned by the Chrome status platform, we
      // can try to look at the Edge status platform, since it uses
      // that ID as well
      if (chromeid && (source === 'edgestatus')) {
        implementations = implementations.concat(
          sources[source].getImplStatus(chromeid));
      }

      // TODO: we may have found twice the same implementation status info
      // from the Edge status platform. Should remove one instance.

      // Compute the final implementation status for each user agent with
      // the following rules:
      // 0. Trust the "feedback" source as being authoritative. It should
      // contain feedback from reviewers about implementation statuses that
      // are incorrectly reported by other sources.
      // 1. Trust platform sources to say the right thing about their own
      // user-agent or rendering engine. For instance, if chromestatus says
      // that a feature is "in development" in Chrome, consider that the
      // feature is really "in development" in Chrome, and ignore possible
      // claims in other sources that the feature is "shipped" in Chrome
      // 2. Keep the most optimistic status otherwise, meaning that if
      // chromestatus says that feature A has shipped in Edge while
      // caniuse says it is in development, consider that the feature has
      // shipped in Edge
      // 3. Due to the close relationship between webkit and Safari, trust
      // webkitstatus more than any other source about support in Safari.
      // If webkitstatus says that a feature is in development in webkit,
      // it means it cannot be at a more advanced level in Safari. In other
      // words, constrain the implementation status in Safari to the
      // implementation status in Webkit, when it is known to be lower.
      // 4. Also, once 3. is done, drop the Webkit entry when there is also
      // an entry for Safari. No need to confuse people with the
      // distinction between Safari and Webkit, unless that is needed
      // (it's only going to be needed for features that are being
      // developed in Webkit but for which there has not been any public
      // signal about support in Safari)
      impldata[id] = {
        implementations,
        shipped: [],
        experimental: [],
        indevelopment: [],
        consideration: []
      }

      let statuses = ['', 'consideration', 'indevelopment', 'experimental', 'shipped'];

      function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
      }

      // Extract the list of user agents that appear in implementation
      // data, computing the status for "webkit" on the side to be able to
      // apply rules 3 and 4, and apply rules for each user agent.
      // (Note this code assumes that the webkitstatus platform is the only
      // source that describes the implementation status in webkit)
      let webkitstatus = (implementations.find(impl => impl.ua === 'webkit') || {})
        .status;
      let uas = implementations
        .map(impl => (impl.ua !== 'webkit') ? impl.ua : null)
        .filter(ua => !!ua)
        .filter(onlyUnique);
      uas.forEach(ua => {
        let status = '';
        let authoritativeStatusFound = false;
        let coreStatusFound = false;
        implementations.filter(impl => impl.ua === ua).forEach(impl => {
          if (authoritativeStatusFound) return;
          if (impl.source === 'feedback') {
            // Rule 0, status comes from reviewer feedback, consider
            // it as authoritative
            status = impl.status;
            authoritativeStatusFound = true;
          }
          else if (Object.keys(sources).includes(impl.source) &&
              sources[impl.source].coreua.includes(ua)) {
            // Rule 1, status comes from the right platform, we've
            // found the implementation status unless we got some
            // feedback from a reviewer that this status is incorrect
            // which will be handled by Rule 0
            coreStatusFound = true;

            // Rule 3, constrain safari status to that of webkit
            // when it is lower
            if ((ua === 'safari') && (typeof webkitstatus === 'string') &&
                statuses.indexOf(impl.status) > statuses.indexOf(webkitstatus)) {
              status = webkitstatus;
            }
            else {
              status = impl.status;
            }
          }
          else if (!coreStatusFound &&
              (statuses.indexOf(impl.status) > statuses.indexOf(status))) {
            // Rule 2, be optimistic in life... except if Rule 1 was
            // already applied. Also take rule 3 into account
            if ((ua === 'safari') && (typeof webkitstatus === 'string') &&
                statuses.indexOf(impl.status) > statuses.indexOf(webkitstatus)) {
              status = webkitstatus
            }
            else {
              status = impl.status;
            }
          }
        });

        if (status !== '') {
          impldata[id][status].push(ua);
        }
      });

      // Rule 4, insert Webkit entry if there was no Safari entry
      if ((typeof webkitstatus === 'string') &&
          (webkitstatus !== '') &&
          !uas.includes('safari')) {
        impldata[id][webkitstatus].push('webkit');
      }

      // Copy polyfill information over from the feature data file
      // (we'll just check that the data is correct)
      if (feature.polyfills) {
        impldata[id].polyfills = [];
        feature.polyfills.forEach(polyfill => {
          if (!polyfill.url) {
            console.error(`Missing URL for polyfill in ${file}`);
          }
          else if (!polyfill.label) {
            console.error(`Missing label for polyfill in ${file}`);
          }
          else {
            impldata[id].polyfills.push(polyfill);
          }
        });
      }
    });
  });

  return impldata;
}


module.exports.extractImplData = extractImplData;


if (require.main === module) {
  const files = process.argv.slice(2);
  extractImplData(files)
    .then(data => console.log(JSON.stringify(data, null, 2)));
}
