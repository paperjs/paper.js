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

# Generate a paper.js file that uses load.js to directly load the library
# through the seperate source files in the src directory. Very useful during
# development of the library itself.

echo "// Paper.js loader for development, as produced by the build/load.sh script
document.write('<script type=\"text/javascript\" src=\"../../lib/prepro.js\"></script>');
document.write('<script type=\"text/javascript\" src=\"../../src/load.js\"></script>');

// For more information on building the library please refer to the
// 'Building the Library' section of README.md:
// https://github.com/paperjs/paper.js#building-the-library" > ../dist/paper.js;