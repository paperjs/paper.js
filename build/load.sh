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

# This script simply copies src/load.js to dist/paper.js and dist/paper-node.js,
# which loads the library from separate sources through PrePro both in the
# browser and in Node.js.

if [ -f ../dist/paper.js ]
then
	rm ../dist/paper.js
fi

if [ -f ../dist/paper-node.js ]
then
	rm ../dist/paper-node.js
fi

cp ../src/load.js ../dist/paper.js
cp ../src/load.js ../dist/paper-node.js
