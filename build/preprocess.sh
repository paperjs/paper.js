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

# preprocess.sh
#
# A simple code preprocessing wrapper that uses a combination of cpp, jssrip.py
# and sed to preprocess JavaScript files containing C-style preprocess macros
# (#include, #ifdef, etc.). Three options offer control over whether comments
# are preserved or stripped and whitespaces are compressed.
#
# Usage:
# preprocess.sh MODE SOURCE ARGUMENTS DESTINATION
#
# MODE:
#   commented       Preprocessed, still formated and commented
#   stripped        Preprocessed, formated but without comments

# Get the date from the git log:
DATE=$(git log -1 --pretty=format:%ad)
# Load __options from options.js and convert it to escaped JSON, to be passed on
# to prepro:
OPTIONS=$(printf '%q' $(node -e "
    eval(require('fs').readFileSync('../src/options.js', 'utf8'));
    process.stdout.write(JSON.stringify(__options));
"))
# Build the prepo.js command out of it, passing on version and date as defines:
COMMAND="../node_modules/.bin/prepro -o $OPTIONS -o '{ \"date\": \"$DATE\" }' $3 $2"
# Flags to pass to prepro
if [ $1 = "stripped" ]; then FLAGS="-c"; else FLAGS=""; fi

eval "$COMMAND $FLAGS" > $4
# Now convert 4 spaces to tabs, to shave of some bytes (quite a few KB actually)
unexpand -t 4 -a $4 > "$4-tabs" && mv "$4-tabs" $4
# Remove trailing white-space on each line
perl -p -i -e "s/[ \t]*$//g" $4
