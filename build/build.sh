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

# Usage:
# build.sh MODE
#
# MODE:
#	commented		Preprocessed, still formated and commented
#	stripped		Preprocessed, formated but without comments

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

./preprocess.sh $MODE ../src/paper.js "-d '{ \"browser\": true }' -i '../src/constants.js'" ../dist/paper.js
./preprocess.sh $MODE ../src/paper.js "-d '{ \"browser\": true, \"paperscript\": false }' -i '../src/constants.js'" ../dist/paper-core.js
#./preprocess.sh $MODE ../src/paper.js "-d '{ \"node\": true }' -i '../src/constants.js'" ../dist/paper-node.js 
