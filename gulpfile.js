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
    rimraf = require('gulp-rimraf'),
    shell = require('gulp-shell'),
    symlink = require('gulp-symlink'),
    uglify = require('gulp-uglify'),
    uncomment = require('gulp-uncomment'),
    whitespace = require('gulp-whitespace'),
    zip = require('gulp-zip'),
    merge = require('merge-stream'),
    gitty = require('gitty')('.'),
    fs = require('fs');

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
        // ascii_only: true,
        comments: /^!/
    }
};

var buildNames = Object.keys(buildOptions);
var docNames = Object.keys(docOptions);

gulp.on('error', function(err) {
    console.error(err.toString());
    gulp.emit('end');
});

gulp.task('test', function() {
    return gulp.src('test/index.html')
        .pipe(qunit({ timeout: 20, noGlobals: true }));
});

docNames.forEach(function(name) {
    gulp.task('docs:' + name, shell.task([
        'java -cp jsrun.jar:lib/* JsRun app/run.js -c=conf/' + name + '.conf ' +
            '-D="renderMode:' + docOptions[name] + '"',
    ], {
        cwd: 'jsdoc-toolkit'
    }));
});

gulp.task('docs', ['docs:local']);

gulp.task('load', ['clean:load'], function() {
    return gulp.src('src/load.js')
        .pipe(symlink('dist/paper-full.js'))
        .pipe(symlink('dist/paper-node.js'));
});

gulp.task('clean:load', function() {
    return gulp.src([
            'dist/paper-full.js',
            'dist/paper-node.js'
        ], { read: false })
        .pipe(rimraf());
});

gulp.task('build',
    buildNames.map(function(name) {
        return 'build:' + name;
    })
);

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

buildNames.forEach(function(name) {
    // Get the date of the last commit from git.
    var logData = gitty.logSync('-1');
    gulp.task('build:' + name, ['build:start'], function() {
        return gulp.src('src/paper.js')
            .pipe(prepro({
                evaluate: ['src/constants.js', 'src/options.js'],
                setup: function() {
                    var options = buildOptions[name];
                    options.date = logData[0].date;
                    // This object will be merged into the Prepro.js VM scope,
                    // which already holds a __options object from the above
                    // include statement.
                    return { __options: options };
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
    return gulp.src('dist/paper-*.js', { read: false })
        .pipe(rimraf());
});

gulp.task('minify:acorn', function() {
    var path = 'bower_components/acorn/';
    // Only compress acorn if the compressed file doesn't exist yet.
    try {
        fs.accessSync(path + 'acorn.min.js');
    } catch(e) {
        return gulp.src(path + 'acorn.js')
            .pipe(uglify(uglifyOptions))
            .pipe(rename({
                suffix: '.min'
            }))
            .pipe(gulp.dest(path));
    }
});
