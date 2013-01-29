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

echo "Building paper.js"
./build.sh
echo "Minifying paper.js"
./minify.sh
echo "Building docs"
./docs.sh
echo "Zipping paperjs.zip"
./zip.sh
