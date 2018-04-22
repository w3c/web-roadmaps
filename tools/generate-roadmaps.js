/*******************************************************************************
Generates roadmaps in the repository to the '.out' folder

To generate roadmaps:
node tools/generate-roadmaps.js
*******************************************************************************/

const jsdom = require('jsdom');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const ncp = require('ncp').ncp;


/**
 * Generate a roadmap page and save the result to the output folder
 *
 * @param  {String} file The roadmap page to generate
 * @param  {String} outputFolder The output folder
 * @return {Promise<Array(String)>} Promise to have generated the roadmap page
 *   and to get a log of generation info
 */
async function generatePage(file, outputFolder) {
  return new Promise(async (resolve, reject) => {
    let logs = [];
    logs.push(`- generate ${file}...`);

    // Collect console messages as logs
    const virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.on('error', (...args) => args.map(msg => logs.push(msg)));
    virtualConsole.on('warn', (...args) => args.map(msg => logs.push(msg)));
    virtualConsole.on('info', (...args) => args.map(msg => logs.push(msg)));
    virtualConsole.on('dir', (...args) => args.map(msg => logs.push(msg)));

    // Load the page using JSDOM
    let dom = await jsdom.JSDOM.fromFile(file, {
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole
    });
    let doc = dom.window.document;

    // Save the page once it has been generated
    doc.addEventListener('generate', _ => {
      doc.querySelectorAll('head script').forEach(
        script => script.parentNode.removeChild(script));
      let outputFile = path.join(outputFolder, file);
      mkdirp(path.dirname(outputFile));
      fs.writeFile(outputFile, dom.serialize(), 'utf-8', err => {        
        if (err) {
          console.error(`- generate ${file}... an error occurred`);
          return reject(err);
        }
        logs.push(`- generate ${file}... done`);
        return resolve(logs);
      });
    });
  });
}


/**
 * Copy the contents of a folder recursively
 *
 * Note some hardcoded rules to only copy the "right" files.
 *
 * @param  {[type]} folder [description]
 * @param  {[type]} output [description]
 * @return {[type]}        [description]
 */
function copyFolder(folder, output) {
  return new Promise((resolve, reject) => {
    ncp(folder, output, {
      filter: file => {
        let filename = path.basename(file);
        if (folder === 'js') {
          return (filename === 'js') ||
            (filename === 'filter-implstatus.js') ||
            (filename === 'sidenav.js');
        }
        else {
          return !filename.startsWith('.');
        }
      }
    }, err => {
      if (err) {
        reject(err);
      }
      else {
        resolve();
      }
    });
  });
}



/*******************************************************************************
Main loop
*******************************************************************************/
// Put generated roadmap pages in the '.out' folder
const outputFolder = '.out';
try {
  let stat = fs.statSync(outputFolder);
}
catch (err) {
  mkdirp(outputFolder, err => {
    if (err) {
      console.error('Output folder does not exist and could not be created.');
      process.exit(1);
    }
  });
}

// Compute the list of roadmap pages that need to be generated
const inputFolders = fs.readdirSync('.')
  .filter(f => fs.statSync(f).isDirectory())
  .filter(f => !f.startsWith('.'))
  .filter(f => !['assets', 'data', 'js', 'node_modules', 'tools'].includes(f));
const files = inputFolders.map(folder => {
  return fs.readdirSync(folder)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(folder, f));
}).reduce((res, files) => res.concat(files), []);

// Generate all roadmap pages, and copy other files to the output folder
Promise.all(files.map(file => generatePage(file, outputFolder)
    .then(log => log.forEach(msg => console.log(msg)))
  ))
  .then(_ => copyFolder('assets', path.join(outputFolder, 'assets')))
  .then(_ => copyFolder('js', path.join(outputFolder, 'js')))
  .catch(err => {
    console.error(err);
    process.exit(2);
  });