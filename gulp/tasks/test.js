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

// The unit tests run with Vitest, see vitest.config.mjs. Gulp only runs the
// boolean sweep:
var gulp = require('gulp'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    argv = require('minimist')(process.argv.slice(2));

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

    // Sweeps every n-th case from the given one on in one child process per
    // core, each restarted after a case that doesn't return within 2 minutes:
    var step = os.cpus().length,
        running = 0;
    function run(first) {
        running++;
        var child = spawn(process.execPath,
                [path.join(dir, 'sweep.js'), build, first + ':' + step,
                    argv.exclusion || '', argv.scale || '',
                    argv.translation || ''],
                // Let the children write their errors directly:
                { stdio: ['ignore', 'pipe', 'inherit'] }),
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
            watch(120000);
        });
        child.on('exit', function(code, signal) {
            clearTimeout(timer);
            running--;
            if (signal) {
                results.push({ label: started.label, op: started.op,
                        index: started.index, timeout: true });
                run(started.index + step);
            } else if (code) {
                callback(new Error('The boolean sweep failed.'));
            } else if (!running) {
                finish();
            }
        });
    }

    function finish() {
        // Key the results by label, operation and occurrence, in the order
        // of the cases:
        var current = {};
        results.sort(function(a, b) {
            return a.index - b.index;
        });
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
        // The points close to the outlines, per multiple of epsilon:
        ['near', 'movedNear'].forEach(function(name) {
            var sums = {};
            results.forEach(function(result) {
                Object.keys(result[name] || {}).forEach(function(factor) {
                    var sum = sums[factor] = sums[factor] || [0, 0];
                    sum[0] += result[name][factor][0];
                    sum[1] += result[name][factor][1];
                });
            });
            console.log((name === 'near' ? 'Close to the outlines'
                    : 'Close to the outlines of the tiny moves')
                    + ': ' + Object.keys(sums).map(function(factor) {
                        return sums[factor][0] + ' of ' + sums[factor][1]
                                + ' wrong at ' + factor + ' epsilon';
                    }).join(', ') + '.');
        });
        worse.forEach(function(line) {
            console.log('Worse: ' + line);
        });
        results.forEach(function(result) {
            if (result.wrong || result.movedWrong) {
                console.log('Wrong: ' + result.label + ' / ' + result.op
                        + ': ' + result.wrong + ', in the results of the tiny'
                        + ' moves: ' + result.movedWrong);
            }
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

    for (var i = 0; i < step; i++)
        run(i);
});

