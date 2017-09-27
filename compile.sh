#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

# for i in data/*.json ; do echo $i ; python tools/extract-spec-data.py $i ; done

# for i in data/*.json ; do echo $i ; python tools/extract-impl-data.py $i ; done

python tools/extract-spec-data.py data/*.json > specs/tr.json
python tools/extract-impl-data.py data/*.json > specs/impl.json

if [ -d out ]; then
  cp -R assets out/assets/
  cp -R data out/data/
  cp -R js out/js/
  cp -R media out/media/
  cp -R mobile out/mobile/
  cp -R publishing out/publishing/
  cp -R security out/security/
  cp -R web5g out/web5g/
  cp specs/tr.json out/specs/tr.json
  cp specs/impl.json out/specs/impl.json
fi
