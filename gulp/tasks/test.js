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
    gutil = require('gulp-util'),
    chalk = require('chalk'),
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
        log: extend({ errors: true }, options)
    });
    // Use the correct working directory for tests:
    process.chdir('test');
    qunit_node.run({
        maxBlockDuration: 100 * 1000,
        deps: [
            // To dynamically load the tests from the sources, we need to
            // require Prepro.js first. Since we need a sub-module, we need to
            // use relative addresses: require('prepro/lib/node') does not work
            // because of the way node-qunit handles relative addresses.
            '../node_modules/prepro/lib/node.js',
            { path: '../dist/paper-full.js', namespace: 'paper' }
        ],
        code: 'load.js'
    }, function(err, stats) {
        var passed = false;
        if (err) {
            gulp.emit('error', new gutil.PluginError(node-qunit, err));
        } else {
            var color = stats.failed > 0 ? chalk.red : chalk.green;
            gutil.log('Took ' + stats.runtime + ' ms to run ' + chalk.blue(stats.assertions) + ' assertions. ' + color(stats.passed + ' passed, ' + stats.failed + ' failed.'));
            if (stats.failed > 0) {
                gutil.log('node-qunit: ' + chalk.red('✖') + ' QUnit assertions failed');
            } else {
                gutil.log('node-qunit: ' + chalk.green('✔') + ' QUnit assertions all passed');
                passed = true;
            }
        }
        gulp.emit('node-qunit.finished', { 'passed': passed });
        callback();
    });
});
