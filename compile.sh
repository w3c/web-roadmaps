#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

# Generate the roadmaps, which should populate the ".out" folder
# with all the files that need to be published
npm run all

# Copy the README over, because we want to publish the latest version as well
cp README.md .out/README.md
