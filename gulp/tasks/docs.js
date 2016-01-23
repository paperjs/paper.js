/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var gulp = require('gulp'),
    del = require('del'),
    shell = require('gulp-shell'),
    options = require('../utils/options.js');

var docOptions = {
    local: 'docs', // Generates the offline docs
    server: 'serverdocs' // Generates the website templates for the online docs
};

Object.keys(docOptions).forEach(function(name) {
    gulp.task('docs:' + name, ['clean:docs'], shell.task([
        'java -cp jsrun.jar:lib/* JsRun app/run.js -c=conf/' + name + '.conf ' +
            '-D="renderMode:' + docOptions[name] + '" ' +
            '-D="version:' + options.version + '"'
    ], {
        cwd: 'gulp/jsdoc'
    }));
});

gulp.task('docs', ['docs:local']);
