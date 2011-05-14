/***
 *
 * Paper.js
 *
 * A JavaScript Vector Graphics Library, based on Scriptographer.org and
 * designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 *
 ***
 *
 * Bootstrap.js JavaScript Framework.
 * http://bootstrapjs.org/
 *
 * Distributed under the MIT license.
 *
 * Copyright (c) 2006 - 2011 Juerg Lehni
 * http://lehni.org/
 *
 ***
 *
 * Parse-JS, A JavaScript tokenizer / parser / generator.
 *
 * Distributed under the BSD license.
 *
 * Copyright (c) 2010, Mihai Bazon <mihai.bazon@gmail.com>
 * http://mihai.bazon.net/blog/
 *
 ***/

var paper = new function() {
// Inline Bootstrap core (the Base class) inside the paper scope first:
//#include "../lib/bootstrap.js"

//#include "core/Base.js"
//#include "core/PaperScope.js"

// Include Paper classes, which are later injected into PaperScope by setting
// them on the 'this' object, e.g.:
// var Point = this.Point = Base.extend(...);

//#include "basic/Point.js"
//#include "basic/Size.js"
//#include "basic/Rectangle.js"
//#include "basic/Matrix.js"
//#include "basic/Line.js"

//#include "document/DocumentView.js"
//#include "document/Document.js"
//#include "document/Symbol.js"

//#include "item/ChangeFlags.js"
//#include "item/Item.js"
//#include "item/Group.js"
//#include "item/Layer.js"
//#include "item/Raster.js"
//#include "item/PlacedSymbol.js"
//#include "item/PathStyle.js"

//#include "path/Segment.js"
//#include "path/SegmentPoint.js"
//#include "path/SelectionState.js"
//#include "path/Curve.js"
//#include "path/CurveLocation.js"
//#include "path/PathItem.js"
//#include "path/Path.js"
//#include "path/CompoundPath.js"
//#include "path/Path.Constructors.js"

//#include "color/Color.js"
//#include "color/RGBColor.js"
//#include "color/HSBColor.js"
//#include "color/GrayColor.js"
//#include "color/GradientColor.js"
//#include "color/Gradient.js"
//#include "color/GradientStop.js"

//#ifdef BROWSER

//#include "browser/DomElement.js"
//#include "browser/DomEvent.js"

//#include "ui/Event.js"
//#include "ui/KeyEvent.js"
//#include "ui/Key.js"

//#include "tool/ToolEvent.js"
//#include "tool/ToolHandler.js"
//#include "tool/Tool.js"

//#endif // BROWSER

//#include "util/CanvasProvider.js"
//#include "util/Numerical.js"
//#include "util/PaperScript.js"
//#include "util/BlendMode.js"

// Finally inject the classes set on 'this' into the PaperScope class and create
// the first PaperScope and return it, all in one statement.
return new (PaperScope.inject(this));
};
