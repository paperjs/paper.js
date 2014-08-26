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

# Extract the paper.js version from options.js:
VERSION=$(printf '%q' $(node -e "
    eval(require('fs').readFileSync('../src/options.js', 'utf8'));
    process.stdout.write(__options.version);
"))

# Helper function that updates paper.js vesion in JSON files
function update_version()
{
node -e "
    var data = require('$1');
    data.version = '$VERSION';
    require('fs').writeFile('$1',
            JSON.stringify(data, null, '  ') + require('os').EOL);
"
}

cd ..
PAPER_DIR=`PWD`
cd ../paperjs.org
SITE_DIR=`PWD`
DIST_FILE=content/11-Download/paperjs-v$VERSION.zip # Relative to $SITE_DIR

cd $PAPER_DIR/build
./dist.sh
cd $PAPER_DIR
echo "Commiting Version"
# Update versions
update_version 'package.json'
update_version 'bower.json'
update_version 'component.json'
# Add changed json configuration files
git add -u src/options.js # Commit as well, since it was manually bumped.
git add -u package.json
git add -u bower.json
git add -u component.json
# Add all changed files in dist
git add -u dist
# Commit
git commit -m "Bump version to v$VERSION"
# Tag & Push
git tag "v$VERSION"
git push
git push --tags
# Publish
npm publish

# Copy paperjs.zip to the website's download folder
cd $SITE_DIR
cp $PAPER_DIR/dist/paperjs.zip $DIST_FILE
# Update the online version of paper.js
cp $PAPER_DIR/dist/paper-full.js assets/js/paper.js
# Commit to paperjs.org
git add -A $DIST_FILE
git add -u assets/js/paper.js
git commit -m "Release version v$VERSION"
# Tag & Push
git tag "v$VERSION"
git push
git push --tags

cd "$PAPER_DIR/build"
