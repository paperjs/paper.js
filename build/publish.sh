#!/bin/bash

# Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
# http://paperjs.org/
#
# Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
# http://lehni.org/ & http://jonathanpuckey.com/
#
# Distributed under the MIT license. See LICENSE file for details.
#
# All rights reserved.

./dist.sh
echo "Commiting Version"
# Add changed json configuration files
git add -u ../package.json
git add -u ../bower.json
# Add all changed files in dist
git add -u ../dist
# Extract the paper.js version from package.json:
VERSION=$(node -e "
	process.stdout.write(require('../package.json').version)
")
# Commit
git commit -m "Bump version to v$VERSION"
# Tag
git tag "v$VERSION"
# Push
git push --tags
# Publish
npm publish ..
