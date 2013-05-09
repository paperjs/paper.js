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
	domToHtml = require('jsdom/lib/jsdom/browser/domtohtml').domToHtml,
	dirname = path.resolve(__dirname, '..');

var options = {
	server: true,
	svg: true,
	parser: 'acorn',
	// Use 'dev' for on-the fly compilation of separate files ,but update after.
	version: 'dev'
};

// Create a window and document using jsdom, e.g. for exportSVG()
var win = jsdom.createWindow(),
	doc = win.document = jsdom.jsdom("<html><body></body></html>");

// Define XMLSerializer.
// TODO: Put this into a simple node module, with dependency on jsdom
function XMLSerializer() {
}

XMLSerializer.prototype.serializeToString = function(node) {
	var text = domToHtml(node);
	// Fix a jsdom issue where linearGradient gets converted to lineargradient:
	// https://github.com/tmpvar/jsdom/issues/620
	return text.replace(/(linear|radial)(gradient)/g, function(all, type) {
		return type + 'Gradient';
	});
};

// Create the context within which we will run the source files:
var context = vm.createContext({
	// Used to load and run source files within the same context:
	include: function(uri) {
		var source = fs.readFileSync(path.resolve(dirname, uri), 'utf8'),
			// For relative includes, we save the current directory and then
			// add the uri directory to dirname:
			prevDirname = dirname;
		dirname = path.resolve(dirname, path.dirname(uri));
		vm.runInContext(source, context, uri);
		dirname = prevDirname;
	},
	// Expose core methods and values
	__dirname: dirname,
	require: require,
	options: options,
	// Expose node modules
	fs: fs,
	Canvas: Canvas,
	// Expose global browser variables:
	HTMLCanvasElement: Canvas,
	Image: Canvas.Image,
	window: win,
    document: doc,
    navigator: win.navigator,
    console: console
});

// Load Paper.js library files:
context.include('paper.js');

// Since the created context fo Paper.js compilation, and the context in which
// Node.js scripts are executed do not share the definition of Object and Array,
// we need to redefine Base.isPlainObject() here.
// Object(obj) === obj is a trick from underscore, but also returns true for all
// Base objects. So we are filtering these out with an instanceof check, but
// Include Base instances since we're using them as hashes. 
// TODO: Benchmark the speed and consider this implementation instead of the
// current one.
var Base = context.Base;
Base.isPlainObject = function(obj) {
	return Object(obj) === obj && (!(obj instanceof Base)
			|| Object.getPrototypeOf(obj) === Base.prototype);
};

// Expose the Canvas, XMLSerializer to paper scopes:
Base.each({
	Canvas: Canvas,
	XMLSerializer: XMLSerializer
}, function(value, key) {
	this[key] = value;
}, context.PaperScope.prototype);

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
