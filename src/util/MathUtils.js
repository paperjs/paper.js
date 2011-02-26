MathUtils = {
	// TODO: 64 bit: 53 digits, 32 bit: 24 digits
	// TODO: Naming? What is MANT standing for?
	MANT_DIGITS: 53,
	EPSILON: Math.pow(2, -52),

	// Compute a numerical approximation to an integral via adaptive Simpson's Rule
	// This routine ignores underflow.

	// Returns approximate value of the integral if successful.
	// f: Pointer to function to be integrated.
	// a, b: Lower, upper limits of integration.
	// accuracy:  Desired relative accuracy of integral,
	//       try to make |error| <= accuracy*abs(integral).
	// dxmax: Maximum limit on the width of a subinterval
	// For periodic functions, dxmax should be
	// set to the period or smaller to prevent
	// premature convergence of Simpson's rule. 
	simpson: function(f, a, b, accuracy, dxmax) {
		var table = new Array(MathUtils.MANT_DIGITS);
		var p = table[0] = {
			left: true,
			psum: 0
		};
		var index = 0,
			success = true,
			alpha = a,
			da = b - a,
			fv0 = f(alpha),
			fv1,
			fv2 = f(alpha + 0.5 * da),
			fv3,
			fv4 = f(alpha + da),
			fv5,
			wt = da * (1 / 6),
			est = wt * (fv0 + 4 * fv2 + fv4),
			area = est;

		// Have estimate est of integral on (alpha, alpha+da).
		// Bisect and compute estimates on left and right half intervals.
		// integral is the best value for the integral.
		for (;;) {
			var dx = 0.5 * da,
				arg = alpha + 0.5 * dx;
			fv1 = f(arg);
			fv3 = f(arg + dx);
			var wt = dx * (1 / 6),
				estl = wt * (fv0 + 4 * fv1 + fv2),
				estr = wt * (fv2 + 4 * fv3 + fv4),
				integral = estl + estr,
				diff = est - integral;
			area -= diff;

			if (index >= table.length)
				success = false;
			if (!success || (Math.abs(diff) <= accuracy * Math.abs(area) && da <= dxmax)) {
				// Accept approximate integral.
				// If it was a right interval, add results to finish at this level.
				// If it was a left interval, process right interval.
				for (;;) {
					if (!p.left) { // process right-half interval
						alpha += da;
						p.left = true;
						p.psum = integral;
						fv0 = p.f1t;
						fv2 = p.f2t;
						fv4 = p.f3t;
						da = p.dat;
						est = p.estr;
						break;
					}
					integral += p.psum;
					if (--index <= 0)
						return success ? integral : null;
					p = table[index];
				}

			} else {
				// Raise level and store information for processing right-half interval.
				p = table[++index] = {
					left: false,
					f1t: fv2,
					f2t: fv3,
					f3t: fv4,
					dat: dx,
					estr: estr
				};
				da = dx;
				est = estl;
				fv4 = fv2;
				fv2 = fv1;
			}
		}
	},

	// Use adaptive Simpson integration to determine the upper limit of
	// integration required to make the definite integral of a continuous
	// non-negative function close to a user specified sum.
	// This routine ignores underflow.
	// integral: Given value for the integral.
	// f: Pointer to function to be integrated.
	// a, b: Lower, upper limits of integration (a <= b).
	//       The value of b provided on entry is used
	//       as an initial guess; somewhat faster if the
	//       given value is an underestimation.
	// accuracy: Desired relative accuracy of b.
	//           Try to make |integral-area| <= accuracy*integral.
	// area: Computed integral of f(x) on [a,b].
	// dxmin: Lower limit on sampling width.
	// dxmax: Maximum limit on the width of a subinterval
	//        For periodic functions, dxmax should be
	//        set to the period or smaller to prevent
	//        premature convergence of Simpson's rule. 
	unsimpson: function(integral, f, a, b, accuracy, area, dxmin, dxmax) {
		var table = new Array(MathUtils.MANT_DIGITS);
		var p = table[0] = {
			psum: 0
		};
		var index = 0,
			alpha = a,
			parea = 0,
			pdiff = 0,
			fv0, fv1, fv2, fv3, fv4, fv5;
		for (;;) {
			p.left = true;
			var da = b - alpha;
			fv0 = f(alpha);
			fv2 = f(alpha + 0.5 * da);
			fv4 = f(alpha + da);
			var wt = da * (1 / 6),
				est = area = wt * (fv0 + 4 * fv2 + fv4);
			// Have estimate est of integral on (alpha, alpha+da).
			// Bisect and compute estimates on left and right half intervals.
			// Sum is better value for integral.
			var cont = true;
			while(cont) {
				var dx = 0.5 * da,
					arg = alpha + 0.5 * dx;
				fv1 = f(arg);
				fv3 = f(arg + dx);
				var wt = dx * (1 / 6),
					estl = wt * (fv0 + 4 * fv1 + fv2),
					estr = wt * (fv2 + 4 * fv3 + fv4),
					sum = estl + estr,
					diff = est - sum;
				area = parea + sum;
				var b2 = alpha + da;
				if (Math.abs(Math.abs(integral - area) - Math.abs(pdiff)) + Math.abs(diff) <= fv4 * accuracy * (b2 - a)) {
					return { b: b2, area: area };
				}
				if (Math.abs(integral - area) > Math.abs(pdiff + diff)) {
					if (integral <= area) {
						index = 0;
						p = table[0];
						p.left = true;
						p.psum = parea;
					} else {
						if ((Math.abs(diff) <= fv4 * accuracy * da || dx <= dxmin) && da <= dxmax) {
							// Accept approximate integral sum.
							// If it was a right interval, add results to finish at this level.
							// If it was a left interval, process right interval.
							pdiff += diff;
							for (;;) {
								if (!p.left) { // process right-half interval
									parea += sum;
									alpha += da;
									p.left = true;
									p.psum = sum;
									fv0 = p.f1t;
									fv2 = p.f2t;
									fv4 = p.f3t;
									da = p.dat;
									est = p.estr;
									break;
								}
								sum += p.psum;
								parea -= p.psum;
								if (--index <= 0) {
									index = 0;
									p = table[0];
									p.psum = parea = sum;
									alpha += da;
									b += b - a;
									cont = false;
									break;
								} else {
									p = table[index];
								}
							}
							continue;
						}
					}
				}
				if (index >= table.length)
					return null;
				// Raise level and store information for processing right-half interval.
				da = dx;
				est = estl;
				p = table[++index] = {
					left: false,
					f1t: fv2,
					f2t: fv3,
					f3t: fv4,
					dat: dx,
					estr: estr,
					psum: 0
				};
				fv4 = fv2;
				fv2 = fv1;
			}
		}
		return { b: b, area: area };
	}
}