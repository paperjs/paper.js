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

../node_modules/.bin/uglifyjs ../components/acorn/acorn.js -o ../components/acorn/acorn.min.js -c -m -b ascii_only=true,beautify=false
../node_modules/.bin/uglifyjs ../components/esprima/esprima.js -o ../components/esprima/esprima.min.js -c -m -b ascii_only=true,beautify=false
