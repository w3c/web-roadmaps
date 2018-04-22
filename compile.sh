#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

# Start from a fresh ".out" folder to avoid keeping files
# that should be removed
if [ -d .out ]; then
  rm -rf .out
fi

# Generate the roadmaps, which should populate the ".out" folder
# with all the files that need to be published
npm run all

# Copy the README over, because we want to publish the latest version as well
cp README.md .out/README.md
