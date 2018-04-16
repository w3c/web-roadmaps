/**
 * A bunch of JS functions used to generate the page.
 *
 * NB: The "utils.js" defines functions used in this script and must be loaded
 * too for this script to run properly.
 */

/**
 * List of implementation sources
 */
const sources = {
  'caniuse': 'Can I use',
  'chromestatus': 'Chrome Platform Status',
  'edgestatus': 'Microsoft Edge Platform Status',
  'webkitstatus': 'WebKit Feature Status',
  'feedback': 'User feedback',
  'other': 'Other'
}

/**
 * Wraps querySelectorAll to return an Array across browsers
 */
const $ = (el, selector) =>
  Array.prototype.slice.call(el.querySelectorAll(selector), 0);

/**
 * Returns true if the given object is an array
 */
const isArray = Array.prototype.isArray || function(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

/**
 * Returns true if the given object is a real object
 */
const isObject = function(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
};


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
 * List of scripts to include in all pages once the page has been generated
 */
const scripts = ['../js/sidenav.js', '../js/filter-implstatus.js'];

/**
 * Template to use for an item in the main navigation menu
 */
const templateItem = '<a href="" data-nav><div class="icon"><img src="" alt=""></div><div class="description"><h2></h2><p></p></div></a>';

/**
 * Template to use for an item in the side navigation menu
 */
const templateTocItem = '<a href="" data-nav><div class="icon"><img src="" alt=""></div><div class="description"></div></a>';

/**
 * Ordered list of known implementation stages
 */
const implementationStatuses = [
  'shipped',
  'experimental',
  'indevelopment',
  'consideration'
];


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
  'exploratory-work': ['feature', 'spec', 'impl-intents'],
  'versions': ['feature', 'spec', 'maturity', 'versions']
};

/**
 * Helper function that expands column definitions into an object structure
 * (used to allow shortcuts in table columns definitions in tableColumnsPerType
 * and in custom table definitions that may appear in toc.json.
 */
