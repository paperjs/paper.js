var MathUtils = new function() {
	var maxDepth = 53; // MANT_DIGITS: 64 bit: 53 digits, 32 bit: 24 digits

	var abscissa = [
		-0.5773502692, 0.5773502692,
		-0.7745966692, 0.7745966692, 0,
		-0.8611363116, 0.8611363116, -0.3399810436, 0.3399810436,
		-0.9061798459, 0.9061798459, -0.5384693101, 0.5384693101, 0.0000000000,
		-0.9324695142, 0.9324695142, -0.6612093865, 0.6612093865, -0.2386191861, 0.2386191861,
		-0.9491079123, 0.9491079123, -0.7415311856, 0.7415311856, -0.4058451514, 0.4058451514, 0.0000000000,
		-0.9602898565, 0.9602898565, -0.7966664774, 0.7966664774, -0.5255324099, 0.5255324099, -0.1834346425, 0.1834346425
	];

	var weight = [
		1, 1,
		0.5555555556, 0.5555555556, 0.8888888888,
		0.3478548451, 0.3478548451, 0.6521451549, 0.6521451549,
		0.2369268851, 0.2369268851, 0.4786286705, 0.4786286705, 0.5688888888,
		0.1713244924, 0.1713244924, 0.3607615730, 0.3607615730, 0.4679139346, 0.4679139346,
		0.1294849662, 0.1294849662, 0.2797053915, 0.2797053915, 0.3818300505, 0.3818300505, 0.4179591837,
		0.1012285363, 0.1012285363, 0.2223810345, 0.2223810345, 0.3137066459, 0.3137066459, 0.3626837834, 0.3626837834
	];

	return {
		EPSILON: Math.pow(2, -maxDepth + 1),

		// Gauss-Legendre Numerical Integration, a Gauss.as port from Singularity:
		//
		// Copyright (c) 2006-2007, Jim Armstrong (www.algorithmist.net)
		// All Rights Reserved.

		gauss: function(f, a, b, n) {
			n = Math.min(Math.max(n, 2), 8);

			var l = n == 2 ? 0 : n * (n - 1) / 2 - 1,
				sum = 0,
				mul = 0.5 * (b - a),
				ab2 = mul + a;
			for(var i = 0; i < n; i++)
				sum += f(ab2 + mul * abscissa[l + i]) * weight[l + i];

			return mul * sum;
		},

		// Van Wijngaarden–Dekker–Brent method for root finding
		brent: function(f, a, b, tol) {
			var c = b, d = 0, e = 0,
				fa = f(a),
				fb = f(b),
				fc = fb;

			for (var i = 1; i <= 16; i++) {
				if ((fb > 0.0 && fc > 0.0) || (fb < 0.0 && fc < 0.0)) {
					c = a;
					fc = fa;
					e = d = b - a;
				}
				if (Math.abs(fc) < Math.abs(fb)) {
					a = b;
					b = c;
					c = a;
					fa = fb;
					fb = fc;
					fc = fa;
				}
				var tol1 = 2 * MathUtils.EPSILON * Math.abs(b) + 0.5 * tol,
					xm = 0.5 * (c - b);
				if (Math.abs(xm) <= tol1 || fb == 0.0) {
					return b;
				}
				if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
					var p, q, r,
						s = fb / fa;
					if (a == c) {
						p = 2.0 * xm * s;
						q = 1.0 - s;
					} else {
						q = fa / fc;
						r = fb / fc;
						p = s * (2.0 * xm * q * (q - r) - (b - a) * (r - 1.0));
						q = (q - 1.0) * (r - 1.0) * (s - 1.0);
					}
					if (p > 0.0)
						q = -q;
					p = Math.abs(p);
					var min1 = 3.0 * xm * q - Math.abs(tol1 * q),
					 	min2 = Math.abs(e * q);
					if (2.0 * p < (min1 < min2 ? min1 : min2)) {
						e = d;
						d = p / q;
					} else {
						d = xm;
						e = d;
					}
				} else {
					d = xm;
					e = d;
				}
				a = b;
				fa = fb;
				if (Math.abs(d) > tol1)
					b += d;
				else
					b += xm >= 0.0 ? Math.abs(tol1) : -Math.abs(tol1);
				fb = f(b);
			}
			return b;
		}
	}
};
