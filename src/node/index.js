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
	// Node Canvas library: https://github.com/learnboost/node-canvas
	Canvas = require('canvas'),
	jsdom = require('jsdom'),
	dirname = path.resolve(__dirname, '..');

var options = {
	server: true,
	svg: true,
	parser: 'acorn',
	version: 'dev'
};

// Create a window and document using jsdom, e.g. for exportSVG()
var win = jsdom.createWindow(),
	doc = win.document = jsdom.jsdom("<html><body></body></html>");

// Create the context within which we will run the source files:
var context = vm.createContext({
	options: options,
	fs: fs,
	// We need to export the local Object definition, so Base.isPlainObject()
	// works. See http://nodejs.org/api/vm.html#vm_globals
	Object: Object,
	Array: Array,
	Canvas: Canvas,
	HTMLCanvasElement: Canvas,
	Image: Canvas.Image,
	// Copy over global variables:
	window: win,
    document: doc,
    navigator: win.navigator,
    console: console,
	require: require,
	__dirname: dirname,
	// Used to load and run source files within the same context:
	include: function(uri) {
		var source = fs.readFileSync(path.resolve(dirname, uri), 'utf8'),
			// For relative includes, we save the current directory and then
			// add the uri directory to dirname:
			prevDirname = dirname;
		dirname = path.resolve(dirname, path.dirname(uri));
		vm.runInContext(source, context, uri);
		dirname = prevDirname;
	}
});

// Load Paper.js library files:
context.include('paper.js');

// Export all classes through PaperScope:
context.Base.each(context, function(val, key) {
	if (val && val.prototype instanceof context.Base)
		context.PaperScope.prototype[key] = val;
});
context.PaperScope.prototype.Canvas = Canvas;

require.extensions['.pjs'] = function(module, uri) {
	var source = context.PaperScript.compile(fs.readFileSync(uri, 'utf8'));
	var prevDirname = context.__dirname,
		prevFilename = context.__filename;
	context.__dirname = path.dirname(uri);
	context.__filename = uri;
	var scope = new context.PaperScope();
	context.PaperScript.evaluate(source, scope);
	context.__dirname = prevDirname;
	context.__filename = prevFilename;
	module.exports = scope;
};

module.exports = new context.PaperScope();
