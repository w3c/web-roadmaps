/*******************************************************************************
Helper script that parses data files and fetches implementation information from
Web status platforms such as Can I use and those provided by browser vendors

To parse files:
node tools/extract-impl-data.js data/3dcamera.json data/webvtt.json
*******************************************************************************/

const fetch = require('fetch-filecache-for-crawling');
const fs = require('fs');
const path = require('path');
const bcd = require('mdn-browser-compat-data');


/**
 * Possible implementation statuses
 *
 * @type {Array}
 */
const statuses = [
  '',
  'consideration',
  'indevelopment',
  'experimental',
  'shipped'
];


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
  /**
   * Some notes about Can I Use:
   * - info about Samsung Internet browser may be slightly outdated. As of
   * April 2018, it's for v6.2 from Oct 2017, whereas v6.4 shipped in Feb 2018.
   * That's not perfect but we'll make do with it.
   * - info about Chinese browsers (Baidu, QQ, UC) seems slightly outdated too
   * (info is for releases in 2016 and 2017, more recent versions exist). That's
   * far from perfect but we'll make do with it nevertheless.
   * - info about Opera for Android and Opera Mini seem completely outdated. As
   * of April 2018, it's for v37 from Sept 2016 for Opera for Android, whereas
   * v45 was released in March 2018. Here, the gap seems too wide for it to be
   * useful to report on Opera for Android and Opera Mini, so the info is just
   * not processed.
   */
  caniuse: {
    url: "https://caniuse.com/data.json",
    userAgents: {
      'and_chr': 'chrome_android',
      'and_ff': 'firefox_android',
      'and_qq': 'qq_android',
      'and_uc': 'uc_android',
      'baidu': 'baidu_android',
      'chrome': 'chrome',
      'edge': 'edge',
      'firefox': 'firefox',
      'ios_saf': 'safari_ios',
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
          res.href = `https://caniuse.com/#feat=${key}`;
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
    coreua: ["chrome", "chrome_android", "edge"],
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

      // The JSON file returned by the Chrome Platform Status does not give any
      // information about which version is the current one
      // (see https://github.com/GoogleChrome/chromium-dashboard/issues/440 for
      // a related issue)
      // We'll get the info from Can I Use data for now
      // The assumption is that the mobile version is the same as the desktop
      // version. That's usually correct as there seems to be one or two days
      // of difference between desktop and mobile releases at most:
      // https://en.wikipedia.org/wiki/Google_Chrome_version_history
      // (Also the information on Can I Use for Chrome for Android is not as
      // accurate. For instance, it reports that the today's version of Chrome
      // for Android is 64 whereas it should be 65 in practice)
      // Opera's version is a priori consistently Chrome's version - 13 as
      // explained in:
      // https://github.com/w3c/web-roadmaps/issues/13#issuecomment-351468443
      let chromeVersion = sources.caniuse.data.agents.chrome.versions.slice(-4, -3)[0];
      let edgeVersion = sources.caniuse.data.agents.edge.versions.slice(-4, -3)[0];
      let operaVersion = chromeVersion - 13;

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
          case 'Shipped/Shipping':
            res.status = 'shipped';
            break;
          case 'In developer trial (Behind a flag)':
          case 'Behind a flag':
          case 'Origin trial':
            res.status = 'experimental';
            break;
          case 'In development':
            res.status = 'indevelopment';
            break;
          case 'Proposed':
          case 'Public support':
          case 'Positive':
            res.status = 'consideration';
            break;
          case 'No signal':
          case 'No public signals':
          case 'Mixed public signals':
          case 'No active development':
          case 'No longer pursuing':
          case 'Public skepticism':
          case 'Negative':
          case 'Opposed':
          case 'Removed':
          case 'Deprecated':
          case 'Defer':
          case 'Harmful':
            res.status = '';
            break;
          default:
            console.warn(`- Unknown chrome status ${status}`);
            break;
        }

        // The "prefixed" and "flag" properties are no longer maintained once a
        // feature has shipped, see discussion in :
        // https://github.com/GoogleChrome/chromium-dashboard/issues/1006
        if (res.status !== 'shipped') {
          if (chromestatus.prefixed) {
            res.prefix = true;
          }
          if (chromestatus.flag || (status === 'Behind a flag')) {
            res.flag = true;
          }
        }
        res.source = source;
        res.href = `https://www.chromestatus.com/feature/${key}`;
        return res;
      }

      // 2020-09-09: Voluntarily ignore information about "edge", which does not
      // seem to be current for the version of Edge based on Chromium
      for (let ua of ['chrome', 'ff', 'safari']) {
        let info = parseStatus(impldata[ua]);
        ua = (ua === 'ff' ? 'firefox' : ua);
        if (info) {
          // Chromestatus has more detailed and forward-looking implementation
          // info about Chrome (also, "in development" and "consideration" are
          // at the Chromium level and thus apply to Chrome for desktops and
          // Chrome for Android)
          let enabledOnAllPlatforms = (info.status === 'indevelopment') ||
              (info.status === 'consideration') ||
              (impldata.chrome.status.milestone_str === 'Enabled by default');
          if (ua === 'chrome') {
            if (impldata.chrome.desktop &&
                (impldata.chrome.desktop > chromeVersion) &&
                (info.status === 'shipped')) {
              impl.push(Object.assign({ ua: 'chrome' }, info,
                { status: 'experimental' }));
            }
            else if (impldata.chrome.desktop || enabledOnAllPlatforms) {
              impl.push(Object.assign({ ua: 'chrome' }, info));
            }
            if (impldata.chrome.android &&
                (impldata.chrome.android > chromeVersion) &&
                (info.status === 'shipped')) {
              impl.push(Object.assign({ ua: 'chrome_android' }, info,
                { status: 'experimental' }));
            }
            else if (impldata.chrome.android || enabledOnAllPlatforms) {
              impl.push(Object.assign({ ua: 'chrome_android' }, info));
            }

            // 2020-09-09: consider that implementation status for Edge is the
            // same as implementation status for Chrome (Chrome Platform Status
            // data include implementation data about Edge but that info seems
            // to be for the previous version of Edge)
            if (impldata.chrome.desktop &&
                (impldata.chrome.desktop > edgeVersion) &&
                (info.status === 'shipped')) {
              impl.push(Object.assign({ ua: 'edge' }, info,
                { status: 'experimental' }));
            }
            else if (impldata.chrome.desktop || enabledOnAllPlatforms) {
              impl.push(Object.assign({ ua: 'edge' }, info));
            }
          }
          else {
            impl.push(Object.assign({ ua }, info));
          }
        }
      }

      // Support in Opera is reported differently, and follows an "Opera
      // version is Chromium's version - 13" rule which is correct for the
      // desktop version, but Opera for Android seems to follow its own
      // schedule (today's version of Opera for Android is 45 and is based on
      // Chromium 61, so that's version - 16...). We could deduce the right
      // information for Opera for Android if we knew on which version of
      // Chromium the current version of Opera for Android is based, but there
      // is no easy way to tell, so let's ignore the Opera for Android info.
      if (impldata.opera && impldata.opera.desktop) {
        let href = `https://www.chromestatus.com/feature/${key}`;
        let status = (impldata.opera.desktop > operaVersion) ?
          'experimental' : 'shipped';
        impl.push({ ua: 'opera', status, source, href });
      }

      return impl;
    }
  },
  edgestatus: {
    url: "https://raw.githubusercontent.com/MicrosoftEdge/Status/production/status.json",
    coreua: [],
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
          case 'Supported':
            res.status = 'shipped';
            break;
          case 'Preview Release':
          case 'Prefixed':
          case 'Partial Support':
            res.status = 'experimental';
            break;
          case 'In Development':
          case 'In Development (Windows & Mac backend services)':
            res.status = 'indevelopment';
            break;
          case 'Under Consideration':
            res.status = 'consideration';
            break;
          case 'Not currently planned':
          case 'Not Supported':
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

        let implid = impldata.name.toLowerCase().replace(/\W/g, '');
        res.href = `https://developer.microsoft.com/en-us/microsoft-edge/platform/status/${implid}/`;
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
          case 'Removed':
          case 'Not Considering':
            res.status = '';
            break;
          default:
            console.warn(`- Unknown webkit status ${webkitstatus}`);
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
        res.href = `https://webkit.org/status/#${key}`;
        if (res.status || (res.status === '')) {
          impl.push(res);
        }
      }
      return impl;
    }
  },

  /**
   * MDN Browser Compatibility Data:
   * https://github.com/mdn/browser-compat-data
   *
   * Note the data is not retrieved online but rather directly as an NPM
   * package. The package gets updated whenever there are updates, so make
   * sure to call `npm install` to update the package as needed before running
   * the script.
   *
   * Key is path whose first part is the initial path, and the remainder links
   * to sub-features, e.g. "api.StorageManager.estimate" to link to the
   * "estimate" subfeature of the StorageManager class in the API folder.
   */
  mdn: {
    getImplStatus: function (key) {
      let source = 'mdn';
      let now = (new Date()).toISOString();
      let impl = [];
      let tokens = key.split('.');
      let impldata = tokens.reduce((res, token) => { return res[token]; }, bcd);
      if (!impldata || !impldata.__compat) {
        return impl;
      }
      impldata = impldata.__compat;
      let href = impldata.mdn_url;

      let uas = Object.keys(impldata.support || {});
      for (let ua of uas) {
        let res = { ua };
        let releases = (bcd.browsers[ua] || {}).releases || {};
        if ((ua === 'chrome_android') && !bcd.browsers[ua] && bcd.browsers['chrome']) {
          releases = bcd.browsers['chrome'].releases || {};
        }

        let support = impldata.support[ua];
        if (Array.isArray(support)) {
          // Sort support array, most recent info first and take the first one
          support.sort((a, b) => {
            let aAdded = a.version_added;
            let bAdded = b.version_added;
            if ((aAdded === true) || (aAdded === false)) {
              return -1;
            }
            else if ((bAdded === true) || (bAdded === false)) {
              return 1;
            }
            else if (aAdded === null) {
              return (bAdded === null) ? 0 : 1;
            }
            else if (bAdded === null) {
              return -1;
            }
            else {
              let aRelease = releases[aAdded];
              let bRelease = releases[bAdded];
              if (!aRelease) {
                return (!bRelease ? 0 : -1);
              }
              else if (!bRelease) {
                return 1;
              }
              else if (!aRelease.release_date) {
                return (!bRelease.release_date ? 0 : -1);
              }
              else if (!bRelease.release_date) {
                return 1;
              }
              else if (aRelease.release_date < bRelease.release_date) {
                return 1;
              }
              else if (aRelease.release_date > bRelease.release_date) {
                return -1;
              }
              else {
                return 0;
              }
            }
          });
          support = support[0] || {};
        }
        if (!support.version_added && (support.version_added !== false)) {
          continue;
        }

        if ((support.version_added === false) || support.version_removed) {
          res.status = '';
        }
        else if (support.prefix || support.alternative_name) {
          res.status = 'experimental';
          res.prefix = true;
        }
        else if (support.flags && (support.flags.length > 0)) {
          res.status = 'experimental';
          res.flag = true;
        }
        else if (typeof support.version_added === 'string') {
          let release = releases[support.version_added];
          if (!release) {
            // Nothing known about release version, consider it does not
            // exist yet.
            res.status = 'experimental';
          }
          else if ((release.status === 'retired') ||
              (release.release_date && (release.release_date < now))) {
            // Version released some time ago
            res.status = 'shipped';
          }
          else {
            // Version not released yet
            res.status = 'experimental';
          }
        }
        else {
          res.status = 'shipped';
        }

        if (support.partial_implementation) {
          res.partial = true;
        }
        if (support.notes) {
          res.notes = (Array.isArray(support.notes) ?
            support.notes : [support.notes]);
        }

        res.source = source;
        if (impldata.mdn_url) {
          res.href = impldata.mdn_url;
        }
        impl.push(res);
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
          if (d.href) {
            implstatus.href = d.href;
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


function getImplInfoForFeature(feature) {
  let implementations = [];

  // Compute implementation status only when we know where to look in the
  // implementation data
  if (!feature.impl) {
    return implementations;
  }

  let chromeid = feature.impl.chromestatus;
  if (chromeid && !sources.chromestatus.data.find(f => f.id === chromeid)) {
    chromeid = null;
  }

  Object.keys(sources).forEach(source => {
    // 2020-09-09: Temporarily disable Edge status platform. Implementation
    // status seems to change once in a while but additions merely point at
    // Chrome Platform Status. The file only contains acutal implementation info
    // about the previous version of Edge, not about the one based on Chromium.
    if (source === 'edgestatus') {
      return;
    }

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
  });

  // We may have found the implementation status info from the Edge status
  // platform twice (once with the real feature name, once with a Chrome ID).
  // Let's remote one instance if that happened.
  implementations = implementations.filter(impl =>
    (impl.source !== 'edgestatus') ||
    (impl === implementations.find(i => i.source === 'edgestatus'))
  );

  return implementations;
}


function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}


function guessImplInfoFromFeatures(implinfo, coverage) {
  if (!implinfo.features) {
    return;
  }

  // List user-agents for which we have some level of implementation info
  // at the feature level
  let uas = [];
  for (let feature of Object.values(implinfo.features)) {
    uas = uas.concat(feature.implementations.map(impl => impl.ua))
  }
  uas = uas.filter(onlyUnique);

  for (let source of Object.keys(sources)) {
    for (let ua of uas) {
      let guessed = {
        ua,
        status: null,
        source,
        guess: true,
        features: []
      };

      for (let featureName of Object.keys(implinfo.features)) {
        let impl = implinfo.features[featureName].implementations.find(o =>
          (o.ua === ua) && (o.source === source));
        if (!impl) {
          continue;
        }
        if ((guessed.status === null) ||
            (statuses.indexOf(impl.status) <= statuses.indexOf(guessed.status))) {
          // Guessed impl status for the whole spec is the lowest status of
          // individual features
          guessed.status = impl.status;
          if (impl.prefix) {
            guessed.prefix = impl.prefix;
          }
          if (impl.flag) {
            guessed.flag = impl.flag;
          }
          if (impl.partial) {
            guessed.partial = impl.partial;
          }
        }
        guessed.features.push(featureName);
      }

      if (guessed.status) {
        if ((coverage === 'full') && !guessed.partial &&
            (guessed.features.length === Object.keys(implinfo.features).length)) {
          guessed.partial = false;
        }
        else {
          guessed.partial = true;
        }
        implinfo.implementations.push(guessed);
      }
    }
  }
}


function guessImplInfoFromSpec(featureName, implinfo) {
  if (!implinfo.features || !implinfo.features[featureName]) {
    return;
  }

  // List user-agents for which we have implementation info at the spec level
  let uas = implinfo.implementations.map(o => o.ua).filter(onlyUnique);

  for (let source of Object.keys(sources)) {
    for (let ua of uas) {
      let impl = implinfo.implementations.find(o =>
        (o.source === source) && (o.ua === ua));
      if (!impl || !impl.status) {
        continue;
      }

      let guessed = {
        ua,
        status: impl.status,
        source,
        href: impl.href,
        guess: true
      };
      if (impl.prefix) {
        guessed.prefix = impl.prefix;
      }
      if (impl.flag) {
        guessed.flag = impl.flag;
      }
      if (impl.partial) {
        guessed.partial = impl.partial
      }

      implinfo.features[featureName].implementations.push(guessed);
    }
  }
}


function flagBestImplInfo(implementations) {
  // Compute the final implementation status for each user agent with
  // the following rules:
  // 0. Trust the "feedback" source as being authoritative. It should
  // contain feedback from reviewers about implementation statuses that
  // are incorrectly reported by other sources.
  // 1. Trust platform sources to say the right thing about their own
  // user-agent or rendering engine. For instance, if chromestatus says
  // that a feature is "in development" in Chrome, consider that the
  // feature is really "in development" in Chrome, and ignore possible
  // claims in other sources that the feature is "shipped" in Chrome.
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
  // 4. Only select inferred implementation status (flagged with `guess`) when
  // there is no other better info.

  // Extract the list of user agents that appear in implementation
  // data, computing the status for "webkit" on the side to be able to
  // apply rule 3, and apply rules for each user agent.
  let webkitInfo = implementations.find(impl => impl.source === 'webkitstatus');
  let webkitStatus = (webkitInfo || {}).status;
  let uas = implementations
    .map(impl => (impl.ua !== 'webkit') ? impl.ua : null)
    .filter(ua => !!ua)
    .filter(onlyUnique);
  uas.forEach(ua => {
    let authoritativeStatusFound = false;
    let coreStatusFound = false;
    let selectedImplInfo = null;
    implementations.filter(impl => impl.ua === ua).forEach(impl => {
      if (authoritativeStatusFound) return;
      if (impl.source === 'feedback') {
        // Rule 0, status comes from reviewer feedback, consider
        // it as authoritative
        authoritativeStatusFound = true;
        selectedImplInfo = impl;
      }
      else if (Object.keys(sources).includes(impl.source) &&
          sources[impl.source].coreua.includes(ua) && !impl.guess) {
        // Rule 1, status comes from the right platform, we've
        // found the implementation status unless we got some
        // feedback from a reviewer that this status is incorrect
        // which will be handled by Rule 0
        coreStatusFound = true;

        // Rule 3, constrain safari status to that of webkit
        // when it is lower
        if (ua.startsWith('safari') && (typeof webkitstatus === 'string') &&
            statuses.indexOf(impl.status) > statuses.indexOf(webkitstatus)) {
          selectedImplInfo = webkitInfo;
        }
        else {
          selectedImplInfo = impl;
        }
      }
      else if (!selectedImplInfo || (!coreStatusFound && !impl.guess &&
          (statuses.indexOf(impl.status) > statuses.indexOf(selectedImplInfo.status)))) {
        // Rule 2, be optimistic in life... except if Rule 1 was
        // already applied. Also take rule 3 into account
        if ((ua === 'safari') && (typeof webkitstatus === 'string') &&
            statuses.indexOf(impl.status) > statuses.indexOf(webkitstatus)) {
          selectedImplInfo = impl;
        }
        else {
          selectedImplInfo = impl;
        }
      }
    });

    // Flag the selected implementation info
    if (selectedImplInfo) {
      selectedImplInfo.selected = true;
    }
  });
}


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
    let spec = requireFromWorkingDirectory(file);

    // Get implementation status for the whole spec
    impldata[id] = {
      implementations: getImplInfoForFeature(spec)
    };

    // Get implementation status for individual features in the spec
    if (spec.features) {
      impldata[id].features = {};
      for (let featureName of Object.keys(spec.features)) {
        let feature = spec.features[featureName];
        impldata[id].features[featureName] = {
          implementations: getImplInfoForFeature(feature)
        };
      }

      // Merge implementation status at the feature level to guess
      // implementation status of the whole spec
      guessImplInfoFromFeatures(impldata[id], spec.featuresCoverage);
    }

    // Flag the best implementation info for the whole spec
    flagBestImplInfo(impldata[id].implementations);

    // Guess individual features implementation status from implementation
    // status of the whole spec and choose the best implementation info for
    // individual features
    if (impldata[id].features) {
      for (let featureName of Object.keys(spec.features)) {
        guessImplInfoFromSpec(featureName, impldata[id]);
        flagBestImplInfo(impldata[id].features[featureName].implementations);
      }
    }

    // Copy polyfill information over from the feature data file
    // (we'll just check that the data is correct)
    if (spec.polyfills) {
      impldata[id].polyfills = [];
      spec.polyfills.forEach(polyfill => {
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

  return impldata;
}


module.exports.extractImplData = extractImplData;


if (require.main === module) {
  let config = {};
  try {
    config = requireFromWorkingDirectory('config.json');
  }
  catch (err) {}

  if (config.cacheFolder) {
    fetch.setParameter('cacheFolder', config.cacheFolder);
  }
  if (config.cacheRefresh) {
    fetch.setParameter('refresh', config.cacheRefresh);
  }
  if (config.logToConsole) {
    fetch.setParameter('logToConsole', config.logToConsole);
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

  extractImplData(files)
    .then(data => console.log(JSON.stringify(data, null, 2)));
}
