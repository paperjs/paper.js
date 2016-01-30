#!/bin/bash
wget http://sourceforge.net/p/tellmatic/git/ci/master/tree/img/arial.ttf?format=raw -O arial.ttf
mkdir -p ~/.fonts
mv arial.ttf ~/.fonts
fc-cache -f -v
