const $ = (el, selector) =>
  Array.prototype.slice.call(el.querySelectorAll(selector), 0);

const scripts = ['../js/sidenav.js'];

const templateItem = '<a href=""><div class="icon"><img src="" width="45" alt=""></div><div class="description"><h2></h2><p></p></div></a>';
const templateTocItem = '<a href=""><div class="description"></div></a>';


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
        console.warn('No localized version of ' + url + ' in ' + lang);
        return loadUrl(url);
      }
    })
};


// Extract document language from the HTML tag if defined,
// or from the filename otherwise, assuming that the file is named
// "[name].[lg].html". Default language is English ("en")
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


loadLocalizedUrl('../js/template-index.html', lang)
  .then(response => {
    // Preserve initial content that needs to appear in final document
    // (head elements, main header)
    const headElements = $(document, 'head > *').filter(el =>
      (el.nodeName !== 'TITLE') &&
      !((el.nodeName === 'META') && el.getAttribute('charset')));
    const hero = $(document, 'header > *');

    // Replace doc by template doc and complete with content saved above
    document.documentElement.innerHTML = response;
    headElements.forEach(el => document.querySelector('head').appendChild(el));
    hero.forEach(el => document.querySelector('.hero .container').appendChild(el));

    // Add JS scripts to the end of the body
    scripts.forEach(script => {
      let s = document.createElement('script');
      s.src = script;
      document.querySelector('body').appendChild(s);
    });
  })
  .then(() => loadLocalizedUrl('toc.json', lang))
  .then(response => JSON.parse(response))
  .then(toc => {
    let ul = document.querySelector('ul.roadmap-list');
    document.querySelector('title').textContent = toc.title;

    $(document, 'section.contribute .discourse').forEach(link => {
      link.href = toc.discourse.url;
      if (link.classList.contains('discoursecat')) {
          link.textContent = toc.discourse.category;
      }
    });

    let nav = document.querySelector('aside nav ul');
    toc.pages.forEach(page => {
      let li = document.createElement('li');
      li.innerHTML = templateItem;
      li.querySelector('a').href = page.url;
      li.querySelector('h2').textContent = page.title;
      li.querySelector('img').src = page.icon;
      li.querySelector('p').textContent = page.description;
      ul.appendChild(li);

      let navLi = document.createElement('li');
      navLi.innerHTML = templateTocItem;
      navLi.querySelector('a').href = page.url;
      navLi.querySelector('div.description').textContent = page.title;
      nav.appendChild(navLi);
    });
  });
