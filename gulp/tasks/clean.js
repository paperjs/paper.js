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
    del = require('del');

gulp.task('clean:build', function() {
    return del([
        'dist/paper-*.js'
    ]);
});

gulp.task('clean:docs', function(callback) {
    return del([
        'dist/docs/**',
        'dist/serverdocs/**'
    ]);
});

gulp.task('clean:load', function() {
    return del([
        'dist/paper-full.js',
        'dist/paper-node.js'
    ]);
});
