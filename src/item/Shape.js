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
var Shape = this.Shape = Item.extend(/** @lends Shape# */{
	_class: 'Shape',

	initialize: function(type, size) {
		this.base();
		this._type = type;
		this._size = size;
	},

	_draw: function(ctx, param) {
		var style = this._style,
			size = this._size,
			width = size.width,
			height = size.height,
			fillColor = style._fillColor,
			strokeColor = style._strokeColor;
		if (fillColor || strokeColor || param.clip) {
			ctx.beginPath();
			switch (this._type) {
			case 'rect':
				ctx.rect(-width / 2, -height / 2, width, height);
				break;
			case 'circle':
				ctx.arc(0, 0, width, 0, Math.PI * 2, true);
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

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	statics: {
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return new Shape('circle', new Size(radius)).translate(center);
		},

		Rectangle: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle');
			return new Shape('rect', rect.getSize(true)).translate(
					rect.getCenter(true));
		},

		Ellipse: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle');
			return new Shape('ellipse', rect.getSize(true)).translate(
					rect.getCenter(true));
		}
	}
});
