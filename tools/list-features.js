/*******************************************************************************
Parses existing roadmap pages and reports the list of specs and features that
these pages reference.

To run the tool:
node tools/list-features.js
*******************************************************************************/

const jsdom = require('jsdom');
const fs = require('fs');
const path = require('path');

const $ = (el, selector) =>
  Array.prototype.slice.call(el.querySelectorAll(selector), 0);


/**
 * Parse an HTML page and extract referenced features
 *
 * @param  {String} file The roadmap page to parse
 * @return {Promise<Array(String)>} Promise to get the list of features referenced
 *   in the page.
 */
async function extractReferencedFeatures(file) {
  return new Promise(async (resolve, reject) => {
    // Load the page using JSDOM
    const virtualConsole = new jsdom.VirtualConsole();
    let dom = await jsdom.JSDOM.fromFile(file, { virtualConsole });
    let doc = dom.window.document;
    let specs = $(doc, '[data-featureid]').map(el => el.getAttribute('data-featureid'));
    return resolve(specs);
  });
}


async function listFeatures() {
  // Compute the list of roadmap pages to parse
  // (same code as in `generate-roadmaps.js`)
  const inputFolders = fs.readdirSync('.')
    .filter(f => fs.statSync(f).isDirectory())
    .filter(f => !f.startsWith('.'))
    .filter(f => !['assets', 'data', 'js', 'node_modules', 'tools'].includes(f));
  const files = inputFolders.map(folder => {
    return fs.readdirSync(folder)
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(folder, f));
  }).reduce((res, files) => res.concat(files), []);

  // Parse HTML pages to extract `data-featureid` references
  const list = {};
  for (const file of files) {
    const ids = await extractReferencedFeatures(file);
    for (const id of ids) {
      const [spec, feature] = id.split('/');
      if (!list[spec]) {
        list[spec] = new Set();
      }
      if (feature) {
        list[spec].add(feature);
      }
    }
  }

  for (const [spec, features] of Object.entries(list)) {
    list[spec] = [...features];
  }
  
  return list;
}


/*******************************************************************************
Main loop
*******************************************************************************/
module.exports.listFeatures = listFeatures;

if (require.main === module) {
  listFeatures()
    .then(list => console.log(JSON.stringify(list, null, 2)))
    .catch(err => console.error(err));
}