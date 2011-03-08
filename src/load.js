/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved. See LICENSE file for details.
 */

// This file is only used by examples and unit tests, in order to load the
// library without having to preprocess it first.
//
// NOTE: Any files added as includes to paper.js also need to be listed here

var id = '?' + Math.random(),
	loadBase = window.loadBase || '',
	loadTests = window.loadTests,
	loaded = false;

function addEvent(obj, type, fn) {
	if (obj.addEventListener) {
		obj.addEventListener(type, fn, false);
	} else if (obj.attachEvent) {
		obj.attachEvent('on'+ type, fn);
	}
}

addEvent(window, 'load', function() {
	loaded = true;
});

// Load Paper.js library bit by bit, in chunks defined by inderdependent files.
var items = [
	[
		'lib/bootstrap.js',
		'lib/parse-js.js'
	], [
		'src/paper.js'
	], [
		'src/basic/Point.js',
		'src/basic/Size.js',
		'src/basic/Rectangle.js',
		'src/basic/Matrix.js',
		'src/basic/Line.js'
	], [
		'src/document/DocumentView.js',
		'src/document/Document.js',
		'src/document/Symbol.js'
	], [
		'src/item/Item.js'
	], [
		'src/item/Group.js',
		'src/item/Raster.js',
		'src/item/PlacedSymbol.js',
		'src/item/PathStyle.js',
		'src/path/PathItem.js',
		'src/path/Segment.js',
		'src/path/Curve.js'
	], [
		// Requires Group
		'src/item/Layer.js',
		// Requires PathItem
		'src/path/Path.js',
		'src/path/CompoundPath.js'
	], [
		'src/path/Path.Constructors.js',
		'src/color/Color.js'
	], [
		// Requires Color
		'src/color/RGBColor.js',
		'src/color/GrayColor.js',
		'src/color/GradientColor.js',
		'src/color/Gradient.js',
		'src/color/GradientStop.js'
	], [
		'src/tool/ToolEvent.js',
		'src/tool/ToolHandler.js'
	], [
		// Requires ToolHandler
		'src/tool/Tool.js',
		'src/util/BlendMode.js',
		'src/util/CanvasProvider.js',
		'src/util/Numerical.js',
		'src/util/Events.js'
	], [
		// Requires Events
		'src/util/PaperScript.js'
	]
];

// Load unit tests after library if asked to do so
if (loadTests) {
	items.push(
		[
			'test/lib/qunit/qunit.js',
			'test/lib/test_functions.js'
		],
		// Load each test seperately
		[ 'test/tests/Point.js' ], 
		[ 'test/tests/Size.js' ],
		[ 'test/tests/Rectangle.js' ],
		[ 'test/tests/Color.js' ],
		[ 'test/tests/Document.js' ],
		[ 'test/tests/Item.js' ],
		[ 'test/tests/Layer.js' ],
		[ 'test/tests/Group.js' ],
		[ 'test/tests/Segment.js' ],
		[ 'test/tests/Path.js' ],
		[ 'test/tests/Path_Shapes.js' ],
		[ 'test/tests/Path_Drawing_Commands.js' ],
		[ 'test/tests/Path_Bounds.js' ],
		[ 'test/tests/Path_Length.js' ],
		[ 'test/tests/PathStyle.js' ],
		[ 'test/tests/PlacedSymbol.js' ]
	);
}

// This bit of code is required to convert the above lists of grouped sources
// to the odd load.js format:
var loader = null;
for (var i = 0; i < items.length; i++) {
	var sources = items[i];
	for (var j = 0; j < sources.length; j++) {
		sources[j] = loadBase + sources[j] + id;
	}
	if (!loader) {
		loader = load.apply(window, sources);
	} else {
		loader.then.apply(loader, sources);
	}
}



// At the end of loading, run PaperScript and QUnit if required
loader.thenRun(
	function() {
		if (loaded) {
			PaperScript.load();
			if (loadTests) {
				QUnit.load();
			}
		}
	}
);
