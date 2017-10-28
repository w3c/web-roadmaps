/**
 * Wraps querySelectorAll to return an Array across browsers
 */
const $ = (el, selector) =>
  Array.prototype.slice.call(el.querySelectorAll(selector), 0);

/**
 * Applied to an element, sets an ID for it (and returns it), using a specific
 * prefix if provided, and a specific text if given.
 *
 * This code comes from Respec:
 * https://github.com/w3c/respec/blob/develop/src/core/jquery-enhanced.js
 *
 * Changes made to Respec code:
 * - "elem" added as first parameter
 * - "txt" initialized with value of "data-feature" or "data-featureid"
 * attributes when present
 */
const makeID = function(elem, pfx = "", txt = "", noLC = false) {
  if (elem.id) {
    return elem.id;
  }
  if (!txt) {
    txt = (elem.getAttribute('data-featureid') ? elem.getAttribute('data-featureid') :
      (elem.getAttribute('data-feature') ? elem.getAttribute('data-feature') :
        (elem.title ? elem.title : elem.textContent))).trim();
  }
  let id = noLC ? txt : txt.toLowerCase();
  id = id
    .replace(/[\W]+/gmi, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  if (!id) {
    id = "generatedID";
  } else if (/\.$/.test(id) || !/^[a-z]/i.test(id)) {
    id = "x" + id; // trailing . doesn't play well with jQuery
  }
  if (pfx) {
    id = `${pfx}-${id}`;
  }
  if (elem.ownerDocument.getElementById(id)) {
    let i = 0;
    let nextId = id + "-" + i;
    while (elem.ownerDocument.getElementById(nextId)) {
      nextId = id + "-" + i++;
    }
    id = nextId;
  }
  elem.id = id;
  return id;
};


/**
 * List of scripts to include in all pages
 */
const scripts = ['../js/sidenav.js'];

/**
 * Template to use for an item in the navigation menu
 */
const templateTocItem = '<a href=""><div class="icon"><img src="" alt=""></div><div class="description"></div></a>';

/**
 * List of maturity levels
 */
const maturityLevels = {
  'ED': 'low',
  'LastCall': 'medium',
  'WD': 'low',
  'CR': 'high',
  'PR': 'high',
  'REC': 'high',
  'NOTE': 'high',
  'LS': 'high'
};

/**
 * Known browsers
 */
const browsers = ['firefox', 'chrome', 'edge', 'safari', 'webkit'];


const fillCell = function (el, data, image) {
  if (!data) return;
  if (data.level) {
    el.setAttribute('class',data.level);
  }

  let img;
  if (image) {
    img = new Image();
    img.setAttribute('src', image.src);
    img.setAttribute('alt', image.alt);
    if (image.width) {
      img.setAttribute('width', image.width);
    }
    if (image.height) {
      img.setAttribute('height', image.height);
    }
  }

  if (data.url) {
    let a = document.createElement("a");
    a.setAttribute('href', data.url);
    if (image) {
      a.setAttribute('title', data.label);
      a.appendChild(img);
    } else {
      a.appendChild(document.createTextNode(data.localizedLabel || data.label));
    }
    el.appendChild(a);

    // Render the English label as well when a localized label was rendered.
    // This should be useful because the English title is the title used to
    // refer to the spec or group name across Web pages.
    if (data.localizedLabel && data.label &&
        (data.localizedLabel !== data.label)) {
      el.appendChild(document.createTextNode(' '));
      let span = document.createElement('span');
      span.setAttribute('lang', 'en');
      span.appendChild(document.createTextNode('(' + data.label + ')'));
      el.appendChild(span);
    }
  } else {
    if (image) {
      el.appendChild(img);
    } else {
      el.appendChild(document.createTextNode(data.localizedLabel || data.label));
    }
  }
};


const maturityData = function (spec) {
  return {
    maturity: {
      label: spec.maturity,
      level: maturityLevels[spec.maturity] || 'low'
    },
    maturityIcon: (!spec.maturity || (spec.maturity === 'NOTE')) ? null : {
      src: 'https://www.w3.org/2013/09/wpd-rectrack-icons/' +
        spec.maturity.toLowerCase().replace(/lastcall/,'lcwd') +
        '.svg',
      alt: spec.maturity,
      width: 50,
      height: (spec.maturity === 'REC' || spec.maturity === 'LastCall') ? 53 : 50
    }
  };
};


/**
 * "Promisify" XHR to fetch documents at the given URL
 * (not using "fetch" for now due to lack of support in some browsers)
 */
const loadUrl = function (url, failSilently) {
  return new Promise(function(resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.responseType = "text";
    xhr.open('GET', url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(this.response);
      } else if (failSilently) {
        resolve(null);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      if (failSilently) {
        resolve(null);
      }
      else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.send();
  });
};


/**
 * Loads the localized version of the given page if it exists, the default
 * version otherwise.
 */
const loadLocalizedUrl = function (url, lang) {
  const localizedUrl = ((lang === 'en') ? url :
    url.replace(/\.([^\.]+)$/, '.' + lang + '.$1'));
  return loadUrl(localizedUrl)
    .catch(err => {
      if (lang === 'en') {
        console.error('Could not find required document at ' + url);
        throw err;
      }
      else {
        console.warn('No localized version of ' + url + ' in "' + lang + '"');
        return loadUrl(url);
      }
    })
};



/**
 * Loads the template page and applies the content to the loaded template.
 *
 * The code loads the localized version if it exists, the default template page
 * otherwise.
 */
const loadTemplatePage = function (lang) {
  return loadLocalizedUrl('../js/template-page.html', lang)
    .then(responseText => {
      // Preserve initial content that needs to appear in final document
      // (head elements, main header and sections)
      const headElements = $(document, 'head > *').filter(el =>
        (el.nodeName !== 'TITLE') &&
        !((el.nodeName === 'META') && el.getAttribute('charset')));
      const hero = $(document, 'header > *');
      const sections = $(document, 'section');

      // Replace doc by template doc and complete with content saved above
      document.documentElement.innerHTML = responseText;
      headElements.forEach(el => document.querySelector('head').appendChild(el));
      hero.forEach(el => document.querySelector('.hero .container').appendChild(el));
      sections.forEach(section => document.querySelector('.main-content .container').appendChild(section));
      document.documentElement.lang = lang;

      // Add JS scripts to the end of the body
      scripts.forEach(script => {
        let s = document.createElement("script");
        s.src = script;
        document.querySelector('body').appendChild(s);
      });

      // Add IDs to all headers, data-feature paragraphs and data-featureid elements
      $(document, 'h2:not([id]), h3:not([id]), h4:not([id]), h5:not([id]), h6:not([id]), *[data-feature]:not([id]), *[data-featureid]:not([id])')
        .forEach(el => makeID(el));
    });
};


/**
 * Loads translations of strings to be used in the right language, falling
 * back to English if translations cannot be found.
 */
const loadTranslations = function (lang) {
  return loadLocalizedUrl('../js/translations.json', lang)
    .then(response => JSON.parse(response))
};


/**
 * Creates the navigation menu from the Table of Contents
 */
const applyToc = function (toc) {
  const title = document.querySelector('.hero .container h1').textContent;
  document.querySelector('title').textContent = title + ' - ' + toc.title;
  $(document, 'section.contribute .discourse').forEach(link => {
    link.href = toc.discourse.url;
    if (link.classList.contains('discoursecat')) {
      link.textContent = toc.discourse.category;
    }
  });

  if (toc.pages.length === 0) {
    document.getElementById('side-nav-btn').hidden = true;
  }

  let nav = document.querySelector('aside nav ul');
  toc.pages.forEach(page => {
    let navLi = document.createElement('li');
    navLi.innerHTML = templateTocItem;
    navLi.querySelector('a').href = page.url;
    navLi.querySelector('.icon img').src = page.icon;
    navLi.querySelector('div.description').textContent = page.title;
    nav.appendChild(navLi);
  });
};


/**
 * Loads, parses and applies the Table of Contents.
 *
 * If a localized version of the TOC cannot be found, the function falls back
 * to the default Table of Contents.
 */
const loadAndApplyToc = function (lang) {
  return loadLocalizedUrl('toc.json', lang)
    .then(response => JSON.parse(response))
    .then(toc => applyToc(toc));
};


/**
 * Loads known metadata for each specification
 */
const loadSpecData = function () {
  return loadUrl('../specs/tr.json')
    .then(response => JSON.parse(response));
};


/**
 * Loads known implementation data for each specification
 */
const loadImplementationData = function () {
  return loadUrl('../specs/impl.json')
    .then(response => JSON.parse(response));
};


/**
 * Loads HTML table templates
 */
const loadTableTemplates = function (lang) {
  const templateTypes = ['well-deployed', 'exploratory-work'];
  return Promise.all(templateTypes.map(type =>
    loadLocalizedUrl('../js/template-table-' + type + '.html', lang)
  )).then(results => {
    let res = {};
    templateTypes.forEach((type, index) => res[type] = results[index]);
    return res;
  });
};


/**
 * Loop through sections and set titles to well-known sections without titles.
 *
 * Well-known sections are identified based on their "class" attribute, using
 * an harcoded list of section titles and possible translations of these titles.
 */
const setSectionTitles = function (translations, lang) {
  const sections = $(document, 'section');
  let sectionTitlesPerType = translations['sections'] || {};
  sections.forEach(section => {
    // Search for section's title, defined as the first title found that has
    // the current section as first section ancestor.
    let titleEl = section.querySelector('h1,h2,h3,h4,h5,h6');
    if (titleEl) {
      let parentSection = titleEl.parentNode;
      while (parentSection !== section) {
        if (parentSection.nodeName === 'SECTION') {
          break;
        }
        parentSection = parentSection.parentNode;
      }
      if (parentSection === section) {
        return;
      }
    }

    // No title found, set the title if the section is a well-known one
    let type = section.className.split(' ').find(type =>
        Object.keys(sectionTitlesPerType).includes(type));
    if (type) {
      titleEl = document.createElement('h2');
      titleEl.appendChild(document.createTextNode(sectionTitlesPerType[type]));
      section.insertBefore(titleEl, section.firstChild);
    }
    else if (section.className && (section.className !== 'main-content')) {
      console.warn('Found a titleless section with class attribute ' +
        '"' + section.className + '" for which no title could be found in ' +
        '"' + lang + '". Is it normal? If not, title needs to be added to ' +
        'the `translations.' + lang + '.json` file');
    }
  });
};


/**
 * Generates tables based on the information loaded
 */
const fillTables = function (tableTemplates, specData, implData, translations, lang) {
  const sections = $(document, 'section');
  const specTitlesTranslations = translations['specifications'] || {};
  const groupNamesTranslations = translations['groups'] || {};
  const featureTranslations = translations['features'] || {};
  const labelTranslations = translations['labels'] || {};
  let sectionsData = [];
  let referencedFeatureIds = [];

  sections.forEach(section => {
    let features = {};
    let extractFeatures = featureEl => {
      // Extract all feature IDs referenced under the given element
      let featureIds = [];
      if (featureEl.dataset['featureid']) {
        featureIds = [featureEl.dataset['featureid']];
      }
      else {
        let specEls = featureEl.querySelectorAll('[data-featureid]');
        for (let k = 0; k <specEls.length; k++) {
          if (featureIds.indexOf(specEls[k].dataset['featureid']) < 0) {
            featureIds.push(specEls[k].dataset['featureid']);
          }
        }
      }
      Array.prototype.push.apply(referencedFeatureIds, featureIds);

      // Update the array of features referenced in the underlying section if
      // the element under review has a data-feature attribute.
      let featureName = featureEl.dataset['feature'];
      if (featureName) {
        if (features[featureName]) {
          Array.prototype.push.apply(features[featureName], featureIds);
        }
        else {
          features[featureName] = featureIds;
        }
      }
    };

    if (section.classList.contains('featureset')) {
      // A table needs to be generated at the end of the section.
      $(section, '[data-feature]').forEach(extractFeatures);
      sectionsData.push({
        sectionEl: section,
        features: features
      });
    }

    // The section may also use data-featureid outside without encapsulating
    // them into data-feature. Or no table needs to be generated. In both cases,
    // we'll need to convert these featureids into links (but we don't want
    // them to appear in the generated table if there is one)
    extractFeatures(section);
  });

  // Remove duplicates from the list of referenced data files and load them
  referencedFeatureIds = referencedFeatureIds.filter(
    (fid, idx, self) => self.indexOf(fid) === idx);
  Promise.all(referencedFeatureIds
      .map(featureId => {
        return {
          id: featureId,
          url: '../data/' + featureId + '.json'
        }
      })
      .map(feature => {
        return loadUrl(feature.url, true)
          .then(response => JSON.parse(response))
          .then(data => {
            // Complete links to that feature ID with the right URL
            // and the spec title if the link is empty
            $(document, 'a[data-featureid="' + feature.id + '"]')
              .forEach(link => {
                link.setAttribute('href', data.editors || data.ls || data.TR);
                if (!link.textContent) {
                  if (data.feature) {
                    link.textContent =
                      featureTranslations[data.feature] ||
                      data.feature;
                  }
                  else if ((specData[feature.id] && specData[feature.id].title) || data.title) {
                    let specTitle = specData[feature.id].title || data.title;
                    if (specTitlesTranslations[specTitle]) {
                      specTitle = specTitlesTranslations[specTitle];
                    }
                    link.textContent = specTitle;
                  }
                }
              });

            return data;
          });
      }))
    .then(dataFiles => {
      let warnings = [];
      sectionsData.forEach(sectionData => {
        let dataTable = document.createElement('div');
        let tableType = sectionData.sectionEl.className.split(' ')[1];
        tableType = (tableType === 'in-progress') ? 'well-deployed' : tableType;
        if (!tableTemplates[tableType]) {
          warnings.push('Nothing known about table type "' + tableType + '". ' +
            'Skipping the section as a result');
          return;
        }
        dataTable.innerHTML = tableTemplates[tableType];
        let tbody = dataTable.querySelector('tbody');

        let features = sectionData.features;
        Object.keys(features).forEach(featureName => {
          let tr = document.createElement('tr');
          let th = document.createElement('th');
          th.appendChild(document.createTextNode(featureName));

          let featureIds = features[featureName];
          if (featureIds.length > 1) {
            th.setAttribute('rowspan', featureIds.length);
          }
          tr.appendChild(th);

          featureIds.forEach((featureId, k) => {
            if (k > 0) {
              tr = document.createElement('tr');
            }
            tbody.appendChild(tr);

            let data = dataFiles[referencedFeatureIds.indexOf(featureId)];

            // Render the title of the spec in the "Specifications" columns
            let specTd = document.createElement('td');
            let specUrl = data.TR || data.editors || data.ls;
            let specTitle = null;
            let localizedSpecTitle = null;
            if (data.TR) {
              if (specData[featureId]) {
                specTitle = specData[featureId].title;
              }
              else {
                warnings.push('No spec data found for TR feature "' + featureId + '"');
              }
            }
            if (!specTitle) {
              specTitle = data.title;
            }
            if (specTitle) {
              if (specTitlesTranslations[specTitle]) {
                localizedSpecTitle = specTitlesTranslations[specTitle];
              }
              else if (lang !== 'en') {
                warnings.push('No localized spec title for "' + specTitle + '" in "' + lang + '"');
              }
            }
            if (!specTitle) {
              warnings.push('No spec title found for "' + featureId + '"');
              specTitle = featureId + ' (Spec title not found!)';
            }

            let localizedLabel = localizedSpecTitle || specTitle;
            if (data.feature) {
              localizedLabel = (labelTranslations['%feature in %spec'] || '%feature in %spec')
                .replace('%feature', featureTranslations[data.feature] || data.feature)
                .replace('%spec', localizedSpecTitle || specTitle);
            }
            let label = null;
            if ((featureTranslations[data.feature] &&
                (featureTranslations[data.feature] !== data.feature)) ||
                (localizedSpecTitle && localizedSpecTitle !== specTitle)) {
              label = specTitle;
              if (data.feature) {
                label = '%feature in %spec'
                  .replace('%feature', data.feature)
                  .replace('%spec', specTitle);
              }
            }
            fillCell(specTd, {
              localizedLabel: localizedLabel,
              label: label,
              url: specUrl
            });

            if (!specData[featureId]) {
              specData[featureId] = {
                wgs: data.wgs,
                maturity: (data.editors ? "ED" : (data.ls ? "LS" : "Unknown"))
              };
            }

            // Render the name of the group that produced the spec
            let wgTd = document.createElement('td');
            specData[featureId].wgs = specData[featureId].wgs || [];
            for (let w = 0 ; w < specData[featureId].wgs.length; w++) {
              wg = specData[featureId].wgs[w];
              wg.label = wg.label || '';
              if (groupNamesTranslations[wg.label]) {
                wg.localizedLabel = groupNamesTranslations[wg.label];
              }
              else if (lang !== 'en') {
                warnings.push('No localized group name for "' + wg.label + '" in "' + lang + '"');
              }
              if (tableType === 'well-deployed') {
                wg.label = wg.label.replace(/ Working Group/,'');
              }
              wg.label = wg.label
                .replace(/Cascading Style Sheets \(CSS\)/, 'CSS')
                .replace(/Technical Architecture Group/, 'TAG')
                .replace(/Web Real-Time Communications/, 'WebRTC');
              if (w > 0) {
                if (w < specData[featureId].wgs.length - 1) {
                  wgTd.appendChild(document.createTextNode(','));
                }
                else {
                  wgTd.appendChild(document.createTextNode(' and'));
                }
                wgTd.appendChild(document.createElement('br'));
              }
              fillCell(wgTd, wg);
            }

            // Render maturity info
            let maturityTd = document.createElement('td');
            maturityInfo = maturityData(specData[featureId]);
            fillCell(maturityTd, maturityInfo.maturity, maturityInfo.maturityIcon);
            maturityTd.classList.add('maturity');

            // Render implementation status
            let implTd = document.createElement('td');
            implTd.appendChild(formatImplData(
              implData[featureId], tableType, translations));

            // Append required cells to table row
            tr.appendChild(specTd);
            if (tableType === 'well-deployed') {
              tr.appendChild(maturityTd);
            }
            if (tableType !== 'well-deployed') {
              tr.appendChild(wgTd);
            }
            tr.appendChild(implTd);
          });
        });

        sectionData.sectionEl.appendChild(dataTable);
      });
      return warnings;
    })
    .then(warnings => {
      // Remove duplicate warnings and report
      warnings = warnings.filter((warning, idx, self) => self.indexOf(warning) === idx);
      warnings.forEach(warning => console.warn(warning));
    });
};

const formatImplData = function (data, implType, translations) {
  const labelTranslations = translations['labels'] || {};
  const statusTranslations = translations['implstatus'] || {};
  let div = document.createElement('div');
  if (!data) {
    if (implType === 'well-deployed') {
      let p = document.createElement('p');
      p.appendChild(document.createTextNode(labelTranslations['N/A'] || 'N/A'));
      div.appendChild(p);
    }
    return div;
  }
  Object.keys(data).forEach(type => {
    let uadata = data[type];
    uadata = uadata.filter(ua => browsers.indexOf(ua) !== -1);
    if (uadata.length) {
        let heading = document.createElement('p');
        heading.appendChild(document.createTextNode(
          statusTranslations[type] || type));
        heading.appendChild(document.createElement('br'));
        uadata.forEach(ua => {
          let icon = document.createElement('img');
          icon.src = '../assets/impl/' + ua + '.png';
          icon.height = 30;
          icon.alt = type + ' in ' + ua;
          heading.appendChild(icon);
        });
        div.appendChild(heading);
    }
  });

  return div;
};


// Extract document language from the HTML tag if defined,
// or from the filename otherwise, assuming that the file is named
// "[name].[lg].html". Default language is English ("en").
//
// The code assumes that the English version is in files without ".[lg].".
// While that is good because one can view the English version without having
// to enter any language in the URL, note that this prevents content
// negotiation, so we may want to reconsider that later on.
let lang = document.documentElement.lang;
if (!lang) {
  let match = window.location.pathname.match(/\/.+\.(.*)\.html$/);
  if (match) {
    lang = match[1];
  }
}
lang = lang || 'en';


// Load the template page, apply the content of the page to the template,
// then load the additional information needed to generate the tables
loadTemplatePage(lang)
  .then(_ => loadTranslations(lang))
  .then(translations => Promise.all([
    loadTableTemplates(lang),
    loadSpecData(),
    loadImplementationData(),
    translations,
    lang,
    loadAndApplyToc(lang),
    setSectionTitles(translations, lang)
  ]))
  .then(results => fillTables.apply(null, results));