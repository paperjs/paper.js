/*!
 * Paper.js v*#=* options.version - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: *#=* options.date
 *
 ***
 *
 * Bootstrap.js JavaScript Inheritance Micro-Framework
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Acorn.js
 * http://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

var paper = new function() {
// Inline Bootstrap core (the Base class) inside the paper scope first:
/*#*/ include('../lib/bootstrap.js');

/*#*/ if (options.version == 'dev') {
/*#*/ include('constants.js');
/*#*/ } // options.version == 'dev'

/*#*/ if (options.stats) {
/*#*/ include('../lib/stats.js');
/*#*/ } // options.stats

/*#*/ include('core/Base.js');
/*#*/ include('core/Callback.js');
/*#*/ include('core/PaperScope.js');
/*#*/ include('core/PaperScopeItem.js');

// Include Paper classes, which are later injected into PaperScope by setting
// them on the 'this' object, e.g.:
// var Point = this.Point = Base.extend(...);

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
/*#*/ include('item/PlacedItem.js');
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

/*#*/ include('text/TextItem.js');
/*#*/ include('text/PointText.js');

/*#*/ include('style/Style.js');

/*#*/ include('color/Color.js');
/*#*/ include('color/Gradient.js');
/*#*/ include('color/GradientStop.js');

/*#*/ if (options.browser) {
/*#*/ include('browser/DomElement.js');
/*#*/ include('browser/DomEvent.js');
/*#*/ } // options.browser

/*#*/ include('ui/View.js');
/*#*/ include('ui/CanvasView.js');

/*#*/ if (options.browser) {
/*#*/ include('ui/Event.js');
/*#*/ include('ui/KeyEvent.js');
/*#*/ include('ui/Key.js');
/*#*/ include('ui/MouseEvent.js');

/*#*/ include('ui/Palette.js');
/*#*/ include('ui/Component.js');

/*#*/ include('tool/ToolEvent.js');
/*#*/ include('tool/Tool.js');
/*#*/ } // options.browser

/*#*/ include('util/Format.js');
/*#*/ include('util/CanvasProvider.js');
/*#*/ include('util/Numerical.js');
/*#*/ include('util/BlendMode.js');
/*#*/ if (options.version == 'dev') {
/*#*/ include('util/ProxyContext.js');
/*#*/ } // options.browser

/*#*/ if (options.svg) {
/*#*/ include('svg/SvgStyles.js');
/*#*/ include('svg/SvgExport.js');
/*#*/ include('svg/SvgImport.js');
/*#*/ } // options.svg

/*#*/ include('core/PaperScript.js');
/*#*/ include('core/initialize.js');

/*#*/ if (options.version != 'dev') {
// Finally inject the classes set on 'this' into the PaperScope class and create
// the first PaperScope and return it, all in one statement.
// The version for 'dev' of this happens in core/initialize.js, since it depends
// on sequentiality of include() loading.
// Mark this object as enumerable, so all the injected classes can be enumerated
// again in PaperScope#install().
this.enumerable = true;
return new (PaperScope.inject(this));
/*#*/ } // options.version != 'dev'
};
