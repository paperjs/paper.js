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
    qunit_node = require('qunit'),
    extend = require('extend'),
    minimist = require('minimist');

// Support simple command line options to pass on to test:node, to display
// errors selectively, e.g.:
// gulp test:node --assertions
var options = minimist(process.argv.slice(2), {
  boolean: true
});

gulp.task('test', ['test:browser']);

gulp.task('test:browser', ['minify:acorn'], function() {
    return gulp.src('test/index.html')
        .pipe(qunit({ timeout: 20, noGlobals: true }));
});

gulp.task('test:node', ['minify:acorn'], function(callback) {
    qunit_node.setup({
        log: extend({ errors: true, globalSummary: true }, options)
    });
    // Use the correct working directory for tests:
    process.chdir('test');
    qunit_node.run({
        maxBlockDuration: 100 * 1000,
        deps: [
            // To dynamically load from the sources, require Prepro.js first
            '../node_modules/prepro/lib/node',
            { path: '../src/load.js', namespace: 'paper' }
        ],
        code: 'load.js'
    }, callback);
});
