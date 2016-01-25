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

gulp.task('docs', ['docs:local']);

for (var key in docOptions) {
    gulp.task('docs:' + key, ['clean:docs:' + key], shell.task([
        'java -cp jsrun.jar:lib/* JsRun app/run.js -c=conf/' + key + '.conf ' +
            '-D="renderMode:' + docOptions[key] + '" ' +
            '-D="version:' + options.version + '"'
    ], {
        cwd: 'gulp/jsdoc'
    }));
}

for (var key in docOptions) {
    gulp.task('clean:docs:' + key, function(callback) {
        return del([
            'dist/' + docOptions[key] + '/**',
        ]);
    });
}
