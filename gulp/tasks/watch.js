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
    path = require('path'),
    gutil = require('gulp-util');

gulp.task('watch', function () {
    gulp.watch('src/**/*.js', ['jshint'])
        .on('change', function(event) {
            gutil.log(
                gutil.colors.green('File ' + event.type + ': ') +
                gutil.colors.magenta(path.basename(event.path))
            );
        });
});

