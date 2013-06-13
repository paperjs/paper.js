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
 * @name Shape
 *
 * @class
 *
 * @extends Item
 */
var Shape = Item.extend(/** @lends Shape# */{
	_applyMatrix: false,

	initialize: function Shape(type, point, size) {
		Item.call(this, point);
		this._type = type;
		this._size = size;
	},

	_draw: function(ctx, param) {
		var style = this._style,
			size = this._size,
			width = size.width,
			height = size.height,
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor();
		if (fillColor || strokeColor || param.clip) {
			ctx.beginPath();
			switch (this._type) {
			case 'rect':
				ctx.rect(-width / 2, -height / 2, width, height);
				break;
			case 'circle':
				// Average half of width & height for radius...
				ctx.arc(0, 0, (width + height) / 4, 0, Math.PI * 2, true);
				break;
			case 'ellipse':
				var mx = width / 2,
					my = height / 2,
					kappa = Numerical.KAPPA,
					cx = mx * kappa,
					cy = my * kappa;
				ctx.moveTo(0, my);
				ctx.bezierCurveTo(0, my - cy, mx - cx, 0, mx, 0);
				ctx.bezierCurveTo(mx + cx, 0, width, my - cy, width, my);
				ctx.bezierCurveTo(width, my + cy, mx + cx, height, mx, height);
				ctx.bezierCurveTo(mx - cx, height, 0, my + cy, 0, my);
				break;
			}
		}
		if (!param.clip && (fillColor || strokeColor)) {
			this._setStyles(ctx);
			if (fillColor)
				ctx.fill();
			if (strokeColor)
				ctx.stroke();
		}
	},

	_contains: function _contains(point) {
		switch (this._type) {
		case 'rect':
			return _contains.base.call(this, point);
		case 'circle':
		case 'ellipse':
			return point.divide(this._size).getLength() <= 0.5;
		}
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTest: function _hitTest(point, options) {
		// TODO: Implement stroke!
		return _hitTest.base.apply(this, arguments);
	},

	statics: {
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return new Shape('circle', center, new Size(radius * 2));
		},

		Rectangle: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle');
			return new Shape('rect', rect.getCenter(true), rect.getSize(true));
		},

		Ellipse: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle');
			return new Shape('ellipse', rect.getCenter(true),
					rect.getSize(true));
		}
	}
});
