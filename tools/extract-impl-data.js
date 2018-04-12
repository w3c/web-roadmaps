/*******************************************************************************
Helper script that parses data files and fetches implementation information from
Web status platforms such as Can I use and those provided by browser vendors

To parse files:
node tools/extract-impl-data.js data/3dcamera.json data/webvtt.json
*******************************************************************************/

const fetch = require('fetch-filecache-for-crawling');
const fs = require('fs');
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
 * Implementation data sources
 *
 * Some of these sources are maintained by browser vendors, and thus contain
 * "more accurate" data for some user agents. These UA appear in the "coreua"
 * property.
 */
let sources = {
  caniuse: {
    url: "https://caniuse.com/data.json",
    userAgents: {
      'and_chr': 'chrome_android',
      'and_ff': 'firefox_android',
      'and_qq': 'qq_android',
      'and_uc': 'uc_android',
      'baidu': 'baidu',
      'chrome': 'chrome',
      'edge': 'edge',
      'firefox': 'firefox',
      'ios_saf': 'safari_ios',
      'op_mini': 'opera_mini',
      'op_mob': 'opera_android',
      'opera': 'opera',
      'safari': 'safari',
      'samsung': 'samsunginternet_android'
    },
    getImplStatus: function (key) {
      let source = 'caniuse';
      let sourcedata = sources[source].data;
      let impl = [];
      let impldata = sourcedata.data[key].stats;
      let implnotes = sourcedata.data[key].notes_by_num;
      Object.keys(impldata).forEach(ua => {
        let uadata = impldata[ua];
        let latestUAVersion = sourcedata.agents[ua].versions.slice(-4, -3);
        let experimentalUAversions = sourcedata.agents[ua].versions.slice(-3);

        // Only save implementation info for UA we're interested in,
        // and normalize UA name
        if (!(ua in sources[source].userAgents)) {
          return;
        }
        ua = sources[source].userAgents[ua];

        function parseStatus(caniuseStatus, experimental) {
          let res = { ua };
          if (caniuseStatus.startsWith('y') || caniuseStatus.startsWith('a')) {
            res.status = (experimental ? 'experimental' : 'shipped');
          }
          else if (caniuseStatus.startsWith('n d')) {
            res.status = 'experimental';
          }
          if (caniuseStatus.includes('x')) {
            res.prefix = true;
          }
          if (caniuseStatus.includes('d')) {
            res.flag = true;
          }
          if ((res.status === 'shipped') && (res.prefix || res.flag)) {
            res.status = 'experimental';
          }
          let notes = caniuseStatus.split(' ')
            .filter(token => token.startsWith('#'))
            .map(noteid => implnotes[noteid.slice(1)])
            .filter(note => !!note);
          if (notes.length > 0) {
            res.notes = notes;
          }
          res.source = source;
          return res;
        }

        let info = parseStatus(uadata[latestUAVersion]);
        if ((info.status === 'shipped') || (info.status === 'experimental')) {
          impl.push(info);
        }
        else {
          experimentalUAversions.forEach(version => {
            if (!version) return;
            let info = parseStatus(uadata[version], true);
            if (info.status === 'experimental') {
              impl.push(info);
            }
          });
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
      let impldata = sourcedata.find(feature => feature.id === key);
      if (impldata) {
        impldata = impldata.browsers;
      }
      if (!impldata) {
        throw new Error(`Unknown Chrome feature ${key}`);
      }

      function parseStatus(chromestatus) {
        if (!chromestatus) {
          return null;
        }
        let status = (chromestatus.status ?
          chromestatus.status.text :
          chromestatus.view.text);
        let res = {};
        switch (status) {
          case 'Enabled by default':
          case 'Shipped':
            res.status = 'shipped';
            break;
          case 'Behind a flag':
          case 'Origin trial':
            res.status = 'experimental';
            break;
          case 'In development':
            res.status = 'indevelopment';
            break;
          case 'Proposed':
          case 'Public support':
            res.status = 'consideration';
            break;
          case 'No public signals':
          case 'Mixed public signals':
          case 'Public skepticism':
          case 'Opposed':
            res.status = '';
            break;
          default:
            console.warn(`- Unknown chrome status ${status}`);
            break;
        }
        if (chromestatus.prefixed) {
          res.prefix = true;
        }
        if (chromestatus.flag || (status === 'Behind a flag')) {
          res.flag = true;
        }
        if ((res.status === 'shipped') && (res.prefix || res.flag)) {
          res.status = 'experimental';
        }
        res.source = source;
        return res;
      }

      for (let ua of ['chrome', 'ff', 'edge', 'safari']) {
        let info = parseStatus(impldata[ua]);
        ua = (ua === 'ff' ? 'firefox' : ua);
        if (info) {
          // Chromestatus has more detailed implementation info about Chrome
          // ("in development" and "consideration" are at the Chromium level
          // and thus apply to Chrome for desktops and Chrome for Android)
          let enabledOnAllPlatforms = (info.status === 'indevelopment') ||
              (info.status === 'consideration') ||
              (impldata.chrome.status.milestone_str === 'Enabled by default');
          if (ua === 'chrome') {
            if (impldata.chrome.desktop || enabledOnAllPlatforms) {
              impl.push(Object.assign({ ua: 'chrome'}, info));
            }
            if (impldata.chrome.android || enabledOnAllPlatforms) {
              impl.push(Object.assign({ ua: 'chrome_android'}, info));
            }
          }
          else {
            impl.push(Object.assign({ ua }, info));
          }
        }
      }

      // Support in Opera is reported differently, not exactly sure how
      // to read that info though (typically, if it completes "chrome" info,
      // we should take the prefix and flag info from "chrome" into account)
      if (impldata.opera) {
        if (impldata.opera.desktop) {
          impl.push({ ua: 'opera', status: 'shipped', source });
        }
        if (impldata.opera.android) {
          impl.push({ ua: 'opera_android', status: 'shipped', source });
        }
      }

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
      if (impldata) {
        let edgestatus = impldata.ieStatus.text;
        let res = { ua };
        switch (edgestatus) {
          case 'Shipped':
            res.status = 'shipped';
            break;
          case 'Preview Release':
          case 'Prefixed':
            res.status = 'experimental';
            break;
          case 'In Development':
            res.status = 'indevelopment';
            break;
          case 'Under Consideration':
            res.status = 'consideration';
            break;
          case 'Not currently planned':
            res.status = '';
            break;
          default:
            console.warn(`- Unknown edge status ${edgestatus}`);
            break;
        }
        if (impldata.ieStatus.iePrefixed && !impldata.ieStatus.ieUnprefixed) {
          res.prefix = true;
        }
        if (impldata.ieStatus.flag) {
          res.flag = true;
        }
        if ((res.status === 'shipped') && (res.prefix || res.flag)) {
          res.status = 'experimental';
        }
        res.source = source;
        if (res.status || (res.status === '')) {
          impl.push(res);
        }
      }
      else if (property === 'name') {
        throw new Error(`Unknown Edge feature ${key} (property ${property})`);
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
      let impldata = sourcedata[keyType]
        .find(feature => feature.name.toLowerCase() === keyName);
      if (!impldata) {
        throw new Error(`Unknown webkit feature ${key}`);
      }
      impldata = impldata.status;
      if (impldata) {
        let webkitstatus = impldata.status;
        let res = { ua };
        switch (webkitstatus) {
          case 'Supported':
          case 'Partially Supported':
            res.status = 'shipped';
            break;
          case 'Supported In Preview':
            res.status = 'experimental';
            break;
          case 'In Development':
            res.status = 'indevelopment';
            break;
          case 'Under Consideration':
            res.status = 'consideration';
            break;
          default:
            console.warn(`- Unknown status ${webkitstatus}`);
        }

        if (('enabled_by_default' in impldata) &&
            !impldata.enabled_by_default) {
          res.flag = true;
        }
        // No specific info about whether implementation requires use of a
        // prefix but that seems to be noted in comments, so let's assume that
        // the presence of the term "prefixed" is a good-enough indicator.
        if (impldata.comment && impldata.comment.includes(' prefixed')) {
          res.prefix = true;
        }
        if ((res.status === 'shipped') && (res.prefix || res.flag)) {
          res.status = 'experimental';
        }
        if (impldata.comment) {
          res.notes = [impldata.comment];
        }
        res.source = source;
        if (res.status || (res.status === '')) {
          impl.push(res);
        }
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
          if (d.prefix) {
            implstatus.prefix = true;
          }
          if (d.flag) {
            implstatus.flag = true;
          }
          if (d.date) {
            implstatus.date = d.date;
          }
          if (d.comment) {
            implstatus.notes = [d.comment];
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
      let response = await fetch(sources[source].url, { timeout: 300000 })
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
    let id = file.split(/\/|\\/).pop().split('.')[0];
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

  extractImplData(files)
    .then(data => console.log(JSON.stringify(data, null, 2)));
}
