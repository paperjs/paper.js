#!/bin/bash
#
# Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
# http://paperjs.org/
#
# Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
# http://juerglehni.com/ & https://puckey.studio/
#
# Distributed under the MIT license. See LICENSE file for details.
#
# All rights reserved.

# Determine target for commit messages.
if [ -n "${TRAVIS_TAG}" ]; then
    TARGET=$TRAVIS_TAG
else
    TARGET="commit ${TRAVIS_COMMIT}"
fi

# Set up a temporary folder to prepare distribution files.
TMP=~/tmp
mkdir $TMP
# Copy everything to the this folder first, then clean up.
cp -a dist $TMP/
# Copy all visible root files (LICENSE.txt, README.md, package.json, etc.).
cp -p *.* $TMP/
# No need for .gitignore or build files.
rm $TMP/dist/.gitignore
rm $TMP/gulpfile.js
# Reset the branch so we can switch to prebuilt/module and prebuilt/dist after.
git clean -fdx --quiet # Remove all ignored and untracked files from the build.
git checkout -- . # Reset all tracked files to the original state.

# Create a new orphaned buid/dist branch and switch to it.
git checkout --orphan prebuilt/dist
# Remove and delete all tracked files left after the switch.
git rm -rf --quiet .
# Move the zipped dist file into the branch and commit.
mv $TMP/dist/paperjs.zip .
git add --all *
git commit -m "Prebuilt package for ${TARGET}"
# Push with --force since we're always overriding the previous built version.
git push -u origin prebuilt/dist --force

# Specifically fetch and check out the prebuilt/module branch from origin.
git fetch origin +refs/heads/prebuilt/module:refs/remotes/origin/prebuilt/module
git checkout -b prebuilt/module -t origin/prebuilt/module
# Remove everything so we can fully replace it. Git will create the diffs.
rm -fr *
mv $TMP/* .
git add --all *
git commit -m "Prebuilt module for ${TARGET}"
git push -u origin prebuilt/module
rmdir $TMP
