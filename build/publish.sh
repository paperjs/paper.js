#!/bin/bash

# Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
# http://paperjs.org/
#
# Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
# http://scratchdisk.com/ & http://jonathanpuckey.com/
#
# Distributed under the MIT license. See LICENSE file for details.
#
# All rights reserved.

# Extract the paper.js version from package.json:
VERSION=$(node -e "
	process.stdout.write(require('../package.json').version)
")
cd ..
PAPER_DIR=`PWD`
cd ../paperjs.org
SITE_DIR=`PWD`
DIST_FILE=content/10-Download/paperjs-v$VERSION.zip # Relative to $SITE_DIR

cd $PAPER_DIR/build
./dist.sh
cd $PAPER_DIR
echo "Commiting Version"
# Add changed json configuration files
git add -u package.json
git add -u bower.json
# Add all changed files in dist
git add -u dist
# Commit
git commit -m "Bump version to v$VERSION"
# Tag
git tag "v$VERSION"
# Push
git push --tags
# Publish
npm publish ..

# Copy paperjs.zip to the website's download folder
cd $SITE_DIR
echo `PWD`
cp $PAPER_DIR/dist/paperjs.zip $DIST_FILE
# Commit to paperjs.org
git add -A $DIST_FILE
git commit -m "Release version v$VERSION"
# Tag
git tag "v$VERSION"
git push --tags

cd "$PAPER_DIR/build"
