#!/bin/bash

# Download and instal fonts, but only if they haven't been installed from the
# cache yet.

if [ ! -d ~/.fonts ];
    wget http://sourceforge.net/p/tellmatic/git/ci/master/tree/img/arial.ttf?format=raw -O arial.ttf
    mkdir -p ~/.fonts
    mv arial.ttf ~/.fonts
fi;
fc-cache -f -v
