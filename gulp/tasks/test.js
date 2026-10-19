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
    qunits = require('gulp-qunits'),
    webserver = require('gulp-webserver'),
    execFileSync = require('child_process').execFileSync,
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    argv = require('minimist')(process.argv.slice(2));

gulp.task('test', ['test:node']);

gulp.task('test:node', ['minify:acorn'], function(callback) {
    return gulp.src('load.js', { cwd: 'test' })
        .pipe(qunits({
            require: [
                // To dynamically load the tests files from the sources, we need
                // to require Prepro.js first.
                'prepro/lib/node.js',
                // Note that loading dist/paper-full.js also works in
                // combination with `gulp load`, in which case Prepro.js is
                // present and handles the loading transparently. Test other
                // builds with --build, e.g. `gulp test:node --build=sourced`.
                {
                    path: '../dist/paper-' + (argv.build || 'full') + '.js',
                    namespace: 'paper'
                }
            ],
            timeout: 40
        }));
});

// Run the browser tests in headless Chrome, which dumps the page once they're
// done, and report the result from it. Set CHROME to use another binary:
gulp.task('test:chrome', ['minify:acorn'], function(callback) {
    var chrome = process.env.CHROME || (process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : 'google-chrome'),
        page = execFileSync(chrome, [
            '--headless=new',
            '--no-sandbox',
            '--disable-gpu',
            // The tests load their assets from the file system:
            '--allow-file-access-from-files',
            '--user-data-dir='
                    + fs.mkdtempSync(path.join(os.tmpdir(), 'paper-')),
            '--virtual-time-budget=120000',
            '--dump-dom',
            'file://' + path.resolve('test/index.html')
        ], {
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'ignore']
        });

    function getText(html) {
        return html.replace(/<[^>]+>/g, ' ')
                .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    }

    var result = page.match(/id="qunit-testresult"[^>]*>([\s\S]*?)<\/p>/),
        failed = page.match(/<span class="failed">(\d+)<\/span>/),
        tests = page.split('<li id="qunit-test-output').slice(1);
    console.log(result ? getText(result[1]) : 'The tests did not finish.');
    tests.forEach(function(test) {
        if (/^[^>]*class="fail"/.test(test)) {
            var module = test.match(/class="module-name">([^<]*)</)[1],
                name = test.match(/class="test-name">([^<]*)</)[1];
            console.log('Failed: ' + getText(module + ': ' + name));
            (test.match(/<li class="fail">[\s\S]*?<\/li>/g) || [])
                .forEach(function(assertion) {
                    console.log('    ' + getText(assertion).slice(0, 500));
                });
        }
    });
    callback(!result || !failed || +failed[1]
            ? new Error('Browser tests failed.')
            : null);
});

gulp.task('test:browser', ['minify:acorn'], function() {
    gulp.src('.')
        .pipe(webserver({
            open: '/test'
        }));
});

