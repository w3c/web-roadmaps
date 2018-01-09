/*******************************************************************************
Script that runs on generated pages to filter the list of user-agents that
appear in "Current implementations" columns.

The filtering is done based on the presence of a "ua" parameter in the query
string. That parameter should contain a comma-separated list of user-agents
that should appear in the generated tables.

For instance:
- "ua=firefox" to only display the current implementation status in Firefox
- "ua=chrome,edge" to display the current implementation status in Chrome and
in Edge.

The script also updates navigation links to preserve the query string across
pages.
*******************************************************************************/
(function () {
  const $ = (el, selector) =>
    Array.prototype.slice.call(el.querySelectorAll(selector), 0);

  const isString = function (obj) {
    return Object.prototype.toString.call(obj) === '[object String]';
  };

  const filterImplementations = function (ua) {
    if (ua && isString[ua]) {
      ua = [ua];
    }

    // Reset elements, making sure they are all visible
    $(document, '[data-implstatus],[data-ua]')
      .forEach(el => el.hidden = false);

    // Nothing to filter if all UA are to be displayed
    if (!ua || (ua.length === 0)) {
      return;
    }

    // Hide UA implementations that are not requested
    $(document, '[data-ua]')
      .filter(el => !ua.includes(el.getAttribute('data-ua')))
      .forEach(el => el.hidden = true);

    // Hide wrapping label if there are no more visible implementation status
    // to show under that label
    $(document, '[data-implstatus]')
      .filter(el => !el.querySelector('[data-ua]:not([hidden])'))
      .forEach(el => el.hidden = true);
  };

  let filtered = false;

  const loadHandler = function () {
    if (filtered || !document.querySelector('[data-generated]')) {
      return;
    }
    filtered = true;

    // Get requested user-agents from query string
    let ua = (window.location.search || '').substring(1)
      .split('&')
      .filter(param => param.split('=')[0] === 'ua')
      .map(param => param.split('=')[1])
      .pop()
      .split(',');

    // Update links in navigation menus to preserve the current query string
    // across pages
    $(document, '[data-nav]').forEach(el => {
      let url = el.getAttribute('href').replace(/\?.*$/, '') +
        window.location.search;
      el.setAttribute('href', url);
    });

    // Filter implementation status results as requested
    filterImplementations(ua);
  };

  // Apply the filtering when the document is loaded and has been generated,
  // meaning when there is a "data-generated" attribute. If the "generate.js"
  // script is present, it will add the attribute and trigger a "generate"
  // event when it is done running. If the "generate.js" script is not present,
  // in other words when the page is a published version of the generated page,
  // the "data-generated" attribute should already exist.
  document.addEventListener('generate', loadHandler);
  document.addEventListener('load', loadHandler);
})();
