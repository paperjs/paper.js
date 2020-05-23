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
    jshint = require('gulp-jshint'),
    cache = require('gulp-cached');

gulp.task('jshint', function () {
    return gulp.src('src/**/*.js')
        .pipe(cache('jshint', { optimizeMemory: true }))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-summary'))
        .pipe(jshint.reporter('fail'));
});
