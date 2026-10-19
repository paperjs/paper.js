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
    run = require('run-sequence'),
    git = require('gulp-git-streamed'),
    shell = require('gulp-shell'),
    jsonModifier = require('gulp-json-modifier'),
    options = require('../utils/options.js');

var packages = ['paper-jsdom', 'paper-jsdom-canvas'],
    releaseMessage = null,
    jsonModifierOptions = { indent: 2 };

gulp.task('publish', function(callback) {
    if (options.branch !== 'develop') {
        throw new Error('Publishing is only allowed on the develop branch.');
    }
    // Commit, tag and push the release. Pushing the tag runs the release
    // workflow on GitHub Actions, which publishes it to npm, the website and
    // the sketch editor:
    run(
        'publish:json',
        'publish:dist',
        'publish:packages',
        'publish:commit',
        'publish:release',
        'publish:load',
        callback
    );
});

gulp.task('publish:version', function() {
    // Reset the version value since we're executing this on the develop branch,
    // but we don't wan the published version suffixed with '-develop'.
    options.resetVersion();
    releaseMessage = 'Release version ' + options.version;
});

gulp.task('publish:json', ['publish:version'], function() {
    return gulp.src(['package.json'])
        .pipe(jsonModifier({
            version: options.version
        }, jsonModifierOptions))
        .pipe(gulp.dest('.'))
});

// Build the files that the release commits in dist:
gulp.task('publish:dist', ['build', 'docs:typescript']);

gulp.task('publish:commit', ['publish:version'], function() {
    return gulp.src('.')
        .pipe(shell('pnpm install')) // Update pnpm-lock.yaml
        .pipe(git.add({ args: '--update' }))
        .pipe(git.commit(releaseMessage))
        .pipe(git.tag('v' + options.version, releaseMessage));
});

gulp.task('publish:release', function() {
    return gulp.src('.')
        .pipe(git.checkout('main'))
        .pipe(git.merge('develop', { args: '-X theirs' }))
        .pipe(git.push('origin', ['main', 'develop'], { args: '--tags' }));
});

gulp.task('publish:packages',
    packages.map(function(name) {
        return 'publish:packages:' + name;
    })
);

packages.forEach(function(name) {
    gulp.task('publish:packages:' + name, ['publish:version'], function() {
        var path = 'packages/' + name,
            opts = { cwd: path };
        return gulp.src(['package.json'], opts)
            .pipe(jsonModifier({
                version: options.version,
                dependencies: {
                    paper: options.version
                }
            }, jsonModifierOptions))
            .pipe(gulp.dest(path));
    });
});

gulp.task('publish:load', ['load'], function() {
    return gulp.src('dist')
        .pipe(git.checkout('develop'))
        .pipe(git.add())
        .pipe(git.commit('Switch back to load.js versions on develop branch.'))
        .pipe(git.push('origin', 'develop'));
});
