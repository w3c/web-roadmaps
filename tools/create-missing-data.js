/*******************************************************************************
Parses existing roadmap pages and creates (or reports on) missing data files.

The tool also reports on data files that are not referenced anywhere.

To run the tool:
node tools/create-missing-data.js [--detect]

The `--detect` option tells the tool not to create missing data files in the
`data` folder.
*******************************************************************************/

const jsdom = require('jsdom');
const fs = require('fs');
const path = require('path');


function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}


const $ = (el, selector) =>
  Array.prototype.slice.call(el.querySelectorAll(selector), 0);


/**
 * Parse an HTML page and extract referenced specs
 *
 * @param  {String} file The roadmap page to parse
 * @return {Promise<Array(String)>} Promise to get the list of specs referenced
 *   in the page.
 */
async function extractReferencedSpecs(file) {
  return new Promise(async (resolve, reject) => {
    // Load the page using JSDOM
    const virtualConsole = new jsdom.VirtualConsole();
    let dom = await jsdom.JSDOM.fromFile(file, { virtualConsole });
    let doc = dom.window.document;
    let specs = $(doc, '[data-featureid]').map(el =>
      el.getAttribute('data-featureid').split('/')[0]);
    return resolve(specs);
  });
}


/*******************************************************************************
Main loop
*******************************************************************************/
// Tool creates missing data files by default. The `--detect` parameter tells
// the tool to only report on missing data files, but not to create them.
let detectOnly = (process.argv.length > 1) && (process.argv[2] === '--detect');

// Compute the list of roadmap pages to parse
// (same code as in `generate-roadmap.js`)
const inputFolders = fs.readdirSync('.')
  .filter(f => fs.statSync(f).isDirectory())
  .filter(f => !f.startsWith('.'))
  .filter(f => !['assets', 'data', 'js', 'node_modules', 'tools'].includes(f));
const files = inputFolders.map(folder => {
  return fs.readdirSync(folder)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(folder, f));
}).reduce((res, files) => res.concat(files), []);

// Compute the list of data files that already exist
const knownSpecs = fs.readdirSync('data')
  .filter(f => !fs.statSync(path.join('data', f)).isDirectory())
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace(/.json$/, ''))
  .filter(onlyUnique);

// Parse HTML pages to extract `data-featureid` references that do not exist
// in the "data" folder.
console.log('Parse HTML pages to detect missing/unused data files...');
Promise.all(files.map(file => extractReferencedSpecs(file, knownSpecs)))
  .then(res => res.reduce((missing, specs) => missing.concat(specs), []))
  .then(referenced => referenced.filter(onlyUnique))
  .then(referenced => Object.assign({
    missing: referenced.filter(spec => !knownSpecs.includes(spec)),
    unused: knownSpecs.filter(spec => !referenced.includes(spec))
  }))
  .then(res => {
    for (let spec of res.missing) {
      if (detectOnly) {
        console.log(`- found missing data file for "${spec}"`);
      }
      else {
        fs.writeFileSync(`data/${spec}.json`, '{}\n', 'utf8');
        console.log(`- created missing data file for "${spec}"`);
      }
    }

    for (let spec of res.unused) {
      console.log(`- data file "data/${spec}.json" is unused`);
    }

    console.log(`=> ${res.missing.length} missing data file(s) found`);
    console.log(`=> ${res.unused.length} unused data file(s) found`);
  })
  .catch(err => {
    console.error(err);
    process.exit(2);
  });