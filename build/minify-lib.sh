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

uglifyjs ../lib/acorn.js -o ../lib/acorn-min.js -c -m -b ascii_only=true,beautify=false
uglifyjs ../lib/esprima.js -o ../lib/esprima-min.js -c -m -b ascii_only=true,beautify=false
