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

# This script simply generates a symbolic link from dist/paper.js to src/load.js
# which loads the library from separate sources through PrePro.

if [ -f ../dist/paper.js ]
then
	rm ../dist/paper.js
fi
ln -s ../src/load.js ../dist/paper.js
