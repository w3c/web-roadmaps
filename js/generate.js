/*******************************************************************************
Main script that dynamically converts a raw roadmap page into rendered version
that can be browsed or exported to create a static version.

In particular, the script:
1. applies an HTML template to the page to add a header and footer
2. generates tables per section that summarize the standardization and
implementation status of features referenced in the text of the section
3. generates a side navigation menu if the page is part of a multi-page roadmap
4. generates the main menu if the page being processed is the index page of a
multi-page roadmap

The script must be included in all roadmap pages. It contains logic to handle
translations of a roadmap.

More details on parameters that influence the behavior of this script can be
found on:
https://github.com/w3c/web-roadmaps/#framework-for-web-technology-roadmaps
*******************************************************************************/

// Helper function to load additional scripts
const loadScript = function (url) {
  return new Promise((resolve, reject) => {
    var script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
};


/*******************************************************************************
Step 1: Determine the type of document (main menu or regular roadmap page)

The document is considered to be a menu page if it contains an element with
a data-pagetype="menu" attribute.
The document is considered to be a regular page if it contains an element with
a data-pagetype="page" attribute.

In the absence of such attributes, the document is considered to be a regular
page if it contains a "<main>" element, or an element with a class attribute
that contains the value "featureset".
It is considered to be a menu page otherwise.

The type affects the contents of the HTML template that gets loaded and applied
to the current document.

Note a document may both be a menu page and a regular page. This allows authors
to list a few features on the menu page (which is probably confusing, but then
why not).
*******************************************************************************/
let pagetype = {
  menu: !!document.querySelector('*[data-pagetype="menu"]'),
  page: !!document.querySelector('*[data-pagetype="page"]'),
  about: !!document.querySelector('*[data-contents="about"]'),
  groups: !!document.querySelector('*[data-contents="groups"]')
};

if (!pagetype.menu && !pagetype.page) {
  pagetype.page =
    !!document.querySelector('main') ||
    !!document.querySelector('.featureset');
  pagetype.menu = !pagetype.page;
}


/*******************************************************************************
Step 2: Extract the document's language

The language is extracted from the HTML tag if defined, or from the filename
otherwise, assuming that the file is named "[name].[lg].html". Default language
is English ("en").

NB: The code assumes that the English version is in files without ".[lg].".
While that is good because one can view the English version without having to
enter any language in the URL, note that this prevents content negotiation. We
may want to reconsider that later on.
*******************************************************************************/
let lang = document.documentElement.lang;
if (!lang) {
  let match = window.location.pathname.match(/\/.+\.(.*)\.html$/);
  if (match) {
    lang = match[1];
  }
}
lang = lang || 'en';


/*******************************************************************************
Step 3: Generate the page as needed

To generate the page, the following code:
- loads functions defined in utils.js
- loads the HTML template
- applies the template to the current document
- loads the appropriate "toc.json" file that describes the current roadmap
- loads additional files as needed, notably translations
- generates the side navigation menu
- generates the main menu and/or the tables at the end of each section
*******************************************************************************/
loadScript('../js/utils.js')
  .then(_ => loadScript('../js/generate-utils.js'))
  .then(_ => {
    return Promise.all([
      loadTemplatePage(lang, pagetype),
      loadTranslations(lang),
      loadToc(lang)
    ]);
  }).then(results => {
    let translate = results[1];
    let toc = results[2];
    return Promise.all([
      applyToc(toc, translate, lang, pagetype),
      setSectionTitles(translate, lang),
      loadSpecInfo(),
      loadImplementationInfo(),
      translate
    ]);
  }).then(results => {
    let promise = fillTables(results[2], results[3], results[0], results[4], lang);
    addFilteringMenus(results[4]);
    return promise;
  }).then(_ => {
    // Remove duplicate warnings and report them
    warnings = warnings.filter((warning, idx, self) => self.indexOf(warning) === idx);
    warnings.forEach(warning => console.warn(warning));

    document.documentElement.setAttribute('data-generated', '');
    document.dispatchEvent(new Event('generate'));
  });