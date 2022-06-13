/*******************************************************************************
Helper script that parses the a list of spec and features and that creates an
implementation status report based on information from browser-statuses.

To parse files:
node tools/extract-impl-data.js [list.json]
*******************************************************************************/

const fs = require('fs');
const path = require('path');
const browserStatuses = require("browser-statuses");


async function extractImplData(list) {
  const impldata = {};

  for (const [shortname, features] of Object.entries(list)) {
    // Look for spec in browser-statuses
    const spec = browserStatuses.find(s => s.shortname === shortname);

    // Also look for spec in local data files
    let data = null;
    try {
      const file = path.join(__dirname, '..', 'data', `${shortname}.json`);
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch {
      data = {};
    }

    if (spec && data.impl) {
      console.warn(`[warn] data/${shortname}.json matches entry in browser-statuses. Is it really needed?`);
    }

    impldata[shortname] = { support: spec?.support ?? [], features: {} };
    if (spec?.polyfills) {
      impldata[shortname].polyfills = spec.polyfills;
      if (data.polyfills) {
        console.warn(`[warn] data/${shortname}.json lists polyfills for spec ${shortname} but so does browser-statuses. Local data ignored.`);
      }
    }
    for (const feature of features) {
      if (spec?.features?.[feature]) {
        impldata[shortname].features[feature] = { support: spec.features[feature].support };
        if (data.features?.[feature]) {
          console.warn(`[warn] data/${shortname}.json lists feature ${feature} but so does browser-statuses. Local data ignored.`);
        }
      }
      else if (data.features?.[feature]) {
        impldata[shortname].features[feature] = { support: data.features[feature].support };
        if (spec) {
          console.warn(`[warn] data/${shortname}.json info about feature ${shortname}/${feature} should be integrated in browser-statuses.`);
        }
      }
    }
  }

  return impldata;
}


module.exports.extractImplData = extractImplData;

if (require.main === module) {
  const file = process.argv[2] ?? '.out/data/list.json';
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));

  extractImplData(list)
    .then(data => console.log(JSON.stringify(data, null, 2)));
}
