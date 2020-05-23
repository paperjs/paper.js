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
    prepro = require('gulp-prepro'),
    rename = require('gulp-rename'),
    uncomment = require('gulp-uncomment'),
    whitespace = require('gulp-whitespace'),
    del = require('del'),
    options = require('../utils/options.js');

// Options to be used in Prepro.js preprocessing through the global __options
// object, merged in with the options required above.
var buildOptions = {
    full: { paperScript: true },
    core: { paperScript: false }
};

var buildNames = Object.keys(buildOptions);

gulp.task('build',
    buildNames.map(function(name) {
        return 'build:' + name;
    }).concat(['build:copy'])
);

gulp.task('build:copy', function() {
    gulp.src(['src/node/*.js']).pipe(gulp.dest('dist/node'));
});

buildNames.forEach(function(name) {
    gulp.task('build:' + name, ['clean:build:' + name, 'minify:acorn'], function() {
        return gulp.src('src/paper.js')
            .pipe(prepro({
                // Evaluate constants.js inside the precompilation scope before
                // the actual precompilation, so all the constants substitution
                // statements in the code can work (look for: /*#=*/):
                evaluate: ['src/constants.js'],
                setup: function() {
                    // Return objects to be defined in the preprocess-scope.
                    // Note that this would be merged in with already existing
                    // objects.
                    return {
                        __options: Object.assign({}, options, buildOptions[name])
                    };
                }
            }))
            .pipe(uncomment({
                mergeEmptyLines: true
            }))
            .pipe(whitespace({
                spacesToTabs: 4,
                removeTrailing: true
            }))
            .pipe(rename({
                suffix: '-' + name
            }))
            .pipe(gulp.dest('dist'));
    });

    gulp.task('clean:build:' + name, function() {
        return del([
            'dist/paper-' + name + '*.js'
        ]);
    });
});
