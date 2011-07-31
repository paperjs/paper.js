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

# Generate a paper.js file that uses load.js to directly load the library
# through the seperate source files in the src directory. Very useful during
# development of the library itself.

./preprocess.sh compressed ../lib/parse-js.js ../lib/parse-js-min.js '{}'
