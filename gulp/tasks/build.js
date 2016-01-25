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
    prepro = require('gulp-prepro'),
    rename = require('gulp-rename'),
    uncomment = require('gulp-uncomment'),
    whitespace = require('gulp-whitespace'),
    del = require('del'),
    extend = require('extend'),
    options = require('../utils/options.js');

// Options to be used in Prepro.js preprocessing through the global __options
// object, merged in with the options required above.
var buildOptions = {
    full: { paperScript: true },
    core: { paperScript: false },
    node: { environment: 'node', paperScript: true }
};

gulp.task('build',
    Object.keys(buildOptions).map(function(name) {
        return 'build:' + name;
    })
);

for (var key in buildOptions) {
    gulp.task('build:' + key, ['clean:build', 'minify:acorn'], function() {
        return gulp.src('src/paper.js')
            .pipe(prepro({
                // Evaluate constants.js inside the precompilation scope before
                // the actual precompilation, so all the constants substitution
                // statements in the code can work (look for: /*#=*/):
                evaluate: ['src/constants.js'],
                setup: function() {
                    // Return objects to be defined in the preprocess-scope.
                    // Note that this would be merge in with already existing
                    // objects.
                    return {
                        __options: extend({}, options, buildOptions[key])
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
                suffix: '-' + key
            }))
            .pipe(gulp.dest('dist'));
    });
}

gulp.task('clean:build', function() {
    return del([
        'dist/paper-*.js'
    ]);
});
