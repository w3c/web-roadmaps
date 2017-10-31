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
 * Lists of columns in generated tables per type of table
 *
 * This structure may be completed or overridden in `toc.json` files.
 */
const tableColumnsPerType = {
  'well-deployed': ['feature', 'spec', 'maturity', 'impl'],
  'in-progress': ['feature', 'spec', 'maturity', 'impl'],
  'exploratory-work': ['feature', 'spec', 'group', 'implintents'],
  'versions': ['feature', 'spec', 'maturity', 'versions']
};

/**
 * Helper function that expands column definitions into an object structure
 * (used to allow shortcuts in table columns definitions in tableColumnsPerType
 * and in custom table definitions that may appear in toc.json.
 */
const expandColumns = function (columns, tr) {
  return (columns || [])
    .map(column => {
      if (Object.prototype.toString.call(column) === '[object String]') {
        return {
          type: column,
          title: tr.columns[column]
        };
      }
      else if (!column.type) {
        console.warn('Skip column definition as `type` property is missing');
        return null;
      }
      else if (!column.title) {
        column.title = tr.columns[column.type];
        return column;
      }
      else {
        return column;
      }
    })
    .filter(column => !!column)
    .map(column => {
      if (!column.title) {
        console.warn('No column title found for column type "' + column.type + '" in "' + lang + '"');
        column.title = column.type;
      }
      return column;
    })
    .map(column => {
      if (!tableColumnCreators[column.type]) {
        console.warn('Skip unknown column type "' + column.type + '"');
        return null;
      }
      column.createCell = tableColumnCreators[column.type];
      return column;
    })
    .filter(column => !!column);
};

/**
 * Known browsers
 */
const browsers = ['firefox', 'chrome', 'edge', 'safari', 'webkit'];

/**
 * Code to call to create a cell of the given type
 *
 * Creators should be called with an object that has the following properties:
 * - column: The description of the column the cell will belong to
 * - featureId: The ID of the feature for which the cell is being generated
 * - featureName: The name of the wrapping feature
 * - specData: Raw data about the feature ID (from the data/ folder)
 * - specInfo: The available spec info for that feature ID
 * - implInfo: The available implementation status for that feature ID
 * - tr: Sanitized translations
 * - lang: The language of the underlying document
 * - pos: The zero-based index of the column in the table
 * - warnings: An array of warnings that the creator may complete
 */
const createFeatureCell = function (column, featureId, featureName, specData, specInfo, implInfo, tr, lang, pos, warnings) {
  let cell = document.createElement((pos === 0) ? 'th' : 'td');
  cell.appendChild(document.createTextNode(featureName));
  return cell;
};

const createSpecCell = function (column, featureId, featureName, specData, specInfo, implInfo, tr, lang, pos, warnings) {
  let specUrl = specData.TR || specData.editors || specData.ls;
  let specTitle = null;
  let localizedSpecTitle = null;
  if (specData.TR) {
    specTitle = specInfo.title;
  }
  if (!specTitle) {
    specTitle = specData.title;
  }
  if (specTitle) {
    if (tr.specifications[specTitle]) {
      localizedSpecTitle = tr.specifications[specTitle];
    }
    else if (lang !== 'en') {
      warnings.push('No spec title for "' + specTitle + '" in "' + lang + '"');
    }
  }
  if (!specTitle) {
    warnings.push('No spec title found for "' + featureId + '"');
    specTitle = featureId + ' (Spec title not found!)';
  }

  let localizedLabel = localizedSpecTitle || specTitle;
  if (specData.feature) {
    localizedLabel = (tr.labels['%feature in %spec'] || '%feature in %spec')
      .replace('%feature', tr.features[specData.feature] || specData.feature)
      .replace('%spec', localizedSpecTitle || specTitle);
  }
  let label = null;
  if ((tr.features[specData.feature] &&
      (tr.features[specData.feature] !== specData.feature)) ||
      (localizedSpecTitle && localizedSpecTitle !== specTitle)) {
    label = specTitle;
    if (specData.feature) {
      label = '%feature in %spec'
        .replace('%feature', specData.feature)
        .replace('%spec', specTitle);
    }
  }

  let cell = document.createElement('td');
  fillCell(cell, {
    localizedLabel: localizedLabel,
    label: label,
    url: specUrl
  });
  return cell;
};

