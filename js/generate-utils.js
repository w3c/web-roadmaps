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
  'mdn': 'MDN Browser Compatibility Data',
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
 * Template to use for the title in a page
 * (replaces the h1 that authors set in the source page)
 */
const templatePageTitle = '<h2><a href="" data-breadcrumb></a> ></h2><div class="title"><img src="" alt="" data-icon><div><h1 data-title></h1><h2 data-publishdate></h2></div></div>';

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
 *
 * TODO: Add "milestones" to "in-progress" table, once we have enough data. As
 * of June 2018, the info from spec dashboard is too scarce:
 * https://github.com/w3c/spec-dashboard/tree/gh-pages/pergroup
 */
const tableColumnsPerType = {
  'well-deployed': ['feature', 'spec', 'maturity', 'impl'],
  'in-progress': ['feature', 'spec', 'maturity', 'impl'],
  'exploratory-work': ['feature', 'spec', 'impl-intents'],
  'versions': ['feature', 'spec', 'maturity', 'seeAlso'],
  'groups': [
    'group',
    { type: 'spec', title: 'Specification', hideGroup: true },
    'mention'
  ]
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
 * Format a date into a month and year string, using the provided locale.
 *
 * Rules for Chinese are hardcoded when code runs in JSDOM, because JSDOM does
 * not yet seem to support producing dates in Chinese.
 */
const formatMonthAndYearDate = function (date, lang) {
  if (((lang === 'zh') || lang.startsWith('zh-')) &&
      window.navigator.userAgent.split(/[\s\/]/).includes('jsdom')) {
    let month = date.getMonth() + 1;
    return '' + date.getFullYear() + '年' + month + '月';
  }
  else {
    return date.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  }
};


/**
 * Retrieve the right URL to use to target the requested feature ID in
 * the given spec, possibly linking to the Editor's Draft when possible
 *
 * The function completes the URL with the fragment, when defined.
 */
const getSpecFeatureUrl = function (spec, featureId, linkto) {
  let fragment = null;
  if (featureId) {
    let feature = spec.features[featureId] || {};
    if (feature.url) {
      if (!feature.url.startsWith('#')) {
        // We only have the link to the ED at the spec level. If the URL of
        // individual features are absolute, there's no easy way to tell what
        // the ED equivalent of that URL would be
        return feature.url;
      }
      fragment = feature.url.substring(1);
    }
  }
  else {
    [,fragment] = spec.url.split('#');
  }
  let [baseUrl] = (((linkto === 'ED') && spec.edDraft) ? spec.edDraft : spec.url).split('#');

  if (fragment) {
    return baseUrl + '#' + fragment;
  }
  else {
    return baseUrl;
  }
};


/**
 * Code to call to create a cell of the given type
 *
 * Creators should be called with an object that has the following properties:
 * - column: The description of the column the cell will belong to
 * - refId: The ID of the spec/feature for which the cell is being generated
 * - featureName: The name of the wrapping feature
 * - specInfo: The available spec info for that feature ID
 * - implInfo: The available implementation status for that feature ID
 * - translate: A translation function that takes a category and a label and returns
 * the corresponding localized label
 * - lang: The language of the underlying document
 * - pos: The zero-based index of the column in the table
 */
const createFeatureCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement((pos === 0) ? 'th' : 'td');
  cell.setAttribute('data-col', column.type);
  cell.appendChild(document.createTextNode(featureName));
  cell.classList.add('feature');
  return cell;
};

const createSpecCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  let [specId, featureId] = refId.split('/');
  let specUrl = getSpecFeatureUrl(specInfo, featureId, column.linkto);
  let specTitle = specInfo.title;
  let localizedSpecTitle = translate('specifications', specTitle);
  let featureTitle = (featureId && specInfo.features && specInfo.features[featureId]) ?
    specInfo.features[featureId].title : specInfo.feature;

  let localizedLabel = localizedSpecTitle;
  let localizedFeature = (featureTitle ? translate('features', featureTitle) : null);
  if (localizedFeature) {
    localizedLabel = translate('labels', '%feature in %spec')
      .replace('%feature', localizedFeature)
      .replace('%spec', localizedSpecTitle || specTitle);
  }
  let label = null;
  if ((localizedFeature && (localizedFeature !== specInfo.feature)) ||
      (localizedSpecTitle !== specTitle)) {
    label = specTitle;
    if (featureTitle) {
      label = '%feature in %spec'
        .replace('%feature', featureTitle)
        .replace('%spec', specTitle);
    }
  }

  let cell = document.createElement('td');
  cell.setAttribute('data-col', column.type);
  fillCell(cell, {
    localizedLabel: localizedLabel,
    label: label,
    url: specUrl
  });

  if (!column.hideGroup) {
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
  }

  return cell;
};

const createMaturityCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  // Render maturity info
  let cell = document.createElement('td');
  cell.setAttribute('data-col', column.type);
  let maturityInfo = maturityData(specInfo, translate);
  fillCell(cell, maturityInfo.maturity, maturityInfo.maturityIcon);
  cell.classList.add('maturity');
  return cell;
};

const createImplCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement('td');
  cell.setAttribute('data-col', column.type);
  cell.appendChild(formatImplInfo(implInfo, translate));
  cell.classList.add('impl');
  return cell;
};

const createSeeAlsoCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement('td');
  cell.setAttribute('data-col', column.type);
  cell.classList.add('seeAlso');
  if (column.class) {
    cell.classList.add(column.class);
  }
  let renderLink = (link, pos) => {
    if (link.url && link.label) {
      if (pos > 0) {
        cell.appendChild(document.createElement('br'));
      }
      fillCell(cell, link);
    }
  };
  let links = specInfo.seeAlso || [];
  let kinds = null;
  if (!column.kinds || (column.kinds === 'all')) {
    kinds = ['seeAlso', 'edDraft', 'repository'];
  }
  else if (isArray(column.kinds)) {
    kinds = column.kinds;
  }
  else {
    kinds = [column.kinds];
  }
  let linkPos = 0;
  kinds.forEach(kind => {
    switch (kind) {
    case 'repository':
      if (specInfo.repository) {
        renderLink({
          label: translate('metadata', 'Repository'),
          url: specInfo.repository
        }, linkPos);
        linkPos += 1;
      }
      break;

    case 'edDraft':
      if (specInfo.edDraft) {
        renderLink({
          label: translate('metadata', 'Editor\'s Draft'),
          url: specInfo.edDraft
        }, linkPos);
        linkPos += 1;
      }
      break;

    default:
      links.forEach(link => {
        if ((kind === 'seeAlso') || (link.kind === kind)) {
          renderLink(link, linkPos);
          linkPos += 1;
        }
      });
      break;
    }
  });

  return cell;
};

const createMilestonesCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement('td');
  cell.setAttribute('data-col', column.type);
  cell.classList.add('milestones');
  if (specInfo.milestones) {
    let milestones = Object.keys(specInfo.milestones).map(maturity => {
      return {
        date: specInfo.milestones[maturity],
        maturity
      }
    }).sort((a, b) => {
      if (a.date < b.date) {
        return -1;
      }
      else if (a.date > b.date) {
        return 1;
      }
      return 0;
    });

    milestones.forEach((milestone, pos) => {
      if (pos > 0) {
        cell.appendChild(document.createElement('br'));
      }
      let label = translate('maturity', milestone.maturity);
      if (label !== milestone.maturity) {
        let el = document.createElement('abbr');
        el.setAttribute('title', label);
        el.appendChild(document.createTextNode(milestone.maturity));
        cell.appendChild(el);
      }
      else {
        cell.appendChild(document.createTextNode(milestone.maturity));
      }
      cell.appendChild(document.createTextNode(
        ': ' + formatMonthAndYearDate(new Date(milestone.date), lang)));
    });
  }
  return cell;
};


const createGroupCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement((pos === 0) ? 'th' : 'td');
  cell.setAttribute('data-col', column.type);

  specInfo.deliveredBy = specInfo.deliveredBy || [];
  specInfo.deliveredBy.forEach((wg, w) => {
    wg.label = wg.label || '';
    wg.label = wg.label
      .replace(/Cascading Style Sheets \(CSS\)/, 'CSS')
      .replace(/Technical Architecture Group/, 'TAG')
      .replace(/Web Real-Time Communications/, 'WebRTC');
    wg.localizedLabel = translate('groups', wg.label);
    fillCell(cell, wg);
  });
  return cell;
};

const createMentionCell = function (column, refId, featureName, specInfo, implInfo, translate, lang, pos) {
  let cell = document.createElement((pos === 0) ? 'th' : 'td');
  cell.setAttribute('data-col', column.type);
  const pages = implInfo || [];
  const seeLabel = translate('labels', 'in %page');
  if (featureName) {
    cell.innerHTML = featureName;
  }
  pages.forEach((page, pos) => {
    const localizedUrl = ((lang === 'en') ? page.url :
      page.url.replace(/\.([^\.]+)$/, '.' + lang + '.$1'));
    cell.innerHTML += ((pos > 0 || featureName) ? '<br/>' : '') +
      seeLabel.replace('%page',
        '<a href="' + localizedUrl + '">' + page.title + '</a>');
  });
  cell.classList.add('mention');
  return cell;
};

