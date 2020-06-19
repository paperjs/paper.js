/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var gulp = require('gulp'),
    path = require('path'),
    log = require('fancy-log'),
    colors = require('ansi-colors');

gulp.task('watch', function () {
    gulp.watch('src/**/*.js', ['jshint'])
        .on('change', function(event) {
            log(
                colors.green('File ' + event.type + ': ') +
                colors.magenta(path.basename(event.path))
            );
        });
});

