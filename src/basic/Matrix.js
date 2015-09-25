/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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
     * @param {Number} a the a property of the transform
     * @param {Number} c the c property of the transform
     * @param {Number} b the b property of the transform
     * @param {Number} d the d property of the transform
     * @param {Number} tx the tx property of the transform
     * @param {Number} ty the ty property of the transform
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
     * @param {Number} a the a property of the transform
     * @param {Number} c the c property of the transform
     * @param {Number} b the b property of the transform
     * @param {Number} d the d property of the transform
     * @param {Number} tx the tx property of the transform
     * @param {Number} ty the ty property of the transform
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
        var owner = this._owner;
        if (owner) {
            // If owner has #applyMatrix set, directly bake the change in now.
            if (owner._applyMatrix) {
                owner.transform(null, true);
            } else {
                owner._changed(/*#=*/Change.GEOMETRY);
            }
        }
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
     * Resets the matrix by setting its values to the ones of the identity
     * matrix that results in no transformation.
     */
    reset: function(_dontNotify) {
        this._a = this._d = 1;
        this._c = this._b = this._tx = this._ty = 0;
        if (!_dontNotify)
            this._changed();
        return this;
    },

    /**
     * Attempts to apply the matrix to the content of item that it belongs to,
     * meaning its transformation is baked into the item's content or children.
     *
     * @param {Boolean} recursively controls whether to apply transformations
     * recursively on children
     * @return {Boolean} {@true if the matrix was applied}
     */
    apply: function(recursively, _setApplyMatrix) {
        var owner = this._owner;
        if (owner) {
            owner.transform(null, true, Base.pick(recursively, true),
                    _setApplyMatrix);
            // If the matrix was successfully applied, it will be reset now.
            return this.isIdentity();
        }
        return false;
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
    translate: function(/* point */) {
        var point = Point.read(arguments),
            x = point.x,
            y = point.y;
        this._tx += x * this._a + y * this._b;
        this._ty += x * this._c + y * this._d;
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
            center = Point.read(arguments, 0, { readNull: true });
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
     * @param {Point} shear the shear factor in x and y direction
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
    shear: function(/* shear, center */) {
        // Do not modify point, center, since that would arguments of which
        // we're reading from!
        var shear = Point.read(arguments),
            center = Point.read(arguments, 0, { readNull: true });
        if (center)
            this.translate(center);
        var a = this._a,
            c = this._c;
        this._a += shear.y * this._b;
        this._c += shear.y * this._d;
        this._b += shear.x * a;
        this._d += shear.x * c;
        if (center)
            this.translate(center.negate());
        this._changed();
        return this;
    },

    /**
     * Concatenates this transform with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Point} skew the skew angles in x and y direction in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this transform with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Number} hor the horizontal skew angle in degrees
     * @param {Number} ver the vertical skew angle in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    skew: function(/* skew, center */) {
        var skew = Point.read(arguments),
            center = Point.read(arguments, 0, { readNull: true }),
            toRadians = Math.PI / 180,
            shear = new Point(Math.tan(skew.x * toRadians),
                Math.tan(skew.y * toRadians));
        return this.shear(shear, center);
    },

    /**
     * Concatenates the given affine transform to this transform.
     *
     * @param {Matrix} mx the transform to concatenate
     * @return {Matrix} this affine transform
     */
    concatenate: function(mx) {
        var a1 = this._a,
            b1 = this._b,
            c1 = this._c,
            d1 = this._d,
            a2 = mx._a,
            b2 = mx._b,
            c2 = mx._c,
            d2 = mx._d,
            tx2 = mx._tx,
            ty2 = mx._ty;
        this._a = a2 * a1 + c2 * b1;
        this._b = b2 * a1 + d2 * b1;
        this._c = a2 * c1 + c2 * d1;
        this._d = b2 * c1 + d2 * d1;
        this._tx += tx2 * a1 + ty2 * b1;
        this._ty += tx2 * c1 + ty2 * d1;
        this._changed();
        return this;
    },

    /**
     * Pre-concatenates the given affine transform to this transform.
     *
     * @param {Matrix} mx the transform to preconcatenate
     * @return {Matrix} this affine transform
     */
    preConcatenate: function(mx) {
        var a1 = this._a,
            b1 = this._b,
            c1 = this._c,
            d1 = this._d,
            tx1 = this._tx,
            ty1 = this._ty,
            a2 = mx._a,
            b2 = mx._b,
            c2 = mx._c,
            d2 = mx._d,
            tx2 = mx._tx,
            ty2 = mx._ty;
        this._a = a2 * a1 + b2 * c1;
        this._b = a2 * b1 + b2 * d1;
        this._c = c2 * a1 + d2 * c1;
        this._d = c2 * b1 + d2 * d1;
        this._tx = a2 * tx1 + b2 * ty1 + tx2;
        this._ty = c2 * tx1 + d2 * ty1 + ty2;
        this._changed();
        return this;
    },

    /**
     * Returns a new instance of the result of the concatenation of the given
     * affine transform with this transform.
     *
     * @param {Matrix} mx the transform to concatenate
     * @return {Matrix} the newly created affine transform
     */
    chain: function(mx) {
        var a1 = this._a,
            b1 = this._b,
            c1 = this._c,
            d1 = this._d,
            tx1 = this._tx,
            ty1 = this._ty,
            a2 = mx._a,
            b2 = mx._b,
            c2 = mx._c,
            d2 = mx._d,
            tx2 = mx._tx,
            ty2 = mx._ty;
        return new Matrix(
                a2 * a1 + c2 * b1,
                a2 * c1 + c2 * d1,
                b2 * a1 + d2 * b1,
                b2 * c1 + d2 * d1,
                tx1 + tx2 * a1 + ty2 * b1,
                ty1 + tx2 * c1 + ty2 * d1);
    },

    /**
     * @return {Boolean} whether this transform is the identity transform
     */
    isIdentity: function() {
        return this._a === 1 && this._c === 0 && this._b === 0 && this._d === 1
                && this._tx === 0 && this._ty === 0;
    },

    orNullIfIdentity: function() {
        return this.isIdentity() ? null : this;
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
        return dest.set(
            x * this._a + y * this._b + this._tx,
            x * this._c + y * this._d + this._ty,
            _dontNotify
        );
    },

    _transformCoordinates: function(src, dst, count) {
        var i = 0,
            j = 0,
            max = 2 * count;
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
     * into {@code scaling}, {@code rotation} and {@code shearing}, and returns
     * an object with these properties if it succeeded, {@code null} otherwise.
     *
     * @return {Object} the decomposed matrix, or {@code null} if decomposition
     * is not possible
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
            scaling: new Point(scaleX, scaleY),
            rotation: -Math.atan2(b, a) * 180 / Math.PI,
            shearing: shear
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
     * @name Matrix#c
     * @type Number
     */

    /**
     * The value that affects the transformation along the x axis when rotating
     * or skewing, positioned at (0, 1) in the transformation matrix.
     *
     * @name Matrix#b
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
     * The translation of the matrix as a vector.
     *
     * @type Point
     * @bean
     */
    getTranslation: function() {
        // No decomposition is required to extract translation.
        return new Point(this._tx, this._ty);
    },

    /**
     * The scaling values of the matrix, if it can be decomposed.
     *
     * @type Point
     * @bean
     * @see #decompose()
     */
    getScaling: function() {
        return (this.decompose() || {}).scaling;
    },

    /**
     * The rotation angle of the matrix, if it can be decomposed.
     *
     * @type Number
     * @bean
     * @see #decompose()
     */
    getRotation: function() {
        return (this.decompose() || {}).rotation;
    },

    /**
     * Creates the inversion of the transformation of the matrix and returns it
     * as a new insteance. If the matrix is not invertible (in which case
     * {@link #isSingular()} returns true), {@code null } is returned.
     *
     * @return {Matrix} the inverted matrix, or {@code null }, if the matrix is
     * singular
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
}, Base.each(['a', 'c', 'b', 'd', 'tx', 'ty'], function(name) {
    // Create getters and setters for all internal attributes.
    var part = Base.capitalize(name),
        prop = '_' + name;
    this['get' + part] = function() {
        return this[prop];
    };
    this['set' + part] = function(value) {
        this[prop] = value;
        this._changed();
    };
}, {}));
