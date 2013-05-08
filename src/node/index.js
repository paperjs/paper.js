/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var fs = require('fs'),
	vm = require('vm'),
	path = require('path'),
	Canvas = require('canvas');

__dirname = path.resolve(__dirname, '..');

// Create the context within which we will run the source files:
var context = vm.createContext({
	options: {
		server: true,
		svg: true,
		parser: 'acorn',
		version: 'dev'
	},
	fs: fs,
	// Node Canvas library: https://github.com/learnboost/node-canvas
	Canvas: Canvas,
	HTMLCanvasElement: Canvas,
	Image: Canvas.Image,
	// Copy over global variables:
    console: console,
	require: require,
	__dirname: __dirname,
	__filename: __filename,
	// Used to load and run source files within the same context:
	include: function(uri) {
		var source = fs.readFileSync(path.resolve(__dirname, uri), 'utf8');
		// For relative includes, we save the current directory and then
		// add the uri directory to __dirname:
		var oldDirname = __dirname;
		__dirname = path.resolve(__dirname, path.dirname(uri));
		vm.runInContext(source, context, uri);
		__dirname = oldDirname;
	}
});

// Load Paper.js library files:
context.include('paper.js');

// Export all classes through PaperScope:
context.Base.each(context, function(val, key) {
	if (val && val.prototype instanceof context.Base)
		context.PaperScope.prototype[key] = val;
});
context.PaperScope.prototype['Canvas'] = context.Canvas;

require.extensions['.pjs'] = function(module, uri) {
	var source = context.PaperScript.compile(fs.readFileSync(uri, 'utf8'));
	var envVars = 'var __dirname = \'' + path.dirname(uri) + '\';' + 
				 'var __filename = \'' + uri + '\';';
	vm.runInContext(envVars, context);
	var scope = new context.PaperScope();
	context.PaperScript.evaluate(source, scope);
	module.exports = scope;
};

module.exports = new context.PaperScope();
