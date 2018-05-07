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

The script includes the following polyfill (for Microsoft Edge):

Details Element Polyfill 2.0.1
Copyright © 2018 Javan Makhmali
MIT License
See: https://github.com/javan/details-element-polyfill
*******************************************************************************/

/*******************************************************************************
Details Element Polyfill 2.0.1

NB: the ugly heuristics are meant to identify JSDOM so as not to run the
script in that context to avoid JSDOM reporting errors (script is not needed
in JSDOM)
*******************************************************************************/
(function(){}).call(this),function(){
if (window.navigator.userAgent.split(/[\s\/]/).indexOf('jsdom') === -1) {
  var t,e,n,r,u,o,i,a,l,s,c,d;s={element:function(){var t,e,n,r,u;return e=document.createElement("details"),"open"in e?(e.innerHTML="<summary>a</summary>b",e.setAttribute("style","position: absolute; left: -9999px"),r=null!=(u=document.body)?u:document.documentElement,r.appendChild(e),t=e.offsetHeight,e.open=!0,n=e.offsetHeight,r.removeChild(e),t!==n):!1}(),toggleEvent:function(){var t;return t=document.createElement("details"),"ontoggle"in t}()},s.element&&s.toggleEvent||(i=function(){return document.head.insertAdjacentHTML("afterbegin",'<style>@charset"UTF-8";details:not([open])>*:not(summary){display:none;}details>summary{display:block;}details>summary::before{content:"\u25ba";padding-right:0.3rem;font-size:0.6rem;cursor:default;}details[open]>summary::before{content:"\u25bc";}</style>')},o=function(){var t,e,n,r;return e=document.createElement("details").constructor.prototype,r=e.setAttribute,n=e.removeAttribute,t=Object.getOwnPropertyDescriptor(e,"open"),Object.defineProperties(e,{open:{get:function(){var e;return"DETAILS"===this.tagName?this.hasAttribute("open"):null!=t&&null!=(e=t.get)?e.call(this):void 0},set:function(e){var n;return"DETAILS"===this.tagName?(e?this.setAttribute("open",""):this.removeAttribute("open"),e):null!=t&&null!=(n=t.set)?n.call(this,e):void 0}},setAttribute:{value:function(t,e){return d(this,function(n){return function(){return r.call(n,t,e)}}(this))}},removeAttribute:{value:function(t){return d(this,function(e){return function(){return n.call(e,t)}}(this))}}})},a=function(){return r(function(t){var e;return e=t.querySelector("summary"),t.hasAttribute("open")?(t.removeAttribute("open"),e.setAttribute("aria-expanded",!1)):(t.setAttribute("open",""),e.setAttribute("aria-expanded",!0))})},u=function(){var e,n,r,u,o;for(u=document.querySelectorAll("summary"),e=0,n=u.length;n>e;e++)o=u[e],t(o);return"undefined"!=typeof MutationObserver&&null!==MutationObserver?(r=new MutationObserver(function(e){var n,r,u,i,a;for(i=[],r=0,u=e.length;u>r;r++)n=e[r].addedNodes,i.push(function(){var e,r,u;for(u=[],e=0,r=n.length;r>e;e++)a=n[e],"DETAILS"===a.tagName&&(o=a.querySelector("summary"))?u.push(t(o,a)):u.push(void 0);return u}());return i}),r.observe(document.documentElement,{subtree:!0,childList:!0})):document.addEventListener("DOMNodeInserted",function(e){return"SUMMARY"===e.target.tagName?t(e.target):void 0})},t=function(t,e){return null==e&&(e=n(t,"DETAILS")),t.setAttribute("aria-expanded",e.hasAttribute("open")),t.hasAttribute("tabindex")||t.setAttribute("tabindex","0"),t.hasAttribute("role")?void 0:t.setAttribute("role","button")},l=function(){var t;return"undefined"!=typeof MutationObserver&&null!==MutationObserver?(t=new MutationObserver(function(t){var e,n,r,u,o,i;for(o=[],n=0,r=t.length;r>n;n++)u=t[n],i=u.target,e=u.attributeName,"DETAILS"===i.tagName&&"open"===e?o.push(c(i)):o.push(void 0);return o}),t.observe(document.documentElement,{attributes:!0,subtree:!0})):r(function(t){var e;return e=t.getAttribute("open"),setTimeout(function(){return t.getAttribute("open")!==e?c(t):void 0},1)})},e=function(t){return!(t.defaultPrevented||t.altKey||t.ctrlKey||t.metaKey||t.shiftKey||t.target.isContentEditable)},r=function(t){return addEventListener("click",function(r){var u,o;return e(r)&&r.which<=1&&(u=n(r.target,"SUMMARY"))&&"DETAILS"===(null!=(o=u.parentElement)?o.tagName:void 0)?t(u.parentElement):void 0},!1),addEventListener("keydown",function(r){var u,o,i;return e(r)&&(13===(o=r.keyCode)||32===o)&&(u=n(r.target,"SUMMARY"))&&"DETAILS"===(null!=(i=u.parentElement)?i.tagName:void 0)?(t(u.parentElement),r.preventDefault()):void 0},!1)},n=function(){return"function"==typeof Element.prototype.closest?function(t,e){return t.closest(e)}:function(t,e){for(;t;){if(t.tagName===e)return t;t=t.parentElement}}}(),c=function(t){var e;return e=document.createEvent("Events"),e.initEvent("toggle",!0,!1),t.dispatchEvent(e)},d=function(t,e){var n,r;return n=t.getAttribute("open"),r=e(),t.getAttribute("open")!==n&&c(t),r},s.element||(i(),o(),a(),u()),s.element&&!s.toggleEvent&&l())
}
}.call(this);

