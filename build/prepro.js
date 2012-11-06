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
 *
 * Arguments:
 *  -d DEFINE_JSON -- define a json containing defintions availabe to prepro
 *  -i INCLUDE_JS -- include a JS file containing definitinos availabe to prepro
 *  -c -- strip comments
 */

// Required libs

var fs = require('fs'),
	path = require('path'),
	vm = require('vm');

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
			// /*#=*/ eval (outside comments)
			// *#=* eval (inside comments)
			line = line.replace(/\/?\*#=\*\/?\s*([\w.]*)/g,
				function(all, val) {
					return eval(val);
				}
			);
			// Now add a statement that when evaluated writes out this code line
			code.push('out.push(' + JSON.stringify(line) + ');');
		}
	});
}

function parse() {
	var out = [];
	// Evaluate the collected code: Collects result in out, through out.push() 
	eval(code.join('\n'));
	// Start again with a new code buffer.
	code = [];
	// Return the resulting lines as one string.
	return out.join('\n');
}

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
	case '-i':
		// Include code to be present at prepro time, e.g. for on-the-fly
		// replacement of constants, using /*#=*/ statements.
		// Luckily we can reuse the include() / parse() functionality to do so:
		var file = args.shift();
		if (file) {
			include(path.resolve(), path.normalize(file));
			eval(parse());
		}
		break;
	case '-c':
		strip = true;
		break;
	default:
		files.push(arg);
	}
}

// Include all files. Everything else happens from there, through include()
files.forEach(function(file) {
	include(path.resolve(), file);
});

var out = parse();

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
	// Add some padding so we can always look ahead and behind by two chars
	str = ('__' + str + '__').split('');
	var quote = false,
		quoteSign,
		blockComment = false,
		lineComment = false,
		preserveComment = false;
	for (var i = 0, l = str.length; i < l; i++) {
		if (quote) {
			// When checking for quote escaping, we also need to check that the
			// escape sign itself is not escaped, as otherwise '\\' would cause
			// the wrong impression of and endlessly open string:
			if (str[i] === quoteSign && (str[i - 1] !== '\\' || str[i - 2] === '\\'))
				quote = false;
		} else if (blockComment) {
			// Is the block comment closing?
			if (str[i] === '*' && str[i + 1] === '/') {
				if (!preserveComment)
					str[i] = str[i + 1] = '';
				blockComment = preserveComment = false;
			} else if (!preserveComment) {
				str[i] = '';
			}
		} else if (lineComment) {
			// One-line comments end with the line-break
			if (/[\n\r]/.test(str[i + 1]))
				lineComment = false;
			str[i] = '';
		} else {
			quote = /['"]/.test(str[i]);
			if (quote)
				quoteSign = str[i];
			if (!blockComment && str[i] === '/') {
				if (str[i + 1] === '*') {
					// Do not filter out conditional comments /*@ ... */
					// and comments marked as protected /*! ... */
					preserveComment = /[@!]/.test(str[i + 2]);
					if (!preserveComment)
						str[i] = '';
					blockComment = true;
				} else if (str[i + 1] === '/') {
					str[i] = '';
					lineComment = true;
				}
			}
		}
	}
	// Remove padding again.
	return str.join('').slice(2, -2);
}
