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
    gutil.log(ERROR, err);
    if (err.stack)
        gutil.log(ERROR, err.stack);
    this.emit('end');
});
