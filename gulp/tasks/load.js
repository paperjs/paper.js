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
    del = require('del'),
    symlink = require('gulp-symlink');

gulp.task('load', ['clean:load'], function() {
    return gulp.src('src/load.js')
        .pipe(symlink('dist/paper-full.js'))
        .pipe(symlink('dist/paper-core.js'));
});

gulp.task('clean:load', function() {
    return del([ 'dist/*.js', 'dist/node/**' ]);
});