const expandColumns = function (columns, translate) {
  return (columns || [])
    .map(column => {
      if (Object.prototype.toString.call(column) === '[object String]') {
        return {
          type: column,
          title: translate('columns', column)
        };
      }
      else if (!column.type) {
        console.warn('Skip column definition as `type` property is missing');
        return null;
      }
      else if (!column.title) {
        column.title = translate('columns', column.type);
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
 *
 * The "main" browsers are the individual browser engines. A more "proper"
 * categorization would have used Blink, EdgeHTML, Gecko, and Webkit, but
 * random people don't think in terms of underlying engines and implementation
 * info is usually provided for browsers themselves.
 *
 * As an exception to the rule, the Webkit platform status site reports
 * implementation info about Webkit and, once in a while, features shipped in
 * the latest version of Webkit are not in the latest version of Safari. As a
 * consequence, Safari and Webkit are treated both as different browsers and as
 * the same one: implementation info about Safari will be displayed if
 * available, otherwise we'll display implementation info about Webkit.
 */
const browsers = {
  main: ['chrome', 'edge', 'firefox', 'safari|webkit'],
  secondary: ['baidu', 'opera', 'qq', 'samsunginternet', 'uc']
};

/**
 * Code to call to create a cell of the given type
 *
 * Creators should be called with an object that has the following properties:
 * - column: The description of the column the cell will belong to
 * - featureId: The ID of the feature for which the cell is being generated
 * - featureName: The name of the wrapping feature
 * - specInfo: The available spec info for that feature ID
 * - implInfo: The available implementation status for that feature ID
 * - translate: A translation function that takes a category and a label and returns
 * the corresponding localized label
 * - lang: The language of the underlying document
 * - pos: The zero-based index of the column in the table
 */
const createFeatureCell = function (column, featureId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement((pos === 0) ? 'th' : 'td');
  cell.appendChild(document.createTextNode(featureName));
  cell.classList.add('feature');
  return cell;
};

const createSpecCell = function (column, featureId, featureName, specInfo, implInfo, translate, lang, pos) {
  let specUrl = specInfo.url;
  let specTitle = specInfo.title;
  let localizedSpecTitle = translate('specifications', specTitle);

  let localizedLabel = localizedSpecTitle;
  let localizedFeature = (specInfo.feature ?
    translate('features', specInfo.feature) : null);
  if (localizedFeature) {
    localizedLabel = translate('labels', '%feature in %spec')
      .replace('%feature', localizedFeature)
      .replace('%spec', localizedSpecTitle || specTitle);
  }
  let label = null;
  if (localizedFeature && (localizedFeature !== specInfo.feature) ||
      (localizedSpecTitle !== specTitle)) {
    label = specTitle;
    if (specInfo.feature) {
      label = '%feature in %spec'
        .replace('%feature', specInfo.feature)
        .replace('%spec', specTitle);
    }
  }

  let cell = document.createElement('td');
  fillCell(cell, {
    localizedLabel: localizedLabel,
    label: label,
    url: specUrl
  });

  specInfo.deliveredBy = specInfo.deliveredBy || [];
  specInfo.deliveredBy.forEach((wg, w) => {
    wg.label = wg.label || '';
    wg.label = wg.label
      .replace(/Cascading Style Sheets \(CSS\)/, 'CSS')
      .replace(/Technical Architecture Group/, 'TAG')
      .replace(/Web Real-Time Communications/, 'WebRTC');
    wg.localizedLabel = translate('groups', wg.label);
    cell.appendChild(document.createElement('br'));
    let span = document.createElement('span');
    span.classList.add('group');
    fillCell(span, wg);
    cell.appendChild(span);
  });

  return cell;
};

const createMaturityCell = function (column, featureId, featureName, specInfo, implInfo, translate, lang, pos) {
  // Render maturity info
  let cell = document.createElement('td');
  let maturityInfo = maturityData(specInfo);
  fillCell(cell, maturityInfo.maturity, maturityInfo.maturityIcon);
  cell.classList.add('maturity');
  return cell;
};

const createImplCell = function (column, featureId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement('td');
  cell.appendChild(formatImplInfo(implInfo, translate));
  cell.classList.add('impl');
  return cell;
};

const createVersionsCell = function (column, featureId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement('td');
  (specInfo.versions || []).forEach((version, pos) => {
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
  'maturity': createMaturityCell,
  'impl': createImplCell,
  'impl-intents': createImplCell,
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
      label: spec.status,
      level: maturityLevels[spec.status] || 'low'
    },
    maturityIcon: !spec.status ? null : {
      src: 'https://www.w3.org/2013/09/wpd-rectrack-icons/' +
        spec.status.toLowerCase().replace(/lastcall/,'lcwd') +
        '.svg',
      alt: spec.status,
      width: 50,
      height: (spec.status === 'REC' || spec.status === 'LastCall') ? 53 : 50
    }
  };
};


/**
 * Loads the template page and applies the content to the loaded template.
 *
 * The code loads the localized version if it exists, the default template page
 * otherwise.
 */
const loadTemplatePage = function (lang, pagetype) {
  return loadLocalizedUrl('../js/template-page.html', lang)
    .then(responseText => {
      // Preserve initial content that needs to appear in final document
      // (head elements, main header and sections)
      const headElements = $(document, 'head > *').filter(el =>
        (el.nodeName !== 'TITLE') &&
        !((el.nodeName === 'META') && el.getAttribute('charset')));
      const hero = $(document, 'header > *');
      const sections = $(document, 'section');

      // Replace doc by template doc
      document.documentElement.innerHTML = responseText;

      // Drop template content that is specific to a certain type of page
      // if the current page is not of that type
      Object.keys(pagetype)
        .filter(type => !pagetype[type])
        .forEach(type =>
          $(document, '[data-pagetype="' + type + '"]').forEach(el =>
            el.parentNode.removeChild(el)));

      // Complete the new doc with the content saved above
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
 * Applies the information contained in the toc.json file to:
 * - set the title of the document
 * - set the links to the discourse instance and GitHub repo for feedback
 * - generate the main navigation menu (on the menu page only)
 * - generate the side navigation menu (with a link to the menu page when
 * current page is not the menu page)
 */
const applyToc = function (toc, translate, lang, pagetype) {
  const title = document.querySelector('.hero .container h1').textContent;
  document.querySelector('title').textContent =
    (pagetype.menu ? '' : title + ' - ') + toc.title;
  $(document, 'section.contribute .discourse').forEach(link => {
    link.href = toc.discourse.url;
    if (link.classList.contains('discoursecat')) {
      link.textContent = toc.discourse.category;
    }
  });

  if (toc.pages.length === 0) {
    document.getElementById('side-nav-btn').hidden = true;
  }

  let mainNav = document.querySelector('ul.roadmap-list');
  let sideNav = document.querySelector('aside nav ul');
  let pages = pagetype.menu ? [] : [{
    title: translate('labels', 'Home'),
    url: ((lang === 'en') ? './' : './index.html'),
    icon: '../assets/img/home.svg'
  }];
  pages = pages.concat(toc.pages);
  pages.forEach(page => {
    const localizedUrl = ((lang === 'en') ? page.url :
      page.url.replace(/\.([^\.]+)$/, '.' + lang + '.$1'));

    if (mainNav) {
      let mainNavItem = document.createElement('li');
      mainNavItem.innerHTML = templateItem;
      mainNavItem.querySelector('a').href = localizedUrl;
      mainNavItem.querySelector('h2').textContent = page.title;
      mainNavItem.querySelector('.icon img').src = page.icon;
      mainNavItem.querySelector('p').textContent = page.description;
      mainNav.appendChild(mainNavItem);
    }

    if (sideNav) {
      let sideNavItem = document.createElement('li');
      sideNavItem.innerHTML = templateTocItem;
      sideNavItem.querySelector('a').href = localizedUrl;
      sideNavItem.querySelector('.icon img').src = page.icon;
      sideNavItem.querySelector('div.description').textContent = page.title;
      sideNav.appendChild(sideNavItem);
    }
  });

  let listOfTranslations = toc.translations || [];
  if (listOfTranslations.length <= 1) {
    $(document, '.translations-wrapper').forEach(el => el.parentNode.removeChild(el));
  }
  else {
    let trtext = listOfTranslations.map(tr => {
      if (tr.lang === lang) {
        return '<span>' + tr.title + '</span>';
      }
      else {
        // Compute the URL of the same page as the current one in the target
        // language, taking into account that we handle English as an exception
        // to the rule (files in English do not have "en" in their name), and
        // that the index page in English may end with "/" instead of with
        // "/index.html"
        let url = null;
        if (lang === 'en') {
          // Current doc is in English, add the right lang to the current URL
          if (!window.location.pathname.match(/\.([^\.]+)$/)) {
            url = window.location.pathname + 'index.' + tr.lang + '.html';
          }
          else {
            url = window.location.pathname.replace(/\.([^\.]+)$/, '.' + tr.lang + '.$1');
          }
        }
        else if (tr.lang === 'en') {
          // English version, remove the lang from the URL
          url = window.location.pathname.replace(/\.([^\.]+)\.([^\.]+)$/, '.$2');
        }
        else {
          // Replace language in the current URL with the target language
          url = window.location.pathname.replace(/\.([^\.]+)\.([^\.]+)$/, '.' + tr.lang + '.$2');
        }
        return '<a href="' + url + '" data-nav>' + tr.title + '</a>';
      }
    });
    $(document, '.translations').forEach(el => el.innerHTML = trtext.join (' | '));
  }

  return toc;
};


/**
 * Loads and parses the `toc.json` file.
 *
 * The function will both download the `toc.json` file (in other words the
 * default TOC file of the English version), and the localized version of the
 * file if it exists. It will then merge the two files into one.
 *
 * Note that if the localized version contains a "reset: true" flag, the
 * whole content of the default TOC file is dropped.
 *
 * NB: The `toc.json` obviously contains the table of contents. It also sets
 * a few other parameters such as links for feedback and custom table
 * structures as needed.
 */
const loadToc = function (lang) {
  let toc = null;
  return loadUrl('toc.json')
    .then(response => JSON.parse(response))
    .then(defaultToc => toc = defaultToc)
    .catch(err => {
      console.error ('Could not find "toc.json" file');
      throw err;
    })
    .then(_ => {
      if (lang === 'en') {
        return toc;
      }
      return loadUrl('toc.' + lang + '.json')
        .then(response => JSON.parse(response))
        .then(localizedToc => {
          if (localizedToc.reset) {
            toc = localizedToc;
          }
          else {
            // Overwrite default TOC with localized info when it exists.
            // For object parameters, we'll keep the keys that are not defined
            // in the localized version. We'll do the same thing for array
            // parameters whose items are objects
            Object.keys(localizedToc).forEach(key => {
              if (!toc[key]) {
                toc[key] = localizedToc[key];
              }
              else if (isArray(toc[key]) && isArray(localizedToc[key])) {
                localizedToc[key].forEach((item, pos) => {
                  if (toc[key][pos] && isObject(toc[key][pos]) && isObject(item)) {
                    Object.keys(item).forEach(subkey =>
                      toc[key][pos][subkey] = item[subkey]);
                  }
                  else {
                    toc[key][pos] = item;
                  }
                });
              }
              else if (isObject(toc[key]) && isObject(localizedToc[key])) {
                Object.keys(localizedToc[key]).forEach(subkey =>
                  toc[key][subkey] = localizedToc[key][subkey]);
              }
              else {
                toc[key] = localizedToc[key];
              }
            });
          }
          return toc;
        })
        .catch(err => {
          console.warn('No localized version of toc.json in "' + lang + '"');
          return toc;
        });
    });
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
const setSectionTitles = function (translate, lang) {
  const sections = $(document, 'section');
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
    let type = section.className.split(' ').find(
      type => translate('sections', type, true) !== type);
    if (type) {
      titleEl = document.createElement('h2');
      titleEl.appendChild(document.createTextNode(translate('sections', type)));
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
const fillTables = function (specInfo, implInfo, customTables, translate, lang) {
  // Build the list of columns that will need to be generated per type of table
  let columnsPerType = {};
  Object.keys(customTables || {}).forEach(type => {
    columnsPerType[type] = expandColumns(customTables[type], translate);
  });
  Object.keys(tableColumnsPerType).forEach(type => {
    if (!columnsPerType[type]) {
      columnsPerType[type] = expandColumns(tableColumnsPerType[type], translate);
    }
  });

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

  // Remove duplicates from the list of referenced data files, look them up in
  // tr.json, and update links in the document accordingly
  referencedFeatureIds = referencedFeatureIds.filter(
    (fid, idx, self) => self.indexOf(fid) === idx);
  let referencedFeatures = referencedFeatureIds.map(id => {
    let info = specInfo[id];
    if (!info) {
      warnings.push('Unknown feature "' + id + '"');
      info = { url: '', title: '' };
    }
    if (!info.url) {
      warnings.push('No URL found for feature "' + id + '"');
      info.url = '';
    }
    if (!info.title) {
      warnings.push('No title found for feature "' + id + '"');
      info.title = id + ' (Spec title not found!)';
    }
    return { id, info };
  }).map(spec => {
    // Complete links with the right URL and set title if the link is empty
    let info = spec.info;
    $(document, 'a[data-featureid="' + spec.id + '"]').forEach(link => {
      link.setAttribute('href', info.url);
      if (!link.textContent) {
        link.textContent = (spec.feature ?
          translate('features', spec.feature) :
          translate('specifications', info.title));
      }
    });
    return spec;
  });

  // Apply spec info to generate the tables at the end of each section
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
      cell.setAttribute('data-col', column.type);
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
        let info = referencedFeatures.find(feature => feature.id === featureId).info;
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
            info, implInfo[featureId],
            translate, lang, pos);

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
};

const formatImplInfo = function (data, translate) {
  let div = document.createElement('div');
  if (!data) {
    let p = document.createElement('p');
    p.appendChild(document.createTextNode(translate('labels', 'N/A')));
    div.appendChild(p);
    return div;
  }

  let allBrowsers = browsers.main.concat(browsers.secondary)
    .map(ua => ua.split('|'))
    .reduce((arr, val) => arr.concat(val), []);

  // Arrange the implementation info per implementation status
  let info = {};
  implementationStatuses.forEach(status => {
    let implementations = data.implementations.filter(impl =>
      impl.selected && (impl.status === status) &&
      allBrowsers.find(ua => (impl.ua === ua) || impl.ua.startsWith(ua + '_'))
    ).filter((impl, index, arr) => {
      // Group mobile info with desktop info when it exists and add flags
      let tokens = impl.ua.split('_');
      if (tokens[1]) {
        let desktop = arr.find(i => i.ua === tokens[0]);
        if (desktop) {
          desktop.mobile = true;
          return false;
        }
        else {
          impl.mobile = true;
          impl.ua = tokens[0];
          return true;
        }
      }
      else {
        impl.desktop = true;
        return true;
      }
    });

    if (implementations.length > 0) {
      info[status] = implementations.sort((i1, i2) => {
        let pos1 = allBrowsers.indexOf(i1.ua);
        let pos2 = allBrowsers.indexOf(i2.ua);
        if (pos1 < pos2) {
          return -1;
        }
        if (pos1 > pos2) {
          return 1;
        }
        return 0;
      });
    }
  });

  Object.keys(info).forEach(status => {
    let statusLabel = translate('implstatus', status);
    let p = document.createElement('p');
    p.setAttribute('data-implstatus', status);
    p.appendChild(document.createTextNode(statusLabel + ':'));
    p.appendChild(document.createElement('br'));
    info[status].forEach(impl => {
      let versions = [];
      if (impl.desktop) {
        versions.push('desktop');
      }
      if (impl.mobile) {
        versions.push('mobile');
      }
      let title = translate('labels', '%status in %ua (%versions).')
        .replace('%status', statusLabel)
        .replace('%ua', translate('browsers', impl.ua))
        .replace('%versions', versions.map(
          version => translate('labels', version)).join(', '));
      if (impl.prefix && impl.flag) {
        title += ' ' + translate('labels', 'Feature requires using a prefix and is behind a flag.');
      }
      else if (impl.prefix) {
        title += ' ' + translate('labels', 'Feature requires using a prefix.');
      }
      else if (impl.flag) {
        title += ' ' + translate('labels', 'Feature is behind a flag.');
      }
      title += ' ' + translate('labels', 'Source: %source.')
        .replace('%source', sources[impl.source] || impl.source);
      let link = document.createElement('a');
      link.setAttribute('class', 'ua');
      link.setAttribute('data-ua', impl.ua);
      if (impl.href) {
        link.setAttribute('href', impl.href);
      }
      let abbr = document.createElement('abbr');
      abbr.setAttribute('title', title);
      let span = document.createElement('span');
      span.appendChild(document.createTextNode(title));
      abbr.appendChild(span);
      let i = document.createElement('i');
      i.setAttribute('class', impl.ua);
      abbr.appendChild(i);
      if (versions.length > 0) {
        let i = document.createElement('i');
        i.setAttribute('class', versions.join(' '));
        abbr.appendChild(i);
      }
      if (impl.prefix) {
        let i = document.createElement('i');
        i.setAttribute('class', 'prefix');
        abbr.appendChild(i);
      }
      if (impl.flag) {
        let i = document.createElement('i');
        i.setAttribute('class', 'flag');
        abbr.appendChild(i);
      }
      link.appendChild(abbr);
      p.appendChild(link);
    });
    div.appendChild(p);
  });

  if (data.polyfills) {
    let el = document.createElement('p');
    el.appendChild(document.createTextNode(translate('labels', 'Polyfills')));
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


/**
 * Add filtering menus to implementation columns as a dropdown with check boxes
 *
 * @function
 * @param {function} translate Translation function
 */
const addFilteringMenus = function (translate) {
  $(document, 'th[data-col|=impl]').forEach(th => {
    let menu = document.createElement('details');
    let summary = document.createElement('summary');
    summary.appendChild(document.createTextNode(
      translate('labels', 'Select browsers...')));
    menu.appendChild(summary);

    let container = document.createElement('div');
    ['main', 'secondary'].forEach(type => {
      let list = document.createElement('ul');
      browsers[type].forEach(ua => {
        let li = document.createElement('li');
        let label = document.createElement('label');
        let input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.setAttribute('value', ua);
        label.appendChild(input);
        label.appendChild(document.createTextNode(
          translate('browsers', ua)));
        li.appendChild(label);
        list.appendChild(li);
      });
      container.appendChild(list);
    });
    menu.appendChild(container);
    th.appendChild(menu);
  });
};
