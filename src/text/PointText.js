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
var PointText = this.PointText = TextItem.extend(/** @lends PointText# */{
	_type: 'pointtext',
	/**
	 * Creates a point text item
	 *
	 * @name PointText#initialize
	 * @param {Point} point the position where the text will start
	 *
	 * @example
	 * var text = new PointText(new Point(50, 100));
	 * text.justification = 'center';
	 * text.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 */

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
		this.translate(Point.read(arguments).subtract(
				this._matrix.getTranslation()));
	},

	draw: function(ctx) {
		if (!this._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			leading = this.getLeading(),
			lines = this._lines;
		ctx.font = style.getFontStyle();
		ctx.textAlign = this.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			var line = lines[i];
			if (style._fillColor)
				ctx.fillText(line, 0, 0);
			if (style._strokeColor)
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
			var justification = this.getJustification(),
				x = 0;
			// Measure the real width of the text. Unfortunately, there is no
			// sane way to measure text height with canvas
			measureCtx.font = this._style.getFontStyle();
			var width = 0;
			for (var i = 0, l = this._lines.length; i < l; i++)
				width = Math.max(width, measureCtx.measureText(
						this._lines[i]).width);
			// Adjust for different justifications
			if (justification !== 'left')
				x -= width / (justification === 'center' ? 2: 1);
			var leading = this.getLeading(),
				count = this._lines.length,
				// Until we don't have baseline measuring, assume leading / 4 as
				// a rough guess:
				bounds = Rectangle.create(x,
						count ? leading / 4 + (count - 1) * leading : 0,
						width, -count * leading);
			return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
		}
	};
});
