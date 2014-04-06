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

# This script simply creates symbolic links to src/load.js from
# dist/paper-full.js and dist/paper-node.js, which loads the library from
# separate sources through PrePro both in the browser and in Node.js.

if [ -f ../dist/paper-full.js ]
then
	rm ../dist/paper-full.js
fi

if [ -f ../dist/paper-node.js ]
then
	rm ../dist/paper-node.js
fi

ln -s ../src/load.js ../dist/paper-full.js
ln -s ../src/load.js ../dist/paper-node.js
