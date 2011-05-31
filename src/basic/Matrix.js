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

// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

var Matrix = this.Matrix = Base.extend({
	/** @lends Matrix# */

	beans: true,

	/**
	 * Creates a 2D affine transform.
	 *
	 * @constructs Matrix
	 * @param {Number} m00 The m00 coordinate of the transform.
	 * @param {Number} m10 The m10 coordinate of the transform.
	 * @param {Number} m01 The m01 coordinate of the transform.
	 * @param {Number} m11 The m11 coordinate of the transform.
	 * @param {Number} m02 The m02 coordinate of the transform.
	 * @param {Number} m12 The m12 coordinate of the transform.
	 * 
	 * @class An affine transform performs a linear mapping from 2D coordinates
	 * to other 2D coordinates that preserves the "straightness" and
	 * "parallelness" of lines.
	 *
	 * Such a coordinate transformation can be represented by a 3 row by 3
	 * column matrix with an implied last row of [ 0 0 1 ]. This matrix
	 * transforms source coordinates (x,y) into destination coordinates (x',y')
	 * by considering them to be a column vector and multiplying the coordinate
	 * vector by the matrix according to the following process:
	 * <pre>
	 *      [ x']   [  m00  m01  m02  ] [ x ]   [ m00x + m01y + m02 ]
	 *      [ y'] = [  m10  m11  m12  ] [ y ] = [ m10x + m11y + m12 ]
	 *      [ 1 ]   [   0    0    1   ] [ 1 ]   [         1         ]
	 * </pre>
	 *
	 * This class is optimized for speed and minimizes calculations based on its
	 * knowledge of the underlying matrix (as opposed to say simply performing
	 * matrix multiplication).
	 */
	initialize: function(m00, m10, m01, m11, m02, m12) {
		var ok = true;
		if (arguments.length == 6) {
			this.set(m00, m10, m01, m11, m02, m12);
		} else if (arguments.length == 1) {
			if (m00 instanceof Matrix) {
				this.set(m00._m00, m00._m10, m00._m01,
						m00._m11, m00._m02, m00._m12);
			} else if (Array.isArray(m00)) {
				this.set.apply(this, m00);
			} else {
				ok = false;
			} 
		} else if (arguments.length > 0) {
			ok = false;
		} else {
			this._m00 = this._m11 = 1;
			this._m10 = this._m01 = this._m02 = this._m12 = 0;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	/**
	 * @return {Matrix} A copy of this transform.
	 */
	clone: function() {
		return Matrix.create(this._m00, this._m10, this._m01,
				this._m11, this._m02, this._m12);
	},

	/**
	 * Sets this transform to the matrix specified by the 6 values.
	 *
	 * @param {Number} m00 The m00 coordinate of the transform.
	 * @param {Number} m10 The m10 coordinate of the transform.
	 * @param {Number} m01 The m01 coordinate of the transform.
	 * @param {Number} m11 The m11 coordinate of the transform.
	 * @param {Number} m02 The m02 coordinate of the transform.
	 * @param {Number} m12 The m12 coordinate of the transform.
	 * @return {Matrix} This affine transform.
	 */
	set: function(m00, m10, m01, m11, m02, m12) {
		this._m00 = m00;
		this._m10 = m10;
		this._m01 = m01;
		this._m11 = m11;
		this._m02 = m02;
		this._m12 = m12;
		return this;
	},

	/**
	 * Concatentates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} scale The scaling factor.
	 * @param {Point} [center] The optional center for the scaling
	 * transformation.
	 * @return {Matrix} This affine transform.
	 */
	/**
	 * Concatentates this transform with a scaling transformation.
	 *
	 * @param {Number} sx The x-axis scaling factor.
	 * @param {Number} sy The y-axis scaling factor.
	 * @param {Point} [center] The optional center for the scaling
	 * transformation.
	 * @return {Matrix} This affine transform.
	 */
	scale: function(sx, sy /* | scale */, center) {
		if (arguments.length < 2 || typeof sy === 'object') {
			// sx is the single scale parameter, representing both sx and sy
			// Read center first from argument 1, then set sy = sx (thus
			// modifing the content of argument 1!)
			center = Point.read(arguments, 1);
			sy = sx;
		} else {
			center = Point.read(arguments, 2);
		}
		if (center)
			this.translate(center);
		this._m00 *= sx;
		this._m10 *= sx;
		this._m01 *= sy;
		this._m11 *= sy;
		if (center)
			this.translate(center.negate());
		return this;
	},

	/**
	 * Concatentates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Point} point The vector to translate by.
	 * @return {Matrix} This affine transform.
	 */
	/**
	 * Concatentates this transform with a translate transformation.
	 *
	 * @param {Number} dx The distance to translate in the x direction.
	 * @param {Number} dy The distance to translate in the y direction.
	 * @return {Matrix} This affine transform.
	 */
	translate: function(point) {
		point = Point.read(arguments);
		var x = point.x, y = point.y;
		this._m02 += x * this._m00 + y * this._m01;
		this._m12 += x * this._m10 + y * this._m11;
		return this;
	},

	/**
	 * Concatentates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle The angle of rotation measured in degrees.
	 * @param {Point} center The anchor point to rotate around.
	 * @return {Matrix} This affine transform.
	 */
	/**
	 * Concatentates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @param {Number} angle The angle of rotation measured in degrees.
	 * @param {Number} x The x coordinate of the anchor point.
	 * @param {Number} y The y coordinate of the anchor point.
	 * @return {Matrix} This affine transform.
	 */
	rotate: function(angle, center) {
		return this.concatenate(
				Matrix.getRotateInstance.apply(Matrix, arguments));
	},

	/**
	 * Concatentates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Point} point The shear factor in x and y direction.
	 * @param {Point} [center] The optional center for the shear transformation.
	 * @return {Matrix} This affine transform.
	 */
	/**
	 * Concatentates this transform with a shear transformation.
	 *
	 * @param {Number} shx The x shear factor.
	 * @param {Number} shy The y shear factor.
	 * @param {Point} [center] The optional center for the shear transformation.
	 * @return {Matrix} This affine transform.
	 */
	shear: function(shx, shy, center) {
		// See #scale() for explanation of this:
		if (arguments.length < 2 || typeof shy === 'object') {
			center = Point.read(arguments, 1);
			sy = sx;
		} else {
			center = Point.read(arguments, 2);
		}
		if (center)
			this.translate(center);
		var m00 = this._m00;
		var m10 = this._m10;
		this._m00 += shy * this._m01;
		this._m10 += shy * this._m11;
		this._m01 += shx * m00;
		this._m11 += shx * m10;
		if (center)
			this.translate(center.negate());
		return this;
	},

	/**
	 * @return {String} A string representation of this transform.
	 */
	toString: function() {
		var format = Base.formatNumber;
		return '[[' + [format(this._m00), format(this._m01),
					format(this._m02)].join(', ') + '], ['
				+ [format(this._m10), format(this._m11),
					format(this._m12)].join(', ') + ']]';
	},
	
	/**
	 * @return {Number} The scaling factor in the x-direction (m00).
	 */
	// scaleX

	/**
	 * @return {Number} The scaling factor in the y-direction (m11).
	 */
	// scaleY

	/**
	 * @return {Number} The translation in the x-direction (m02).
	 */
	// translateX

	/**
	 * @return {Number} The translation in the y-direction (m12).
	 */
	// translateY

	/**
	 * @return {Number} The shear factor in the x-direction (m01).
	 */
	// shearX

	/**
	 * @return {Number} The shear factor in the y-direction (m10).
	 */
	// shearY

	/**
	 * Concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx The transform to concatenate.
	 * @return {Matrix} This affine transform.
	 */
	concatenate: function(mx) {
		var m0 = this._m00,
			m1 = this._m01;
		this._m00 = mx._m00 * m0 + mx._m10 * m1;
		this._m01 = mx._m01 * m0 + mx._m11 * m1;
		this._m02 += mx._m02 * m0 + mx._m12 * m1;

		m0 = this._m10;
		m1 = this._m11;
		this._m10 = mx._m00 * m0 + mx._m10 * m1;
		this._m11 = mx._m01 * m0 + mx._m11 * m1;
		this._m12 += mx._m02 * m0 + mx._m12 * m1;
		return this;
	},

	/**
	 * Pre-concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx The transform to preconcatenate.
	 * @return {Matrix} This affine transform.
	 */
	preConcatenate: function(mx) {
		var m0 = this._m00,
			m1 = this._m10;
		this._m00 = mx._m00 * m0 + mx._m01 * m1;
		this._m10 = mx._m10 * m0 + mx._m11 * m1;

		m0 = this._m01;
		m1 = this._m11;
		this._m01 = mx._m00 * m0 + mx._m01 * m1;
		this._m11 = mx._m10 * m0 + mx._m11 * m1;

		m0 = this._m02;
		m1 = this._m12;
		this._m02 = mx._m00 * m0 + mx._m01 * m1 + mx._m02;
		this._m12 = mx._m10 * m0 + mx._m11 * m1 + mx._m12;
		return this;
	},

	/**
	 * Transforms a point or an array of coordinates by this matrix and returns
	 * the result. If an array is transformed, the the result is stored into a
	 * destination array.
	 *
	 * @param {Point} point The point to be transformed.
	 *
	 * @param {Array} src The array containing the source points
	 *        as x, y value pairs.
	 * @param {Number} srcOff The offset to the first point to be transformed.
	 * @param {Array} dst The array into which to store the transformed
	 *        point pairs.
	 * @param {Number} dstOff The offset of the location of the first
	 *        transformed point in the destination array.
	 * @param {Number} numPts The number of points to tranform.
	 */
	transform: function(/* point | */ src, srcOff, dst, dstOff, numPts) {
		return arguments.length < 5
			// TODO: Check for rectangle and use _tranformBounds?
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, srcOff, dst, dstOff, numPts);
	},

	/**
	 * A faster version of transform that only takes one point and does not 
	 * attempt to convert it.
	 */
	_transformPoint: function(point, dest, dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = new Point(Point.dont);
		return dest.set(
			x * this._m00 + y * this._m01 + this._m02,
			x * this._m10 + y * this._m11 + this._m12,
			dontNotify
		);
	},

	_transformCoordinates: function(src, srcOff, dst, dstOff, numPts) {
		var i = srcOff, j = dstOff,
			srcEnd = srcOff + 2 * numPts;
		while (i < srcEnd) {
			var x = src[i++];
			var y = src[i++];
			dst[j++] = x * this._m00 + y * this._m01 + this._m02;
			dst[j++] = x * this._m10 + y * this._m11 + this._m12;
		}
		return dst;
	},

	_transformCorners: function(rect) {
		var x1 = rect.x,
			y1 = rect.y,
			x2 = x1 + rect.width,
			y2 = y1 + rect.height,
			coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
		return this._transformCoordinates(coords, 0, coords, 0, 4);
	},

	/**
	 * Returns the 'transformed' bounds rectangle by transforming each corner
	 * point and finding the new bounding box to these points. This is not
	 * really the transformed reactangle!
	 */
	_transformBounds: function(bounds) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = coords.slice(0);
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j])
				min[j] = val;
			else if (val > max[j])
				max[j] = val;
		}
		return Rectangle.create(min[0], min[1],
				max[0] - min[0], max[1] - min[1]);
	},

	/**
	 * @return {Number} The determinant of this transform.
	 */
	getDeterminant: function() {
		return this._m00 * this._m11 - this._m01 * this._m10;
	},

	/**
	 * @return {Boolean} Whether this transform is the identity transform.
	 */
	isIdentity: function() {
		return this._m00 == 1 && this._m10 == 0 && this._m01 == 0 &&
				this._m11 == 1 && this._m02 == 0 && this._m12 == 0;
	},

	/**
	 * Returns whether the transform is invertible. A transform is not
	 * invertible if the determinant is 0 or any value is non-finite or NaN.
	 *
	 * @return {Boolean} Whether the transform is invertible.
	 */
	isInvertible: function() {
		var det = this.getDeterminant();
		return isFinite(det) && det != 0 && isFinite(this._m02)
				&& isFinite(this._m12);
	},

	/**
	 * Checks whether the matrix is singular or not. Singular matrices cannot be
	 * inverted.
	 * 
	 * @return {Boolean} Whether the matrix is singular.
	 */
	isSingular: function() {
		return !this.isInvertible();
	},

	/**
	 * @return {Matrix} An Matrix object representing the inverse
	 *         transformation.
	 */
	createInverse: function() {
		var det = this.getDeterminant();
		if (isFinite(det) && det != 0 && isFinite(this._m02)
				&& isFinite(this._m12)) {
			return Matrix.create(
				this._m11 / det,
				-this._m10 / det,
				-this._m01 / det,
				this._m00 / det,
				(this._m01 * this._m12 - this._m11 * this._m02) / det,
				(this._m10 * this._m02 - this._m00 * this._m12) / det);
		}
		return null;
	},

	createShiftless: function() {
		return Matrix.create(this._m00, this._m10, this._m01, this._m11, 0, 0);
	},

	/**
	 * Sets this transform to a scaling transformation.
	 *
	 * @param {Number} sx The x-axis scaling factor.
	 * @param {Number} sy The y-axis scaling factor.
	 * @return {Matrix} This affine transform.
	 */
	setToScale: function(sx, sy) {
		return this.set(sx, 0, 0, sy, 0, 0);
	},

	/**
	 * Sets this transform to a translation transformation.
	 *
	 * @param {Number} dx The distance to translate in the x direction.
	 * @param {Number} dy The distance to translate in the y direction.
	 * @return {Matrix} This affine transform.
	 */
	setToTranslation: function(delta) {
		delta = Point.read(arguments);
		return this.set(1, 0, 0, 1, delta.x, delta.y);
	},

	/**
	 * Sets this transform to a shearing transformation.
	 *
	 * @param {Number} shx The x-axis shear factor.
	 * @param {Number} shy The y-axis shear factor.
	 * @return {Matrix} This affine transform.
	 */
	setToShear: function(shx, shy) {
		return this.set(1, shy, shx, 1, 0, 0);
	},

	/**
	 * Sets this transform to a rotation transformation.
	 *
	 * @param {Number} angle The angle of rotation measured in degrees.
	 * @param {Number} x The x coordinate of the anchor point.
	 * @param {Number} y The y coordinate of the anchor point.
	 * @return {Matrix} This affine transform.
	 */
	setToRotation: function(angle, center) {
		center = Point.read(arguments, 1);
		angle = angle * Math.PI / 180.0;
		var x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle);
		return this.set(cos, sin, -sin, cos,
				x - x * cos + y * sin,
				y - x * sin - y * cos);
	},

	/**
	 * Applies this matrix to the specified Canvas Context.
	 * 
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Boolean} [reset=false]
	 */
	applyToContext: function(ctx, reset) {
		ctx[reset ? 'setTransform' : 'transform'](
			this._m00, this._m10, this._m01,
			this._m11, this._m02, this._m12
		);
		return this;
	},

	statics: {
		/** @lends Matrix */

		// See Point.create()
		create: function(m00, m10, m01, m11, m02, m12) {
			return new Matrix(Matrix.dont).set(m00, m10, m01, m11, m02, m12);
		},

		/**
		 * Creates a transform representing a scaling transformation.
		 *
		 * @param {Number} sx The x-axis scaling factor.
		 * @param {Number} sy The y-axis scaling factor.
		 * @return {Matrix} A transform representing a scaling
		 *         transformation.
		 */
		getScaleInstance: function(sx, sy) {
			var mx = new Matrix();
			return mx.setToScale.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a translation transformation.
		 *
		 * @param {Number} dx The distance to translate in the x direction.
		 * @param {Number} dy The distance to translate in the y direction.
		 * @return {Matrix} A transform representing a translation
		 *         transformation.
		 */
		getTranslateInstance: function(delta) {
			var mx = new Matrix();
			return mx.setToTranslation.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a shearing transformation.
		 *
		 * @param {Number} shx The x-axis shear factor.
		 * @param {Number} shy The y-axis shear factor.
		 * @return {Matrix} A transform representing a shearing transformation.
		 */
		getShearInstance: function(shx, shy, center) {
			var mx = new Matrix();
			return mx.setToShear.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a rotation transformation.
		 *
		 * @param {Number} angle The angle of rotation measured in degrees.
		 * @param {Number} x The x coordinate of the anchor point.
		 * @param {Number} y The y coordinate of the anchor point.
		 * @return {Matrix} A transform representing a rotation transformation.
		 */
		getRotateInstance: function(angle, center) {
			var mx = new Matrix();
			return mx.setToRotation.apply(mx, arguments);
		}
	}
}, new function() {
	return Base.each({
		scaleX: '_m00',
		scaleY: '_m11',
		translateX: '_m02',
		translateY: '_m12',
		shearX: '_m01',
		shearY: '_m10'
	}, function(prop, name) {
		name = Base.capitalize(name);
		this['get' + name] = function() {
			return this[prop];
		};
		this['set' + name] = function(value) {
			this[prop] = value;
		};
	}, { beans: true });
});
