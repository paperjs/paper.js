/*!
 * Paper.js v*#=* __options.version - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: *#=* __options.date
 *
 ***
 *
 * straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * acorn.js
 * http://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

// Allow the minification of the undefined variable by defining it as a local
// parameter inside the paper scope.
var paper = new function(undefined) {
// Inline Bootstrap core (the Base class) inside the paper scope first:
/*#*/ include('../bower_components/straps/straps.js', { exports: false });

/*#*/ if (__options.stats) {
/*#*/ include('../bower_components/stats.js/build/stats.min.js');
/*#*/ } // __options.stats

/*#*/ if (__options.version == 'dev') {
/*#*/ include('constants.js');
/*#*/ } // __options.version == 'dev'

/*#*/ include('core/Base.js');
/*#*/ include('core/Callback.js');
/*#*/ include('core/PaperScope.js');
/*#*/ include('core/PaperScopeItem.js');

/*#*/ include('util/Formatter.js');
/*#*/ include('util/Numerical.js');

// Include Paper classes, which are later injected into PaperScope by setting
// them on the 'this' object, e.g.:
// var Point = Base.extend(...);

/*#*/ include('basic/Point.js');
/*#*/ include('basic/Size.js');
/*#*/ include('basic/Rectangle.js');
/*#*/ include('basic/Matrix.js');
/*#*/ include('basic/Line.js');

/*#*/ include('project/Project.js');
/*#*/ include('project/Symbol.js');

/*#*/ include('item/Item.js');
/*#*/ include('item/Group.js');
/*#*/ include('item/Layer.js');
/*#*/ include('item/Shape.js');
/*#*/ include('item/Raster.js');
/*#*/ include('item/PlacedSymbol.js');
/*#*/ include('item/HitResult.js');

/*#*/ include('path/Segment.js');
/*#*/ include('path/SegmentPoint.js');
/*#*/ include('path/Curve.js');
/*#*/ include('path/CurveLocation.js');
/*#*/ include('path/PathItem.js');
/*#*/ include('path/Path.js');
/*#*/ include('path/Path.Constructors.js');
/*#*/ include('path/CompoundPath.js');
/*#*/ include('path/PathFlattener.js');
/*#*/ include('path/PathFitter.js');
/*#*/ include('path/PathItem.Boolean.js');

/*#*/ include('text/TextItem.js');
/*#*/ include('text/PointText.js');

/*#*/ include('style/Color.js');
/*#*/ include('style/Gradient.js');
/*#*/ include('style/GradientStop.js');
/*#*/ include('style/Style.js');

/*#*/ if (__options.environment == 'node') {
/*#*/ include('dom/node.js');
/*#*/ } // __options.environment == 'node'
/*#*/ include('dom/DomElement.js');
/*#*/ if (__options.environment == 'browser') {
// DomEvent doesn't make sense outside of the browser (yet)
/*#*/ include('dom/DomEvent.js');
/*#*/ } // __options.environment == 'browser'

/*#*/ include('ui/View.js');
/*#*/ include('ui/CanvasView.js');

/*#*/ if (__options.environment == 'browser') {
/*#*/ include('ui/Event.js');
/*#*/ include('ui/KeyEvent.js');
/*#*/ include('ui/Key.js');
/*#*/ include('ui/MouseEvent.js');

/*#*/ if (__options.palette) {
/*#*/ include('ui/Palette.js');
/*#*/ include('ui/Component.js');
/*#*/ } // __options.palette

/*#*/ include('tool/ToolEvent.js');
/*#*/ include('tool/Tool.js');

// Http is used both for PaperScript and SVGImport
/*#*/ if (__options.paperscript || __options.svg) {
/*#*/ include('net/Http.js');
/*#*/ } // __options.paperscript || __options.svg
/*#*/ } // __options.environment == 'browser'

/*#*/ include('canvas/CanvasProvider.js');
/*#*/ include('canvas/BlendMode.js');
/*#*/ if (__options.version == 'dev') {
/*#*/ include('canvas/ProxyContext.js');
/*#*/ } // __options.environment == 'browser'

/*#*/ if (__options.svg) {
/*#*/ include('svg/SVGStyles.js');
/*#*/ include('svg/SVGNamespaces.js');
/*#*/ include('svg/SVGExport.js');
/*#*/ include('svg/SVGImport.js');
/*#*/ } // __options.svg

/*#*/ include('export.js');
return paper;
};

// include PaperScript separately outside the main paper scope, due to its use
// of with(). This also simplifies making its inclusion optional.
/*#*/ if (__options.paperscript) {
/*#*/ include('core/PaperScript.js');
/*#*/ } // __options.paperscript
