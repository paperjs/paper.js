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

/**
 * @name Line
 *
 * @class The Line object represents..
 */
var Line = Base.extend(/** @lends Line# */{
    _class: 'Line',

    // DOCS: document Line class and constructor
    /**
     * Creates a Line object.
     *
     * @param {Point} point1
     * @param {Point} point2
     * @param {Boolean} [asVector=false]
     */
    initialize: function Line(arg0, arg1, arg2, arg3, arg4) {
        var asVector = false;
        if (arguments.length >= 4) {
            this._px = arg0;
            this._py = arg1;
            this._vx = arg2;
            this._vy = arg3;
            asVector = arg4;
        } else {
            this._px = arg0.x;
            this._py = arg0.y;
            this._vx = arg1.x;
            this._vy = arg1.y;
            asVector = arg2;
        }
        if (!asVector) {
            this._vx -= this._px;
            this._vy -= this._py;
        }
    },

    /**
     * The starting point of the line.
     *
     * @type Point
     * @bean
     */
    getPoint: function() {
        return new Point(this._px, this._py);
    },

    /**
     * The direction of the line as a vector.
     *
     * @type Point
     * @bean
     */
    getVector: function() {
        return new Point(this._vx, this._vy);
    },

    /**
     * The length of the line.
     *
     * @type Number
     * @bean
     */
    getLength: function() {
        return this.getVector().getLength();
    },

    /**
     * @param {Line} line
     * @param {Boolean} [isInfinite=false]
     * @return {Point} the intersection point of the lines, {@code undefined}
     * if the two lines are collinear, or {@code null} if they don't intersect.
     */
    intersect: function(line, isInfinite) {
        return Line.intersect(
                this._px, this._py, this._vx, this._vy,
                line._px, line._py, line._vx, line._vy,
                true, isInfinite);
    },

    // DOCS: document Line#getSide(point)
    /**
     * @param {Point} point
     * @return {Number}
     */
    getSide: function(point) {
        return Line.getSide(
                this._px, this._py, this._vx, this._vy,
                point.x, point.y, true);
    },

    // DOCS: document Line#getDistance(point)
    /**
     * @param {Point} point
     * @return {Number}
     */
    getDistance: function(point) {
        return Math.abs(Line.getSignedDistance(
                this._px, this._py, this._vx, this._vy,
                point.x, point.y, true));
    },

    isCollinear: function(line) {
        // TODO: Tests showed that 1e-10 might work well here, but we want to
        // keep it in sync with Point#isCollinear()
        return this._vx * line._vy - this._vy * line._vx
                < /*#=*/Numerical.TOLERANCE;
    },

    statics: /** @lends Line */{
        intersect: function(apx, apy, avx, avy, bpx, bpy, bvx, bvy, asVector,
                isInfinite) {
            // Convert 2nd points to vectors if they are not specified as such.
            if (!asVector) {
                avx -= apx;
                avy -= apy;
                bvx -= bpx;
                bvy -= bpy;
            }
            var cross = avx * bvy - avy * bvx;
            // Avoid divisions by 0, and errors when getting too close to 0
            if (!Numerical.isZero(cross)) {
                var dx = apx - bpx,
                    dy = apy - bpy,
                    ta = (bvx * dy - bvy * dx) / cross,
                    tb = (avx * dy - avy * dx) / cross;
                // Check the ranges of t parameters if the line is not allowed
                // to extend beyond the definition points.
                if (isInfinite || 0 <= ta && ta <= 1 && 0 <= tb && tb <= 1)
                    return new Point(
                                apx + ta * avx,
                                apy + ta * avy);
            }
        },

        getSide: function(px, py, vx, vy, x, y, asVector) {
            if (!asVector) {
                vx -= px;
                vy -= py;
            }
            var v2x = x - px,
                v2y = y - py,
                ccw = v2x * vy - v2y * vx; // ccw = v2.cross(v1);
            if (ccw === 0) {
                ccw = v2x * vx + v2y * vy; // ccw = v2.dot(v1);
                if (ccw > 0) {
                    // ccw = v2.subtract(v1).dot(v1);
                    v2x -= vx;
                    v2y -= vy;
                    ccw = v2x * vx + v2y * vy;
                    if (ccw < 0)
                        ccw = 0;
                }
            }
            return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
        },

        getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
            if (!asVector) {
                vx -= px;
                vy -= py;
            }
            return Numerical.isZero(vx)
                    ? vy >= 0 ? px - x : x - px
                    : Numerical.isZero(vy)
                        ? vx >= 0 ? y - py : py - y
                        : (vx * (y - py) - vy * (x - px)) / Math.sqrt(vx * vx + vy * vy);
        }
    }
});
