// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

var Matrix = Base.extend({
	beans: true,

	/**
	 * Creates a 2D affine transform. An affine transform performs a linear
	 * mapping from 2D coordinates to other 2D coordinates that preserves the
	 * "straightness" and "parallelness" of lines.
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
	 *
	 * @param {number} m00 The m00 coordinate of the transform.
	 * @param {number} m10 The m10 coordinate of the transform.
	 * @param {number} m01 The m01 coordinate of the transform.
	 * @param {number} m11 The m11 coordinate of the transform.
	 * @param {number} m02 The m02 coordinate of the transform.
	 * @param {number} m12 The m12 coordinate of the transform.
	 * @constructor
	 */
	initialize: function(m00, m10, m01, m11, m02, m12) {
		if (arguments.length == 6) {
			this.set(m00, m10, m01, m11, m02, m12);
		} else if (arguments == 1) {
			var mx = arguments[0];
			// TODO: Check for array!
			this.set(mx._m00, mx._m10, mx._m01, mx._m11, mx._m02, mx._m12);
		} else if (arguments.length) {
			throw Error('Insufficient matrix parameters');
		} else {
			this._m00 = this._m11 = 1;
			this._m10 = this._m01 = this._m02 = this._m12 = 0;
		}
	},

	/**
	 * @return {Matrix} A copy of this transform.
	 */
	clone: function() {
		return new Matrix(this._m00, this._m10, this._m01,
				this._m11, this._m02, this._m12);
	},

	/**
	 * Sets this transform to the matrix specified by the 6 values.
	 *
	 * @param {number} m00 The m00 coordinate of the transform.
	 * @param {number} m10 The m10 coordinate of the transform.
	 * @param {number} m01 The m01 coordinate of the transform.
	 * @param {number} m11 The m11 coordinate of the transform.
	 * @param {number} m02 The m02 coordinate of the transform.
	 * @param {number} m12 The m12 coordinate of the transform.
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
	 * @param {number} sx The x-axis scaling factor.
	 * @param {number} sy The y-axis scaling factor.
	 * @param {Point} center The optional center for the scaling transformation.
	 * @return {Matrix} This affine transform.
	 */
	scale: function(sx, sy /* | scale */, center) {
		// TODO: Make single scale parameter work with center points!
		// Check arguments.length and typeof arguments[1], if object, assume
		// scale
		center = Point.read(arguments, 2);
		// TODO: Optimise calls to translate to not rely on point conversion
		// use private translate function instead.
		if (center)
			this.translate(center.x, center.y);
		this._m00 *= sx;
		this._m10 *= sx;
		this._m01 *= sy;
		this._m11 *= sy;
		if (center)
			this.translate(-center.x, -center.y);
		return this;
	},

	/**
	 * Concatentates this transform with a translate transformation.
	 *
	 * @param {number} dx The distance to translate in the x direction.
	 * @param {number} dy The distance to translate in the y direction.
	 * @return {Matrix} This affine transform.
	 */
	translate: function(point) {
		point = Point.read(arguments);
		if (point) {
			var x = point.x, y = point.y;
			this._m02 += x * this._m00 + y * this._m01;
			this._m12 += x * this._m10 + y * this._m11;
		}
		return this;
	},

	/**
	 * Concatentates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @param {number} angle The angle of rotation measured in degrees.
	 * @param {number} x The x coordinate of the anchor point.
	 * @param {number} y The y coordinate of the anchor point.
	 * @return {Matrix} This affine transform.
	 */
	rotate: function(angle, center) {
		return this.concatenate(
				Matrix.getRotateInstance.apply(Matrix, arguments));
	},

	/**
	 * Concatentates this transform with a shear transformation.
	 *
	 * @param {number} shx The x shear factor.
	 * @param {number} shy The y shear factor.
	 * @param {Point} center The optional center for the shear transformation.
	 * @return {Matrix} This affine transform.
	 */
	shear: function(shx, shy, center) {
		center = Point.read(arguments, 2);
		// TODO: Optimise calls to translate to not rely on point conversion
		// use private translate function instead.
		if (center)
			this.translate(center.x, center.y);
		var m00 = this._m00;
		var m10 = this._m10;
		this._m00 += shy * this._m01;
		this._m10 += shy * this._m11;
		this._m01 += shx * m00;
		this._m11 += shx * m10;
		if (center)
			this.translate(-center.x, -center.y);
		return this;
	},

	/**
	 * @return {string} A string representation of this transform. The format of
	 *		 of the string is compatible with SVG matrix notation, i.e.
	 *		 "matrix(a,b,c,d,e,f)".
	 */
	toString: function() {
		// TODO: Make behave the same as in Scriptographer
		return 'matrix(' + [this._m00, this._m10, this._m01, this._m11,
				this._m02, this._m12].join(',') + ')';
	},

	/**
	 * @return {number} The scaling factor in the x-direction (m00).
	 */
	getScaleX: function() {
		return this._m00;
	},

	setScaleX: function(scaleX) {
		this._m00 = scaleX;
	},

	/**
	 * @return {number} The scaling factor in the y-direction (m11).
	 */
	getScaleY: function() {
		return this._m11;
	},

	setScaleY: function(scaleY) {
		this._m11 = scaleY;
	},

	/**
	 * @return {number} The translation in the x-direction (m02).
	 */
	getTranslateX: function() {
		return this._m02;
	},

	setTranslateX: function(translateX) {
		this._m02 = translateX;
	},

	/**
	 * @return {number} The translation in the y-direction (m12).
	 */
	getTranslateY: function() {
		return this._m12;
	},

	setTranslateY: function(translateY) {
		this._m12 = translateY;
	},

	/**
	 * @return {number} The shear factor in the x-direction (m01).
	 */
	getShearX: function() {
		return this._m01;
	},

	setShearX: function(shearX) {
		this._m01 = shearX;
	},

	/**
	 * @return {number} The shear factor in the y-direction (m10).
	 */
	getShearY: function() {
		return this._m10;
	},

	setShearY: function(shearY) {
		this._m10 = shearY;
	},

	/**
	 * Concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx The transform to concatenate.
	 * @return {Matrix} This affine transform.
	 */
	concatenate: function(mx) {
		var m0 = this._m00;
		var m1 = this._m01;
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
		var m0 = this._m00;
		var m1 = this._m10;
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
	 *		 as x, y value pairs.
	 * @param {number} srcOff The offset to the first point to be transformed.
	 * @param {Array} dst The array into which to store the transformed
	 *		 point pairs.
	 * @param {number} dstOff The offset of the location of the first transformed
	 *		 point in the destination array.
	 * @param {number} numPts The number of points to tranform.
	 */
	transform: function(/* point | */ src, srcOff, dst, dstOff, numPts) {
		if (arguments.length == 5) {
			var i = srcOff;
			var j = dstOff;
			var srcEnd = srcOff + 2 * numPts;
			while (i < srcEnd) {
				var x = src[i++];
				var y = src[i++];
				dst[j++] = x * this._m00 + y * this._m01 + this._m02;
				dst[j++] = x * this._m10 + y * this._m11 + this._m12;
			}
			return dst;
		} else if (arguments.length > 0) {
			var point = Point.read(arguments);
			if (point) {
				var x = point.x, y = point.y;
				return new Point(
					x * this._m00 + y * this._m01 + this._m02,
					x * this._m10 + y * this._m11 + this._m12
				);
			}
		}
		return null;
	},

	/**
	 * @return {number} The determinant of this transform.
	 */
	getDeterminant: function() {
		return this._m00 * this._m11 - this._m01 * this._m10;
	},

	/**
	 * @return {boolean} Whether this transform is the identity transform.
	 */
	isIdentity: function() {
		return this._m00 == 1 && this._m10 == 0 && this._m01 == 0 &&
				this._m11 == 1 && this._m02 == 0 && this._m12 == 0;
	},

	/**
	 * Returns whether the transform is invertible. A transform is not invertible
	 * if the determinant is 0 or any value is non-finite or NaN.
	 *
	 * @return {boolean} Whether the transform is invertible.
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
	 * @return {boolean} Whether the matrix is singular.
	 */
	isSingular: function() {
		return !this.isInvertible();
	},

	/**
	 * @return {Matrix} An Matrix object representing the inverse transformation.
	 */
	createInverse: function() {
		var det = this.getDeterminant();
		if (isFinite(det) && det != 0 && isFinite(this._m02)
				&& isFinite(this._m12)) {
			return new Matrix(
				this._m11 / det,
				-this._m10 / det,
				-this._m01 / det,
				this._m00 / det,
				(this._m01 * this._m12 - this._m11 * this._m02) / det,
				(this._m10 * this._m02 - this._m00 * this._m12) / det);
		}
		return null;
	},

	/**
	 * Sets this transform to a scaling transformation.
	 *
	 * @param {number} sx The x-axis scaling factor.
	 * @param {number} sy The y-axis scaling factor.
	 * @return {Matrix} This affine transform.
	 */
	setToScale: function(sx, sy) {
		return this.set(sx, 0, 0, sy, 0, 0);
	},

	/**
	 * Sets this transform to a translation transformation.
	 *
	 * @param {number} dx The distance to translate in the x direction.
	 * @param {number} dy The distance to translate in the y direction.
	 * @return {Matrix} This affine transform.
	 */
	setToTranslation: function(delta) {
		delta = Point.read(arguments);
		if (delta) {
			return this.set(1, 0, 0, 1, delta.x, delta.y);
		}
		return this;
	},

	/**
	 * Sets this transform to a shearing transformation.
	 *
	 * @param {number} shx The x-axis shear factor.
	 * @param {number} shy The y-axis shear factor.
	 * @return {Matrix} This affine transform.
	 */
	setToShear: function(shx, shy) {
		return this.set(1, shy, shx, 1, 0, 0);
	},

	/**
	 * Sets this transform to a rotation transformation.
	 *
	 * @param {number} angle The angle of rotation measured in degrees.
	 * @param {number} x The x coordinate of the anchor point.
	 * @param {number} y The y coordinate of the anchor point.
	 * @return {Matrix} This affine transform.
	 */
	setToRotation: function(angle, center) {
		center = Point.read(arguments, 1);
		if (center) {
			angle = angle * Math.PI / 180.0;
			var x = center.x, y = center.y;
			var cos = Math.cos(angle);
			var sin = Math.sin(angle);
			return this.set(cos, sin, -sin, cos,
					x - x * cos + y * sin,
					y - x * sin - y * cos);
		}
		return this;
	},

	statics: {
		/**
		 * Creates a transform representing a scaling transformation.
		 *
		 * @param {number} sx The x-axis scaling factor.
		 * @param {number} sy The y-axis scaling factor.
		 * @return {Matrix} A transform representing a scaling
		 *		 transformation.
		 */
		getScaleInstance: function(sx, sy) {
			var mx = new Matrix();
			return mx.setToScale.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a translation transformation.
		 *
		 * @param {number} dx The distance to translate in the x direction.
		 * @param {number} dy The distance to translate in the y direction.
		 * @return {Matrix} A transform representing a
		 *		 translation transformation.
		 */
		getTranslateInstance: function(delta) {
			var mx = new Matrix();
			return mx.setToTranslation.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a shearing transformation.
		 *
		 * @param {number} shx The x-axis shear factor.
		 * @param {number} shy The y-axis shear factor.
		 * @return {Matrix} A transform representing a shearing
		 *		 transformation.
		 */
		getShearInstance: function(shx, shy, center) {
			var mx = new Matrix();
			return mx.setToShear.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a rotation transformation.
		 *
		 * @param {number} angle The angle of rotation measured in degrees.
		 * @param {number} x The x coordinate of the anchor point.
		 * @param {number} y The y coordinate of the anchor point.
		 * @return {Matrix} A transform representing a rotation
		 *		 transformation.
		 */
		getRotateInstance: function(angle, center) {
			var mx = new Matrix();
			return mx.setToRotation.apply(mx, arguments);
		}
	}
});

