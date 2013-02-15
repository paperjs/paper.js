#!/bin/sh

# Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
# http://paperjs.org/
#
# Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
# http://lehni.org/ & http://jonathanpuckey.com/
#
# Distributed under the MIT license. See LICENSE file for details.
#
# All rights reserved.

uglifyjs ../lib/acorn.js -o ../lib/acorn-min.js -c -m -b ascii_only=true,beautify=false
uglifyjs ../lib/esprima.js -o ../lib/esprima-min.js -c -m -b ascii_only=true,beautify=false
