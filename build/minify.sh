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

../node_modules/.bin/uglifyjs ../dist/paper-full.js -o ../dist/paper-full.min.js -c unsafe=true -m -b ascii_only=true,beautify=false --comments /^!/
../node_modules/.bin/uglifyjs ../dist/paper-core.js -o ../dist/paper-core.min.js -c unsafe=true -m --comments /^!/
