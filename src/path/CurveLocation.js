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

CurveLocation = Base.extend({
	beans: true,

	initialize: function(curve, parameter, point) {
		this._curve = curve;
		this._parameter = parameter;
		this._point = point;
	},

	/**
	 * The segment of the curve which is closer to the described location.
	 */
	getSegment: function() {
		if (!this._segment) {
			var parameter = this.getParameter();
			if (parameter == 0) {
				this._segment = curve.getSegment1();
			} else if (parameter == 1) {
				this._segment = curve.getSegment2();
			} else if (parameter == -1) {
				return null;
			} else {
				// Determine the closest segment by comparing curve lengths
				var rightCurve = curve.clone().divide(parameter);
				this._segment = rightCurve.getLength() > curve.getLength() / 2
					? curve.getSegment1()
					: curve.getSegment2();
			}
		}
		return this._segment;
	},

	/**
	 * The curve by which the location is defined.
	 */
	getCurve: function() {
		return this._curve;
	},

	/**
	 * The path on which the location is defined.
	 */
	getPath: function() {
		return this._curve && this._curve.getPath();
	},

	/**
	 * The index of the curve within the {@link Path#getCurves()} list, if the
	 * curve is part of a {@link Path} item.
	 */
	getIndex: function() {
		return this._curve && this._curve.getIndex();
	},

	/**
	 * The length of the path from its beginning up to the location described
	 * by this object.
	 */
	getLength: function() {
		var path = this._curve && this._curve.getPath();
		return path && path.getLength(this);
	},

	/**
	 * The length of the curve from its beginning up to the location described
	 * by this object.
	 */
	getCurveLength: function() {
		if (this.curve) {
			var parameter = this.getParameter();
			return parameter != null
				? curve.getLength(0, parameter)
				: null;
		}
	},

	/**
	 * The curve parameter, as used by various bezier curve calculations. It is
	 * value between {@code 0} (beginning of the curve) and {@code 1} (end of
	 * the curve).
	 */
	getParameter: function() {
		if (this._parameter != null && this._point)
			this._parameter = this._curve.getParameter(point);
		return this._parameter;
	},

	/**
	 * The point which is defined by the {@link #getCurve()} and
	 * {@link #getParameter()}.
	 */
	getPoint: function() {
		if (!this._point && this._curve)
			this._point = this._curve.getPoint(this._parameter);
		return this._point;
	},

	/**
	 * The item this curve belongs to, if any.
	 */
	getItem: function() {
		return this._curve && this._curve.getPath();
	},

	toString: function() {
		var parts = [];
		if (this._point)
			parts.push('point: ' + this.getPoint());
		var index = this.getIndex();
		if (index >= 0)
			parts.push('index: ' + index);
		var parameter = this.getParameter();
		if (parameter != -1)
			parts.push('parameter: ' + parameter);
		return '{ ' + parts.join(', ') + ' }'
	}
});
