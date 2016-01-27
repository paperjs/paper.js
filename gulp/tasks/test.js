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
    var name = 'node-qunit';
    qunit_node.setup({
        log: extend({ errors: true }, options)
    });
    // Use the correct working directory for tests:
    process.chdir('./test');
    qunit_node.run({
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
        var result;
        if (err) {
            result = new gutil.PluginError(name, err);
        } else {
            // Imitate the way gulp-qunit formats results and errors.
            var color = gutil.colors[stats.failed > 0 ? 'red' : 'green'];
            gutil.log('Took ' + stats.runtime + ' ms to run ' +
                gutil.colors.blue(stats.assertions) + ' tests. ' +
                color(stats.passed + ' passed, ' + stats.failed + ' failed.'));
            if (stats.failed > 0) {
                err = 'QUnit assertions failed';
                gutil.log(name + ': ' + gutil.colors.red('✖ ') + err);
                result = new gutil.PluginError(name, err);
            } else {
                gutil.log(name + ': ' + gutil.colors.green('✔ ') +
                    'QUnit assertions all passed');
            }
        }
        callback(result);
    });
});
