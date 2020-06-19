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
    log = require('fancy-log'),
    colors = require('ansi-colors'),
    ERROR = colors.red('[ERROR]');

gulp.on('error', function(err) {
    var msg = err.toString();
    if (msg === '[object Object]')
        msg = err;
    if (err.stack)
        msg += err.stack;
    msg.split(/\r\n|\n|\r/mg).forEach(function(line) {
        log(ERROR, line);
    });
    this.emit('end');
});
