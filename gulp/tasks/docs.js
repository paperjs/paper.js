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
    rename = require('gulp-rename'),
    shell = require('gulp-shell'),
    options = require('../utils/options.js')({ suffix: true });

var docOptions = {
    local: 'docs', // Generates the offline docs
    server: 'serverdocs' // Generates the website templates for the online docs
};

gulp.task('docs', ['docs:local', 'build:full'], function() {
    gulp.src('dist/paper-full.js')
        .pipe(rename({ basename: 'paper' }))
        .pipe(gulp.dest('dist/docs/assets/js/'));
});

Object.keys(docOptions).forEach(function(name) {
    gulp.task('docs:' + name, ['clean:docs:' + name], shell.task([
        'java -cp jsrun.jar:lib/* JsRun app/run.js -c=conf/' + name + '.conf ' +
            '-D="renderMode:' + docOptions[name] + '" ' +
            '-D="version:' + options.version + '"'
    ], {
        cwd: 'gulp/jsdoc'
    }));

    gulp.task('clean:docs:' + name, function() {
        return del([
            'dist/' + docOptions[name] + '/**',
        ]);
    });
});
