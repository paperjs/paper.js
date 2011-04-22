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

var CompoundPath = this.CompoundPath = PathItem.extend({
	initialize: function(items) {
		this.base();
		this.children = [];
		if (items) {
			for (var i = 0, l = items.length; i < l; i++)
				this.appendTop(items[i]);
		}
	},

	// TODO: have getBounds of Group / Layer / CompoundPath use the same
	// code (from a utility script?)
	getBounds: function() {
		if (this.children.length) {
			var rect = this.children[0].getBounds(),
				x1 = rect.x,
				y1 = rect.y,
				x2 = rect.x + rect.width,
				y2 = rect.y + rect.height;
			for (var i = 1, l = this.children.length; i < l; i++) {
				var rect2 = this.children[i].getBounds();
				x1 = Math.min(rect2.x, x1);
				y1 = Math.min(rect2.y, y1);
				x2 = Math.max(rect2.x + rect2.width, x1 + x2 - x1);
				y2 = Math.max(rect2.y + rect2.height, y1 + y2 - y1);
			}
		}
		return LinkedRectangle.create(this, 'setBounds',
				x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * If this is a compound path with only one path inside,
	 * the path is moved outside and the compound path is erased.
	 * Otherwise, the compound path is returned unmodified.
	 *
	 * @return the simplified compound path.
	 */
	simplify: function() {
		if (this.children.length == 1) {
			var child = this.children[0];
			child.moveAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

	smooth: function() {
		for (var i = 0, l = this.children.length; i < l; i++)
			this.children[i].smooth();
	},

	moveTo: function() {
		var path = new Path();
		this.appendTop(path);
		path.moveTo.apply(path, arguments);
	},

	draw: function(ctx, param) {
		var firstChild = this.children[0];
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = this.children.length; i < l; i++)
			Item.draw(this.children[i], ctx, param);
		firstChild.setContextStyles(ctx);
		var fillColor = firstChild.getFillColor(),
			strokeColor = firstChild.getStrokeColor();
		if (fillColor) {
			ctx.fillStyle = fillColor.toCssString();
			ctx.fill();
		}
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.toCssString();
			ctx.stroke();
		}
	}
}, new function() {

	function getCurrentPath(that) {
		if (that.children.length) {
			return that.children[that.children.length - 1];
		} else {
			throw new Error('Use a moveTo() command first');
		}
	}

	var fields = {
		moveBy: function() {
			var point = arguments.length ? Point.read(arguments) : new Point(),
				path = getCurrentPath(this),
				current = path.segments[path.segments.length - 1]._point;
			this.moveTo(current.add(point));
		},

		closePath: function() {
			getCurrentPath(this).closed = true;
		}
	};

	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'curveBy', 'arcBy'], function(key) {
		fields[key] = function() {
			var path = getCurrentPath(this);
			path[key].apply(path, arguments);
		};
	});

	return fields;
});
