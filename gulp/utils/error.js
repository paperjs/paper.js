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
    gutil = require('gulp-util'),
    ERROR = gutil.colors.red('[ERROR]');

gulp.on('error', function(err) {
    var msg = err.toString();
    if (msg === '[object Object]')
        msg = err;
    if (err.stack)
        msg += err.stack;
    msg.split(/\r\n|\n|\r/mg).forEach(function(line) {
        gutil.log(ERROR, line);
    });
    this.emit('end');
});
