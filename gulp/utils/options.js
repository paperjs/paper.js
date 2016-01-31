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

var execSync = require('child_process').execSync,
    extend = require('extend'),
    // Require the __options object, so we have access to the version number and
    // make amendments, e.g. the release date.
    options = require('../../src/options.js');

function git(command) {
    return execSync('git ' + command).toString().trim();
}

// Get the date of the last commit from this branch for release date:
var date = git('log -1 --pretty=format:%ad'),
    branch = git('rev-parse --abbrev-ref HEAD');

extend(options, {
    date: date,
    branch: branch,
    // If we're not on the master branch, use the branch name as a suffix:
    suffix: branch === 'master' ? '' : '-' + branch
});

module.exports = function(opts) {
    return extend({}, options, opts && opts.suffix && {
        version: options.version + options.suffix
    });
};
