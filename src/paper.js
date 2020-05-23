/*!
 * Paper.js v*#=*__options.version - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: *#=*__options.date
 *
 ***
 *
 * Straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2020 Jürg Lehni
 * http://juerglehni.com/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Acorn.js
 * https://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

// Allow the minification of the undefined variable by defining it as a local
// parameter inside the paper scope.
var paper = function(self, undefined) {
/*#*/ include('init.js');
// Inline Straps.js core (the Base class) inside the paper scope first:
/*#*/ include('../node_modules/straps/straps.js');

/*#*/ include('core/Base.js');
/*#*/ include('core/Emitter.js');
/*#*/ include('core/PaperScope.js');
/*#*/ include('core/PaperScopeItem.js');

/*#*/ include('util/CollisionDetection.js');
/*#*/ include('util/Formatter.js');
/*#*/ include('util/Numerical.js');
/*#*/ include('util/UID.js');

// Include Paper classes, which are later injected into PaperScope by setting
// them on the 'this' object, e.g.:
// var Point = Base.extend(...);

/*#*/ include('basic/Point.js');
/*#*/ include('basic/Size.js');
/*#*/ include('basic/Rectangle.js');
/*#*/ include('basic/Matrix.js');
/*#*/ include('basic/Line.js');

/*#*/ include('item/Project.js');
/*#*/ include('item/Item.js');
/*#*/ include('item/Group.js');
/*#*/ include('item/Layer.js');
/*#*/ include('item/Shape.js');
/*#*/ include('item/Raster.js');
/*#*/ include('item/SymbolItem.js');
/*#*/ include('item/SymbolDefinition.js');
/*#*/ include('item/HitResult.js');

/*#*/ include('path/Segment.js');
/*#*/ include('path/SegmentPoint.js');
/*#*/ include('path/Curve.js');
/*#*/ include('path/CurveLocation.js');
/*#*/ include('path/PathItem.js');
/*#*/ include('path/Path.js');
/*#*/ include('path/Path.Constructors.js');
/*#*/ include('path/CompoundPath.js');
/*#*/ if (__options.booleanOperations) {
/*#*/     include('path/PathItem.Boolean.js');
/*#*/ }
/*#*/ include('path/PathFlattener.js');
/*#*/ include('path/PathFitter.js');

/*#*/ include('text/TextItem.js');
/*#*/ include('text/PointText.js');

/*#*/ include('style/Color.js');
/*#*/ include('style/Gradient.js');
/*#*/ include('style/GradientStop.js');
/*#*/ include('style/Style.js');

/*#*/ include('dom/DomElement.js');
/*#*/ include('dom/DomEvent.js');

/*#*/ include('view/View.js');
/*#*/ include('view/CanvasView.js');

/*#*/ include('event/Event.js');
/*#*/ include('event/KeyEvent.js');
/*#*/ include('event/Key.js');
/*#*/ include('event/MouseEvent.js');

/*#*/ include('tool/ToolEvent.js');
/*#*/ include('tool/Tool.js');

/*#*/ include('anim/Tween.js');

/*#*/ include('net/Http.js');

/*#*/ include('canvas/CanvasProvider.js');
/*#*/ include('canvas/BlendMode.js');
/*#*/ if (__options.load) {
/*#*/     include('canvas/ProxyContext.js');
/*#*/ }

/*#*/ if (__options.svg) {
/*#*/     include('svg/SvgElement.js');
/*#*/     include('svg/SvgStyles.js');
/*#*/     include('svg/SvgExport.js');
/*#*/     include('svg/SvgImport.js');
/*#*/ }

/*#*/ if (__options.paperScript) {
/*#*/     include('core/PaperScript.js');
/*#*/ }

/*#*/ include('export.js');
return paper;
}.call(this, typeof self === 'object' ? self : null);
