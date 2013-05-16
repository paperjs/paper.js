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
	json = require('../../package.json');

var options = {
	server: true,
	svg: true,
	parser: 'acorn',
	// Use 'dev' for on-the fly compilation of separate files ,but update after.
	version: 'dev'
};

// Create a document and a window using jsdom, e.g. for exportSVG()
var doc = jsdom.jsdom("<html><body></body></html>"),
	win = doc.createWindow();

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

function DOMParser() {
}

DOMParser.prototype.parseFromString = function(string, contenType) {
	var div = doc.createElement('div');
	div.innerHTML = string;
	return div.firstChild;
};

// Create the context within which we will run the source files:
var dirname = path.resolve(__dirname, '..');
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
	XMLSerializer: XMLSerializer,
	DOMParser: DOMParser,
	Image: Canvas.Image,
	window: win,
    document: doc,
    navigator: win.navigator,
    console: console
});

// Load Paper.js library files:
context.include('paper.js');

// Since the context used for Paper.js compilation, and the context in which
// Node.js scripts are executed do not share the definition of Object, we need
// to redefine Base.isPlainObject() here.
// So instead of checking for Object.prototype, we're checking
// proto.constructor.name for 'Object'
var Base = context.Base;
Base.isPlainObject = function(obj) {
	var proto = obj !== null && typeof obj === 'object'
			&& Object.getPrototypeOf(obj);
	return proto && (proto.constructor.name === 'Object'
			|| proto === Base.prototype);
};

context.PaperScope.inject({
	// Expose the Canvas, XMLSerializer & DOMParser to PaperScope:
	Canvas: Canvas,
	XMLSerializer: XMLSerializer,
	DOMParser: DOMParser,
	// Also fix version. Remove 2nd dot, so we can make a float out of it:
	version: parseFloat(json.version.replace(/(.)(\d)$/, '$2'))
});

require.extensions['.pjs'] = function(module, uri) {
	var source = context.PaperScript.compile(fs.readFileSync(uri, 'utf8'));
	// Temporarily override __dirname and __filename
	var envVars = 'var __dirname = \'' + path.dirname(uri) + '\';'
			+ 'var __filename = \'' + uri + '\';';
	vm.runInContext(envVars, context);
	var scope = new context.PaperScope();
	context.PaperScript.evaluate(source, scope);
	module.exports = scope;
};

module.exports = context.paper;
