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
mkdir lib
cp $BASE/dist/paper.js lib
# Copy examples over
cp -r $BASE/examples .
# Replace ../../dist/ with ../../lib/ in each example
find examples -type f -print0 | xargs -0 perl -i -pe 's/\.\.\/\.\.\/dist\//\.\.\/\.\.\/lib\//g'
# Copy docs over
cp -r $BASE/dist/docs .
# Zip the whole thing
zip -9 -r $BASE/dist/paperjs.zip * LICENSE.txt -x "*/.DS_Store"
cd ..
# Remove the temporary folder again
rm -fr zip
