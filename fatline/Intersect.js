new function() {

var MAX_RECURSION = 20;
var MAX_ITERATION = 20;

/**
 * This method is analogous to paperjs#PathItem.getIntersections, but calls
 * Curve.getIntersections2 instead.
 */
 PathItem.prototype.getIntersections2 = function(path) {
	// First check the bounds of the two paths. If they don't intersect,
	// we don't need to iterate through their curves.
	if (!this.getBounds().touches(path.getBounds()))
		return [];
	var locations = [],
		curves1 = this.getCurves(),
		curves2 = path.getCurves(),
		length2 = curves2.length,
		values2 = [];
	for (var i = 0; i < length2; i++)
		values2[i] = curves2[i].getValues();
	for (var i = 0, l = curves1.length; i < l; i++) {
		var curve1 = curves1[i],
			values1 = curve1.getValues();
		for (var j = 0; j < length2; j++)
			Curve.getIntersections2(values1, values2[j], curve1, curves2[j],
					locations);
	}
	return locations;
};

/**
 * This method is analogous to paperjs#Curve.getIntersections
 */
Curve.getIntersections2 = function(v1, v2, curve1, curve2, locations) {
	var linear1 = Curve.isLinear(v1),
		linear2 = Curve.isLinear(v2);
	// Determine the correct intersection method based on values of linear1 & 2:
	(linear1 && linear2
			? getLineLineIntersection
			: linear1 || linear2
				? getCurveLineIntersections
				: getCurveIntersections)(v1, v2, curve1, curve2, locations);
	return locations;
};

function addLocation(locations, curve1, parameter, point, curve2) {
	// Avoid duplicates when hitting segments (closed paths too)
	var first = locations[0],
		last = locations[locations.length - 1];
	if ((!first || !point.equals(first._point))
			&& (!last || !point.equals(last._point)))
		locations.push(new CurveLocation(curve1, parameter, point, curve2));
}

function getCurveIntersections(v1, v2, curve1, curve2, locations, v1t, v2t,
		recursion) {
	// NOTE: v1t and v1t are only used for recusion
	recursion = (recursion || 0) + 1;
	// Avoid endless recursion.
	// Perhaps we should fall back to a more expensive method after this, but
	// so far endless recursion happens only when there is no real intersection
	// and the infinite fatline continue to intersect with the other curve
	// outside its bounds!
	if (recursion > MAX_RECURSION)
		return;
	// Set up the parameter ranges.
	v1t = v1t || [ 0, 1 ];
	v2t = v2t || [ 0, 1 ];
	// Get the clipped parts from the original curve, to avoid cumulative errors
	var p1 = Curve.getPart(v1, v1t[0], v1t[1]);
	var p2 = Curve.getPart(v2, v2t[0], v2t[1]);
	// markCurve(p1, '#f0f', true);
	// markCurve(p2, '#0ff', false);
	var iteration = 0;
	// Loop until both parameter range converge. We have to handle the
	// degenerate case seperately, where fat-line clipping can become
	// numerically unstable when one of the curves has converged to a point and
	// the other hasn't.
	while (iteration++ < MAX_ITERATION
			&& (Math.abs(v1t[1] - v1t[0]) > /*#=*/ Numerical.TOLERANCE
			|| Math.abs(v2t[1] - v2t[0]) > /*#=*/ Numerical.TOLERANCE)) {
		// First we clip v2 with v1's fat-line
		var range = v2t.slice();
		var intersects1 = clipFatLine(p1, p2, range),
			intersects2 = 0;
		// Stop if there are no possible intersections
		if (intersects1 === 0)
			break;
		if (intersects1 > 0) {
			// Get the clipped parts from the original v2, to avoid cumulative
			// errors ...and reuse some objects.
			v2t = range;
			p2 = Curve.getPart(v2, v2t[0], v2t[1]);
			// markCurve(p2, '#0ff', false);
			// Next we clip v1 with nuv2's fat-line
			intersects2 = clipFatLine(p2, p1, range = v1t.slice());
			// Stop if there are no possible intersections
			if (intersects2 === 0)
				break;
			if (intersects1 > 0) {
				// Get the clipped parts from the original v2, to avoid
				// cumulative errors
				v1t = range;
				p1 = Curve.getPart(v1, v1t[0], v1t[1]);
			}
			// markCurve(p1, '#f0f', true);
		}
		// Get the clipped parts from the original v1
		// Check if there could be multiple intersections
		if (intersects1 < 0 || intersects2 < 0) {
			// Subdivide the curve which has converged the least from the
			// original range [0,1], which would be the curve with the largest
			// parameter range after clipping
			if (v1t[1] - v1t[0] > v2t[1] - v2t[0]) {
				// subdivide v1 and recurse
				var t = (v1t[0] + v1t[1]) / 2;
				getCurveIntersections(v1, v2, curve1, curve2, locations,
						[ v1t[0], t ], v2t, recursion);
				getCurveIntersections(v1, v2, curve1, curve2, locations,
						[ t, v1t[1] ], v2t, recursion);
				break;
			} else {
				// subdivide v2 and recurse
				var t = (v2t[0] + v2t[1]) / 2;
				getCurveIntersections(v1, v2, curve1, curve2, locations, v1t,
						[ v2t[0], t ], recursion);
				getCurveIntersections(v1, v2, curve1, curve2, locations, v1t,
						[ t, v2t[1] ], recursion);
				break;
			}
		}
		// We need to bailout of clipping and try a numerically stable method if
		// any of the following are true.
		//  1. One of the parameter ranges is converged to a point.
		//  2. Both of the parameter ranges have converged reasonably well
		//     (according to Numerical.TOLERANCE).
		//  3. One of the parameter range is converged enough so that it is
		//     *flat enough* to calculate line curve intersection implicitly.
		//
		// Check if one of the parameter range has converged completely to a
		// point. Now things could get only worse if we iterate more for the
		// other curve to converge if it hasn't yet happened so.
		var converged1 = (Math.abs(v1t[1] - v1t[0]) < /*#=*/ Numerical.EPSILON),
			converged2 = (Math.abs(v2t[1] - v2t[0]) < /*#=*/ Numerical.EPSILON);
		if (converged1 || converged2) {
			addLocation(locations, curve1, null, converged1
					? curve1.getPointAt(v1t[0], true)
					: curve2.getPointAt(v2t[0], true), curve2);
			break;
		}
		if (Math.abs(v1t[1] - v1t[0]) <= /*#=*/ Numerical.TOLERANCE
				&& Math.abs(v2t[1] - v2t[0]) <= /*#=*/ Numerical.TOLERANCE) {
			// Both parameter ranges have converged.
			addLocation(locations, curve1, v1t[0],
					curve1.getPointAt(v1t[0], true), curve2);
			break;
		}
		// see if either or both of the curves are flat enough to be treated
		// as lines.
		var flat1 = Curve.isFlatEnough(p1, /*#=*/ Numerical.TOLERANCE),
			flat2 = Curve.isFlatEnough(p2, /*#=*/ Numerical.TOLERANCE);
		if (flat1 && flat2) {
			getLineLineIntersection(p1, p2, curve1, curve2, locations);
			break;
		}
		if (flat1 || flat2) {
			// Use curve line intersection method while specifying which
			// curve to be treated as line
			getCurveLineIntersections(p1, p2, curve1, curve2, locations, flat1);
			break;
		}
	}
}

/**
 * Clip curve V2 with fat-line of v1
 * @param {Array} v1 section of the first curve, for which we will make a
 * fat-line
 * @param {Array} v2 section of the second curve; we will clip this curve with
 * the fat-line of v1
 * @param {Object} v2t the parameter range of v2
 * @return {Number} 0: no Intersection, 1: one intersection, -1: more than one 
 * ntersection
 */
function clipFatLine(v1, v2, v2t) {
	// first curve, P
	var p0x = v1[0], p0y = v1[1], p1x = v1[2], p1y = v1[3],
		p2x = v1[4], p2y = v1[5], p3x = v1[6], p3y = v1[7],
		// second curve, Q
		q0x = v2[0], q0y = v2[1], q1x = v2[2], q1y = v2[3],
		q2x = v2[4], q2y = v2[5], q3x = v2[6], q3y = v2[7],
		// Calculate the fat-line L for P is the baseline l and two
		// offsets which completely encloses the curve P.
		d1 = getSignedDistance(p0x, p0y, p3x, p3y, p1x, p1y) || 0,
		d2 = getSignedDistance(p0x, p0y, p3x, p3y, p2x, p2y) || 0,
		factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
		dmin = factor * Math.min(0, d1, d2),
		dmax = factor * Math.max(0, d1, d2),
		// Calculate non-parametric bezier curve D(ti, di(t)) - di(t) is the
		// distance of Q from the baseline l of the fat-line, ti is equally
		// spaced in [0, 1]
		dq0 = getSignedDistance(p0x, p0y, p3x, p3y, q0x, q0y),
		dq1 = getSignedDistance(p0x, p0y, p3x, p3y, q1x, q1y),
		dq2 = getSignedDistance(p0x, p0y, p3x, p3y, q2x, q2y),
		dq3 = getSignedDistance(p0x, p0y, p3x, p3y, q3x, q3y),
		// Find the minimum and maximum distances from l, this is useful for
		// checking whether the curves intersect with each other or not.
		mindist = Math.min(dq0, dq1, dq2, dq3),
		maxdist = Math.max(dq0, dq1, dq2, dq3);
		// If the fatlines don't overlap, we have no intersections!
	if (dmin > maxdist || dmax < mindist)
		return 0;
	var tmp;
	if (dq3 < dq0) {
		tmp = dmin;
		dmin = dmax;
		dmax = tmp;
	}
	var Dt = getConvexHull(dq0, dq1, dq2, dq3);
	// Calculate the convex hull for non-parametric bezier curve D(ti, di(t))
	// Now we clip the convex hulls for D(ti, di(t)) with dmin and dmax
	// for the coorresponding t values (tmin, tmax): Portions of curve v2 before
	// tmin and after tmax can safely be clipped away
	var tmaxdmin = -Infinity, ixd, ixdx, i, len, inv_m;
	var tmin = Infinity, tmax = -Infinity, Dtl, dtlx1, dtly1, dtlx2, dtly2;
	for (i = 0, len = Dt.length; i < len; i++) {
		Dtl = Dt[i];
		dtlx1 = Dtl[0];
		dtly1 = Dtl[1];
		dtlx2 = Dtl[2];
		dtly2 = Dtl[3];
		if (dtly2 < dtly1) {
			tmp = dtly2;
			dtly2 = dtly1;
			dtly1 = tmp;
			tmp = dtlx2;
			dtlx2 = dtlx1;
			dtlx1 = tmp;
		}
		// we know that (dtlx2 - dtlx1) is never 0
		inv_m =  (dtly2 - dtly1) / (dtlx2 - dtlx1);
		if (dmin >= dtly1 && dmin <= dtly2) {
			ixdx = dtlx1 + (dmin - dtly1) / inv_m;
			if (ixdx < tmin) tmin = ixdx;
			if (ixdx > tmaxdmin) tmaxdmin = ixdx;
		}
		if (dmax >= dtly1 && dmax <= dtly2) {
			ixdx = dtlx1 + (dmax - dtly1) / inv_m;
			if (ixdx > tmax) tmax = ixdx;
			if (ixdx < tmin) tmin = 0;
		}
	}
	// Return the parameter values for v2 for which we can be sure that the
	// intersection with v1 lies within.
	if (tmin !== Infinity && tmax !== -Infinity) {
		var mindmin = Math.min(dmin, dmax);
		var mindmax = Math.max(dmin, dmax);
		if (dq3 > mindmin && dq3 < mindmax)
			tmax = 1;
		if (dq0 > mindmin && dq0 < mindmax)
			tmin = 0;
		if (tmaxdmin > tmax)
			tmax = 1;
		// tmin and tmax are within the range (0, 1). We need to project it to
		// the original parameter range for v2.
		var v2tmin = v2t[0];
		var tdiff = (v2t[1] - v2tmin);
		v2t[0] = v2tmin + tmin * tdiff;
		v2t[1] = v2tmin + tmax * tdiff;
		// If the new parameter range fails to converge by atleast 20% of the
		// original range, possibly we have multiple intersections. We need to
		// subdivide one of the curves.
		if ((tdiff - (v2t[1] - v2t[0])) / tdiff >= 0.2)
			return 1;
	}
	// TODO: Try checking with a perpendicular fatline to see if the curves
	// overlap if it is any faster than this
	if (Curve.getBounds(v1).touches(Curve.getBounds(v2)))
		return -1;
	return 0;
}

/**
 * Calculate the convex hull for the non-paramertic bezier curve D(ti, di(t)).
 * The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
 * di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the
 * curve are already sorted in the X axis in the increasing order. Calculating
 * convex-hull is much easier than a set of arbitrary points.
 */
function getConvexHull(dq0, dq1, dq2, dq3) {
	var distq1 = getSignedDistance(0, dq0, 1, dq3, 1 / 3, dq1);
	var distq2 = getSignedDistance(0, dq0, 1, dq3, 2 / 3, dq2);
	var hull;
	// Check if [1/3, dq1] and [2/3, dq2] are on the same side of line
	// [0,dq0, 1,dq3]
	if (distq1 * distq2 < 0) {
		// dq1 and dq2 lie on different sides on [0, q0, 1, q3]
		// Convexhull is a quadrilateral and line [0, q0, 1, q3] is NOT part of
		// the convexhull so we are pretty much done here.
		hull = [
			[ 0, dq0, 1 / 3, dq1 ],
			[ 1 / 3, dq1, 1, dq3 ],
			[ 2 / 3, dq2, 0, dq0 ],
			[ 1, dq3, 2 / 3, dq2 ]
		];
	} else {
		// dq1 and dq2 lie on the same sides on [0, q0, 1, q3]. c-hull can be a
		// triangle or a quadrilateral and line [0, q0, 1, q3] is part of the
		// c-hull. Check if the hull is a triangle or a quadrilateral
		var dqmin, dqmax, dqapex1, dqapex2;
		distq1 = Math.abs(distq1);
		distq2 = Math.abs(distq2);
		var vqa1a2x, vqa1a2y, vqa1Maxx, vqa1Maxy, vqa1Minx, vqa1Miny;
		if (distq1 > distq2) {
			dqmin = [ 2 / 3, dq2 ];
			dqmax = [ 1 / 3, dq1 ];
			// apex is dq3 and the other apex point is dq0 vector
			// dqapex->dqapex2 or base vector which is already part of c-hull
			vqa1a2x = 1;
			vqa1a2y = dq3 - dq0;
			// vector dqapex->dqmax
			vqa1Maxx = 2 / 3;
			vqa1Maxy = dq3 - dq1;
			// vector dqapex->dqmin
			vqa1Minx = 1 / 3;
			vqa1Miny = dq3 - dq2;
		} else {
			dqmin = [ 1 / 3, dq1 ];
			dqmax = [ 2 / 3, dq2 ];
			// apex is dq0 in this case, and the other apex point is dq3 vector
			// dqapex->dqapex2 or base vector which is already part of c-hull
			vqa1a2x = -1;
			vqa1a2y = dq0 - dq3;
			// vector dqapex->dqmax
			vqa1Maxx = -2 / 3;
			vqa1Maxy = dq0 - dq2;
			// vector dqapex->dqmin
			vqa1Minx = -1 / 3;
			vqa1Miny = dq0 - dq1;
		}
		// Compare cross products of these vectors to determine, if
		// point is in triangles [ dq3, dqMax, dq0 ] or [ dq0, dqMax, dq3 ]
		var vcrossa1a2_a1Min = vqa1a2x * vqa1Miny - vqa1a2y * vqa1Minx;
		var vcrossa1Max_a1Min = vqa1Maxx * vqa1Miny - vqa1Maxy * vqa1Minx;
		if (vcrossa1Max_a1Min * vcrossa1a2_a1Min < 0) {
			// Point [2/3, dq2] is inside the triangle and c-hull is a triangle
			hull = [
				[ 0, dq0, dqmax[0], dqmax[1] ],
				[ dqmax[0], dqmax[1], 1, dq3 ],
				[ 1, dq3, 0, dq0 ]
			];
		} else {
			// Convexhull is a quadrilateral and we need all lines in the
			// correct order where line [0, q0, 1, q3] is part of the c-hull
			hull = [
				[ 0, dq0, 1 / 3, dq1 ],
				[ 1 / 3, dq1, 2 / 3, dq2 ],
				[ 2 / 3, dq2, 1, dq3 ],
				[ 1, dq3, 0, dq0 ]
			];
		}
	}
	return hull;
}

// This is basically an "unrolled" version of #Line.getDistance() with sign
// May be a static method could be better!
function getSignedDistance(a1x, a1y, a2x, a2y, bx, by) {
	var m = (a2y - a1y) / (a2x - a1x),
		b = a1y - (m * a1x);
	return (by - (m * bx) - b) / Math.sqrt(m * m + 1);
}

/**
 * Intersections between curve and line becomes rather simple here mostly
 * because of Numerical class. We can rotate the curve and line so that the line 
 * is on X axis, and solve the implicit equations for X axis and the curve
 */
function getCurveLineIntersections(v1, v2, curve1, curve2, locations, flip) {
	if (flip === undefined)
		flip = Curve.isLinear(v1);
	var vc = flip ? v2 : v1,
		vl = flip ? v1 : v2,
		l1x = vl[0], l1y = vl[1],
		l2x = vl[6], l2y = vl[7],
		// Rotate both the curve and line around l1 so that line is on x axis
		lvx = l2x - l1x,
		lvy = l2y - l1y,
		// Angle with x axis (1, 0)
		angle = Math.atan2(-lvy, lvx),
		sin = Math.sin(angle),
		cos = Math.cos(angle),
		// (rl1x, rl1y) = (0, 0)
		rl2x = lvx * cos - lvy * sin,
		rl2y = lvy * cos + lvx * sin,
		vcr = [];

	for(var i = 0; i < 8; i += 2) {
		var x = vc[i] - l1x,
			y = vc[i + 1] - l1y;
		vcr.push(
			x * cos - y * sin,
			y * cos + x * sin);
	}
	var roots = [],
		count = Curve.solveCubic(vcr, 1, 0, roots);
	// NOTE: count could theoretically be -1 for inifnite solutions, although
	// that should only happen with lines, in which case we should not be here.
	for (var i = 0; i < count; i++) {
		var t = roots[i];
		if (t >= 0 && t <= 1) {
			var point = Curve.evaluate(vcr, t, true, 0);
			// We do have a point on the infinite line. Check if it falls on the
			// line *segment*.
			if (point.x  >= 0 && point.x <= rl2x)
				addLocation(locations,
						flip ? curve2 : curve1,
						// The actual intersection point
						t, Curve.evaluate(vc, t, true, 0), 
						flip ? curve1 : curve2);
		}
	}
}

function getLineLineIntersection(v1, v2, curve1, curve2, locations) {
	var point = Line.intersect(
			v1[0], v1[1], v1[6], v1[7],
			v2[0], v2[1], v2[6], v2[7], false);
	// Passing null for parameter leads to lazy determination of parameter
	// values in CurveLocation#getParameter() only once they are requested.
	if (point)
		addLocation(locations, curve1, null, point, curve2);
}

};
