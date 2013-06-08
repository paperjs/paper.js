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

# We need to keep dead_code around for now, since the very odd JavaScriptCore
# scope bug fix (nop().nop()) requires it.
# TODO: uglifyjs gets confused about Base and Color constructor naming, so we
# have to tell it to not rename these. It's also not renaming all the local
# references to classes which could yield a lot of size improvements.
uglifyjs ../dist/paper.js -o ../dist/paper-min.js -c unsafe=true,unused=false,dead_code=false,hoist_funs=false -m -r "Base,Color,_$_,$_" -b ascii_only=true,beautify=false --comments /^!/
