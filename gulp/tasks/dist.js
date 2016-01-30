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
    merge = require('merge-stream'),
    zip = require('gulp-zip');

gulp.task('dist', ['minify', 'docs', 'clean:dist'], function() {
    return merge(
            gulp.src([
                'dist/paper-full*.js',
                'dist/paper-core*.js',
                'LICENSE.txt',
                'examples/**/*',
            ], { base: '.' }),
            gulp.src([
                'dist/docs/**/*'
            ], { base: 'dist' })
        )
        .pipe(zip('paperjs.zip'))
        .pipe(gulp.dest('dist'));
});

gulp.task('clean:dist', function() {
    return del([
        'dist/paperjs.zip'
    ]);
});
