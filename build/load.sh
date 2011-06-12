# Paper.js
#
# This file is part of Paper.js, a JavaScript Vector Graphics Library,
# based on Scriptographer.org and designed to be largely API compatible.
# http://scriptographer.org/
#
# Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
# http://lehni.org/ & http://jonathanpuckey.com/
#
# All rights reserved. See LICENSE file for details.

# Generate a paper.js file that uses load.js to directly load the library
# through the seperate source files in the src directory. Very useful during
# development of the library itself.

echo "// Paper.js loader for development, as produced by the build/load.sh script
var root = '../../';
document.write('<script type=\"text/javascript\" src=\"' + root 
		+ 'src/load.js\"></script>');" > ../out/paper.js;