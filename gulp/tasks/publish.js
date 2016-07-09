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
    bump = require('gulp-bump'),
    git = require('gulp-git-streamed'),
    run = require('run-sequence'),
    shell = require('gulp-shell'),
    options = require('../utils/options.js');

gulp.task('publish', function() {
    if (options.branch !== 'develop') {
        throw new Error('Publishing is only allowed on the develop branch.');
    }
    return run(
        'publish:version',
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
    return gulp.src([ 'package.json' ])
        .pipe(bump({ version: options.version }))
        .pipe(gulp.dest('.'));
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
