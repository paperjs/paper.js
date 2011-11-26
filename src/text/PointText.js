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
	/**
	 * Creates a point text item
	 *
	 * @param {Point} point the position where the text will start
	 *
	 * @example
	 * var text = new PointText(new Point(50, 100));
	 * text.justification = 'center';
	 * text.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 */
	initialize: function(point) {
		this.base();
		this._point = Point.read(arguments).clone();
		this._matrix = new Matrix().translate(this._point);
	},

	clone: function() {
		return this._clone(new PointText(this._point));
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
		return LinkedPoint.create(this, 'setPoint',
				this._point.x, this._point.y);
	},

	setPoint: function(point) {
		this.translate(Point.read(arguments).subtract(this._point));
	},

	_transform: function(matrix, flags) {
		this._matrix.preConcatenate(matrix);
		// Also transform _point:
		matrix._transformPoint(this._point, this._point);
	},

	draw: function(ctx) {
		if (!this._content)
			return;
		ctx.save();
		ctx.font = this.getFontSize() + 'px ' + this.getFont();
		ctx.textAlign = this.getJustification();
		this._matrix.applyToContext(ctx);
		var fillColor = this.getFillColor(),
			strokeColor = this.getStrokeColor(),
			leading = this.getLeading();
		if (!fillColor || !strokeColor)
			ctx.globalAlpha = this._opacity;
		if (fillColor)
			ctx.fillStyle = fillColor.getCanvasStyle(ctx);
		if (strokeColor)
			ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
		for (var i = 0, l = this._lines.length; i < l; i++) {
			var line = this._lines[i];
			if (fillColor)
				ctx.fillText(line, 0, 0);
			if (strokeColor)
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
		ctx.restore();
	}
}, new function() {
	var context = null;

	return {
		_getBounds: function(type, matrix) {
			// If there is no text, there are no bounds
			if (!this._content)
				return new Rectangle();
			// Create an in-memory canvas on which to do the measuring
			if (!context)
				context = CanvasProvider.getCanvas(Size.create(1, 1)).getContext('2d');
			var justification = this.getJustification(),
				x = 0;
			// Measure the real width of the text. Unfortunately, there is no
			// sane way to measure text height with canvas
			context.font = this.getFontSize() + 'px ' + this.getFont();
			var width = 0;
			for (var i = 0, l = this._lines.length; i < l; i++)
				width = Math.max(width, context.measureText(this._lines[i]).width);
			// Adjust for different justifications
			if (justification != 'left')
				x -= width / (justification === 'center' ? 2: 1);
			var leading = this.getLeading();
			var count = this._lines.length;
			// Until we don't have baseline measuring, assume leading / 4 as a
			// rough guess
			var bounds = Rectangle.create(x, leading / 4 + (count - 1) * leading,
					width, -count * leading);
			// TODO: matrix!
			return this._matrix._transformBounds(bounds, bounds);
		}
	};
});