const tableColumnCreators = {
  'feature': createFeatureCell,
  'spec': createSpecCell,
  'maturity': createMaturityCell,
  'impl': createImplCell,
  'impl-intents': createImplCell,
  'seeAlso': createSeeAlsoCell,
  'milestones': createMilestonesCell,
  'group': createGroupCell,
  'mention': createMentionCell
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


const maturityData = function (spec, translate) {
  let iconSrc =
    'https://www.w3.org/2013/09/wpd-rectrack-icons/' +
    (spec.evergreen ? 'REF' : spec.status).toLowerCase() +
    (spec.informative ? '-informative' : '') +
    '.svg';
  let label =
    (spec.evergreen ? 'REF' : spec.status) +
    (spec.informative ? ' - informative' : '');
  let localizedLabel =
    translate('maturity', spec.evergreen ? 'REF' : spec.status) +
    (spec.informative ?
      translate('maturity', ' - ') + translate('maturity', 'informative') :
      '');
  return {
    maturity: {
      label: label,
      localizedLabel: localizedLabel,
      level: maturityLevels[spec.status] || 'low'
    },
    maturityIcon: !spec.status ? null : {
      src: iconSrc,
      alt: localizedLabel,
      width: 50,
      height: 50
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
      const sections = $(document, 'main > *');
      const aboutContents = !!document.querySelector('[data-contents=about]');
      const groupsContents = !!document.querySelector('[data-contents=groups]');

      // Replace doc by template doc
      document.documentElement.innerHTML = responseText;

      // Drop template content that is specific to a certain type of page
      // if the current page is not of that type
      Object.keys(pagetype)
        .filter(type => !pagetype[type])
        .forEach(type =>
          $(document, '[data-pagetype="' + type + '"]').forEach(el =>
            el.parentNode.removeChild(el)));

      const completeContents = function (html) {
        if (aboutContents || groupsContents) {
          document.querySelector('.main-content .container').innerHTML = html;
        }

        headElements.forEach(el => document.querySelector('head').appendChild(el));
        hero.forEach(el => document.querySelector('.hero .container').appendChild(el));

        let container = document.querySelector('.main-content .container');
        sections.forEach(section => {
          if (section.hasAttribute('data-insertBefore')) {
            let before = container.querySelector(section.getAttribute('data-insertBefore'));
            document.querySelector('.main-content .container').insertBefore(section, before);
          }
          else if (section.hasAttribute('data-replace')) {
            let toReplace = container.querySelector(section.getAttribute('data-replace'));
            if (toReplace) {
              toReplace.parentNode.replaceChild(section, toReplace);
            }
            else {
              console.warn('Replacement selector does not match anything: ' +
                section.getAttribute('data-replace'));
            }
          }
          else {
            document.querySelector('.main-content .container')
              .appendChild(section);
          }
        });
        document.documentElement.lang = lang;

        // Add JS scripts to the end of the body
        scripts.forEach(script => {
          let s = document.createElement("script");
          s.src = script;
          document.querySelector('body').appendChild(s);
        });
      };

      // Complete the new doc with the content saved above
      if (aboutContents) {
        return loadLocalizedUrl('../js/template-about.html', lang)
          .then(responseText => completeContents(responseText));
      }
      else if (groupsContents) {
        return loadLocalizedUrl('../js/template-groups.html', lang)
          .then(responseText => completeContents(responseText));
      }
      else {
        return completeContents();
      }
    });
};


/**
 * Create the Document Metadata section based on query string parameters and
 * info in the toc.json file.
 */
const fillDocumentMetadata = function (toc, translate, lang, pagetype) {
  // Retrieve information from the query string or from the toc.json file
  let params = {};
  let queryString = window.location.search;
  if (queryString && queryString.startsWith('?')) {
    queryString = queryString.slice(1).split('&');
    queryString = queryString.forEach(paramvalue => {
      let tokens = paramvalue.split('=');
      if (tokens[0]) {
        params[tokens[0]] = tokens[1];
      }
    });
  }
  params.publishedVersion = params.publishedVersion || toc.publishedVersion;
  params.thisVersion = params.thisVersion || toc.thisVersion;
  params.previousVersion = params.previousVersion || toc.previousVersion;
  params.edDraft = params.edDraft || toc.edDraft;
  params.github = params.github || toc.github;
  params.publishDate = params.publishDate || toc.publishDate;

  // Compute missing URLs when possible
  // NB: for the Editor's Draft URL, we'll assume that the GitHub repo was
  // cloned in a folder that has the name of the repo (that's needed to get
  // the remainder of the path when the repo contains more than one roadmap)
  if (!params.edDraft && params.github) {
    let parts = params.github.split('/');
    if (parts[3] && parts[4]) {
      params.edDraft = 'https://' +
        parts[3] + '.github.io/' + parts[4] +
        window.location.pathname
          .replace(new RegExp('^(?:.*)/' + parts[4] + '(/.*)$'), '$1')
          .replace('index.html', '');
    }
  }
  if (!params.thisVersion) {
    params.thisVersion = params.edDraft || window.location.href;
  }

  // Insert publication date and document metadata section to header
  let container = document.querySelector('.hero .container');
  let publishDate = container.querySelector('[data-publishdate]');
  if (params.publishDate) {
    publishDate.textContent = formatMonthAndYearDate(
      new Date(params.publishDate), lang);
  }
  else {
    publishDate.parentNode.removeChild(publishDate);
  }

  if (!pagetype.menu) {
    return;
  }

  // Prepare Document Metadata section
  // (a bit verbose, but pretty straightforward)
  let metadata = document.createElement('details');
  let summary = document.createElement('summary');
  summary.appendChild(document.createTextNode(
    translate('metadata', 'Document Metadata')));
  metadata.appendChild(summary);

  let links = document.createElement('dl');

  const addMetatadataLinkTitle = function (title) {
    let dt = document.createElement('dt');
    dt.appendChild(document.createTextNode(
      translate('metadata', title)));
    links.appendChild(dt);
  };

  const addMetatadataLink = function (url, title) {
    let dd = document.createElement('dd');
    let link = document.createElement('a');
    link.setAttribute('href', url);
    link.appendChild(document.createTextNode(
      title ? translate('metadata', title) : url));
    dd.appendChild(link);
    links.appendChild(dd);
  };

  if (params.publishedVersion) {
    addMetatadataLinkTitle('Latest published version');
    addMetatadataLink(params.publishedVersion);
  }
  if (params.thisVersion) {
    addMetatadataLinkTitle('This version');
    addMetatadataLink(params.thisVersion);
  }
  if (params.previousVersion) {
    addMetatadataLinkTitle('Previous version');
    addMetatadataLink(params.previousVersion);
  }
  if (params.edDraft) {
    addMetatadataLinkTitle('Editor\'s Draft');
    addMetatadataLink(params.edDraft);
  }
  if (params.github) {
    addMetatadataLinkTitle('Repository');
    addMetatadataLink(
      params.github,
      'We are on GitHub');
    addMetatadataLink(
      params.github + (params.github.endsWith('/') ? '' : '/') + 'issues',
      'File a bug');
    addMetatadataLink(
      params.github + (params.github.endsWith('/') ? '' : '/') + 'commits',
      'Commit history');
  }

  let linksContainer = document.createElement('div');
  linksContainer.appendChild(links);
  metadata.appendChild(linksContainer);

  let firstContent = $(document, '.hero .container > *').find(el =>
    (el.nodeName !== 'H1') && (el.nodeName !== 'H2') &&
    (el.nodeName !== 'H3') && !el.getAttribute('data-beforemetadata'));
  container.insertBefore(metadata, firstContent);
}


/**
 * Applies the information contained in the toc.json file to:
 * - set the title of the document
 * - set the links to the discourse instance and GitHub repo for feedback
 * - generate the main navigation menu (on the menu page only)
 * - generate the side navigation menu (with a link to the menu page when
 * current page is not the menu page)
 */
const applyToc = function (toc, translate, lang, pagetype) {
  // Add title of roadmap to the title in sub-pages
  const container = document.querySelector('.hero .container');
  const h1 = container.querySelector('h1');
  let title = (h1 ? h1.textContent : null);
  if (!title && pagetype.about) {
    title = toc.about.title || translate('labels', 'About this document');
  }
  else if (!title && pagetype.groups) {
    title = toc.groups.title || translate('labels', 'List of relevant groups');
  }
  document.querySelector('title').textContent =
    (pagetype.menu ? '' : title + ' - ') + toc.title;
  $(document, 'section.contribute .discourse').forEach(link => {
    link.href = toc.discourse.url;
    if (link.classList.contains('discoursecat')) {
      link.textContent = toc.discourse.category;
    }
  });

  if (pagetype.menu) {
    document.body.className += ' menu';
  }

  if (pagetype.groups) {
    document.body.setAttribute('data-groups', 'data-groups');
  }

  let currentPage = toc.pages.find(page =>
    window.location.pathname.endsWith(page.url) ||
    window.location.pathname.endsWith(page.url.replace(/\.([^\.]+)$/, '.' + lang + '.$1')));
  let iconUrl = (currentPage && currentPage.icon ? currentPage.icon : null);
  if (!currentPage && toc.about && toc.about.url &&
      (window.location.pathname.endsWith(toc.about.url) ||
      window.location.pathname.endsWith(toc.about.url.replace(/\.([^\.]+)$/, '.' + lang + '.$1')))) {
    iconUrl = toc.about.icon || '../assets/img/about.svg';
  }
  else if (!currentPage && toc.groups && toc.groups.url &&
      (window.location.pathname.endsWith(toc.groups.url) ||
      window.location.pathname.endsWith(toc.groups.url.replace(/\.([^\.]+)$/, '.' + lang + '.$1')))) {
    iconUrl = toc.groups.icon || '../assets/img/groups.svg';
  }
  let titleContainer = document.createElement('div');
  titleContainer.setAttribute('data-beforemetadata', 'true');
  titleContainer.innerHTML = templatePageTitle;

  let breadcrumb = titleContainer.querySelector('[data-breadcrumb]');
  if (pagetype.menu) {
    breadcrumb = breadcrumb.parentNode;
    breadcrumb.parentNode.removeChild(breadcrumb);
  }
  else {
    breadcrumb.setAttribute('href', ((lang === 'en') ? './' : './index.' + lang + '.html'));
    breadcrumb.textContent = toc.title;
  }

  let icon = titleContainer.querySelector('[data-icon]');
  if (iconUrl) {
    icon.src = iconUrl;
  }
  else {
    icon.parentNode.removeChild(icon);
  }

  titleContainer.querySelector('[data-title]').textContent = h1.textContent;
  container.replaceChild(titleContainer, h1);

  if (toc.pages.length === 0) {
    document.getElementById('side-nav-btn').hidden = true;
  }

  // Fill out document metadata section
  fillDocumentMetadata(toc, translate, lang, pagetype);

  // Fill out the main menu (in the index page) and the side menu
  let mainNav = document.querySelector('ul.roadmap-list');
  let sideNav = document.querySelector('aside nav ul');
  let pages = pagetype.menu ? [] : [{
    title: translate('labels', 'Home'),
    url: ((lang === 'en') ? './' : './index.html'),
    icon: '../assets/img/home.svg'
  }];
  pages = pages.concat(toc.pages);
  if (toc.groups) {
    pages.push({
      title: toc.groups.title || translate('labels', 'List of relevant groups'),
      url: toc.groups.url,
      icon: toc.groups.icon || '../assets/img/groups.svg'
    });
  }
  if (toc.about) {
    pages.push({
      title: toc.about.title || translate('labels', 'About this document'),
      url: toc.about.url,
      icon: toc.about.icon || '../assets/img/about.svg'
    });
  }
  pages.forEach(page => {
    const localizedUrl = ((lang === 'en') ? page.url :
      page.url.replace(/\.([^\.]+)$/, '.' + lang + '.$1'));

    if (mainNav && (!toc.about || (page.url !== toc.about.url)) &&
        (!toc.groups || (page.url !== toc.groups.url))) {
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

  // Update links to other roadmap pages as needed
  $(document, '[data-page]').map(el => {
    let ref = el.getAttribute('data-page');
    let page = toc.pages.find(p => p.url.startsWith(ref));
    if (!page) {
      console.warn('Referenced roadmap page does not exist: ' + ref);
      return;
    }

    const localizedUrl = ((lang === 'en') ? page.url :
      page.url.replace(/\.([^\.]+)$/, '.' + lang + '.$1'));
    el.setAttribute('href', localizedUrl);
    if (!el.textContent) {
      el.textContent = page.title;
    }
  });

  // Fill out the list of translations
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
        let filename = window.location.pathname.replace(/^.*\/([^\/]*)$/, '$1');
        if (lang === 'en') {
          // Current doc is in English, add the right lang to the current URL
          if (!filename) {
            url = 'index.' + tr.lang + '.html';
          }
          else {
            url = filename.replace(/\.([^\.]+)$/, '.' + tr.lang + '.$1')
          }
        }
        else if (tr.lang === 'en') {
          // English version, remove the lang from the URL
          url = filename.replace(/\.([^\.]+)\.([^\.]+)$/, '.$2');
        }
        else {
          // Replace language in the current URL with the target language
          url = filename.replace(/\.([^\.]+)\.([^\.]+)$/, '.' + tr.lang + '.$2');
        }
        return '<a href="' + url + '" data-nav>' + tr.title + '</a>';
      }
    });
    $(document, '.translations').forEach(el => el.innerHTML = trtext.join (' | '));
  }

  // Add document's last modified dates to footer
  // We'll consider that document.lastModified represents the date when the
  // content of the page was last updated, and that the current date represents
  // the last date when the implementation data was updated. This is not
  // perfect but these assumptions should remain reasonable.
  // As an exception to the rule, we'll use the publishDate if it is set.
  let queryString = window.location.search;
  let publishDate = null;
  if (queryString && queryString.startsWith('?')) {
    queryString = queryString.slice(1).split('&');
    queryString = queryString.forEach(paramvalue => {
      let tokens = paramvalue.split('=');
      if (tokens[0] === 'publishDate') {
        publishDate = tokens[1];
      }
    });
  }
  publishDate = publishDate || toc.publishDate;
  if (publishDate) {
    publishDate = new Date(publishDate);
  }

  let lastModified = new Date(document.lastModified);
  if (publishDate && (publishDate < lastModified)) {
    lastModified = publishDate;
  }
  document.querySelector('[data-content-lastmodified]').textContent =
    formatMonthAndYearDate(lastModified, lang);

  lastModified = publishDate || new Date();
  document.querySelector('[data-impl-lastmodified]').textContent =
    formatMonthAndYearDate(lastModified, lang);

  // Automatically create feature sections if so requested
  if (toc.createFeatureSections) {
    $(document, 'div[data-feature],p[data-feature],ul[data-feature]').forEach(el => {
      let section = document.createElement('section');
      section.setAttribute('data-feature', el.getAttribute('data-feature'));
      el.removeAttribute('data-feature');
      el.parentNode.insertBefore(section, el);
      section.appendChild(el);
    });
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
  return loadUrl('../.out/data/tr.json')
    .then(response => JSON.parse(response));
};


/**
 * Loads known implementation data for each specification
 */
const loadImplementationInfo = function () {
  return loadUrl('../.out/data/impl.json')
    .then(response => JSON.parse(response));
};


/**
 * Loop through sections and set titles to well-known sections without titles.
 *
 * Well-known sections are identified based on their "class" attribute, using
 * an harcoded list of section titles and possible translations of these titles.
 */
const setSectionTitles = function (translate, lang) {
  const getTitleElement = section => {
    let titleEl = section.querySelector('h1,h2,h3,h4,h5,h6');
    if (titleEl) {
      let parentSection = titleEl.parentNode;
      while (parentSection !== section) {
        if (parentSection.nodeName === 'SECTION') {
          break;
        }
        parentSection = parentSection.parentNode;
      }
      return (parentSection === section) ? titleEl : null;
    }
  };

  const sections = $(document, 'section');
  sections.forEach(section => {
    // Search for section's title, defined as the first title found that has
    // the current section as first section ancestor.
    let titleEl = getTitleElement(section);
    if (titleEl) {
      return;
    }

    // No title found, set the title if the section is a well-known one
    let type = section.className.split(' ').find(
      type => translate('sections', type, true) !== type);
    if (type) {
      titleEl = document.createElement('h2');
      titleEl.appendChild(document.createTextNode(translate('sections', type)));
      section.insertBefore(titleEl, section.firstChild);
    }
    else if (section.getAttribute('data-feature')) {
      titleEl = document.createElement('h3');
      titleEl.appendChild(document.createTextNode(translate('features', section.getAttribute('data-feature'))));
      section.insertBefore(titleEl, section.firstChild);
    }
    else if (section.className && (section.className !== 'main-content')) {
      console.warn('Found a titleless section with class attribute ' +
        '"' + section.className + '" for which no title could be found in ' +
        '"' + lang + '". Is it normal? If not, title needs to be added to ' +
        'the `translations.' + lang + '.json` file');
    }
  });

  // Add IDs to all headers, data-feature paragraphs and data-featureid elements
  $(document, 'h2:not([id]), h3:not([id]), h4:not([id]), h5:not([id]), h6:not([id]), *[data-featureid]:not([id])')
    .forEach(el => makeID(el));
  $(document, '*[data-feature]:not([id])').forEach(el => {
    let titleEl = getTitleElement(el);
    if (!titleEl || !titleEl.getAttribute('id')) {
      makeID(el);
    }
  });
};


/**
 * Generates tables per section based on the information loaded
 */
const fillTables = function (specInfo, implInfo, toc, translate, lang) {
  // Build the list of columns that will need to be generated per type of table
  let customTables = toc.tables;
  let columnsPerType = {};
  Object.keys(customTables || {}).forEach(type => {
    columnsPerType[type] = expandColumns(customTables[type], translate);
  });
  Object.keys(tableColumnsPerType).forEach(type => {
    if (!columnsPerType[type]) {
      columnsPerType[type] = expandColumns(tableColumnsPerType[type], translate);
    }
  });

  // If we're on the groups page, we should rather be building the list of
  // relevant groups
  if (!!document.body.getAttribute('data-groups')) {
    return fillGroupsTable(specInfo, implInfo, toc, translate, lang, columnsPerType.groups);
  }

  // Helper function to extract all specs referenced with a data-featureid.
  // Fills out referencedIds and complete the optional references table
  // (indexed by feature name) with ids of specs to list in the table.
  let referencedIds = [];
  let extractReferences = (featureEl, references) => {
    // Extract all feature IDs referenced under the given element
    let ids = [];
    if (featureEl.dataset['featureid']) {
      ids = [{
        id: featureEl.dataset['featureid'],
        linkonly: (featureEl.dataset['linkonly'] !== undefined) &&
          (featureEl.dataset['linkonly'] !== 'false')
      }];
    }
    else {
      let specEls = featureEl.querySelectorAll('[data-featureid]');
      for (let k = 0; k <specEls.length; k++) {
        ids.push({
          id: specEls[k].dataset['featureid'],
          linkonly: (specEls[k].dataset['linkonly'] !== undefined) &&
            (specEls[k].dataset['linkonly'] !== 'false')
        });
      }
    }

    // Update the list of IDs referenced by the section
    Array.prototype.push.apply(referencedIds, ids.map(item => item.id));

    // Update the array of features to reference in the section table if
    // the element under review has a data-feature attribute.
    // (note specifications flagged as "linkonly" won't appear)
    if (references) {
      let featureName = featureEl.dataset['feature'];
      if (featureName) {
        let refIds = ids.filter(item => !item.linkonly)
          .map(item => item.id)
          .filter((id, idx, self) => self.indexOf(id) === idx);
        if (references[featureName]) {
          Array.prototype.push.apply(references[featureName], refIds);
        }
        else {
          references[featureName] = refIds;
        }
      }
    }
  };

  // Extract the list of feature IDs referenced in the document and
  // generate the list of sections for which a table needs to be generated
  let sectionsData = [];
  $(document, 'section').forEach(section => {
    if (section.classList.contains('featureset')) {
      // A table needs to be generated at the end of the section.
      let references = {};
      $(section, '[data-feature]').forEach(el => extractReferences(el, references));
      sectionsData.push({
        sectionEl: section,
        references
      });
    }

    // The section may also use data-featureid outside without encapsulating
    // them into data-feature. Or no table needs to be generated. In both cases,
    // we'll need to convert these featureids into links (but we don't want
    // them to appear in the generated table if there is one)
    extractReferences(section);
  });

  // Remove duplicates from the list of referenced data files, look them up in
  // tr.json, and update links in the document accordingly
  referencedIds = referencedIds.filter(
    (refId, idx, self) => self.indexOf(refId) === idx);
  let referencedFeatures = referencedIds.map(id => {
    let [specId, featureId] = id.split('/');
    let info = specInfo[specId];
    if (!info) {
      warnings.push('Unknown spec "' + id + '"');
      info = { url: '', title: '', status: 'ED' };
    }
    if (featureId && (!info.features || !info.features[featureId])) {
      warnings.push('Unknown feature in spec "' + id + '"');
    }
    if (!info.url) {
      warnings.push('No URL found for spec "' + id + '"');
      info.url = '';
    }
    if (!info.title) {
      warnings.push('No title found for spec "' + id + '"');
      info.title = id + ' (Spec title not found!)';
    }
    return { id, specId, featureId, info };
  }).map(spec => {
    // Complete links with the right URL and set title if the link is empty
    let info = spec.info;
    $(document, 'a[data-featureid="' + spec.id + '"]').forEach(link => {
      let linkto = link.getAttribute('data-linkto') || toc.linkto;
      link.setAttribute('href', getSpecFeatureUrl(info, spec.featureId, linkto));
      if (!link.textContent) {
        if (spec.featureId && info.features && info.features[spec.featureId]) {
          link.textContent = translate('features', info.features[spec.featureId].title);
        }
        else {
          link.textContent = (info.feature ?
            translate('features', info.feature) :
            translate('specifications', info.title));
        }
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
    let references = sectionData.references;
    Object.keys(references).forEach(featureName => {
      let ids = references[featureName];
      ids.forEach((id, idx) => {
        let info = referencedFeatures.find(feature => feature.id === id).info;

        // Retrieve implementation info of the underlying feature or spec
        let [specId, featureId] = id.split('/');
        let impl = implInfo[specId];
        if (featureId) {
          impl = (impl.features ? impl.features[featureId] : {});
        }

        let row = document.createElement('tr');
        tbody.appendChild(row);
        columns.forEach((column, pos) => {
          // Feature name cell will span multiple rows if there are more
          // than one feature ID associated with the feature name
          if ((column.type === 'feature') && (idx > 0)) {
            return;
          }

          // Create the appropriate cell
          let cell = column.createCell(
            column, id, featureName,
            info, impl,
            translate, lang, pos);

          // Make feature name span multiple rows as needed
          if ((column.type === 'feature') && (ids.length > 1)) {
            cell.setAttribute('rowspan', ids.length);
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
      if (impl.partial) {
        title += ' ' + translate('labels', 'Support may be partial.');
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
      if (impl.partial) {
        let i = document.createElement('i');
        i.setAttribute('class', 'partial');
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
      translate('labels', 'Select browsers…')));
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


/**
 * Generates the list of groups mentioned across pages
 * (may take a while as the document starts by loading each page in turn!)
 */
const fillGroupsTable = function (specInfo, implInfo, toc, translate, lang, columns) {
  return Promise.all(toc.pages.map(page => new Promise((resolve, reject) => {
    // Load page in the background and extract all referenced feature ids
    const iframe = document.createElement('iframe');
    iframe.hidden = true;
    iframe.src = page.url;
    iframe.addEventListener('load', () => {
      iframe.contentWindow.document.addEventListener('generate', _ => {
        const featureids = $(iframe.contentWindow.document, '[data-featureid]')
          .map(el => {
            const featureEl = el.closest('[data-feature]');
            return {
              id: el.dataset['featureid'],
              feature: featureEl ? featureEl.dataset['feature'] : null,
              linkonly: (el.dataset['linkonly'] !== undefined) &&
                (el.dataset['linkonly'] !== 'false'),
              page: page
            };
          })
          .filter((feature, idx, self) =>
            self.findIndex(f => (f.id === feature.id) &&
              (f.feature === feature.feature)) === idx)
          .filter(feature => !feature.linkonly);
        resolve(featureids);
      });
    });
    document.body.appendChild(iframe);
  }))).then(res => {
    // Drop hidden iframes and flatten the list of feature ids
    $(document, 'iframe').forEach(el => el.parentNode.removeChild(el));
    return res.reduce((acc, featureids) => acc.concat(featureids), []);
  }).then(res => res.map(feature => {
    // Retrieve information about each feature
    const [specId, featureId] = feature.id.split('/');
    feature.info = specInfo[specId];
    return feature;
  })).then(res => {
    // Group things by groups, feature ids, feature names and pages
    const groups = [];
    res.forEach(ref => {
      if (!ref.info || !ref.info.deliveredBy) {
        return;
      }

      ref.info.deliveredBy.forEach(deliveredBy => {
        let group = groups.find(g => g.deliveredBy.label === deliveredBy.label);
        if (!group) {
          group = {
            deliveredBy: deliveredBy,
            features: []
          };
          groups.push(group);
        }

        // Override delivered by info (we're grouping by groups and specs may
        // be developed by more than one group)
        const info = Object.assign({}, ref.info, { deliveredBy: [deliveredBy]});

        let spec = group.features.find(f => f.id === ref.id);
        if (!spec) {
          spec = {
            id: ref.id,
            info: info,
            features: []
          }
          group.features.push(spec);
        }

        let feature = spec.features.find(f => f.name === ref.feature);
        if (!feature) {
          feature = {
            name: ref.feature,
            pages: []
          };
          spec.features.push(feature);
        }

        let page = feature.pages.find(f => f.url === ref.page.url);
        if (!page) {
          page = ref.page;
          feature.pages.push(page);
        }
      });
    });

    groups.forEach(group => {
      group.features.forEach(spec => {
        // Only keep entries with no feature names if pages do not already
        // appear elsewhere
        const nofeature = spec.features.find(f => !f.name);
        if (nofeature) {
          nofeature.pages = nofeature.pages.filter(page =>
            !spec.features.find(f => f.name && f.pages.find(p => p.url === page.url)));
          if (nofeature.pages.length === 0) {
            spec.features = spec.features.filter(f => f.name);
          }
        }
      });
    });
    return groups;
  }).then(groups => groups.sort((g1, g2) => {
    return translate('groups', g1.deliveredBy.label)
      .localeCompare(translate('groups', g2.deliveredBy.label));
  })).then(groups => groups.map(group => {
    group.features.sort((s1, s2) => {
      return translate('specifications', s1.info.title)
        .localeCompare(translate('specifications', s2.info.title));
    });
    return group;
  })).then(groups => {
    const tableWrapper = document.getElementById('table');
    const table = document.createElement('table');

    // Fill the table headers
    const row = document.createElement('tr');
    columns.forEach(column => {
      const cell = document.createElement('th');
      cell.setAttribute('data-col', column.type);
      cell.appendChild(document.createTextNode(column.title));
      row.appendChild(cell);
    });

    let thead = document.createElement('thead');
    thead.appendChild(row);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    groups.forEach((group, groupidx) => {
      group.features.forEach((spec, specidx) => {
        spec.features.forEach((feature, featureidx) => {
          const row = document.createElement('tr');
          tbody.appendChild(row);
          columns.forEach((column, columnidx) => {
            // Group name cell and spec cell may span multiple rows
            if ((column.type === 'group') &&
                ((specidx > 0) || (featureidx > 0))) {
              return;
            }
            else if ((column.type === 'spec') && (featureidx > 0)) {
              return;
            }

            // Find implementation info if needed, or use that field to
            // pass page info
            const [specId, featureId] = spec.id.split('/');
            let impl = implInfo[specId];
            if (featureId) {
              impl = (impl.features ? impl.features[featureId] : {});
            }
            if (column.type === 'mention') {
              impl = feature.pages;
            }

            // Create the appropriate cell
            const cell = column.createCell(
              column, spec.id, feature.name,
              spec.info, impl,
              translate, lang, columnidx);
            row.appendChild(cell);

            // Make cells span multiple rows when needed
            if (column.type === 'group') {
              const rowspan = group.features.reduce(
                (tot, spec) => tot + spec.features.length, 0);
              if (rowspan > 1) {
                cell.setAttribute('rowspan', rowspan);
              }
            }
            else if (column.type === 'spec') {
              if (spec.features.length > 1) {
                cell.setAttribute('rowspan', spec.features.length);
              }
            }
          });
        });
      });
    });

    tableWrapper.appendChild(table);
  });
};