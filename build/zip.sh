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
cp $BASE/dist/paper-full.js dist
cp $BASE/dist/paper-full.min.js dist
cp $BASE/dist/paper-core.js dist
cp $BASE/dist/paper-core.min.js dist
# Also include stats sinsce some examples use it
mkdir lib
cp $BASE/lib/stats.js lib
# Copy examples over
cp -r $BASE/examples .
# Replace dist/paper.js with dist/paper-full.js in each example
find examples -type f -print0 | xargs -0 perl -i -pe 's/dist\/paper\.js/dist\/paper-full\.js/g'
# Copy docs over
cp -r $BASE/dist/docs .
# Zip the whole thing
zip -9 -r $BASE/dist/paperjs.zip * LICENSE.txt -x "*/.DS_Store"
cd ..
# Remove the temporary folder again
rm -fr zip
