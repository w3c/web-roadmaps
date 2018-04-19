/*******************************************************************************
Validates the HTML of HTML files against the W3C checker

To parse files:
node tools/validate-html.js mobile/index.html mobile/adaptation.html
*******************************************************************************/

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');


/**
 * Wrapper around the "require" function to require files relative to the
 * current working directory (CWD), instead of relative to the current JS
 * file.
 *
 * This is typically needed to be able to use "require" to load JSON config
 * files provided as command-line arguments.
 *
 * @function
 * @param {String} filename The path to the file to require
 * @return {Object} The result of requiring the file relative to the current
 *   working directory.
 */
function requireFromWorkingDirectory(filename) {
  return require(path.resolve(filename));
}


/**
 * Sends the given HTML file for validation to the W3C validator
 *
 * @param  {String} file The file to validate
 * @return {JSON} Validation result
 */
async function validate(file) {
  return new Promise((resolve, reject) => {
    let stream = fs.createReadStream(file);
    fetch('https://validator.w3.org/nu/?out=json&parser=html5', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
      body: stream
    })
    .then(response => response.json())
    .then(result => {
      return { file, result };
    })
    .then(resolve).catch(reject);
  });
}

const files = process.argv.slice(2).map(file => {
  let stat = fs.statSync(file);
  if (stat.isDirectory()) {
    let contents = fs.readdirSync(file);
    return contents.filter(f => f.endsWith('.html'))
      .map(f => path.join(file, f));
  }
  else {
    return file;
  }
}).reduce((res, files) => res.concat(files), []);

Promise.all(files.map(validate))
  .then(results => {
    let resultsWithErrors = results.filter(item =>
      item.result && item.result.messages &&
      item.result.messages.find(msg => msg.type === 'error'));
    if (resultsWithErrors.length > 0) {
      resultsWithErrors.forEach(item => {
        item.result.messages.filter(msg => msg.type === 'error').forEach(msg => {
          console.log(`- ${item.file} (line ${msg.lastLine}): ${msg.message}`);
        });
      });
      process.exit(1);
    }
    else {
      console.log('All files are valid HTML!');
      process.exit(0);
    }
  });
