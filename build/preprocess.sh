#!/bin/sh

# Paper.js
#
# This file is part of Paper.js, a JavaScript Vector Graphics Library,
# based on Scriptographer.org and designed to be largely API compatible.
# http://scriptographer.org/
#
# Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
# http://lehni.org/ & http://jonathanpuckey.com/
#
# Distributed under the MIT license. See LICENSE file for details.
#
# All rights reserved.

# preprocess.sh
#
# A simple code preprocessing wrapper that uses a combination of cpp, jssrip.py
# and sed to preprocess JavaScript files containing C-style preprocess macros
# (#include, #ifdef, etc.). Three options offer control over wether comments
# are preserved or stripped and whitespaces are compressed.
#
# Usage:
# preprocess.sh MODE SOURCE DEFINITIONS PREPRO_INCLUDE DESTINATION
#
# MODE:
#	commented		Preprocessed but still formated and commented
#	stripped		Formated but without comments
#	compressed		Uses UglifyJS to reduce file size

VERSION=0.22
DATE=$(git log -1 --pretty=format:%ad)

COMMAND="./prepro.js -d '{ \"version\": $VERSION, \"date\": \"$DATE\" }' -d '$3' -i '$4' $2"

case $1 in
	stripped)
		eval "$COMMAND -c" > $5
		;;
	commented)
		eval $COMMAND > $5
		;;
	compressed)
		eval $COMMAND > temp.js
		uglifyjs temp.js --extra --unsafe --reserved-names "_$_,$_" > $5
		rm temp.js
		;;
esac
