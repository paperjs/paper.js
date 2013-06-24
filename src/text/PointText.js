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

/**
 * @name PointText
 *
 * @class A PointText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */
var PointText = TextItem.extend(/** @lends PointText# */{
	_class: 'PointText',

	/**
	 * Creates a point text item
	 *
	 * @name PointText#initialize
	 * @param {Point} point the position where the text will start
	 *
	 * @example {@paperscript}
	 * var text = new PointText(new Point(200, 50));
	 * text.justification = 'center';
	 * text.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 * 
	 * @example {@paperscript}
	 * // Using object notation:
	 * var text = new PointText({
	 * 	point: [50, 50],
	 * 	content: 'The contents of the point text',
	 * 	fillColor: 'black',
	 * 	fontSize: 25
	 * });
	 */
	initialize: function PointText() {
		TextItem.apply(this, arguments);
	},

	clone: function() {
		return this._clone(new PointText());
	},

	/**
	 * The PointText's anchor point
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		// Se Item#getPosition for an explanation why we create new LinkedPoint
		// objects each time.
		var point = this._matrix.getTranslation();
		return LinkedPoint.create(this, 'setPoint', point.x, point.y);
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.translate(point.subtract(this._matrix.getTranslation()));
	},

	_draw: function(ctx) {
		if (!this._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			lines = this._lines,
			leading = style.getLeading();
		ctx.font = style.getFontStyle();
		ctx.textAlign = style.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			var line = lines[i];
			if (style.getFillColor())
				ctx.fillText(line, 0, 0);
			if (style.getStrokeColor())
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
	}
}, new function() {
	var measureCtx = null;

	return {
		_getBounds: function(getter, matrix) {
			// Create an in-memory canvas on which to do the measuring
			if (!measureCtx)
				measureCtx = CanvasProvider.getContext(1, 1);
			var style = this._style,
				lines = this._lines,
				count = lines.length,
				justification = style.getJustification(),
				leading = style.getLeading(),
				x = 0;
			// Measure the real width of the text. Unfortunately, there is no
			// sane way to measure text height with canvas
			measureCtx.font = style.getFontStyle();
			var width = 0;
			for (var i = 0; i < count; i++)
				width = Math.max(width, measureCtx.measureText(lines[i]).width);
			// Adjust for different justifications
			if (justification !== 'left')
				x -= width / (justification === 'center' ? 2: 1);
			// Until we don't have baseline measuring, assume 1 / 4 leading as a
			// rough guess:
			var bounds = new Rectangle(x,
						count ? - 0.75 * leading : 0,
						width, count * leading);
			return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
		}
	};
});
