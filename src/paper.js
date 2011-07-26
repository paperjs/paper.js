/*!
 * Paper.js v*#=* options.version
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
 *
 * Date: *#=* options.date
 *
 ***
 *
 * Bootstrap.js JavaScript Framework.
 * http://bootstrapjs.org/
 *
 * Copyright (c) 2006 - 2011 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Parse-js
 *
 * A JavaScript tokenizer / parser / generator, originally written in Lisp.
 * Copyright (c) Marijn Haverbeke <marijnh@gmail.com>
 * http://marijn.haverbeke.nl/parse-js/
 *
 * Ported by to JavaScript by Mihai Bazon
 * Copyright (c) 2010, Mihai Bazon <mihai.bazon@gmail.com>
 * http://mihai.bazon.net/blog/
 *
 * Modifications and adaptions to browser (c) 2011, Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the BSD license.
 */

/**
 * @name _global_
 *
 * @class In a PaperScript context, the global scope is populated with all
 * fields of the currently active {@link PaperScope} object. In a JavaScript
 * context, it only contains the {@link #paper} reference to the currently
 * active {@link PaperScope} object, which also exposes all Paper classes.
 */

/**
 * {@grouptitle PaperScript Global Properties}
 *
 * @borrows PaperScope#version as _global_#version
 */

/**
 * A reference to the currently active {@link PaperScope} object.
 *
 * @name _global_#paper
 * @property
 * @type PaperScope
 */

/**
 * {@grouptitle PaperScript View Event Handlers}
 * A reference to the {@link View#onFrame} handler function.
 *
 * @name _global_#onFrame
 * @property
 * @type Function
 */

/**
 * A reference to the {@link View#onResize} handler function.
 *
 * @name _global_#onResize
 * @property
 * @type Function
 */

/**
 * {@grouptitle PaperScript Mouse Event Handlers}
 * A reference to the {@link Tool#onMouseDown} handler function.
 * @name _global_#onMouseDown
 * @property
 * @type Function
 */

/**
 * A reference to the {@link Tool#onMouseDrag} handler function.
 *
 * @name _global_#onMouseDrag
 * @property
 * @type Function
 */

/**
 * A reference to the {@link Tool#onMouseMove} handler function.
 *
 * @name _global_#onMouseMove
 * @property
 * @type Function
 */

/**
 * A reference to the {@link Tool#onMouseUp} handler function.
 *
 * @name _global_#onMouseUp
 * @property
 * @type Function
 */

/**
 * {@grouptitle PaperScript Keyboard Event Handlers}
 * A reference to the {@link Tool#onKeyDown} handler function.
 *
 * @name _global_#onKeyDown
 * @property
 * @type Function
 */

/**
 * A reference to the {@link Tool#onKeyUp} handler function.
 *
 * @name _global_#onKeyUp
 * @property
 * @type Function
 */

var paper = new function() {
// Inline Bootstrap core (the Base class) inside the paper scope first:
/*#*/ include('../lib/bootstrap.js');

/*#*/ if (options.stats) {
/*#*/ include('../lib/stats.js');
/*#*/ } // options.stats

/*#*/ include('core/Base.js');
/*#*/ include('core/PaperScope.js');

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

/*#*/ include('item/ChangeFlag.js');
/*#*/ include('item/Item.js');
/*#*/ include('item/Group.js');
/*#*/ include('item/Layer.js');
/*#*/ include('item/PlacedItem.js');
/*#*/ include('item/Raster.js');
/*#*/ include('item/PlacedSymbol.js');
/*#*/ include('item/HitResult.js');

/*#*/ include('path/Segment.js');
/*#*/ include('path/SegmentPoint.js');
/*#*/ include('path/SelectionState.js');
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
/*#*/ include('style/PathStyle.js');
/*#*/ include('style/ParagraphStyle.js');
/*#*/ include('style/CharacterStyle.js');

/*#*/ include('color/Color.js');
/*#*/ include('color/GradientColor.js');
/*#*/ include('color/Gradient.js');
/*#*/ include('color/GradientStop.js');

/*#*/ if (options.browser) {
/*#*/ include('browser/DomElement.js');
/*#*/ include('browser/DomEvent.js');

/*#*/ include('ui/View.js');
/*#*/ include('ui/Event.js');
/*#*/ include('ui/KeyEvent.js');
/*#*/ include('ui/Key.js');

/*#*/ include('tool/ToolEvent.js');
/*#*/ include('tool/Tool.js');
/*#*/ } // options.browser

/*#*/ include('util/CanvasProvider.js');
/*#*/ include('util/Numerical.js');
/*#*/ include('util/BlendMode.js');

/*#*/ include('core/PaperScript.js');

/*#*/ include('core/initialize.js');

/*#*/ if (options.version != 'dev') {
// Finally inject the classes set on 'this' into the PaperScope class and create
// the first PaperScope and return it, all in one statement.
// The version for 'dev' of this happens in core/initialize.js, since it depends
// on sequentiality of include() loading.
return new (PaperScope.inject(this));
/*#*/ } // options.version != 'dev'
};

/*#*/ // Load unit tests after library if we're asked to do so
/*#*/ if (options.tests) {
/*#*/ include('../test/lib/qunit/qunit.js');
/*#*/ include('../test/lib/helpers.js');

/*#*/ include('../test/tests/Point.js');
/*#*/ include('../test/tests/Size.js');
/*#*/ include('../test/tests/Rectangle.js');

/*#*/ include('../test/tests/Color.js');

/*#*/ include('../test/tests/Project.js');

/*#*/ include('../test/tests/Item.js');
/*#*/ include('../test/tests/Item_Cloning.js');
/*#*/ include('../test/tests/Item_Order.js');

/*#*/ include('../test/tests/Layer.js');
/*#*/ include('../test/tests/Group.js');
/*#*/ include('../test/tests/Segment.js');

/*#*/ include('../test/tests/Path.js');
/*#*/ include('../test/tests/PathStyle.js');
/*#*/ include('../test/tests/Path_Shapes.js');
/*#*/ include('../test/tests/Path_Drawing_Commands.js');
/*#*/ include('../test/tests/Path_Curves.js');
/*#*/ include('../test/tests/Path_Bounds.js');
/*#*/ include('../test/tests/Path_Length.js');
/*#*/ include('../test/tests/CompoundPath.js');

/*#*/ include('../test/tests/PlacedSymbol.js');

/*#*/ include('../test/tests/HitResult.js');
/*#*/ } // options.tests
