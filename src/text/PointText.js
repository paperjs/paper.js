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
	beans: true,

	initialize: function(point) {
		this.base();
		this._point = Point.read(arguments, 0);
		this.matrix = new Matrix().translate(this._point);
	},

	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		if (point) {
			var delta = point.subtract(this._point);
			this.matrix.preConcatenate(new Matrix().translate(delta));
			this._point = point;
		}
	},
	
	getPosition: function() {
		return this._point;
	},
	
	setPosition: function(point) {
		// TODO: position should be the center point of the bounds
		// but we currently don't support bounds for PointText.
		this.setPoint.apply(this, arguments);
	},
	
	_transform: function(matrix, flags) {
		this.matrix.preConcatenate(matrix);
		if (!matrix.isIdentity()) {
			matrix._transformPoint(this._point);
		}
	},
	
	draw: function(ctx) {
		if (this.content == null)
			return;
		ctx.save();
		ctx.font = this._characterStyle.fontSize + 'pt ' +
				this._characterStyle.font;
		ctx.textAlign = this._paragraphStyle.justification;
		this.matrix.applyToContext(ctx);
		
		var fillColor = this.getFillColor();
		var strokeColor = this.getStrokeColor();
		if (!fillColor || !strokeColor)
			ctx.globalAlpha = this.opacity;
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
