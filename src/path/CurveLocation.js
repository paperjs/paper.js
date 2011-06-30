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

/**
 * @name CurveLocation
 *
 * @class CurveLocation objects describe a location on {@link Curve}
 * objects, as defined by the curve {@link #parameter}, a value between
 * {@code 0} (beginning of the curve) and {@code 1} (end of the curve). If
 * the curve is part of a {@link Path} item, its {@link #index} inside the
 * {@link Path#curves} array is also provided.
 */
CurveLocation = Base.extend(/** @lends CurveLocation# */{
	// DOCS: CurveLocation class description: add this comment back when the
	// mentioned functioned have been added:
	// The class is in use in many places, such as {@link Path#getLocationAt(offset)},
	// {@link Path#getLength(CurveLocation)}, {@link Path#getPoint(length)},
	// {@link Path#split(CurveLocation)},
	// {@link PathItem#getIntersections(PathItem)}, etc.
	/**
	 * Creates a new CurveLocation object.
	 *
	 * @param {Curve} curve
	 * @param {Number} parameter
	 * @param {Point} point
	 */
	initialize: function(curve, parameter, point) {
		this._curve = curve;
		this._parameter = parameter;
		this._point = point;
	},

	/**
	 * The segment of the curve which is closer to the described location.
	 *
	 * @type Segment
	 * @bean
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
	 *
	 * @type Curve
	 * @bean
	 */
	getCurve: function() {
		return this._curve;
	},

	/**
	 * The item this curve belongs to, if any.
	 *
	 * @type Item
	 * @bean
	 */
	getItem: function() {
		return this._curve && this._curve._path;
	},

	/**
	 * The index of the curve within the {@link Path#curves} list, if the
	 * curve is part of a {@link Path} item.
	 *
	 * @type Index
	 * @bean
	 */
	getIndex: function() {
		return this._curve && this._curve.getIndex();
	},

	/**
	 * The length of the path from its beginning up to the location described
	 * by this object.
	 *
	 * @type Number
	 * @bean
	 */
	getOffset: function() {
		var path = this._curve && this._curve._path;
		return path && path._getOffset(this);
	},

	/**
	 * The length of the curve from its beginning up to the location described
	 * by this object.
	 *
	 * @type Number
	 * @bean
	 */
	getCurveOffset: function() {
		var parameter = this._curve && this.getParameter();
		return parameter != null ? this._curve.getLength(0, parameter) : null;
	},

	/**
	 * The curve parameter, as used by various bezier curve calculations. It is
	 * value between {@code 0} (beginning of the curve) and {@code 1} (end of
	 * the curve).
	 *
	 * @type Number
	 * @bean
	 */
	getParameter: function() {
		if (this._parameter == null && this._point)
			this._parameter = this._curve.getParameter(this._point);
		return this._parameter;
	},

	/**
	 * The point which is defined by the {@link #curve} and
	 * {@link #parameter}.
	 *
	 * @type Point
	 * @bean
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
	 * The tangential vector to the {@link #curve} at the given location.
	 *
	 * @type Point
	 * @bean
	 */
	getTangent: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getTangent(parameter);
	},

	/**
	 * The normal vector to the {@link #curve} at the given location.
	 *
	 * @type Point
	 * @bean
	 */
	getNormal: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getNormal(parameter);
	},

	/**
	 * @return {String} A string representation of the curve location.
	 */
	toString: function() {
		var parts = [],
			point = this.getPoint();
		if (point)
			parts.push('point: ' + point);
		var index = this.getIndex();
		if (index != null)
			parts.push('index: ' + index);
		var parameter = this.getParameter();
		if (parameter != null)
			parts.push('parameter: ' + Base.formatNumber(parameter));
		return '{ ' + parts.join(', ') + ' }';
	}
});
