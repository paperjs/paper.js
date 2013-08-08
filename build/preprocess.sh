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

# preprocess.sh
#
# A simple code preprocessing wrapper that uses a combination of cpp, jssrip.py
# and sed to preprocess JavaScript files containing C-style preprocess macros
# (#include, #ifdef, etc.). Three options offer control over whether comments
# are preserved or stripped and whitespaces are compressed.
#
# Usage:
# preprocess.sh MODE SOURCE ARGUMENTS DESTINATION
#
# MODE:
#	commented		Preprocessed, still formated and commented
#	stripped		Preprocessed, formated but without comments

# Get the date from the git log:
DATE=$(git log -1 --pretty=format:%ad)
# Extract the paper.js version from package.json:
VERSION=$(node -e "
	process.stdout.write(require('../package.json').version)
")
# Load and evaluate the options from options.js, and convert it an escaped json:
OPTIONS=$(printf '%q' $(node -e "
	eval(require('fs').readFileSync('../src/options.js', 'utf8'));
	process.stdout.write(JSON.stringify(options));
"))
# Build the prepo.js command out of it, passing on version and date as defines:
COMMAND="../node_modules/.bin/prepro -o $OPTIONS -o '{ \"version\": \"$VERSION\", \"date\": \"$DATE\", \"stats\": false }' $3 $2"

case $1 in
	commented)
		eval $COMMAND > $4
		;;
	stripped)
		eval "$COMMAND -c" > $4
		;;
esac
