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
	./preprocess.sh stripped ../src/paper.js '{ "browser": true }' ../src/constants.js ../dist/docs/resources/js/paper.js
fi
