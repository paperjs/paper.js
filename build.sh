#!/bin/bash

npm config set registry http://registry.npmjs.org/
npm install
bower install

cd build
./minify-components.sh
./build.sh
./minify.sh
