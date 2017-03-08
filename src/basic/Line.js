/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
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
     * @bean
     * @type Point
     */
    getPoint: function() {
        return new Point(this._px, this._py);
    },

    /**
     * The direction of the line as a vector.
     *
     * @bean
     * @type Point
     */
    getVector: function() {
        return new Point(this._vx, this._vy);
    },

    /**
     * The length of the line.
     *
     * @bean
     * @type Number
     */
    getLength: function() {
        return this.getVector().getLength();
    },

    /**
     * @param {Line} line
     * @param {Boolean} [isInfinite=false]
     * @return {Point} the intersection point of the lines, `undefined` if the
     *     two lines are collinear, or `null` if they don't intersect.
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
     * @param {Boolean} [isInfinite=false]
     * @return {Number}
     */
    getSide: function(point, isInfinite) {
        return Line.getSide(
                this._px, this._py, this._vx, this._vy,
                point.x, point.y, true, isInfinite);
    },

    // DOCS: document Line#getDistance(point)
    /**
     * @param {Point} point
     * @return {Number}
     */
    getDistance: function(point) {
        return Math.abs(this.getSignedDistance(point));
    },

    // DOCS: document Line#getSignedDistance(point)
    /**
     * @param {Point} point
     * @return {Number}
     */
    getSignedDistance: function(point) {
        return Line.getSignedDistance(this._px, this._py, this._vx, this._vy,
                point.x, point.y, true);
    },

    isCollinear: function(line) {
        return Point.isCollinear(this._vx, this._vy, line._vx, line._vy);
    },

    isOrthogonal: function(line) {
        return Point.isOrthogonal(this._vx, this._vy, line._vx, line._vy);
    },

    statics: /** @lends Line */{
        intersect: function(p1x, p1y, v1x, v1y, p2x, p2y, v2x, v2y, asVector,
                isInfinite) {
            // Convert 2nd points to vectors if they are not specified as such.
            if (!asVector) {
                v1x -= p1x;
                v1y -= p1y;
                v2x -= p2x;
                v2y -= p2y;
            }
            var cross = v1x * v2y - v1y * v2x;
            // Avoid divisions by 0, and errors when getting too close to 0
            if (!Numerical.isZero(cross)) {
                var dx = p1x - p2x,
                    dy = p1y - p2y,
                    u1 = (v2x * dy - v2y * dx) / cross,
                    u2 = (v1x * dy - v1y * dx) / cross,
                    // Check the ranges of the u parameters if the line is not
                    // allowed to extend beyond the definition points, but
                    // compare with EPSILON tolerance over the [0, 1] bounds.
                    epsilon = /*#=*/Numerical.EPSILON,
                    uMin = -epsilon,
                    uMax = 1 + epsilon;
                if (isInfinite
                        || uMin < u1 && u1 < uMax && uMin < u2 && u2 < uMax) {
                    if (!isInfinite) {
                        // Address the tolerance at the bounds by clipping to
                        // the actual range.
                        u1 = u1 <= 0 ? 0 : u1 >= 1 ? 1 : u1;
                    }
                    return new Point(
                            p1x + u1 * v1x,
                            p1y + u1 * v1y);
                }
            }
        },

        getSide: function(px, py, vx, vy, x, y, asVector, isInfinite) {
            if (!asVector) {
                vx -= px;
                vy -= py;
            }
            var v2x = x - px,
                v2y = y - py,
                // ccw = v2.cross(v1);
                ccw = v2x * vy - v2y * vx;
            if (!isInfinite && Numerical.isZero(ccw)) {
                // If the point is on the infinite line, check if it's on the
                // finite line too: Project v2 onto v1 and determine ccw based
                // on which side of the finite line the point lies. Calculate
                // the 'u' value of the point on the line, and use it for ccw:
                // u = v2.dot(v1) / v1.dot(v1)
                ccw = (v2x * vx + v2x * vx) / (vx * vx + vy * vy);
                // If the 'u' value is within the line range, set ccw to 0,
                // otherwise its already correct sign is all we need.
                if (ccw >= 0 && ccw <= 1)
                    ccw = 0;
            }
            return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
        },

        getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
            if (!asVector) {
                vx -= px;
                vy -= py;
            }
            // Based on the error analysis by @iconexperience outlined in #799
            return vx === 0 ? vy > 0 ? x - px : px - x
                 : vy === 0 ? vx < 0 ? y - py : py - y
                 : ((x-px) * vy - (y-py) * vx) / Math.sqrt(vx * vx + vy * vy);
        },

        getDistance: function(px, py, vx, vy, x, y, asVector) {
            return Math.abs(
                    Line.getSignedDistance(px, py, vx, vy, x, y, asVector));
        }
    }
});
