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

var gitty = require('gitty'),
    extend = require('extend');

// Require the __options object, so we have access to the version number and
// make amendments, e.g. the release date.
var options = require('../../src/options.js'),
    repo = gitty('.');

function git(param) {
    var args = arguments.length === 1 ? param.split(' ')
            : [].slice.apply(arguments),
        operation = args.shift();
    return new gitty.Command(repo, operation, args).execSync().trim();
}

// Get the date of the last commit from this branch for release date:
options.date = git('log -1 --pretty=format:%ad');
// If we're not on the master branch, append the branch name to the version:
var branch = git('rev-parse --abbrev-ref HEAD'),
    suffix = branch === 'master' ? '' : '-' + branch;

module.exports = function(opts) {
    return extend({}, options, opts && opts.suffix && {
        version: options.version + suffix
    });
};
