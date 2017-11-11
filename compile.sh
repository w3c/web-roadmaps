#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

# for i in data/*.json ; do echo $i ; python tools/extract-spec-data.py $i ; done

# for i in data/*.json ; do echo $i ; python tools/extract-impl-data.py $i ; done

python tools/extract-spec-data.py data/*.json > specs/tr.json
python tools/extract-impl-data.py data/*.json > specs/impl.json

if [ -d out ]; then
  rm -rf out/assets && cp -R assets/ out/assets/
  rm -rf out/data && cp -R data/ out/data/
  rm -rf out/js && cp -R js/ out/js/
  rm -rf out/media && cp -R media/ out/media/
  rm -rf out/mobile && cp -R mobile/ out/mobile/
  rm -rf out/publishing && cp -R publishing/ out/publishing/
  rm -rf out/security && cp -R security/ out/security/
  rm -rf out/web5g && cp -R web5g/ out/web5g/
  cp specs/tr.json out/specs/tr.json
  cp specs/impl.json out/specs/impl.json
  cp README.md out/README.md
fi
