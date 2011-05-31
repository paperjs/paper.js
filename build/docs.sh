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

# Generate documentation

cd jsdoc-toolkit
java -jar jsrun.jar app/run.js -c=conf/paperjs.conf
cd ..
