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

uglifyjs ../dist/paper.js -o ../dist/paper-min.js -c unused=false -m -r "_$_,$_" -b ascii_only=true,beautify=false --comments /^!/
