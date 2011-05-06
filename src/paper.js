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
// Have a pointer to the paper object already during the 'bootstraping' so code
// can rely on it being there all the time.
var paper = this;

this.document = null;
this.documents = [];

this.install = function(scope) {
	for (var i in this) {
		scope[i] = this[i];
	}
};

// Inline Base core inside the paper scope first:
//#include "../lib/bootstrap.js"

Base.inject({
	statics: true,

	read: function(list, start, length) {
		var start = start || 0,
			length = length || list.length - start;
		var obj = list[start];
		// If the class defines _readNull, return null when nothing was provided
		if (obj instanceof this
				|| this.prototype._readNull && obj == null && length <= 1)
			return obj;
		obj = new this(this.dont);
		return obj.initialize.apply(obj, start > 0 || length < list.length
			? Array.prototype.slice.call(list, start, start + length)
			: list) || obj;
	},

	readAll: function(list, start) {
		var res = [], entry;
		for (var i = start || 0, l = list.length; i < l; i++) {
			res.push(Array.isArray(entry = list[i])
				? this.read(entry, 0)
				: this.read(list, i, 1));
		}
		return res;
	},

	capitalize: function(str) {
		return str.replace(/\b[a-z]/g, function(match) {
			return match.toUpperCase();
		});
	},

	formatNumber: function(num) {
		return (Math.round(num * 100000) / 100000).toString();
	}
});

//#ifdef BROWSER
//#include "browser/Element.js"
//#include "browser/Event.js"
//#endif // BROWSER

//#include "util/CanvasProvider.js"
//#include "util/Numerical.js"
//#include "util/PaperScript.js"
//#include "util/BlendMode.js"

//#include "basic/Point.js"
//#include "basic/Size.js"
//#include "basic/Rectangle.js"
//#include "basic/Matrix.js"
//#include "basic/Line.js"

//#include "document/DocumentView.js"
//#include "document/Document.js"
//#include "document/Symbol.js"

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
//#include "color/GrayColor.js"
//#include "color/GradientColor.js"
//#include "color/Gradient.js"
//#include "color/GradientStop.js"

//#include "tool/ToolEvent.js"
//#include "tool/ToolHandler.js"
//#include "tool/Tool.js"

//#ifdef BROWSER
//#include "ui/Key.js"
//#endif // BROWSER
};
