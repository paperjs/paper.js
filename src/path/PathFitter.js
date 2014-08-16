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

// An Algorithm for Automatically Fitting Digitized Curves
// by Philip J. Schneider
// from "Graphics Gems", Academic Press, 1990
// Modifications and optimisations of original algorithm by Juerg Lehni.

/**
 * @name PathFitter
 * @class
 * @private
 */
var PathFitter = Base.extend({
    initialize: function(path, error) {
        this.points = [];
        var segments = path._segments,
            prev;
        // Copy over points from path and filter out adjacent duplicates.
        for (var i = 0, l = segments.length; i < l; i++) {
            var point = segments[i].point.clone();
            if (!prev || !prev.equals(point)) {
                this.points.push(point);
                prev = point;
            }
        }
        this.error = error;
    },

    fit: function() {
        var points = this.points,
            length = points.length;
        this.segments = length > 0 ? [new Segment(points[0])] : [];
        if (length > 1)
            this.fitCubic(0, length - 1,
                // Left Tangent
                points[1].subtract(points[0]).normalize(),
                // Right Tangent
                points[length - 2].subtract(points[length - 1]).normalize());
        return this.segments;
    },

    // Fit a Bezier curve to a (sub)set of digitized points
    fitCubic: function(first, last, tan1, tan2) {
        //  Use heuristic if region only has two points in it
        if (last - first == 1) {
            var pt1 = this.points[first],
                pt2 = this.points[last],
                dist = pt1.getDistance(pt2) / 3;
            this.addCurve([pt1, pt1.add(tan1.normalize(dist)),
                    pt2.add(tan2.normalize(dist)), pt2]);
            return;
        }
        // Parameterize points, and attempt to fit curve
        var uPrime = this.chordLengthParameterize(first, last),
            maxError = Math.max(this.error, this.error * this.error),
            split;
        // Try 4 iterations
        for (var i = 0; i <= 4; i++) {
            var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
            //  Find max deviation of points to fitted curve
            var max = this.findMaxError(first, last, curve, uPrime);
            if (max.error < this.error) {
                this.addCurve(curve);
                return;
            }
            split = max.index;
            // If error not too large, try reparameterization and iteration
            if (max.error >= maxError)
                break;
            this.reparameterize(first, last, uPrime, curve);
            maxError = max.error;
        }
        // Fitting failed -- split at max error point and fit recursively
        var V1 = this.points[split - 1].subtract(this.points[split]),
            V2 = this.points[split].subtract(this.points[split + 1]),
            tanCenter = V1.add(V2).divide(2).normalize();
        this.fitCubic(first, split, tan1, tanCenter);
        this.fitCubic(split, last, tanCenter.negate(), tan2);
    },

    addCurve: function(curve) {
        var prev = this.segments[this.segments.length - 1];
        prev.setHandleOut(curve[1].subtract(curve[0]));
        this.segments.push(
                new Segment(curve[3], curve[2].subtract(curve[3])));
    },

    // Use least-squares method to find Bezier control points for region.
    generateBezier: function(first, last, uPrime, tan1, tan2) {
        var epsilon = /*#=*/Numerical.EPSILON,
            pt1 = this.points[first],
            pt2 = this.points[last],
            // Create the C and X matrices
            C = [[0, 0], [0, 0]],
            X = [0, 0];

        for (var i = 0, l = last - first + 1; i < l; i++) {
            var u = uPrime[i],
                t = 1 - u,
                b = 3 * u * t,
                b0 = t * t * t,
                b1 = b * t,
                b2 = b * u,
                b3 = u * u * u,
                a1 = tan1.normalize(b1),
                a2 = tan2.normalize(b2),
                tmp = this.points[first + i]
                    .subtract(pt1.multiply(b0 + b1))
                    .subtract(pt2.multiply(b2 + b3));
            C[0][0] += a1.dot(a1);
            C[0][1] += a1.dot(a2);
            // C[1][0] += a1.dot(a2);
            C[1][0] = C[0][1];
            C[1][1] += a2.dot(a2);
            X[0] += a1.dot(tmp);
            X[1] += a2.dot(tmp);
        }

        // Compute the determinants of C and X
        var detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
            alpha1, alpha2;
        if (Math.abs(detC0C1) > epsilon) {
            // Kramer's rule
            var detC0X  = C[0][0] * X[1]    - C[1][0] * X[0],
                detXC1  = X[0]    * C[1][1] - X[1]    * C[0][1];
            // Derive alpha values
            alpha1 = detXC1 / detC0C1;
            alpha2 = detC0X / detC0C1;
        } else {
            // Matrix is under-determined, try assuming alpha1 == alpha2
            var c0 = C[0][0] + C[0][1],
                c1 = C[1][0] + C[1][1];
            if (Math.abs(c0) > epsilon) {
                alpha1 = alpha2 = X[0] / c0;
            } else if (Math.abs(c1) > epsilon) {
                alpha1 = alpha2 = X[1] / c1;
            } else {
                // Handle below
                alpha1 = alpha2 = 0;
            }
        }

        // If alpha negative, use the Wu/Barsky heuristic (see text)
        // (if alpha is 0, you get coincident control points that lead to
        // divide by zero in any subsequent NewtonRaphsonRootFind() call.
        var segLength = pt2.getDistance(pt1);
        epsilon *= segLength;
        if (alpha1 < epsilon || alpha2 < epsilon) {
            // fall back on standard (probably inaccurate) formula,
            // and subdivide further if needed.
            alpha1 = alpha2 = segLength / 3;
        }

        // First and last control points of the Bezier curve are
        // positioned exactly at the first and last data points
        // Control points 1 and 2 are positioned an alpha distance out
        // on the tangent vectors, left and right, respectively
        return [pt1, pt1.add(tan1.normalize(alpha1)),
                pt2.add(tan2.normalize(alpha2)), pt2];
    },

    // Given set of points and their parameterization, try to find
    // a better parameterization.
    reparameterize: function(first, last, u, curve) {
        for (var i = first; i <= last; i++) {
            u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
        }
    },

    // Use Newton-Raphson iteration to find better root.
    findRoot: function(curve, point, u) {
        var curve1 = [],
            curve2 = [];
        // Generate control vertices for Q'
        for (var i = 0; i <= 2; i++) {
            curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
        }
        // Generate control vertices for Q''
        for (var i = 0; i <= 1; i++) {
            curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
        }
        // Compute Q(u), Q'(u) and Q''(u)
        var pt = this.evaluate(3, curve, u),
            pt1 = this.evaluate(2, curve1, u),
            pt2 = this.evaluate(1, curve2, u),
            diff = pt.subtract(point),
            df = pt1.dot(pt1) + diff.dot(pt2);
        // Compute f(u) / f'(u)
        if (Math.abs(df) < /*#=*/Numerical.TOLERANCE)
            return u;
        // u = u - f(u) / f'(u)
        return u - diff.dot(pt1) / df;
    },

    // Evaluate a bezier curve at a particular parameter value
    evaluate: function(degree, curve, t) {
        // Copy array
        var tmp = curve.slice();
        // Triangle computation
        for (var i = 1; i <= degree; i++) {
            for (var j = 0; j <= degree - i; j++) {
                tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
            }
        }
        return tmp[0];
    },

    // Assign parameter values to digitized points
    // using relative distances between points.
    chordLengthParameterize: function(first, last) {
        var u = [0];
        for (var i = first + 1; i <= last; i++) {
            u[i - first] = u[i - first - 1]
                    + this.points[i].getDistance(this.points[i - 1]);
        }
        for (var i = 1, m = last - first; i <= m; i++) {
            u[i] /= u[m];
        }
        return u;
    },

    // Find the maximum squared distance of digitized points to fitted curve.
    findMaxError: function(first, last, curve, u) {
        var index = Math.floor((last - first + 1) / 2),
            maxDist = 0;
        for (var i = first + 1; i < last; i++) {
            var P = this.evaluate(3, curve, u[i - first]);
            var v = P.subtract(this.points[i]);
            var dist = v.x * v.x + v.y * v.y; // squared
            if (dist >= maxDist) {
                maxDist = dist;
                index = i;
            }
        }
        return {
            error: maxDist,
            index: index
        };
    }
});