const createGroupCell = function (column, featureId, featureName, specData, specInfo, implInfo, tr, lang, pos, warnings) {
  let cell = document.createElement('td');
  specInfo.wgs = specInfo.wgs || [];
  specInfo.wgs.forEach((wg, w) => {
    wg.label = wg.label || '';
    if (tr.groups[wg.label]) {
      wg.localizedLabel = tr.groups[wg.label];
    }
    else if (lang !== 'en') {
      warnings.push('No localized group name for "' + wg.label + '" in "' + lang + '"');
    }
    if (column.type === 'well-deployed') {
      wg.label = wg.label.replace(/ Working Group/,'');
    }
    wg.label = wg.label
      .replace(/Cascading Style Sheets \(CSS\)/, 'CSS')
      .replace(/Technical Architecture Group/, 'TAG')
      .replace(/Web Real-Time Communications/, 'WebRTC');
    if (w > 0) {
      if (w < specInfo.wgs.length - 1) {
        cell.appendChild(document.createTextNode(','));
      }
      else {
        cell.appendChild(document.createTextNode(' and'));
      }
      cell.appendChild(document.createElement('br'));
    }
    fillCell(cell, wg);
  });
  return cell;
};

const createMaturityCell = function (column, featureId, featureName, specData, specInfo, implInfo, tr, lang, pos, warnings) {
  // Render maturity info
  let cell = document.createElement('td');
  let maturityInfo = maturityData(specInfo);
  fillCell(cell, maturityInfo.maturity, maturityInfo.maturityIcon);
  cell.classList.add('maturity');
  return cell;
};

const createImplCell = function (column, featureId, featureName, specData, specInfo, implInfo, tr, lang, pos, warnings) {
  let cell = document.createElement('td');
  cell.appendChild(formatImplInfo(implInfo, tr));
  return cell;
};

const createVersionsCell = function (column, featureId, featureName, specData, specInfo, implInfo, tr, lang, pos, warnings) {
  let cell = document.createElement('td');
  (specData.versions || []).forEach((version, pos) => {
    if (version.url && version.label) {
      if (pos > 0) {
        cell.appendChild(document.createElement('br'));
      }
      fillCell(cell, version);
    }
  });
  return cell;
};

const tableColumnCreators = {
  'feature': createFeatureCell,
  'spec': createSpecCell,
  'group': createGroupCell,
  'maturity': createMaturityCell,
  'impl': createImplCell,
  'implintents': createImplCell,
  'versions': createVersionsCell
};


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
    .then(translations => {
      // Sanitize translations
      ['specifications', 'features', 'groups', 'labels', 'columns', 'implstatus']
        .forEach(type => translations[type] = translations[type] || {});
      return translations;
    });
};


/**
 * Creates the navigation menu from the Table of Contents
 */
const applyToc = function (toc, translations, lang) {
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
  let pages = [{
    title: ((translations.labels && translations.labels['Home']) ?
      translations.labels['Home'] : 'Home'),
    url: ((lang === 'en') ? './' : './index.' + lang + '.html'),
    icon: '../assets/img/home.svg'
  }];
  pages = pages.concat(toc.pages);
  pages.forEach(page => {
    let navLi = document.createElement('li');
    navLi.innerHTML = templateTocItem;
    navLi.querySelector('a').href = page.url;
    navLi.querySelector('.icon img').src = page.icon;
    navLi.querySelector('div.description').textContent = page.title;
    nav.appendChild(navLi);
  });

  return toc;
};


/**
 * Loads and parses the `toc.json` file.
 *
 * If a localized version of the TOC cannot be found, the function falls back
 * to the default TOC.
 *
 * NB: The `toc.json` obviously contains the table of contents. It also sets
 * a few other parameters such as links for feedback and custom table
 * structures as needed.
 */
const loadToc = function (lang) {
  return loadLocalizedUrl('toc.json', lang)
    .then(response => JSON.parse(response));
};


/**
 * Loads known metadata for each specification
 */
const loadSpecInfo = function () {
  return loadUrl('../specs/tr.json')
    .then(response => JSON.parse(response));
};


/**
 * Loads known implementation data for each specification
 */
