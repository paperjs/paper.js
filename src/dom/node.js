/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Node.js emulation layer of browser based environment, based on node-canvas
// and jsdom.

// console.log(__dirname);

var jsdom = require('jsdom'),
	domToHtml = require('jsdom/lib/jsdom/browser/domtohtml').domToHtml,
	// Node Canvas library: https://github.com/learnboost/node-canvas
	Canvas = require('canvas'),
	// Expose global browser variables and create a document and a window using
	// jsdom, e.g. for import/exportSVG()
	document = jsdom.jsdom('<html><body></body></html>'),
	window = document.createWindow(),
	navigator = window.navigator,
	HTMLCanvasElement = Canvas,
	Image = Canvas.Image;

// Define XMLSerializer and DOMParser shims, to emulate browser behavior.
// TODO: Put this into a simple node module, with dependency on jsdom?
function XMLSerializer() {
}

XMLSerializer.prototype.serializeToString = function(node) {
	var text = domToHtml(node);
	// Fix a jsdom issue where all SVG tagNames are lowercased:
	// https://github.com/tmpvar/jsdom/issues/620
	var tagNames = ['linearGradient', 'radialGradient', 'clipPath'];
	for (var i = 0, l = tagNames.length; i < l; i++) {
		var tagName = tagNames[i];
		text = text.replace(
			new RegExp('(<|</)' + tagName.toLowerCase() + '\\b', 'g'),
			function(all, start) {
				return start + tagName;
			});
	}
	return text;
};

function DOMParser() {
}

DOMParser.prototype.parseFromString = function(string, contenType) {
	var div = document.createElement('div');
	div.innerHTML = string;
	return div.firstChild;
};
