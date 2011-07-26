#! /usr/bin/env node
/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * Prepro.js - A simple preprocesssor for JavaScript that speaks JavaScript,
 * written in JavaScript, allowing preprocessing to either happen at build time
 * or compile time. Very useful for libraries that are built for distribution,
 * but can be also compiled from seperate sources directly for development,
 * supporting build time switches.
 */

// Require libs

var fs = require('fs'),
	path = require('path');

// Parse arguments

var args = process.argv.slice(2),
	options = {},
	files = [];

while (args.length > 0) {
	var arg = args.shift();
	switch (arg) {
	case '-d':
		// Definitions are provided as JSON and supposed to be object literals
		var def = JSON.parse(args.shift());
		// Merge new definitions into options object.
		for (var key in def)
			options[key] = def[key];
		break;	
	default:
		files.push(arg);
	}
}

// Preprocessing

var code = [];

function include(base, file) {
	// Compose a pathname from base and file, which is specified relatively,
	// and normalize the new path, to get rid of ..
	file = path.normalize(path.join(base, file));
	var content = fs.readFileSync(file).toString();
	content.split(/\r\n|\n|\r/mg).forEach(function(line) {
		// See if our line starts with the preprocess prefix.
		var match = line.match(/^\s*\/\*#\*\/\s*(.*)$/);
		if (match) {
			// Check if the preprocessing line is an include statement, and if
			// so, handle it straight away
			line = match[1];
			if (match = line.match(/^include\(['"]([^;]*)['"]\);?$/)) {
				// Pass on the dirname of the current file as the new base
				include(path.dirname(file), match[1]);
			} else {
				// Any other preprocessing code is simply added, for later 
				// evaluation.
				code.push(line);
			}
		} else {
			// Perhaps we need to replace some values? Supported formats are:
			// /*#=*/ options.NAME (outside comments)
			// *#=* options.NAME (inside comments)
			line = line.replace(/\/?\*#=\*\/?\s*options\.([\w]*)/g,
				function(all, name) {
					return options[name];
				}
			);
			// No add a statement that when evaluated writes out this code line
			code.push('console.log(' + JSON.stringify(line) + ');');
		}
	});
}

// Include all files. Everything else happens from there, through include()
files.forEach(function(file) {
	include(path.resolve(), file);
});

// Evaluate the resulting code: Calls puts() and writes the result to stdout.
eval(code.join('\n'));
