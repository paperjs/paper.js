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

// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

/**
 * @name Matrix
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
 *      [ x ]   [ a  b  tx ] [ x ]   [ a * x + b * y + tx ]
 *      [ y ] = [ c  d  ty ] [ y ] = [ c * x + d * y + ty ]
 *      [ 1 ]   [ 0  0  1  ] [ 1 ]   [         1          ]
 * </pre>
 *
 * This class is optimized for speed and minimizes calculations based on its
 * knowledge of the underlying matrix (as opposed to say simply performing
 * matrix multiplication).
 */
var Matrix = Base.extend(/** @lends Matrix# */{
	_class: 'Matrix',

	/**
	 * Creates a 2D affine transform.
	 *
	 * @param {Number} a the scaleX coordinate of the transform
	 * @param {Number} c the shearY coordinate of the transform
	 * @param {Number} b the shearX coordinate of the transform
	 * @param {Number} d the scaleY coordinate of the transform
	 * @param {Number} tx the translateX coordinate of the transform
	 * @param {Number} ty the translateY coordinate of the transform
	 */
	initialize: function Matrix(arg) {
		var count = arguments.length,
			ok = true;
		if (count === 6) {
			this.set.apply(this, arguments);
		} else if (count === 1) {
			if (arg instanceof Matrix) {
				this.set(arg._a, arg._c, arg._b, arg._d, arg._tx, arg._ty);
			} else if (Array.isArray(arg)) {
				this.set.apply(this, arg);
			} else {
				ok = false;
			}
		} else if (count === 0) {
			this.reset();
		} else {
			ok = false;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	/**
	 * Sets this transform to the matrix specified by the 6 values.
	 *
	 * @param {Number} a the scaleX coordinate of the transform
	 * @param {Number} c the shearY coordinate of the transform
	 * @param {Number} b the shearX coordinate of the transform
	 * @param {Number} d the scaleY coordinate of the transform
	 * @param {Number} tx the translateX coordinate of the transform
	 * @param {Number} ty the translateY coordinate of the transform
	 * @return {Matrix} this affine transform
	 */
	set: function(a, c, b, d, tx, ty, _dontNotify) {
		this._a = a;
		this._c = c;
		this._b = b;
		this._d = d;
		this._tx = tx;
		this._ty = ty;
		if (!_dontNotify)
			this._changed();
		return this;
	},

	_serialize: function(options) {
		return Base.serialize(this.getValues(), options);
	},

	_changed: function() {
		if (this._owner)
			this._owner._changed(/*#=*/ Change.GEOMETRY);
	},

	/**
	 * @return {Matrix} a copy of this transform
	 */
	clone: function() {
		return new Matrix(this._a, this._c, this._b, this._d,
				this._tx, this._ty);
	},

	/**
	 * Checks whether the two matrices describe the same transformation.
	 *
	 * @param {Matrix} matrix the matrix to compare this matrix to
	 * @return {Boolean} {@true if the matrices are equal}
	 */
	equals: function(mx) {
		return mx === this || mx && this._a === mx._a && this._b === mx._b
				&& this._c === mx._c && this._d === mx._d
				&& this._tx === mx._tx && this._ty === mx._ty
				|| false;
	},

	/**
	 * @return {String} a string representation of this transform
	 */
	toString: function() {
		var f = Formatter.instance;
		return '[[' + [f.number(this._a), f.number(this._b),
					f.number(this._tx)].join(', ') + '], ['
				+ [f.number(this._c), f.number(this._d),
					f.number(this._ty)].join(', ') + ']]';
	},

	/**
	 * "Resets" the matrix by setting its values to the ones of the identity
	 * matrix that results in no transformation.
	 */
	reset: function() {
		this._a = this._d = 1;
		this._c = this._b = this._tx = this._ty = 0;
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} scale the scaling factor
	 * @param {Point} [center] the center for the scaling transformation
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} hor the horizontal scaling factor
	 * @param {Number} ver the vertical scaling factor
	 * @param {Point} [center] the center for the scaling transformation
	 * @return {Matrix} this affine transform
	 */
	scale: function(/* scale, center */) {
		// Do not modify scale, center, since that would arguments of which
		// we're reading from!
		var scale = Point.read(arguments),
			center = Point.read(arguments, 0, 0, { readNull: true });
		if (center)
			this.translate(center);
		this._a *= scale.x;
		this._c *= scale.x;
		this._b *= scale.y;
		this._d *= scale.y;
		if (center)
			this.translate(center.negate());
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Point} point the vector to translate by
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Number} dx the distance to translate in the x direction
	 * @param {Number} dy the distance to translate in the y direction
	 * @return {Matrix} this affine transform
	 */
	translate: function(point) {
		point = Point.read(arguments);
		var x = point.x,
			y = point.y;
		this._tx += x * this._a + y * this._b;
		this._ty += x * this._c + y * this._d;
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle the angle of rotation measured in degrees
	 * @param {Point} center the anchor point to rotate around
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle the angle of rotation measured in degrees
	 * @param {Number} x the x coordinate of the anchor point
	 * @param {Number} y the y coordinate of the anchor point
	 * @return {Matrix} this affine transform
	 */
	rotate: function(angle, center) {
		center = Point.read(arguments, 1);
		angle = angle * Math.PI / 180;
		// Concatenate rotation matrix into this one
		var x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle),
			tx = x - x * cos + y * sin,
			ty = y - x * sin - y * cos,
			a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = cos * a + sin * b;
		this._b = -sin * a + cos * b;
		this._c = cos * c + sin * d;
		this._d = -sin * c + cos * d;
		this._tx += tx * a + ty * b;
		this._ty += tx * c + ty * d;
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Point} point the shear factor in x and y direction
	 * @param {Point} [center] the center for the shear transformation
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Number} hor the horizontal shear factor
	 * @param {Number} ver the vertical shear factor
	 * @param {Point} [center] the center for the shear transformation
	 * @return {Matrix} this affine transform
	 */
	shear: function(/* point, center */) {
		// Do not modify point, center, since that would arguments of which
		// we're reading from!
		var point = Point.read(arguments),
			center = Point.read(arguments, 0, 0, { readNull: true });
		if (center)
			this.translate(center);
		var a = this._a,
			c = this._c;
		this._a += point.y * this._b;
		this._c += point.y * this._d;
		this._b += point.x * a;
		this._d += point.x * c;
		if (center)
			this.translate(center.negate());
		this._changed();
		return this;
	},

	/**
	 * Concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx the transform to concatenate
	 * @return {Matrix} this affine transform
	 */
	concatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = mx._a * a + mx._c * b;
		this._b = mx._b * a + mx._d * b;
		this._c = mx._a * c + mx._c * d;
		this._d = mx._b * c + mx._d * d;
		this._tx += mx._tx * a + mx._ty * b;
		this._ty += mx._tx * c + mx._ty * d;
		this._changed();
		return this;
	},

	/**
	 * Pre-concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx the transform to preconcatenate
	 * @return {Matrix} this affine transform
	 */
	preConcatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			tx = this._tx,
			ty = this._ty;
		this._a = mx._a * a + mx._b * c;
		this._b = mx._a * b + mx._b * d;
		this._c = mx._c * a + mx._d * c;
		this._d = mx._c * b + mx._d * d;
		this._tx = mx._a * tx + mx._b * ty + mx._tx;
		this._ty = mx._c * tx + mx._d * ty + mx._ty;
		this._changed();
		return this;
	},

	/**
	 * @return {Boolean} whether this transform is the identity transform
	 */
	isIdentity: function() {
		return this._a === 1 && this._c === 0 && this._b === 0 && this._d === 1
				&& this._tx === 0 && this._ty === 0;
	},

	/**
	 * Returns whether the transform is invertible. A transform is not
	 * invertible if the determinant is 0 or any value is non-finite or NaN.
	 *
	 * @return {Boolean} whether the transform is invertible
	 */
	isInvertible: function() {
		return !!this._getDeterminant();
	},

	/**
	 * Checks whether the matrix is singular or not. Singular matrices cannot be
	 * inverted.
	 *
	 * @return {Boolean} whether the matrix is singular
	 */
	isSingular: function() {
		return !this._getDeterminant();
	},

	/**
	 * Transforms a point and returns the result.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point
	 */
	/**
	 * Transforms an array of coordinates by this matrix and stores the results
	 * into the destination array, which is also returned.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Number[]} src the array containing the source points
	 *        as x, y value pairs
	 * @param {Number} srcOffset the offset to the first point to be transformed
	 * @param {Number[]} dst the array into which to store the transformed
	 *        point pairs
	 * @param {Number} dstOffset the offset of the location of the first
	 *        transformed point in the destination array
	 * @param {Number} count the number of points to tranform
	 * @return {Number[]} the dst array, containing the transformed coordinates.
	 */
	transform: function(/* point | */ src, srcOffset, dst, dstOffset, count) {
		return arguments.length < 5
			// TODO: Check for rectangle and use _tranformBounds?
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, srcOffset, dst, dstOffset, count);
	},

	/**
	 * A faster version of transform that only takes one point and does not
	 * attempt to convert it.
	 */
	_transformPoint: function(point, dest, _dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = new Point();
		return dest.set(
			x * this._a + y * this._b + this._tx,
			x * this._c + y * this._d + this._ty,
			_dontNotify
		);
	},

	_transformCoordinates: function(src, srcOffset, dst, dstOffset, count) {
		var i = srcOffset,
			j = dstOffset,
			max = i + 2 * count;
		while (i < max) {
			var x = src[i++],
				y = src[i++];
			dst[j++] = x * this._a + y * this._b + this._tx;
			dst[j++] = x * this._c + y * this._d + this._ty;
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
	_transformBounds: function(bounds, dest, _dontNotify) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = coords.slice();
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j])
				min[j] = val;
			else if (val > max[j])
				max[j] = val;
		}
		if (!dest)
			dest = new Rectangle();
		return dest.set(min[0], min[1], max[0] - min[0], max[1] - min[1],
				_dontNotify);
	},

	/**
	 * Inverse transforms a point and returns the result.
	 *
	 * @param {Point} point the point to be transformed
	 */
	inverseTransform: function(/* point */) {
		return this._inverseTransform(Point.read(arguments));
	},

	/**
	 * Returns the determinant of this transform, but only if the matrix is
	 * reversible, null otherwise.
	 */
	_getDeterminant: function() {
		var det = this._a * this._d - this._b * this._c;
		return isFinite(det) && !Numerical.isZero(det)
				&& isFinite(this._tx) && isFinite(this._ty)
				? det : null;
	},

	_inverseTransform: function(point, dest, _dontNotify) {
		var det = this._getDeterminant();
		if (!det)
			return null;
		var x = point.x - this._tx,
			y = point.y - this._ty;
		if (!dest)
			dest = new Point();
		return dest.set(
			(x * this._d - y * this._b) / det,
			(y * this._a - x * this._c) / det,
			_dontNotify
		);
	},

	/**
	 * Attempts to decompose the affine transformation described by this matrix
	 * into {@code translation}, {@code scaling}, {@code rotation} and
	 * {@code shearing}, and returns an object with these properties if it
	 * succeeded, {@code null} otherwise.
	 *
	 * @return {Object} the decomposed matrix, or {@code null} if decomposition
	 * is not possible.
	 */
	decompose: function() {
		// http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
		// http://stackoverflow.com/questions/4361242/
		// https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
		var a = this._a, b = this._b, c = this._c, d = this._d;
		if (Numerical.isZero(a * d - b * c))
			return null;

		var scaleX = Math.sqrt(a * a + b * b);
		a /= scaleX;
		b /= scaleX;

		var shear = a * c + b * d;
		c -= a * shear;
		d -= b * shear;

		var scaleY = Math.sqrt(c * c + d * d);
		c /= scaleY;
		d /= scaleY;
		shear /= scaleY;

		// a * d - b * c should now be 1 or -1
		if (a * d < b * c) {
			a = -a;
			b = -b;
			// We don't need c & d anymore, but if we did, we'd have to do this:
			// c = -c;
			// d = -d;
			shear = -shear;
			scaleX = -scaleX;
		}

		return {
			translation: this.getTranslation(),
			scaling: new Point(scaleX, scaleY),
			rotation: -Math.atan2(b, a) * 180 / Math.PI,
			shearing: shear
		};
	},

	/**
	 * The scaling factor in the x-direction ({@code a}).
	 *
	 * @name Matrix#scaleX
	 * @type Number
	 */

	/**
	 * The scaling factor in the y-direction ({@code d}).
	 *
	 * @name Matrix#scaleY
	 * @type Number
	 */

	/**
	 * The shear factor in the x-direction ({@code b}).
	 *
	 * @name Matrix#shearX
	 * @type Number
	 */

	/**
	 * The shear factor in the y-direction ({@code c}).
	 *
	 * @name Matrix#shearY
	 * @type Number
	 */

	/**
	 * The translation in the x-direction ({@code tx}).
	 *
	 * @name Matrix#translateX
	 * @type Number
	 */

	/**
	 * The translation in the y-direction ({@code ty}).
	 *
	 * @name Matrix#translateY
	 * @type Number
	 */

	/**
	 * The transform values as an array, in the same sequence as they are passed
	 * to {@link #initialize(a, c, b, d, tx, ty)}.
	 *
	 * @type Number[]
	 * @bean
	 */
	getValues: function() {
		return [ this._a, this._c, this._b, this._d, this._tx, this._ty ];
	},

	/**
	 * The translation values of the matrix.
	 *
	 * @type Point
	 * @bean
	 */
	getTranslation: function() {
		// No decomposition is required to extract translation, so treat this
		return new Point(this._tx, this._ty);
	},

	setTranslation: function(/* point */) {
		var point = Point.read(arguments);
		this._tx = point.x;
		this._ty = point.y;
		this._changed();
	},

	/**
	 * The scaling values of the matrix, if it can be decomposed.
	 *
	 * @type Point
	 * @bean
	 * @see Matrix#decompose()
	 */
	getScaling: function() {
		return (this.decompose() || {}).scaling;
	},

	setScaling: function(/* scale */) {
		var scaling = this.getScaling();
		if (scaling != null) {
			var scale = Point.read(arguments);
			(this._owner || this).scale(
					scale.x / scaling.x, scale.y / scaling.y);
		}
	},

	/**
	 * The rotation angle of the matrix, if it can be decomposed.
	 *
	 * @type Number
	 * @bean
	 * @see Matrix#decompose()
	 */
	getRotation: function() {
		return (this.decompose() || {}).rotation;
	},

	setRotation: function(angle) {
		var rotation = this.getRotation();
		if (rotation != null)
			(this._owner || this).rotate(angle - rotation);
	},

	/**
	 * Inverts the transformation of the matrix. If the matrix is not invertible
	 * (in which case {@link #isSingular()} returns true), {@code null } is
	 * returned.
	 *
	 * @return {Matrix} the inverted matrix, or {@code null }, if the matrix is
	 *         singular
	 */
	inverted: function() {
		var det = this._getDeterminant();
		return det && new Matrix(
				this._d / det,
				-this._c / det,
				-this._b / det,
				this._a / det,
				(this._b * this._ty - this._d * this._tx) / det,
				(this._c * this._tx - this._a * this._ty) / det);
	},

	shiftless: function() {
		return new Matrix(this._a, this._c, this._b, this._d, 0, 0);
	},

	/**
	 * Applies this matrix to the specified Canvas Context.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 */
	applyToContext: function(ctx) {
		ctx.transform(this._a, this._c, this._b, this._d, this._tx, this._ty);
	}
}, new function() {
	return Base.each({
		scaleX: '_a',
		scaleY: '_d',
		translateX: '_tx',
		translateY: '_ty',
		shearX: '_b',
		shearY: '_c'
	}, function(prop, name) {
		name = Base.capitalize(name);
		this['get' + name] = function() {
			return this[prop];
		};
		this['set' + name] = function(value) {
			this[prop] = value;
			this._changed();
		};
	}, {});
});
