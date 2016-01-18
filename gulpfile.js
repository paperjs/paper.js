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
    prepro = require('gulp-prepro'),
    rename = require('gulp-rename'),
    shell = require('gulp-shell'),
    symlink = require('gulp-symlink'),
    uglify = require('gulp-uglify'),
    uncomment = require('gulp-uncomment'),
    whitespace = require('gulp-whitespace'),
    merge = require('merge-stream'),
    del = require('del'),
    extend = require('extend'),
    fs = require('fs'),
    gitty = require('gitty'),
    zip = require('gulp-zip');

/**
 * Options
 */

// Require the __options object before preprocessing, so we have access to the
// version number and can make amendments, e.g. the release date.
var options = require('./src/options.js');

// Options to be used in Prepro.js preprocessing through the global __options
// object.
var buildOptions = {
    full: { paperScript: true },
    core: { paperScript: false },
    node: { environment: 'node', paperScript: true }
};

var docOptions = {
    local: 'docs', // Generates the offline docs
    server: 'serverdocs' // Generates the website templates for the online docs
};

var uglifyOptions = {
    output: {
        ascii_only: true,
        comments: /^!/
    }
};

var acornPath = 'bower_components/acorn/';

var buildNames = Object.keys(buildOptions);
var docNames = Object.keys(docOptions);

/**
 * Git
 */

var gitRepo = gitty('.');

function git(param) {
    var args = arguments.length === 1 ? param.split(' ') : [].slice.apply(arguments);
    var operation = args.shift();
    return new gitty.Command(gitRepo, operation, args).execSync().trim();
}

// Get the date of the last commit from this branch for release date:
options.date = git('log -1 --pretty=format:%ad');
// If we're not on the master branch, append the branch name to the version:
var branch = git('rev-parse --abbrev-ref HEAD');
if (branch !== 'master')
    options.version += '-' + branch;

/**
 * Task: default
 */

gulp.on('error', function(err) {
    console.error(err.toString());
    gulp.emit('end');
});

gulp.task('default', ['dist']);

/**
 * Task: test
 */

gulp.task('test', function() {
    return gulp.src('test/index.html')
        .pipe(qunit({ timeout: 20, noGlobals: true }));
});

/**
 * Task: docs
 */

docNames.forEach(function(name) {
    gulp.task('docs:' + name, ['clean:docs'], shell.task([
        'java -cp jsrun.jar:lib/* JsRun app/run.js -c=conf/' + name + '.conf ' +
            '-D="renderMode:' + docOptions[name] + '"',
    ], {
        cwd: 'jsdoc-toolkit'
    }));
});

gulp.task('docs', ['docs:local']);

gulp.task('clean:docs', function(callback) {
    return del([
        'dist/docs/**',
        'dist/serverdocs/**'
    ]);
});

/**
 * Task: load
 */

gulp.task('load', ['clean:load'], function() {
    return gulp.src('src/load.js')
        .pipe(symlink('dist/paper-full.js'))
        .pipe(symlink('dist/paper-node.js'));
});

gulp.task('clean:load', function() {
    return del([
        'dist/paper-full.js',
        'dist/paper-node.js'
    ]);
});

/**
 * Task: build
 */

gulp.task('build',
    buildNames.map(function(name) {
        return 'build:' + name;
    })
);

// Get the date of the last commit from git.
buildNames.forEach(function(name) {
    gulp.task('build:' + name, ['build:start'], function() {
        return gulp.src('src/paper.js')
            .pipe(prepro({
                // Evaluate constants.js inside the precompilation scope before
                // the actual precompilation, so all the constants substitution
                // statements in the code can work (look for: /*#=*/):
                evaluate: ['src/constants.js'],
                setup: function() {
                    // Return objects to be defined in the preprocess-scope.
                    // Note that this would be merge in with already existing
                    // objects.
                    return {
                        __options: extend({}, options, buildOptions[name])
                    };
                }
            }))
            .pipe(uncomment({
                mergeEmptyLines: true
            }))
            .pipe(whitespace({
                spacesToTabs: 4,
                removeTrailing: true
            }))
            .pipe(rename({
                suffix: '-' + name
            }))
            .pipe(gulp.dest('dist'));
    });
});

gulp.task('build:start', ['clean:build', 'minify:acorn']);

gulp.task('clean:build', function() {
    return del([
        'dist/paper-*.js'
    ]);
});

gulp.task('minify:acorn', function() {
    // Only compress acorn if the compressed file doesn't exist yet.
    try {
        fs.accessSync(acornPath + 'acorn.min.js');
    } catch(e) {
        return gulp.src(acornPath + 'acorn.js')
            .pipe(uglify(uglifyOptions))
            .pipe(rename({
                suffix: '.min'
            }))
            .pipe(gulp.dest(acornPath));
    }
});

/**
 * Task: minify
 */

gulp.task('minify', ['build'], function() {
    return gulp.src([
            'dist/paper-full.js',
            'dist/paper-core.js'
        ])
        .pipe(uglify(uglifyOptions))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('dist'));
});

/**
 * Task: dist
 */

gulp.task('dist', ['minify', 'docs'], function() {
    return merge(
            gulp.src([
                'dist/paper-full*.js',
                'dist/paper-core*.js',
                'LICENSE.txt',
                'examples/**/*',
            ], { base: '.' }),
            gulp.src([
                'dist/docs/**/*'
            ], { base: 'dist' })
        )
        .pipe(zip('/paperjs.zip'))
        .pipe(gulp.dest('dist'));
});
