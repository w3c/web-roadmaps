/**
 * Common JavaScript functions used both to generate the page and for the
 * browser filtering logic.
 */

/**
 * Global warnings to report to the user once page has loaded
 *
 * @type {Array}
 */
let warnings = [];


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
 * Loads translations of strings to be used in the right language, falling
 * back to English if translations cannot be found.
 *
 * Returns a translation function.
 */
const loadTranslations = (function () {
  const loadedTranslations = {};
  return function (lang) {
    if (!loadedTranslations[lang]) {
      loadedTranslations[lang] = loadLocalizedUrl('../js/translations.json', lang)
        .then(response => JSON.parse(response))
        .then(translations => {
          let translate = function (category, text) {
            let catTranslations = (translations || {})[category];
            if (!catTranslations) return text;
            return catTranslations[text] || text;
          };
          return translate;
        })
        .then(translate => {
          if (lang === 'en') {
            return translate;
          }
          return loadTranslations('en').then(translateEnglish => {
            let translateWithFallback = function (category, text, checkOnly) {
              let res = translate(category, text);
              if (res !== text) {
                return res;
              }
              else {
                if (!checkOnly) {
                  warnings.push('Missing ' + lang.toUpperCase() + ' translation for "' + text + '" in category "' + category + '"');
                }
                return translateEnglish(category, text);
              }
            }
            return translateWithFallback;
          });
        });
    }
    return loadedTranslations[lang];
  };
})();