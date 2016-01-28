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
    gulp_qunit = require('gulp-qunit'),
    node_qunit = require('qunit'),
    gutil = require('gulp-util');

gulp.task('test', ['test:browser']);

gulp.task('test:browser', ['minify:acorn'], function() {
    return gulp.src('test/index.html')
        .pipe(gulp_qunit({ timeout: 20, noGlobals: true }));
});

gulp.task('test:node', ['minify:acorn'], function(callback) {
    // Use the correct working directory for tests:
    process.chdir('./test');
    // Deactivate all logging since we're doing our own directly to gutil.log()
    // from helpers.js
    node_qunit.setup({ log: {} });
    node_qunit.run({
        maxBlockDuration: 100 * 1000,
        deps: [
            // To dynamically load the tests files from the sources, we need to
            // require Prepro.js first. Since we need a sub-module, we have to
            // use relative addresses: require('prepro/lib/node') does not work
            // because of the way node-qunit handles relative addresses.
            '../node_modules/prepro/lib/node.js',
            // Note that loading dist/paper-full.js also works in combination
            // with `gulp load`, in which case Prepro.js is present and handles
            // the loading transparently.
            { path: '../dist/paper-full.js', namespace: 'paper' }
        ],
        // Now load the actual test files through test/load.js, using Prepro.js
        // for the loading, which was requested above.
        code: 'load.js'
    }, function(err, stats) {
        err = err || stats.failed > 0 && 'QUnit assertions failed';
        callback(err && new gutil.PluginError('node-qunit', err));
    });
});
