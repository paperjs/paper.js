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

// The build itself is in build.mjs, which runs in this process, so that it
// gets the version that publish:version resets:
var gulp = require('gulp');

gulp.task('build', function() {
    return import('../../build.mjs').then(function(module) {
        module.build();
    });
});
