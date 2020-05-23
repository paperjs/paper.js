/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
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
 * @class An affine transformation matrix performs a linear mapping from 2D
 *     coordinates to other 2D coordinates that preserves the "straightness" and
 *     "parallelness" of lines.
 *
 * Such a coordinate transformation can be represented by a 3 row by 3
 * column matrix with an implied last row of `[ 0 0 1 ]`. This matrix
 * transforms source coordinates `(x, y)` into destination coordinates `(x',y')`
 * by considering them to be a column vector and multiplying the coordinate
 * vector by the matrix according to the following process:
 *
 *     [ x ]   [ a  c  tx ] [ x ]   [ a * x + c * y + tx ]
 *     [ y ] = [ b  d  ty ] [ y ] = [ b * x + d * y + ty ]
 *     [ 1 ]   [ 0  0  1  ] [ 1 ]   [         1          ]
 *
 * Note the locations of b and c.
 *
 * This class is optimized for speed and minimizes calculations based on its
 * knowledge of the underlying matrix (as opposed to say simply performing
 * matrix multiplication).
 */
var Matrix = Base.extend(/** @lends Matrix# */{
    _class: 'Matrix',

    /**
     * Creates a 2D affine transformation matrix that describes the identity
     * transformation.
     *
     * @name Matrix#initialize
     */
    /**
     * Creates a 2D affine transformation matrix.
     *
     * @name Matrix#initialize
     * @param {Number} a the a property of the transform
     * @param {Number} b the b property of the transform
     * @param {Number} c the c property of the transform
     * @param {Number} d the d property of the transform
     * @param {Number} tx the tx property of the transform
     * @param {Number} ty the ty property of the transform
     */
    /**
     * Creates a 2D affine transformation matrix.
     *
     * @name Matrix#initialize
     * @param {Number[]} values the matrix values to initialize this matrix with
     */
    /**
     * Creates a 2D affine transformation matrix.
     *
     * @name Matrix#initialize
     * @param {Matrix} matrix the matrix to copy the values from
     */
    initialize: function Matrix(arg, _dontNotify) {
        var args = arguments,
            count = args.length,
            ok = true;
        if (count >= 6) { // >= 6 to pass on optional _dontNotify argument.
            this._set.apply(this, args);
        } else if (count === 1 || count === 2) {
            // Support both Matrix and Array arguments through #_set(), and pass
            // on the optional _dontNotify argument:
            if (arg instanceof Matrix) {
                this._set(arg._a, arg._b, arg._c, arg._d, arg._tx, arg._ty,
                        _dontNotify);
            } else if (Array.isArray(arg)) {
                this._set.apply(this,
                        _dontNotify ? arg.concat([_dontNotify]) : arg);
            } else {
                ok = false;
            }
        } else if (!count) {
            this.reset();
        } else {
            ok = false;
        }
        if (!ok) {
            throw new Error('Unsupported matrix parameters');
        }
        return this;
    },

    /**
     * Sets the matrix to the passed values. Note that any sequence of
     * parameters that is supported by the various {@link Matrix()} constructors
     * also work for calls of `set()`.
     *
     * @function
     * @param {...*} values
     * @return {Point}
     */
    set: '#initialize',

    // See Point#_set() for an explanation of #_set():
    _set: function(a, b, c, d, tx, ty, _dontNotify) {
        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
        this._tx = tx;
        this._ty = ty;
        if (!_dontNotify)
            this._changed();
        return this;
    },

    _serialize: function(options, dictionary) {
        return Base.serialize(this.getValues(), options, true, dictionary);
    },

    _changed: function() {
        var owner = this._owner;
        if (owner) {
            // If owner has #applyMatrix set, directly bake the change in now.
            if (owner._applyMatrix) {
                owner.transform(null, true);
            } else {
                owner._changed(/*#=*/Change.MATRIX);
            }
        }
    },

    /**
     * @return {Matrix} a copy of this transform
     */
    clone: function() {
        return new Matrix(this._a, this._b, this._c, this._d,
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
                && this._tx === mx._tx && this._ty === mx._ty;
    },

    /**
     * @return {String} a string representation of this transform
     */
    toString: function() {
        var f = Formatter.instance;
        return '[[' + [f.number(this._a), f.number(this._c),
                    f.number(this._tx)].join(', ') + '], ['
                + [f.number(this._b), f.number(this._d),
                    f.number(this._ty)].join(', ') + ']]';
    },

    /**
     * Resets the matrix by setting its values to the ones of the identity
     * matrix that results in no transformation.
     */
    reset: function(_dontNotify) {
        this._a = this._d = 1;
        this._b = this._c = this._tx = this._ty = 0;
        if (!_dontNotify)
            this._changed();
        return this;
    },

    /**
     * Attempts to apply the matrix to the content of item that it belongs to,
     * meaning its transformation is baked into the item's content or children.
     *
     * @param {Boolean} [recursively=true] controls whether to apply
     *     transformations recursively on children
     * @return {Boolean} {@true if the matrix was applied}
     */
    apply: function(recursively, _setApplyMatrix) {
        var owner = this._owner;
        if (owner) {
            owner.transform(null, Base.pick(recursively, true), _setApplyMatrix);
            // If the matrix was successfully applied, it will be reset now.
            return this.isIdentity();
        }
        return false;
    },

    /**
     * Concatenates this matrix with a translate transformation.
     *
     * @name Matrix#translate
     * @function
     * @param {Point} point the vector to translate by
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this matrix with a translate transformation.
     *
     * @name Matrix#translate
     * @function
     * @param {Number} dx the distance to translate in the x direction
     * @param {Number} dy the distance to translate in the y direction
     * @return {Matrix} this affine transform
     */
    translate: function(/* point */) {
        var point = Point.read(arguments),
            x = point.x,
            y = point.y;
        this._tx += x * this._a + y * this._c;
        this._ty += x * this._b + y * this._d;
        this._changed();
        return this;
    },

    /**
     * Concatenates this matrix with a scaling transformation.
     *
     * @name Matrix#scale
     * @function
     * @param {Number} scale the scaling factor
     * @param {Point} [center] the center for the scaling transformation
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this matrix with a scaling transformation.
     *
     * @name Matrix#scale
     * @function
     * @param {Number} hor the horizontal scaling factor
     * @param {Number} ver the vertical scaling factor
     * @param {Point} [center] the center for the scaling transformation
     * @return {Matrix} this affine transform
     */
    scale: function(/* scale, center */) {
        var args = arguments,
            scale = Point.read(args),
            center = Point.read(args, 0, { readNull: true });
        if (center)
            this.translate(center);
        this._a *= scale.x;
        this._b *= scale.x;
        this._c *= scale.y;
        this._d *= scale.y;
        if (center)
            this.translate(center.negate());
        this._changed();
        return this;
    },

    /**
     * Concatenates this matrix with a rotation transformation around an
     * anchor point.
     *
     * @name Matrix#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Point} center the anchor point to rotate around
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this matrix with a rotation transformation around an
     * anchor point.
     *
     * @name Matrix#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Number} x the x coordinate of the anchor point
     * @param {Number} y the y coordinate of the anchor point
     * @return {Matrix} this affine transform
     */
    rotate: function(angle /*, center */) {
        angle *= Math.PI / 180;
        var center = Point.read(arguments, 1),
            // Concatenate rotation matrix into this one
            x = center.x,
            y = center.y,
            cos = Math.cos(angle),
            sin = Math.sin(angle),
            tx = x - x * cos + y * sin,
            ty = y - x * sin - y * cos,
            a = this._a,
            b = this._b,
            c = this._c,
            d = this._d;
        this._a = cos * a + sin * c;
        this._b = cos * b + sin * d;
        this._c = -sin * a + cos * c;
        this._d = -sin * b + cos * d;
        this._tx += tx * a + ty * c;
        this._ty += tx * b + ty * d;
        this._changed();
        return this;
    },

    /**
     * Concatenates this matrix with a shear transformation.
     *
     * @name Matrix#shear
     * @function
     * @param {Point} shear the shear factor in x and y direction
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this matrix with a shear transformation.
     *
     * @name Matrix#shear
     * @function
     * @param {Number} hor the horizontal shear factor
     * @param {Number} ver the vertical shear factor
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    shear: function(/* shear, center */) {
        // Do not modify point, center, since that would arguments of which
        // we're reading from!
        var args = arguments,
            shear = Point.read(args),
            center = Point.read(args, 0, { readNull: true });
        if (center)
            this.translate(center);
        var a = this._a,
            b = this._b;
        this._a += shear.y * this._c;
        this._b += shear.y * this._d;
        this._c += shear.x * a;
        this._d += shear.x * b;
        if (center)
            this.translate(center.negate());
        this._changed();
        return this;
    },

    /**
     * Concatenates this matrix with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Point} skew the skew angles in x and y direction in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this matrix with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Number} hor the horizontal skew angle in degrees
     * @param {Number} ver the vertical skew angle in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    skew: function(/* skew, center */) {
        var args = arguments,
            skew = Point.read(args),
            center = Point.read(args, 0, { readNull: true }),
            toRadians = Math.PI / 180,
            shear = new Point(Math.tan(skew.x * toRadians),
                Math.tan(skew.y * toRadians));
        return this.shear(shear, center);
    },

    /**
     * Appends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(this matrix) * (specified matrix)`.
     *
     * @param {Matrix} matrix the matrix to append
     * @return {Matrix} this matrix, modified
     */
    append: function(mx, _dontNotify) {
        if (mx) {
            var a1 = this._a,
                b1 = this._b,
                c1 = this._c,
                d1 = this._d,
                a2 = mx._a,
                b2 = mx._c,
                c2 = mx._b,
                d2 = mx._d,
                tx2 = mx._tx,
                ty2 = mx._ty;
            this._a = a2 * a1 + c2 * c1;
            this._c = b2 * a1 + d2 * c1;
            this._b = a2 * b1 + c2 * d1;
            this._d = b2 * b1 + d2 * d1;
            this._tx += tx2 * a1 + ty2 * c1;
            this._ty += tx2 * b1 + ty2 * d1;
            if (!_dontNotify)
                this._changed();
        }
        return this;
    },

    /**
     * Prepends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(specified matrix) * (this matrix)`.
     *
     * @param {Matrix} matrix the matrix to prepend
     * @return {Matrix} this matrix, modified
     */
    prepend: function(mx, _dontNotify) {
        if (mx) {
            var a1 = this._a,
                b1 = this._b,
                c1 = this._c,
                d1 = this._d,
                tx1 = this._tx,
                ty1 = this._ty,
                a2 = mx._a,
                b2 = mx._c,
                c2 = mx._b,
                d2 = mx._d,
                tx2 = mx._tx,
                ty2 = mx._ty;
            this._a = a2 * a1 + b2 * b1;
            this._c = a2 * c1 + b2 * d1;
            this._b = c2 * a1 + d2 * b1;
            this._d = c2 * c1 + d2 * d1;
            this._tx = a2 * tx1 + b2 * ty1 + tx2;
            this._ty = c2 * tx1 + d2 * ty1 + ty2;
            if (!_dontNotify)
                this._changed();
        }
        return this;
    },

    /**
     * Returns a new matrix as the result of appending the specified matrix to
     * this matrix. This is the equivalent of multiplying
     * `(this matrix) * (specified matrix)`.
     *
     * @param {Matrix} matrix the matrix to append
     * @return {Matrix} the newly created matrix
     */
    appended: function(mx) {
        return this.clone().append(mx);
    },

    /**
     * Returns a new matrix as the result of prepending the specified matrix
     * to this matrix. This is the equivalent of multiplying
     * `(specified matrix) * (this matrix)`.
     *
     * @param {Matrix} matrix the matrix to prepend
     * @return {Matrix} the newly created matrix
     */
    prepended: function(mx) {
        return this.clone().prepend(mx);
    },

    /**
     * Inverts the matrix, causing it to perform the opposite transformation.
     * If the matrix is not invertible (in which case {@link #isSingular()}
     * returns true), `null` is returned.
     *
     * @return {Matrix} this matrix, or `null`, if the matrix is singular.
     */
    invert: function() {
        var a = this._a,
            b = this._b,
            c = this._c,
            d = this._d,
            tx = this._tx,
            ty = this._ty,
            det = a * d - b * c,
            res = null;
        if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
            this._a = d / det;
            this._b = -b / det;
            this._c = -c / det;
            this._d = a / det;
            this._tx = (c * ty - d * tx) / det;
            this._ty = (b * tx - a * ty) / det;
            res = this;
        }
        return res;
    },

    /**
     * Creates a new matrix that is the inversion of this matrix, causing it to
     * perform the opposite transformation. If the matrix is not invertible (in
     * which case {@link #isSingular()} returns true), `null` is returned.
     *
     * @return {Matrix} this matrix, or `null`, if the matrix is singular.
     */
    inverted: function() {
        return this.clone().invert();
    },

    /**
     * @deprecated use {@link #append(matrix)} instead.
     */
    concatenate: '#append',
    /**
     * @deprecated use {@link #prepend(matrix)} instead.
     */
    preConcatenate: '#prepend',
    /**
     * @deprecated use {@link #appended(matrix)} instead.
     */
    chain: '#appended',

    /**
     * A private helper function to create a clone of this matrix, without the
     * translation factored in.
     *
     * @return {Matrix} a clone of this matrix, with {@link #tx} and {@link #ty}
     * set to `0`.
     */
    _shiftless: function() {
        return new Matrix(this._a, this._b, this._c, this._d, 0, 0);
    },

    _orNullIfIdentity: function() {
        return this.isIdentity() ? null : this;
    },

    /**
     * @return {Boolean} whether this matrix is the identity matrix
     */
    isIdentity: function() {
        return this._a === 1 && this._b === 0 && this._c === 0 && this._d === 1
                && this._tx === 0 && this._ty === 0;
    },

    /**
     * Checks whether the matrix is invertible. A matrix is not invertible if
     * the determinant is 0 or any value is infinite or NaN.
     *
     * @return {Boolean} whether the matrix is invertible
     */
    isInvertible: function() {
        var det = this._a * this._d - this._c * this._b;
        return det && !isNaN(det) && isFinite(this._tx) && isFinite(this._ty);
    },

    /**
     * Checks whether the matrix is singular or not. Singular matrices cannot be
     * inverted.
     *
     * @return {Boolean} whether the matrix is singular
     */
    isSingular: function() {
        return !this.isInvertible();
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
     * as x, y value pairs
     * @param {Number[]} dst the array into which to store the transformed
     * point pairs
     * @param {Number} count the number of points to transform
     * @return {Number[]} the dst array, containing the transformed coordinates
     */
    transform: function(/* point | */ src, dst, count) {
        return arguments.length < 3
            // TODO: Check for rectangle and use _tranformBounds?
            ? this._transformPoint(Point.read(arguments))
            : this._transformCoordinates(src, dst, count);
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
        return dest._set(
                x * this._a + y * this._c + this._tx,
                x * this._b + y * this._d + this._ty,
                _dontNotify);
    },

    _transformCoordinates: function(src, dst, count) {
        for (var i = 0, max = 2 * count; i < max; i += 2) {
            var x = src[i],
                y = src[i + 1];
            dst[i] = x * this._a + y * this._c + this._tx;
            dst[i + 1] = x * this._b + y * this._d + this._ty;
        }
        return dst;
    },

    _transformCorners: function(rect) {
        var x1 = rect.x,
            y1 = rect.y,
            x2 = x1 + rect.width,
            y2 = y1 + rect.height,
            coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
        return this._transformCoordinates(coords, coords, 4);
    },

    /**
     * Returns the 'transformed' bounds rectangle by transforming each corner
     * point and finding the new bounding box to these points. This is not
     * really the transformed rectangle!
     */
    _transformBounds: function(bounds, dest, _dontNotify) {
        var coords = this._transformCorners(bounds),
            min = coords.slice(0, 2),
            max = min.slice();
        for (var i = 2; i < 8; i++) {
            var val = coords[i],
                j = i & 1;
            if (val < min[j]) {
                min[j] = val;
            } else if (val > max[j]) {
                max[j] = val;
            }
        }
        if (!dest)
            dest = new Rectangle();
        return dest._set(min[0], min[1], max[0] - min[0], max[1] - min[1],
                _dontNotify);
    },

    /**
     * Inverse transforms a point and returns the result.
     *
     * @param {Point} point the point to be transformed
     * @return {Point}
     */
    inverseTransform: function(/* point */) {
        return this._inverseTransform(Point.read(arguments));
    },

    _inverseTransform: function(point, dest, _dontNotify) {
        var a = this._a,
            b = this._b,
            c = this._c,
            d = this._d,
            tx = this._tx,
            ty = this._ty,
            det = a * d - b * c,
            res = null;
        if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
            var x = point.x - this._tx,
                y = point.y - this._ty;
            if (!dest)
                dest = new Point();
            res = dest._set(
                    (x * d - y * c) / det,
                    (y * a - x * b) / det,
                    _dontNotify);
        }
        return res;
    },

    /**
     * Decomposes the affine transformation described by this matrix into
     * `scaling`, `rotation` and `skewing`, and returns an object with
     * these properties.
     *
     * @return {Object} the decomposed matrix
     */
    decompose: function() {
        // http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
        // http://www.maths-informatique-jeux.com/blog/frederic/?post/2013/12/01/Decomposition-of-2D-transform-matrices
        // https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
        var a = this._a,
            b = this._b,
            c = this._c,
            d = this._d,
            det = a * d - b * c,
            sqrt = Math.sqrt,
            atan2 = Math.atan2,
            degrees = 180 / Math.PI,
            rotate,
            scale,
            skew;
        if (a !== 0 || b !== 0) {
            var r = sqrt(a * a + b * b);
            rotate = Math.acos(a / r) * (b > 0 ? 1 : -1);
            scale = [r, det / r];
            skew = [atan2(a * c + b * d, r * r), 0];
        } else if (c !== 0 || d !== 0) {
            var s = sqrt(c * c + d * d);
            // rotate = Math.PI/2 - (d > 0 ? Math.acos(-c/s) : -Math.acos(c/s));
            rotate = Math.asin(c / s)  * (d > 0 ? 1 : -1);
            scale = [det / s, s];
            skew = [0, atan2(a * c + b * d, s * s)];
        } else { // a = b = c = d = 0
            rotate = 0;
            skew = scale = [0, 0];
        }
        return {
            translation: this.getTranslation(),
            rotation: rotate * degrees,
            scaling: new Point(scale),
            skewing: new Point(skew[0] * degrees, skew[1] * degrees)
        };
    },

    /**
     * The value that affects the transformation along the x axis when scaling
     * or rotating, positioned at (0, 0) in the transformation matrix.
     *
     * @name Matrix#a
     * @type Number
     */

    /**
     * The value that affects the transformation along the y axis when rotating
     * or skewing, positioned at (1, 0) in the transformation matrix.
     *
     * @name Matrix#b
     * @type Number
     */

    /**
     * The value that affects the transformation along the x axis when rotating
     * or skewing, positioned at (0, 1) in the transformation matrix.
     *
     * @name Matrix#c
     * @type Number
     */

    /**
     * The value that affects the transformation along the y axis when scaling
     * or rotating, positioned at (1, 1) in the transformation matrix.
     *
     * @name Matrix#d
     * @type Number
     */

    /**
     * The distance by which to translate along the x axis, positioned at (2, 0)
     * in the transformation matrix.
     *
     * @name Matrix#tx
     * @type Number
     */

    /**
     * The distance by which to translate along the y axis, positioned at (2, 1)
     * in the transformation matrix.
     *
     * @name Matrix#ty
     * @type Number
     */

    /**
     * The matrix values as an array, in the same sequence as they are passed
     * to {@link #initialize(a, b, c, d, tx, ty)}.
     *
     * @bean
     * @type Number[]
     */
    getValues: function() {
        return [ this._a, this._b, this._c, this._d, this._tx, this._ty ];
    },

    /**
     * The translation of the matrix as a vector.
     *
     * @bean
     * @type Point
     */
    getTranslation: function() {
        // No decomposition is required to extract translation.
        return new Point(this._tx, this._ty);
    },

    /**
     * The scaling values of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Point
     * @see #decompose()
     */
    getScaling: function() {
        return this.decompose().scaling;
    },

    /**
     * The rotation angle of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Number
     * @see #decompose()
     */
    getRotation: function() {
        return this.decompose().rotation;
    },

    /**
     * Applies this matrix to the specified Canvas Context.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    applyToContext: function(ctx) {
        if (!this.isIdentity()) {
            ctx.transform(this._a, this._b, this._c, this._d,
                    this._tx, this._ty);
        }
    }
}, Base.each(['a', 'b', 'c', 'd', 'tx', 'ty'], function(key) {
    // Create getters and setters for all internal attributes.
    var part = Base.capitalize(key),
        prop = '_' + key;
    this['get' + part] = function() {
        return this[prop];
    };
    this['set' + part] = function(value) {
        this[prop] = value;
        this._changed();
    };
}, {}));
