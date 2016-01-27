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
    qunit = require('gulp-qunit'),
    qunit_node = require('qunit');

gulp.task('test', ['test:browser']);

gulp.task('test:browser', ['minify:acorn'], function() {
    return gulp.src('test/index.html')
        .pipe(qunit({ timeout: 20, noGlobals: true }));
});

gulp.task('test:node', ['minify:acorn'], function(callback) {
    qunit_node.setup({
        log: {
            errors: true,
            globalSummary: true
        }
    });
    // Use the correct working directory for tests:
    process.chdir('test');
    qunit_node.run({
        maxBlockDuration: 100 * 1000,
        deps: [
            // To dynamically load from the sources, require Prepro.js first
            '../node_modules/prepro/lib/node',
            { path: '../src/load.js', namespace: 'paper' },
            { path: '../node_modules/resemblejs/resemble.js', namespace: 'resemble' }
        ],
        code: 'tests/load.js'
    }, callback);
});
