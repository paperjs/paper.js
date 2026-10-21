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
    fs = require('fs'),
    path = require('path'),
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
        'publish:changelog',
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

// Collect the entries of the unreleased changes, along with those still in the
// Unreleased section of CHANGELOG.md, into the section of the new version, and
// delete their files. Each file in changelog/unreleased holds the entries of
// one pull request under the headings of their kind, so that pull requests
// don't conflict in CHANGELOG.md, see its README.
gulp.task('publish:changelog', ['publish:version'], function() {
    var kinds = ['News', 'Security', 'Added', 'Changed', 'Deprecated',
            'Removed', 'Fixed'],
        folder = 'changelog/unreleased',
        files = fs.readdirSync(folder).filter(function(file) {
            return /\.md$/.test(file) && file !== 'README.md';
        }).sort().map(function(file) {
            return path.join(folder, file);
        }),
        changelog = fs.readFileSync('CHANGELOG.md', 'utf8'),
        // The Unreleased section, or an empty one above the latest version:
        match = changelog.match(/^## Unreleased\n([^]*?)(?=^## )/m),
        start = match ? match.index : changelog.search(/^## /m),
        end = match ? start + match[0].length : start,
        entries = {};

    function collect(text, source) {
        var sections = text.split(/^### /m);
        if (sections.shift().trim())
            throw new Error('Text before the first heading in ' + source);
        sections.forEach(function(section) {
            var lines = section.split('\n'),
                kind = lines.shift(),
                // Each entry is a list item, with its indented lines:
                items = lines.join('\n').split(/\n(?=- )/).map(function(item) {
                    return item.trim();
                }).filter(Boolean);
            if (kinds.indexOf(kind) === -1)
                throw new Error('Unknown heading ### ' + kind + ' in ' + source);
            entries[kind] = (entries[kind] || []).concat(items);
        });
    }

    collect(match ? match[1] : '', 'CHANGELOG.md');
    files.forEach(function(file) {
        collect(fs.readFileSync(file, 'utf8'), file);
    });
    var sections = kinds.filter(function(kind) {
        return entries[kind];
    }).map(function(kind) {
        return '### ' + kind + '\n\n' + entries[kind].join('\n') + '\n';
    });
    if (!sections.length)
        throw new Error('No changelog entries to release.');
    fs.writeFileSync('CHANGELOG.md', changelog.slice(0, start)
            + '## `' + options.version + '`\n\n' + sections.join('\n') + '\n'
            + changelog.slice(end));
    files.forEach(function(file) {
        fs.unlinkSync(file);
    });
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
