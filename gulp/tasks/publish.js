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
    git = require('gulp-git-streamed'),
    jsonEditor = require('gulp-json-editor'),
    merge = require('merge-stream'),
    run = require('run-sequence'),
    shell = require('gulp-shell'),
    options = require('../utils/options.js');

var packages = ['paper-jsdom', 'paper-jsdom-canvas'],
    jsonOptions = {
        end_with_newline: true
    };

gulp.task('publish', function() {
    if (options.branch !== 'develop') {
        throw new Error('Publishing is only allowed on the develop branch.');
    }
    return run(
        'publish:version',
        'publish:packages',
        'publish:dist',
        'publish:commit',
        'publish:release',
        'publish:load'
    );
});

gulp.task('publish:version', function() {
    // Reset the version value since we're executing this on the develop branch,
    // but we don't wan the published version suffixed with '-develop'.
    options.resetVersion();
    return gulp.src(['package.json'])
        .pipe(jsonEditor({
            version: options.version
        }, jsonOptions))
        .pipe(gulp.dest('.'));
});

gulp.task('publish:packages',
    packages.map(function(name) {
        return 'publish:packages:' + name;
    })
);

packages.forEach(function(name) {
    gulp.task('publish:packages:' + name, function() {
        options.resetVersion(); // See 'publish:version'
        var message = 'Release version ' + options.version,
            path = 'packages/' + name,
            opts = { cwd: path };
        gulp.src(['package.json'], opts)
            .pipe(jsonEditor({
                version: options.version,
                dependencies: {
                    paper: options.version
                }
            }, jsonOptions))
            .pipe(gulp.dest(path))
            .pipe(git.add(opts))
            .pipe(git.commit(message, opts))
            .pipe(git.tag('v' + options.version, message, opts))
            .pipe(git.push('origin', 'master', { args: '--tags', cwd: path }))
            .pipe(shell('npm publish', opts));
    });
});

gulp.task('publish:dist', ['dist']);

gulp.task('publish:commit', function() {
    var message = 'Release version ' + options.version;
    return gulp.src('.')
        .pipe(git.checkout('develop'))
        .pipe(git.add())
        .pipe(git.commit(message))
        .pipe(git.tag('v' + options.version, message));
});

gulp.task('publish:release', function() {
    return gulp.src('.')
        .pipe(git.checkout('master'))
        .pipe(git.merge('develop', { args: '-X theirs' }))
        .pipe(git.push('origin', ['master', 'develop'], { args: '--tags' }))
        .pipe(shell('npm publish'));
});

gulp.task('publish:load', ['load'], function() {
    return gulp.src('dist')
        .pipe(git.checkout('develop'))
        .pipe(git.add())
        .pipe(git.commit('Switch back to load.js versions on develop branch.'))
        .pipe(git.push('origin', 'develop'));
});