const loadImplementationInfo = function () {
  return loadUrl('../specs/impl.json')
    .then(response => JSON.parse(response));
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
 * Generates tables per section based on the information loaded
 */
const fillTables = function (specInfo, implInfo, customTables, tr, lang) {
  // Build the list of columns that will need to be generated per type of table
  let columnsPerType = {};
  Object.keys(customTables || {}).forEach(type => {
    columnsPerType[type] = expandColumns(customTables[type], tr);
  });
  Object.keys(tableColumnsPerType).forEach(type => {
    if (!columnsPerType[type]) {
      columnsPerType[type] = expandColumns(tableColumnsPerType[type], tr);
    }
  })

  // Extract the list of feature IDs referenced in the document and
  // generate the list of sections for which a table needs to be generated
  let sectionsData = [];
  let referencedFeatureIds = [];
  $(document, 'section').forEach(section => {
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

  // Remove duplicates from the list of referenced data files, load them, and
  // apply that info to generate the tables at the end of sections
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
            if (!data) {
              return null;
            }
            $(document, 'a[data-featureid="' + feature.id + '"]')
              .forEach(link => {
                link.setAttribute('href', data.editors || data.ls || data.TR);
                if (!link.textContent) {
                  if (data.feature) {
                    link.textContent =
                      tr.features[data.feature] ||
                      data.feature;
                  }
                  else if ((specInfo[feature.id] && specInfo[feature.id].title) || data.title) {
                    let specTitle = specInfo[feature.id].title || data.title;
                    if (tr.specifications[specTitle]) {
                      specTitle = tr.specifications[specTitle];
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
        if (!columnsPerType[tableType]) {
          warnings.push('Nothing known about table type "' + tableType + '". ' +
            'Skipping the section as a result');
          return;
        }
        dataTable.appendChild(document.createElement('table'));

        // Fill the table headers
        let columns = columnsPerType[tableType];
        let row = document.createElement('tr');
        columns.forEach(column => {
          let cell = document.createElement('th');
          cell.appendChild(document.createTextNode(column.title));
          row.appendChild(cell);
        });

        let thead = document.createElement('thead');
        thead.appendChild(row);
        dataTable.firstChild.appendChild(thead);

        let tbody = document.createElement('tbody');
        dataTable.firstChild.appendChild(tbody);

        // Parse the list of feature names referenced in the section,
        // and the list of feature IDs referenced per feature name,
        // and generate a row per feature ID.
        let features = sectionData.features;
        Object.keys(features).forEach(featureName => {
          let featureIds = features[featureName];
          featureIds.forEach((featureId, featureIndex) => {
            let specData = dataFiles[referencedFeatureIds.indexOf(featureId)];
            if (!specInfo[featureId]) {
              warnings.push('No spec data found for TR feature "' + featureId + '"');
              specInfo[featureId] = {
                wgs: specData.wgs,
                maturity: (specData.editors ? "ED" : (specData.ls ? "LS" : "Unknown"))
              };
            }

            let row = document.createElement('tr');
            tbody.appendChild(row);
            columns.forEach((column, pos) => {
              // Feature name cell will span multiple rows if there are more
              // than one feature ID associated with the feature name
              if ((column.type === 'feature') && (featureIndex > 0)) {
                return;
              }

              // Create the appropriate cell
              let cell = column.createCell(
                column, featureId, featureName,
                specData, specInfo[featureId], implInfo[featureId],
                tr, lang, pos, warnings);

              // Make feature name span multiple rows as needed
              if ((column.type === 'feature') && (featureIds.length > 1)) {
                cell.setAttribute('rowspan', featureIds.length);
              }
              row.appendChild(cell);
            });
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

const formatImplInfo = function (data, translations) {
  const labelTranslations = translations['labels'] || {};
  const statusTranslations = translations['implstatus'] || {};
  let div = document.createElement('div');
  if (!data) {
    let p = document.createElement('p');
    p.appendChild(document.createTextNode(labelTranslations['N/A'] || 'N/A'));
    div.appendChild(p);
    return div;
  }
  Object.keys(data)
    .filter(type => (type !== 'implementations') && (type !== 'polyfills'))
    .forEach(type => {
      let uadata = data[type];
      uadata = uadata.filter(ua => browsers.indexOf(ua) !== -1);
      if (uadata.length) {
          let paragraph = document.createElement('p');
          paragraph.appendChild(document.createTextNode(
            statusTranslations[type] || type));
          paragraph.appendChild(document.createElement('br'));
          uadata.forEach(ua => {
            let icon = document.createElement('img');
            icon.src = '../assets/impl/' + ua + '.png';
            icon.height = 30;
            icon.alt = type + ' in ' + ua;
            paragraph.appendChild(icon);
          });
          div.appendChild(paragraph);
      }
    });

  if (data.polyfills) {
    let el = document.createElement('p');
    el.appendChild(document.createTextNode(
      labelTranslations['Polyfills'] || 'Polyfills'));
    div.appendChild(el);
    el = document.createElement('ul');
    data.polyfills.forEach((polyfill, pos) => {
      let li = document.createElement('li');
      let link = document.createElement('a');
      link.setAttribute('href', polyfill.url);
      if (polyfill.img && polyfill.img.src) {
        let icon = document.createElement('img');
        icon.src = polyfill.img.url;
        icon.height = 30;
        icon.alt = polyfill.img.label || '';
        link.appendChild(icon);
      }
      link.appendChild(document.createTextNode(polyfill.label));
      li.appendChild(link);
      el.appendChild(li);
    });
    div.appendChild(el);
  }

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
Promise.all([
    loadTemplatePage(lang),
    loadTranslations(lang),
    loadToc(lang)
]).then(results => {
  let translations = results[1];
  let toc = results[2];
  return Promise.all([
    applyToc(toc, translations, lang),
    setSectionTitles(translations, lang),
    loadSpecInfo(),
    loadImplementationInfo(),
    translations
  ]);
}).then(results => {
  let customTables = results[0]['tables'];
  return fillTables(results[2], results[3], customTables, results[4], lang);
});