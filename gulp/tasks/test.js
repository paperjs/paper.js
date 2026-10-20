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
    spawn = require('child_process').spawn,
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
                // builds with --build, e.g. `gulp test:node --build=hosted`.
                {
                    path: '../dist/paper-' + (argv.build || 'full') + '.js',
                    namespace: 'paper'
                },
                // A current Acorn, for the tests of what hosts can parse with
                // their own, see the PaperScript tests:
                {
                    path: 'acorn-latest',
                    namespace: 'acornLatest'
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

// Sweeps the boolean operations of the tests and issue cases with tiny moves of
// their second operand, and compares how many results stay the same and how
// many points they fill wrongly with test/booleans/baseline.json. Fails if any
// case got worse. Update the baseline with --update, test other builds with
// --build, e.g. `gulp test:booleans --build=hosted`, and leave out the points
// within a multiple of the operation's epsilon of an outline with --exclusion,
// e.g. `--exclusion=10`, and scale or move all operands with --scale and
// --translation. See test/booleans/sweep.js
gulp.task('test:booleans', ['minify:acorn'], function(callback) {
    var dir = path.join('test', 'booleans'),
        build = path.join('dist', 'paper-' + (argv.build || 'full') + '.js'),
        baselineFile = path.join(dir, 'baseline.json'),
        results = [],
        counts = {};

    // Sweeps the cases from the given one on in a child process, which is
    // restarted after a case that doesn't return within 20 seconds:
    function run(first) {
        var child = spawn(process.execPath,
                [path.join(dir, 'sweep.js'), build, first,
                    argv.exclusion || '', argv.scale || '',
                    argv.translation || '']),
            buffer = '',
            started,
            timer;
        function watch(delay) {
            clearTimeout(timer);
            timer = setTimeout(function() {
                child.kill();
            }, delay);
        }
        // Loading the library and the tests takes longer than a case:
        watch(60000);
        child.stdout.on('data', function(data) {
            var lines = (buffer + data).split('\n');
            buffer = lines.pop();
            lines.forEach(function(line) {
                var result = JSON.parse(line);
                if (result.start) {
                    started = result;
                } else {
                    results.push(result);
                }
            });
            watch(20000);
        });
        child.stderr.pipe(process.stderr);
        child.on('exit', function(code, signal) {
            clearTimeout(timer);
            if (signal) {
                results.push({ label: started.label, op: started.op,
                        timeout: true });
                run(started.index + 1);
            } else if (code) {
                callback(new Error('The boolean sweep failed.'));
            } else {
                finish();
            }
        });
    }

    function finish() {
        // Key the results by label, operation and occurrence:
        var current = {};
        results.forEach(function(result) {
            var key = result.label + ' / ' + result.op;
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] > 1)
                key += ' (' + counts[key] + ')';
            current[key] = result.timeout ? { timeout: true }
                    : result.skipped || result.error
                        ? { skipped: result.skipped || result.error }
                        : { stable: result.stable, wrong: result.wrong,
                            movedWrong: result.movedWrong,
                            nonPlanar: result.nonPlanar };
        });
        var baseline = fs.existsSync(baselineFile)
                ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : {},
            worse = [],
            better = [],
            stable = 0,
            wrong = 0,
            movedWrong = 0,
            nonPlanar = 0,
            timeouts = 0;
        Object.keys(current).forEach(function(key) {
            var entry = current[key],
                base = baseline[key];
            stable += entry.stable || 0;
            wrong += entry.wrong || 0;
            movedWrong += entry.movedWrong || 0;
            nonPlanar += entry.nonPlanar || 0;
            timeouts += entry.timeout ? 1 : 0;
            if (base) {
                var change = entry.timeout ? base.timeout ? 0 : -1
                        : base.timeout ? 1
                        : entry.stable - base.stable || base.wrong - entry.wrong;
                if (change < 0)
                    worse.push(key + ': ' + JSON.stringify(base) + ' -> '
                            + JSON.stringify(entry));
                if (change > 0)
                    better.push(key);
            }
        });
        console.log('Boolean sweep: ' + results.length + ' cases, '
                + stable + ' stable results under tiny moves, ' + wrong
                + ' wrongly filled points, ' + movedWrong
                + ' in the results of the tiny moves, ' + nonPlanar
                + ' graphs that are not planar, ' + timeouts + ' timeouts. '
                + better.length + ' better than the baseline, ' + worse.length
                + ' worse.');
        worse.forEach(function(line) {
            console.log('Worse: ' + line);
        });
        results.forEach(function(result) {
            if (result.nonPlanar) {
                console.log('Not planar: ' + result.label + ' / ' + result.op
                        + ': ' + result.nonPlanar + ', '
                        + JSON.stringify(result.repro));
            }
        });
        if (argv.update) {
            fs.writeFileSync(baselineFile,
                    JSON.stringify(current, null, 4) + '\n');
            console.log('Updated ' + baselineFile + '.');
            callback();
        } else {
            callback(worse.length
                    ? new Error('The boolean sweep got worse than the baseline.')
                    : null);
        }
    }

    run(0);
});

gulp.task('test:browser', ['minify:acorn'], function() {
    gulp.src('.')
        .pipe(webserver({
            open: '/test'
        }));
});

