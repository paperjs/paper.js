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
    path = require('path'),
    fs = require('fs'),
    del = require('del'),
    run = require('run-sequence'),
    git = require('gulp-git-streamed'),
    shell = require('gulp-shell'),
    merge = require('merge-stream'),
    rename = require('gulp-rename'),
    jsonEditor = require('gulp-json-editor'),
    options = require('../utils/options.js');

var packages = ['paper-jsdom', 'paper-jsdom-canvas'],
    sitePath = path.resolve('../paperjs.org'),
    referencePath = sitePath + '/content/08-Reference',
    downloadPath = sitePath + '/content/11-Download',
    assetPath = sitePath + '/assets/js',
    releaseMessage = null,
    jsonOptions = {
        end_with_newline: true
    };

gulp.task('publish', function() {
    if (options.branch !== 'develop') {
        throw new Error('Publishing is only allowed on the develop branch.');
    }
    // publish:website comes before publish:release, so paperjs.zip file is gone
    // before npm publish:
    return run(
        'publish:json',
        'publish:dist',
        'publish:packages',
        'publish:commit',
        'publish:website',
        'publish:release',
        'publish:load'
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
        .pipe(jsonEditor({
            version: options.version
        }, jsonOptions))
        .pipe(gulp.dest('.'));
});

gulp.task('publish:dist', ['zip']);

gulp.task('publish:commit', ['publish:version'], function() {
    return gulp.src('.')
        .pipe(git.checkout('develop'))
        .pipe(git.add())
        .pipe(git.commit(releaseMessage))
        .pipe(git.tag('v' + options.version, releaseMessage));
});

gulp.task('publish:release', function() {
    return gulp.src('.')
        .pipe(git.checkout('master'))
        .pipe(git.merge('develop', { args: '-X theirs' }))
        .pipe(git.push('origin', ['master', 'develop'], { args: '--tags' }))
        .pipe(shell('npm publish'));
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
        gulp.src(['package.json'], opts)
            .pipe(jsonEditor({
                version: options.version,
                dependencies: {
                    paper: options.version
                }
            }, jsonOptions))
            .pipe(gulp.dest(path))
            .pipe(git.add(opts))
            .pipe(git.commit(releaseMessage, opts))
            .pipe(git.tag('v' + options.version, releaseMessage, opts))
            .pipe(git.push('origin', 'master', { args: '--tags', cwd: path }))
            .pipe(shell('npm publish', opts));
    });
});

gulp.task('publish:website', function() {
    if (fs.lstatSync(sitePath).isDirectory()) {
        return run(
            'publish:website:build',
            'publish:website:push'
        );
    }
});

gulp.task('publish:website:build', [
    'publish:website:json', 'publish:website:docs',
    'publish:website:zip', 'publish:website:assets'
]);

gulp.task('publish:website:json', ['publish:version'], function() {
    return gulp.src([sitePath + '/package.json'])
        .pipe(jsonEditor({
            version: options.version
        }, jsonOptions))
        .pipe(gulp.dest(sitePath));
});

gulp.task('publish:website:docs:clean', function() {
    return del([ referencePath + '/*' ], { force: true });
});

gulp.task('publish:website:docs',
    ['publish:version', 'publish:website:docs:clean', 'docs:server'],
function() {
    return gulp.src('dist/serverdocs/**')
        .pipe(gulp.dest(referencePath));
});

gulp.task('publish:website:zip', ['publish:version'], function() {
    return gulp.src('dist/paperjs.zip')
        .pipe(rename({ suffix: '-v' + options.version }))
        .pipe(gulp.dest(downloadPath));
});

gulp.task('publish:website:assets', function() {
    // Always delete the old asset first, in case it's a symlink which Gulp
    // doesn't handle well.
    fs.unlinkSync(assetPath + '/paper.js');
    return gulp.src('dist/paper-full.js')
        .pipe(rename({ basename: 'paper' }))
        .pipe(gulp.dest(assetPath));
});

gulp.task('publish:website:push', ['publish:version'], function() {
    var opts = { cwd: sitePath };
    return gulp.src(sitePath)
        .pipe(git.add(opts))
        .pipe(git.commit(releaseMessage, opts))
        .pipe(git.tag('v' + options.version, releaseMessage, opts))
        .pipe(git.push('origin', 'master', { args: '--tags', cwd: sitePath }));
});

gulp.task('publish:load', ['load'], function() {
    return gulp.src('dist')
        .pipe(git.checkout('develop'))
        .pipe(git.add())
        .pipe(git.commit('Switch back to load.js versions on develop branch.'))
        .pipe(git.push('origin', 'develop'));
});
