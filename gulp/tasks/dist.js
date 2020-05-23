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
    merge = require('merge-stream'),
    zip = require('gulp-zip');

gulp.task('dist', ['build', 'minify', 'docs']);

gulp.task('zip', ['clean:zip', 'dist'], function() {
    return merge(
            gulp.src([
                'dist/paper-full*.js',
                'dist/paper-core*.js',
                'dist/paper.d.ts',
                'dist/paper-core.d.ts',
                'dist/node/**/*',
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

gulp.task('clean:zip', function() {
    return del([
        'dist/paperjs.zip'
    ]);
});
