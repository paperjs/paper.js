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

// Required libs

var fs = require('fs'),
	path = require('path');

// Parse arguments

var args = process.argv.slice(2),
	options = {},
	files = [],
	strip = false;

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
	case '-c':
		strip = true;
		break;
	default:
		files.push(arg);
	}
}

// Preprocessing

var code = [],
	out = [];

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
			// Now add a statement that when evaluated writes out this code line
			code.push('out.push(' + JSON.stringify(line) + ');');
		}
	});
}

// Include all files. Everything else happens from there, through include()
files.forEach(function(file) {
	include(path.resolve(), file);
});

// Evaluate the resulting code: Calls puts() and writes the result to stdout.
eval(code.join('\n'));

// Convert the resulting lines to one string again.
var out = out.join('\n');

if (strip) {
	out = stripComments(out);
	// Strip empty lines that contain only white space and line breaks, as they
	// are left-overs from comment removal.
	out = out.replace(/^[ \t]+(\r\n|\n|\r)/gm, function(all) {
		return '';
	});
	// Replace a sequence of more than two line breaks with only two.
	out = out.replace(/(\r\n|\n|\r)(\r\n|\n|\r)+/g, function(all, lineBreak) {
		return lineBreak + lineBreak;
	});
}

// Write the result out
process.stdout.write(out);

/**
 * Strips comments out of JavaScript code, based on:
 * http://james.padolsey.com/javascript/removing-comments-in-javascript/
*/
function stripComments(str) {
	str = ('__' + str + '__').split('');
	var singleQuote = false,
		doubleQuote = false,
		blockComment = false,
		lineComment = false,
		preserveComment = false;
	for (var i = 0, l = str.length; i < l; i++) {
		if (singleQuote) {
			if (str[i] == "'" && str[i - 1] !== '\\')
				singleQuote = false;
		} else if (doubleQuote) {
			if (str[i] == '"' && str[i - 1] !== '\\')
				doubleQuote = false;
		} else if (blockComment) {
			// Is the block comment closing?
			if (str[i] == '*' && str[i + 1] == '/') {
				if (!preserveComment)
					str[i] = str[i + 1] = '';
				blockComment = preserveComment = false;
			} else if (!preserveComment) {
				str[i] = '';
			}
		} else if (lineComment) {
			// One-line comments end with the line-break
			if (str[i + 1] == '\n' || str[i + 1] == '\r')
				lineComment = false;
			str[i] = '';
		} else {
			doubleQuote = str[i] == '"';
			singleQuote = str[i] == "'";
			if (!blockComment && str[i] == '/') {
				if (str[i + 1] == '*') {
					// Do not filter out conditional comments and comments marked
					// as protected (/*! */)
					preserveComment = str[i + 2] == '@' || str[i + 2] == '!';
					if (!preserveComment)
						str[i] = '';
					blockComment = true;
				} else if (str[i + 1] == '/') {
					str[i] = '';
					lineComment = true;
				}
	 		}
		}
 	}
	return str.join('').slice(2, -2);
}