(function () {
  const browsers = {
    main: ['chrome', 'edge', 'firefox', 'safari|webkit'],
    secondary: ['baidu', 'opera', 'qq', 'samsunginternet', 'uc']
  };

  const $ = (el, selector) =>
    Array.prototype.slice.call(el.querySelectorAll(selector), 0);

  const isString = function (obj) {
    return Object.prototype.toString.call(obj) === '[object String]';
  };

  const filterImplementations = function (uas) {
    if (isString[uas]) {
      uas = [uas];
    }

    // Reset elements, making sure they are all visible
    // Note that using "hidden" on ua blocks is not enough to hide them,
    // because the CSS also changes the value of the "display" property
    $(document, '[data-implstatus],[data-ua]').forEach(el => el.hidden = false);
    $(document, '[data-ua]').forEach(el => el.style.display = 'inline-block');

    // Hide UA implementations that are not requested
    $(document, '[data-ua]')
      .filter(el => uas.indexOf(el.getAttribute('data-ua')) === -1)
      .forEach(el => { el.hidden = true; el.style.display = 'none'; });

    // Hide wrapping label if there are no more visible implementation status
    // to show under that label
    $(document, '[data-implstatus]')
      .filter(el => !el.querySelector('[data-ua]:not([hidden])'))
      .forEach(el => el.hidden = true);
  };


  /**
   * Handler for change events on input elements
   */
  const uaChangeHandler = function (evt) {
    // Pointer to list that contains the input
    let list = evt.target.parentElement.parentElement.parentElement.parentElement;
    let uas = $(list, 'input')
      .map(input => (input.checked ? input.value.split('|') : null))
      .filter(ua => !!ua)
      .reduce((arr, val) => arr.concat(val), []);

    // Apply filtering
    filterImplementations(uas);

    // Check the right browsers in the filtering menus
    updateFilteringMenus(uas);

    // Save the list of selected UA to the session storage
    // (not using persistent storage as default view seems preferable when
    // the user comes back to the page after some time)
    if (window.sessionStorage) {
      window.sessionStorage.setItem('uas', uas.join('|'));
    }
  };

  /**
   * Check the right browsers in the filtering menus
   *
   * @function
   * @param  {Array{string}} uas The list of user agents to check
   */
  const updateFilteringMenus = function (uas) {
    // Update all menus in the page accordingly
    $(document, 'th[data-col|=impl] input')
      .forEach(input => input.checked = (uas.indexOf(input.value.split('|')[0]) !== -1));
  };


  let filtered = false;

  /**
   * Initialize filtering state when the page is loaded
   */
  const loadHandler = function () {
    if (filtered || !document.querySelector('[data-generated]')) {
      return;
    }
    filtered = true;

    // Get requested user-agents from query string
    let uas = (window.location.search || '').substring(1)
      .split('&')
      .filter(param => param.split('=')[0] === 'ua')
      .map(param => param.split('=')[1])
      .pop();
    if (uas) {
      uas = uas.split(',');
    }

    // Load requested user-agents from session storage if no specific
    // user-agents were provided in the query string
    if (!uas && window.sessionStorage && window.sessionStorage.getItem('uas')) {
      uas = window.sessionStorage.getItem('uas').split('|');
    }

    // Display main browsers by default (the ones that appear in the first list
    // in filtering menus) or return if there are no filtering menus to activate
    if (!uas) {
      let mainList = document.querySelector('th[data-col|=impl] details ul');
      if (!mainList) {
        return;
      }
      uas = $(mainList, 'input').map(input => input.value.split('|'))
        .reduce((arr, val) => arr.concat(val), []);
    }

    // Update links in navigation menus to preserve the current query string
    // across pages
    $(document, '[data-nav]').forEach(el => {
      let url = el.getAttribute('href').replace(/\?.*$/, '') +
        window.location.search;
      el.setAttribute('href', url);
    });

    // Activate filtering menus
    $(document, 'th[data-col|=impl] details').forEach(
      menu => menu.classList.add('active'));
    $(document, 'th[data-col|=impl] input').forEach(
      input => input.addEventListener('change', uaChangeHandler));

    // Filter implementation status results as requested
    filterImplementations(uas);

    // Check the right browsers in the filtering menus
    updateFilteringMenus(uas);
  };

  // Apply the filtering when the document is loaded and has been generated,
  // meaning when there is a "data-generated" attribute. If the "generate.js"
  // script is present, it will add the attribute and trigger a "generate"
  // event when it is done running. If the "generate.js" script is not present,
  // in other words when the page is a published version of the generated page,
  // the "data-generated" attribute should already exist.
  document.addEventListener('generate', loadHandler);
  window.addEventListener('load', loadHandler);
})();
