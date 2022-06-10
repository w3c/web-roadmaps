/*******************************************************************************
Validates that we have all the info we need to generate roadmap pages

node tools/validate-info.js [list.json] [tr.json]
*******************************************************************************/

const fs = require('fs');
const path = require('path');

function validateInfo(listFile, trFile) {
  const errors = [];

  let list = null;
  try {
    list = JSON.parse(fs.readFileSync(listFile, 'utf8'));
  }
  catch {
    errors.push(`Could not parse ${listFile} as JSON`);
    return errors;
  }

  let specinfo = null;
  try {
    specinfo = JSON.parse(fs.readFileSync(trFile, 'utf8'));
  }
  catch {
    errors.push(`Could not parse ${trFile} as JSON`);
    return errors;
  }

  for (const [shortname, features] of Object.entries(list)) {
    const spec = specinfo[shortname];
    if (!spec) {
      errors.push(`Missing info for spec ${shortname}`);
      continue;
    }

    for (const feature of features) {
      if (!spec.features?.[feature]) {
        errors.push(`Missing info for feature ${shortname}/${feature}`);
      }
    }
  }

  const dataFolder = path.join(__dirname, '..', 'data');
  const dataFiles = fs.readdirSync(dataFolder)
    .filter(f => f.endsWith('.json'))
    .map(f => f.split('.')[0]);
  for (const shortname of dataFiles) {
    const features = list[shortname];
    if (!features) {
      errors.push(`File data/${shortname}.json is unused`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(path.join(dataFolder, `${shortname}.json`), 'utf8'));
    if (data.features) {
      for (const feature of Object.keys(data.features)) {
        if (!features.find(f => f === feature)) {
          errors.push(`Feature ${shortname}/${feature} is not referenced anywhere`);
        }
      }
    }
  }

  return errors;
}


if (require.main === module) {
  const listFile = process.argv[2] ?? '.out/data/list.json';
  const trFile = process.argv[3] ?? '.out/data/tr.json';
  const errors = validateInfo(listFile, trFile);
  errors.map(error => console.error(`[error] ${error}`));
  //process.exit(errors.length);
  process.exit(0);
}