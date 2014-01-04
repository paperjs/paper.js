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

if [ -f paperjs.zip ]
then
	rm paperjs.zip
fi
# Create a temporary folder to copy all files in for zipping
mkdir zip
cd zip
BASE=../..
# Copy license over
cp $BASE/LICENSE.txt .
# Make library folder and copy paper.js there
mkdir dist
# Copy main library
cp $BASE/dist/paper-full.js dist/paper.js
# Copy all versions
cp $BASE/dist/paper-full.js dist
cp $BASE/dist/paper-full.min.js dist
cp $BASE/dist/paper-core.js dist
cp $BASE/dist/paper-core.min.js dist
# Copy examples over
cp -r $BASE/examples .
# Copy docs over
cp -r $BASE/dist/docs .
# Zip the whole thing
zip -9 -r $BASE/dist/paperjs.zip * LICENSE.txt -x "*/.DS_Store"
cd ..
# Remove the temporary folder again
rm -fr zip
