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

// This file is only used by examples and unit tests, in order to load the
// library without having to preprocess it first.
//
// NOTE: Any files added as includes to paper.js also need to be listed here

var sources = [
	'lib/bootstrap.js',
	'lib/parse-js.js',
	'lib/stats.js',

	'src/core/Base.js',
	'src/core/PaperScope.js',

	'src/paper.js',

	'src/basic/Point.js',
	'src/basic/Size.js',
	'src/basic/Rectangle.js',
	'src/basic/Matrix.js',
	'src/basic/Line.js',

	'src/project/Project.js',
	'src/project/Symbol.js',

	'src/item/ChangeFlag.js',
	'src/item/Item.js',
	'src/item/Group.js',
	'src/item/Layer.js',
	'src/item/PlacedItem.js',
	'src/item/Raster.js',
	'src/item/PlacedSymbol.js',

	'src/path/Segment.js',
	'src/path/SegmentPoint.js',
	'src/path/SelectionState.js',
	'src/path/Curve.js',
	'src/path/CurveLocation.js',
	'src/path/PathItem.js',
	'src/path/Path.js',
	'src/path/CompoundPath.js',
	'src/path/Path.Constructors.js',
	'src/path/PathFlattener.js',
	'src/path/PathFitter.js',

	'src/text/TextItem.js',
	'src/text/PointText.js',

	'src/style/Style.js',
	'src/style/PathStyle.js',
	'src/style/ParagraphStyle.js',
	'src/style/CharacterStyle.js',

	'src/color/Color.js',
	'src/color/GradientColor.js',
	'src/color/Gradient.js',
	'src/color/GradientStop.js',

	'src/browser/DomElement.js',
	'src/browser/DomEvent.js',

	'src/ui/View.js',
	'src/ui/Event.js',
	'src/ui/KeyEvent.js',
	'src/ui/Key.js',

	'src/tool/ToolEvent.js',
	'src/tool/Tool.js',

	'src/util/CanvasProvider.js',
	'src/util/Numerical.js',
	'src/util/BlendMode.js',

	'src/core/PaperScript.js'
];

// Load unit tests after library if asked to do so
if (window.tests) {
	sources.push(
		'test/lib/qunit/qunit.js',
		'test/lib/helpers.js',

		'test/tests/Point.js',
		'test/tests/Size.js',
		'test/tests/Rectangle.js',

		'test/tests/Color.js',

		'test/tests/Project.js',

		'test/tests/Item.js',
		'test/tests/Item_Cloning.js',
		'test/tests/Item_Order.js',

		'test/tests/Layer.js',
		'test/tests/Group.js',
		'test/tests/Segment.js',

		'test/tests/Path.js',
		'test/tests/PathStyle.js',
		'test/tests/Path_Shapes.js',
		'test/tests/Path_Drawing_Commands.js',
		'test/tests/Path_Curves.js',
		'test/tests/Path_Bounds.js',
		'test/tests/Path_Length.js',
		'test/tests/CompoundPath.js',

		'test/tests/PlacedSymbol.js'
	);
}

for (var i = 0; i < sources.length; i++) {
	document.write('<script type="text/javascript" src="' + (window.root || '')
			+ sources[i] + '"></script>');
}

