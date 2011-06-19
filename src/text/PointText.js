/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var PointText = this.PointText = TextItem.extend({
	/** @lends PointText# */

	/**
	 * Creates a point text item
	 * 
	 * @param {Point} point the position where the text will start
	 * @constructs PointText
	 * 
	 * @example
	 * var text = new PointText(new Point(50, 100));
	 * text.paragraphStyle.justification = 'center';
	 * text.characterStyle.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 * 
	 * @class A PointText item represents a piece of typography in your Paper.js
	 * project which starts from a certain point and extends by the amount of
	 * characters contained in it.
	 * 
	 * @extends TextItem
	 */
	initialize: function(point) {
		this.base();
		var point = Point.read(arguments);
		this._point = LinkedPoint.create(this, 'setPoint', point.x, point.y);
		this._matrix = new Matrix().translate(point);
	},

	clone: function() {
		var copy = this._clone(new PointText(this._point));
		// Use Matrix#initialize to easily copy over values.
		copy._matrix.initialize(this._matrix);
		return copy;
	},

	/**
	 * The PointText's anchor point
	 * 
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		this._transform(new Matrix().translate(
				Point.read(arguments).subtract(this._point)));
	},
	
	// TODO: Position should be the center point of the bounds but we currently
	// don't support bounds for PointText.
	getPosition: function() {
		return this._point;
	},
	
	setPosition: function(point) {
		this.setPoint.apply(this, arguments);
	},
	
	_transform: function(matrix, flags) {
		this._matrix.preConcatenate(matrix);
		// We need to transform the LinkedPoint, passing true for dontNotify so
		// chaning it won't trigger calls of setPoint(), leading to an endless
		// recursion.
		matrix._transformPoint(this._point, this._point, true);
	},
	
	draw: function(ctx) {
		if (this.content == null)
			return;
		ctx.save();
		ctx.font = this._characterStyle.fontSize + 'pt ' +
				this._characterStyle.font;
		ctx.textAlign = this._paragraphStyle.justification;
		this._matrix.applyToContext(ctx);
		
		var fillColor = this.getFillColor();
		var strokeColor = this.getStrokeColor();
		if (!fillColor || !strokeColor)
			ctx.globalAlpha = this._opacity;
		if (fillColor) {
			ctx.fillStyle = fillColor.getCanvasStyle(ctx);
			ctx.fillText(this.content, 0, 0);
		}
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
			ctx.strokeText(this.content, 0, 0);
		}
		ctx.restore();
	}
});
