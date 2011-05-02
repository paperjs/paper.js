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
				this._segment = curve._segment1;
			} else if (parameter == 1) {
				this._segment = curve._segment2;
			} else if (parameter == null) {
				return null;
			} else {
				// Determine the closest segment by comparing curve lengths
				this._segment = curve.getLength(0, parameter)
					< curve.getLength(parameter, 1)
						? curve._segment1
						: curve._segment2;
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
	 * The item this curve belongs to, if any.
	 */
	getItem: function() {
		return this._curve && this._curve._path;
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
	getOffset: function() {
		var path = this._curve && this._curve._path;
		return path && path._getOffset(this);
	},

	/**
	 * The length of the curve from its beginning up to the location described
	 * by this object.
	 */
	getCurveOffset: function() {
		var parameter = this._curve && this.getParameter();
		return parameter != null ? this._curve.getLength(0, parameter) : null;
	},

	/**
	 * The curve parameter, as used by various bezier curve calculations. It is
	 * value between {@code 0} (beginning of the curve) and {@code 1} (end of
	 * the curve).
	 */
	getParameter: function() {
		if (this._parameter == null && this._point)
			this._parameter = this._curve.getParameter(this._point);
		return this._parameter;
	},

	/**
	 * The point which is defined by the {@link #getCurve()} and
	 * {@link #getParameter()}.
	 */
	getPoint: function() {
		if (!this._point && this._curve) {
			var parameter = this.getParameter();
			if (parameter != null)
				this._point = this._curve.getPoint(parameter);
		}
		return this._point;
	},

	/**
	 * The tangential vector to the {@link #getCurve()} at the given location.
	 */
	getTangent: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getTangent(parameter);
	},
	
	/**
	 * The normal vector to the {@link #getCurve()} at the given location.
	 */
	getNormal: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getNormal(parameter);
	},

	toString: function() {
		var parts = [];
		var point = this.getPoint();
		if (point)
			parts.push('point: ' + point);
		var index = this.getIndex();
		if (index != null)
			parts.push('index: ' + index);
		var parameter = this.getParameter();
		if (parameter != null)
			parts.push('parameter: ' + parameter);
		return '{ ' + parts.join(', ') + ' }';
	}
});
