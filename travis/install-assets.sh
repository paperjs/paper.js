#!/bin/bash

# Download and instal assets, but only if they haven't been installed from the
# cache yet.
if [ ! -d ~/.assets ] || [ -z "$(ls -A ~/.assets)" ]; then
    mkdir -p ~/.assets
    wget http://sourceforge.net/p/tellmatic/git/ci/master/tree/img/arial.ttf?format=raw -O ~/.assets/arial.ttf
fi

# Install fonts each time, as they can't be cached in Travis.
mkdir -p ~/.fonts
cp -p ~/.assets/arial.ttf ~/.fonts
fc-cache -f -v
