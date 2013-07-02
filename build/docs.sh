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

# Generate documentation
#
# MODE:
#	docs			Generates the JS API docs - Default
#	serverdocs		Generates the website templates for the online JS API docs

if [ $# -eq 0 ]
then
	MODE="docs"
else
	MODE=$1
fi

cd jsdoc-toolkit
java -jar jsrun.jar app/run.js -c=conf/$MODE.conf -D="renderMode:$MODE"
cd ..

if [ $MODE = "docs" ]
then
	# Build paper.js library for documentation
	./preprocess.sh stripped ../src/paper.js "-o '{ \"browser\": true }' -i '../src/constants.js'" ../dist/docs/assets/js/paper.js
fi
