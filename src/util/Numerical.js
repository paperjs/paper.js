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

var Numerical = new function() {

	var abscissa = [
		-0.5773502692, 0.5773502692,
		-0.7745966692, 0.7745966692,  0,
		-0.8611363116, 0.8611363116, -0.3399810436, 0.3399810436,
		-0.9061798459, 0.9061798459, -0.5384693101, 0.5384693101,  0.0000000000,
		-0.9324695142, 0.9324695142, -0.6612093865, 0.6612093865, -0.2386191861, 0.2386191861,
		-0.9491079123, 0.9491079123, -0.7415311856, 0.7415311856, -0.4058451514, 0.4058451514,  0.0000000000,
		-0.9602898565, 0.9602898565, -0.7966664774, 0.7966664774, -0.5255324099, 0.5255324099, -0.1834346425, 0.1834346425
	],

	weight = [
		1,            1,
		0.5555555556, 0.5555555556, 0.8888888888,
		0.3478548451, 0.3478548451, 0.6521451549, 0.6521451549,
		0.2369268851, 0.2369268851, 0.4786286705, 0.4786286705, 0.5688888888,
		0.1713244924, 0.1713244924, 0.3607615730, 0.3607615730, 0.4679139346, 0.4679139346,
		0.1294849662, 0.1294849662, 0.2797053915, 0.2797053915, 0.3818300505, 0.3818300505, 0.4179591837,
		0.1012285363, 0.1012285363, 0.2223810345, 0.2223810345, 0.3137066459, 0.3137066459, 0.3626837834, 0.3626837834
	];

	return {
		TOLERANCE: 10e-6,

		/**
		 * Gauss-Legendre Numerical Integration, ported from Singularity:
		 *
		 * Copyright (c) 2006-2007, Jim Armstrong (www.algorithmist.net)
		 * All Rights Reserved.
		 */
		integrate: function(f, a, b, n) {
			n = Math.min(Math.max(n, 2), 8);

			var l = n == 2 ? 0 : n * (n - 1) / 2 - 1,
				sum = 0,
				mul = 0.5 * (b - a),
				ab2 = mul + a;
			for(var i = 0; i < n; i++)
				sum += f(ab2 + mul * abscissa[l + i]) * weight[l + i];

			return mul * sum;
		},

		findRootNewton: function(f, fd, a, b, n, tol) {
			var x = 0.5 * (a + b);
			for (var i = 0; i < n; i++) {
				var dx = f(x) / fd(x);
				x -= dx;
				if (Math.abs(dx) < tol)
					return x;
			}
			return x;
		},

		findRootFalsePosition: function(f, a, b, n, tol) {
			var fa = f(a),
				fb = f(b),
				dx = b - a,
				del, x;
			for (var i = 0; i <= n; i++) {
				x = a + dx * fa / (fa - fb);
				var fx = f(x);
				if (fx < 0) {
					del = a - x;
					a = x;
					fa = fx;
				} else {
					del = b - x;
					b = x;
					fb = fx;
				}
				dx = b - a;
				if (Math.abs(del) < tol || fx == 0)
					return x;
			}
			return x;
		},
	};
};
