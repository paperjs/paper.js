#!/bin/bash

# Create clean distribution folder.
mkdir ~/tmp
# Copy everything to the distribution folder first, then clean up.
cp -a dist ~/tmp/
# Copy all visible root files (LICENSE.txt, README.md, package.json, etc.).
cp -p *.* ~/tmp/
# No need for .gitignore or build files.
rm ~/tmp/dist/.gitignore
rm ~/tmp/gulpfile.js
# Reset the branch so we can switch to the prebuilt/module and prebuilt/dist
# branches
git clean -fdx # Remove all ignored and untracked files from the build.
git checkout -- . # Reset all tracked files to the original state.

# Create a new orphaned buid/dist branch and switch to it.
git checkout --orphan prebuilt/dist
# Remove and delete all tracked files
git rm -rf .
# Move the zipped dist file into the branch and commit.
mv ~/tmp/dist/paperjs.zip .
git add --all *
git commit -m "Prebuilt distribution for commit ${TRAVIS_COMMIT}."
# Push with --force since we're always overriding the previous built version
git push -u origin prebuilt/dist --force

# Switch to the module branch and add and commit the rest.
git fetch origin prebuilt/module
git checkout prebuilt/module
# Remove everything so we can fully replace it. Git will create the diffs.
rm -fr *
mv ~/tmp/* .
git add --all *
git commit -m "Prebuilt module for commit ${TRAVIS_COMMIT}."
git push -u origin prebuilt/module
rmdir ~/tmp
