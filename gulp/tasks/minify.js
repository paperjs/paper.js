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
    rename = require('gulp-rename'),
    fs = require('fs'),
    uglify = require('gulp-uglify');

var acornPath = 'node_modules/acorn/';

var uglifyOptions = {
    output: {
        ascii_only: true,
        comments: /^!/
    }
};

gulp.task('minify', ['build'], function() {
    return gulp.src([
            'dist/paper-full.js',
            'dist/paper-core.js'
        ])
        .pipe(uglify(uglifyOptions))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('minify:acorn', function() {
    // Only compress acorn if the compressed file doesn't exist yet.
    try {
        fs.accessSync(acornPath + 'acorn.min.js');
    } catch(e) {
        return gulp.src(acornPath + 'acorn.js')
            .pipe(uglify(uglifyOptions))
            .pipe(rename({
                suffix: '.min'
            }))
            .pipe(gulp.dest(acornPath));
    }
});
