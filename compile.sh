#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

npm run all

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
