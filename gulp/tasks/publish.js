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
    addSrc = require('gulp-add-src'),
    bump = require('gulp-bump'),
    git = require('gulp-git-streamed'),
    shell = require('gulp-shell'),
    options = require('../utils/options.js')({ suffix: false });

gulp.task('publish', ['publish:bump', 'publish:release']);

gulp.task('publish:bump', function() {
    return gulp.src([ 'package.json', 'component.json' ])
        .pipe(bump({ version: options.version }))
        .pipe(gulp.dest('./'))
        .pipe(addSrc('src/options.js'))
        .pipe(git.add());
});

gulp.task('publish:release', function() {
    if (options.branch !== 'develop') {
        throw new Error('Publishing is only allowed on the develop branch.');
    }
    var message = 'Release version ' + options.version;
    return gulp.src('.')
        .pipe(git.commit(message))
        .pipe(git.tag('v' + options.version, message))
        .pipe(git.checkout('master'))
        .pipe(git.merge('develop', { args: '-X theirs' }))
        .pipe(git.push('origin', 'master' ))
        .pipe(git.push('origin', 'develop' ))
        .pipe(git.push(null, null, { args: '--tags' } ))
        .pipe(shell('npm publish'))
        .pipe(git.checkout('develop'));
});
