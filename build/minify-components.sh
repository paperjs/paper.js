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

../node_modules/.bin/uglifyjs ../bower_components/acorn/acorn.js -o ../bower_components/acorn/acorn.min.js -c -m -b ascii_only=true,beautify=false
../node_modules/.bin/uglifyjs ../bower_components/esprima/esprima.js -o ../bower_components/esprima/esprima.min.js -c -m -b ascii_only=true,beautify=false
