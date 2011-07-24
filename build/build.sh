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

# Usage:
# build.sh MODE
#
# MODE:
#	commented		Preprocessed but still formated and commented
#	stripped		Formated but without comments (default)
#	compressed		No comments and no whitespaces
#	uglified		Uses UglifyJS to further reduce file size

if [ $# -eq 0 ]
then
	MODE="stripped"
else
	MODE=$1
fi

# Create the dist folder if it does not exist yet.
if [ ! -d ../dist/ ]
then
	mkdir ../dist/
fi

./preprocess.sh $MODE ../src/paper.js ../dist/paper.js "-DBROWSER"
#./preprocess.sh $MODE ../src/paper.js ../dist/paper-server.js "-DSERVER"
