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

// An Algorithm for Automatically Fitting Digitized Curves
// by Philip J. Schneider
// from "Graphics Gems", Academic Press, 1990
var PathFitter = Base.extend({
	initialize: function(path, error) {
		this.points = [];
		var segments = path._segments,
			prev;
		for (var i = 0, l = segments.length; i < l; i++) {
			var point = segments[i].point.clone();
			if (!prev || !prev.equals(point)) {
				this.points[i] = point;
				prev = point;
			}
		}
		this.error = error;
		this.iterationError = error * error;
	},

	fit: function() {
		this.segments = [new Segment(this.points[0])];
		this.fitCubic(0, this.points.length - 1,
				// Left Tangent
				this.points[1].subtract(this.points[0]).normalize(),
				// Right Tangent
				this.points[this.points.length - 2].subtract(
					this.points[this.points.length - 1]).normalize());
		return this.segments;
	},

	// Fit a Bezier curve to a (sub)set of digitized points
	fitCubic: function(first, last, tHat1, tHat2) {
		//	Use heuristic if region only has two points in it
		if (last - first == 1) {
			var pt1 = this.points[first],
				pt2 = this.points[last],
				dist = pt1.getDistance(pt2) / 3;
			this.addCurve([pt1, pt1.add(tHat1.normalize(dist)),
					pt2.add(tHat2.normalize(dist)), pt2]);
			return;
		}
		// Parameterize points, and attempt to fit curve
		var uPrime = this.chordLengthParameterize(first, last),
			prevMaxError = this.iterationError,
			error,
			split;
		// Try 4 iterations
		for (var i = 0; i < 4; i++) {
			var bezCurve = this.generateBezier(first, last, uPrime, tHat1, tHat2);
			//	Find max deviation of points to fitted curve
			var max = this.findMaxError(first, last, bezCurve, uPrime);
			if (max.error < this.error) { 
				this.addCurve(bezCurve);
				return;
			}
			split = max.index;
			// If error not too large, try some reparameterization and iteration
			if (max.error >= this.iterationError || max.error >= prevMaxError)
				break;
			uPrime = this.reparameterize(first, last, uPrime, bezCurve);
			prevMaxError = max.error;
		}
		// Fitting failed -- split at max error point and fit recursively
		var V1 = this.points[split - 1].subtract(this.points[split]),
			V2 = this.points[split].subtract(this.points[split + 1]),
			tHatCenter = V1.add(V2).divide(2).normalize();
		this.fitCubic(first, split, tHat1, tHatCenter);
		this.fitCubic(split, last, tHatCenter.negate(), tHat2);
	},

	addCurve: function(bezCurve) {
		var prev = this.segments[this.segments.length - 1];
		prev.setHandleOut(bezCurve[1].subtract(bezCurve[0]));
		this.segments.push(
				new Segment(bezCurve[3], bezCurve[2].subtract(bezCurve[3])));
	},

	// Use least-squares method to find Bezier control points for region.
	generateBezier: function(first, last, uPrime, tHat1, tHat2) {
		var nPts = last - first + 1,
			pt1 = this.points[first],
			pt2 = this.points[last];

		var A = [];
		// Compute the A's 
		for (var i = 0; i < nPts; i++) {
			var u = uPrime[i],
				t = 1 - u,
				b = 3 * u * t;
			A[i] = [
				tHat1.normalize(b * t), // b1
				tHat2.normalize(b * u)  // b2
			];
		}

		// Create the C and X matrices
		var C = [[0, 0], [0, 0]],
			X = [0, 0];

		for (var i = 0; i < nPts; i++) {
			C[0][0] += A[i][0].dot(A[i][0]);
			C[0][1] += A[i][0].dot(A[i][1]);
			// C[1][0] += A[i][0].dot(A[i][1]);
			C[1][0] = C[0][1];
			C[1][1] += A[i][1].dot(A[i][1]);

			var u = uPrime[i],
				t = 1 - u,
				b = 3 * u * t,
				tmp = this.points[first + i]
					.subtract(pt1.multiply(t * t * t) // b0
						.add(pt1.multiply(b * t)) // b1
						.add(pt2.multiply(b * u)) // b2
						.add(pt2.multiply(u * u * u))); // b3
			X[0] += A[i][0].dot(tmp);
			X[1] += A[i][1].dot(tmp);
		}

		// Compute the determinants of C and X
		var det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
			det_C0_X  = C[0][0] * X[1]    - C[1][0] * X[0],
			det_X_C1  = X[0]    * C[1][1] - X[1]    * C[0][1],
			singularity = det_C0_C1 < Numerical.TOLERANCE;

		// Finally, derive alpha values
		var alpha_l = singularity ? 0 : det_X_C1 / det_C0_C1,
			alpha_r = singularity ? 0 : det_C0_X / det_C0_C1;

		// If alpha negative, use the Wu/Barsky heuristic (see text)
		// (if alpha is 0, you get coincident control points that lead to
		// divide by zero in any subsequent NewtonRaphsonRootFind() call.
		var segLength = pt2.getDistance(pt1),
			epsilon = Numerical.TOLERANCE * segLength;
		if (alpha_l < epsilon || alpha_r < epsilon) {
			// fall back on standard (probably inaccurate) formula, 
			// and subdivide further if needed.
			alpha_l = alpha_r = segLength / 3;
		}

		// First and last control points of the Bezier curve are
		// positioned exactly at the first and last data points
		// Control points 1 and 2 are positioned an alpha distance out
		// on the tangent vectors, left and right, respectively
		return [pt1, pt1.add(tHat1.normalize(alpha_l)),
				pt2.add(tHat2.normalize(alpha_r)), pt2];
	},

	// Given set of points and their parameterization, try to find
	// a better parameterization.
	reparameterize: function(first, last, u, bezCurve) {
		var uPrime = [];
		for (var i = first; i <= last; i++) {
			uPrime[i - first] = this.findRoot(bezCurve, this.points[i],
					u[i - first]);
		}
		return uPrime;
	},

	// Use Newton-Raphson iteration to find better root.
	findRoot: function(Q, P, u) {
		var Q1 = [],
			Q2 = [];
		// Generate control vertices for Q'
		for (var i = 0; i <= 2; i++) {
			Q1[i] = Q[i + 1].subtract(Q[i]).multiply(3);
		}
		// Generate control vertices for Q''
		for (var i = 0; i <= 1; i++) {
			Q2[i] = Q1[i + 1].subtract(Q1[i]).multiply(2);
		}
		// Compute Q(u), Q'(u) and Q''(u)
		Q_u = this.evaluate(3, Q, u);
		Q1_u = this.evaluate(2, Q1, u);
		Q2_u = this.evaluate(1, Q2, u);
		// Compute f(u)/f'(u)
		var V = Q_u.subtract(P),
			df = Q1_u.dot(Q1_u) + V.dot(Q2_u);
		if (df == 0)
			return u;
		// u = u - f(u) / f'(u)
		return u - V.dot(Q1_u) / df;
	},

	// Evaluate a Bezier curve at a particular parameter value
	evaluate: function(degree, V, t) {
		// Copy array
		var Vtemp = V.slice();
		// Triangle computation
		for (var i = 1; i <= degree; i++) {
			for (var j = 0; j <= degree - i; j++) {
				Vtemp[j] = Vtemp[j].multiply(1 - t).add(Vtemp[j + 1].multiply(t));
			}
		}
		return Vtemp[0];
	},

	// Assign parameter values to digitized points 
	// using relative distances between points.
	chordLengthParameterize: function(first, last) {
		var u = [0];
		for (var i = first + 1; i <= last; i++) {
			u[i - first] = u[i - first - 1]
					+ this.points[i].getDistance(this.points[i - 1]);
		}
		for (var i = first + 1; i <= last; i++) {
			u[i - first] = u[i - first] / u[last - first];
		}
		return u;
	},

	// Find the maximum squared distance of digitized points to fitted curve.
	findMaxError: function(first, last, bezCurve, u) {
		var index = Math.floor((last - first + 1) / 2),
			maxDist = 0;
		for (var i = first + 1; i < last; i++) {
			var P = this.evaluate(3, bezCurve, u[i - first]);
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
