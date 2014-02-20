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

/*
 * Boolean Geometric Path Operations
 *
 * This is mostly written for clarity and compatibility, not optimised for
 * performance, and has to be tested heavily for stability.
 *
 * Supported
 *  - Path and CompoundPath items
 *  - Boolean Union
 *  - Boolean Intersection
 *  - Boolean Subtraction
 *  - Resolving a self-intersecting Path
 *
 * Not supported yet
 *  - Boolean operations on self-intersecting Paths
 *  - Paths are clones of each other that ovelap exactly on top of each other!
 *
 * @author Harikrishnan Gopalakrishnan
 * http://hkrish.com/playground/paperjs/booleanStudy.html
 */

PathItem.inject(/** @lends PathItem# */{
    // Boolean operators return true if a curve with the given winding 
    // contribution contributes to the final result or not. They are called
    // for each curve in the graph after curves in the operands are
    // split at intersections.
	_computeBoolean: function(other, operator, subtract) {
		// To deal with a HTML5 canvas requirement where CompoundPaths' child
		// contours has to be of different winding direction for correctly
		// filling holes. But if some individual countours are disjoint, i.e.
		// islands, we have to reorient them so that:
		// - The holes have opposite winding direction, already handled by paper
		// - Islands have to have the same winding direction as the first child
		// NOTE: Does NOT handle self-intersecting CompoundPaths.
		function reorientPath(path) {
			if (path instanceof CompoundPath) {
				var children = path.removeChildren(),
					length = children.length,
					bounds = new Array(length),
					counters = new Array(length),
					clockwise;
				children.sort(function(a, b) {
					return b.getBounds().getArea() - a.getBounds().getArea();
				});
				path.addChildren(children);
				clockwise = children[0].isClockwise();
				for (var i = 0; i < length; i++) {
					bounds[i] = children[i].getBounds();
					counters[i] = 0;
				}
				for (var i = 0; i < length; i++) {
					for (var j = 1; j < length; j++) {
						if (i !== j && bounds[i].intersects(bounds[j]))
							counters[j]++;
					}
					// Omit the first child
					if (i > 0 && counters[i] % 2 === 0)
						children[i].setClockwise(clockwise);
				}
			}
			return path;
		}

		// We do not modify the operands themselves
		// The result might not belong to the same type
		// i.e. subtraction(A:Path, B:Path):CompoundPath etc.
		// We call reduce() on both cloned paths to simplify compound paths and
		// remove empty curves. We also apply matrices to both paths in case
		// they were transformed.
		var path1 = reorientPath(this.clone(false).reduce().applyMatrix());
			path2 = this !== other
					&& reorientPath(other.clone(false).reduce().applyMatrix());
		// Do operator specific calculations before we begin
		// Make both paths at clockwise orientation, except when subtract = true
		// We need both paths at opposite orientation for subtraction.
		if (!path1.isClockwise())
			path1.reverse();
		if (path2 && !(subtract ^ path2.isClockwise()))
			path2.reverse();
		// Split curves at intersections on both paths.
		PathItem._splitPath(path1.getIntersections(path2, true));

		var chain = [],
			windings = [],
			lengths = [],
			segments = [],
			// Aggregate of all curves in both operands, monotonic in y
			monoCurves = [];

		function collect(paths) {
			for (var i = 0, l = paths.length; i < l; i++) {
				var path = paths[i];
				segments.push.apply(segments, path._segments);
				monoCurves.push.apply(monoCurves, path._getMonoCurves());
			}
		}

		// Collect all segments and monotonic curves
		collect(path1._children || [path1]);
		if (path2)
			collect(path2._children || [path2]);
		// Propagate the winding contribution. Winding contribution of curves
		// does not change between two intersections.
		// First, sort all segments with an intersection to the begining.
		segments.sort(function(a, b) {
			var _a = a._intersection,
				_b = b._intersection;
			return !_a && !_b || _a && _b ? 0 : _a ? -1 : 1;
		});
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			if (segment._winding != null)
				continue;
			// Here we try to determine the most probable winding number
			// contribution for this curve-chain. Once we have enough confidence
			// in the winding contribution, we can propagate it until the
			// intersection or end of a curve chain.
			chain.length = windings.length = lengths.length = 0;
			var totalLength = 0,
				startSeg = segment;
			do {
				chain.push(segment);
				lengths.push(totalLength += segment.getCurve().getLength());
				segment = segment.getNext();
			} while (segment && !segment._intersection && segment !== startSeg);
			// Select the median winding of three random points along this curve
			// chain, as a representative winding number. The random selection
			// gives a better chance of returning a correct winding than equally
			// dividing the curve chain, with the same (amortised) time.
			for (var j = 0; j < 3; j++) {
				var length = totalLength * Math.random(),
					amount = lengths.length;
					k = 0;
				do {
					if (lengths[k] >= length) {
						if (k > 0) 
							length -= lengths[k - 1];
						break;
					}
				} while (++k < amount);
				var curve = chain[k].getCurve(),
					point = curve.getPointAt(length),
					hor = curve.isHorizontal(),
					path = curve._path;
				if (path._parent instanceof CompoundPath)
					path = path._parent;
				// While subtracting, we need to omit this curve if this 
				// curve is contributing to the second operand and is outside
				// the first operand.
				windings[j] = subtract && path2
						&& (path === path1 && path2._getWinding(point, hor)
							|| path === path2 && !path1._getWinding(point, hor))
						? 0
						: PathItem._getWinding(point, monoCurves, hor);
			}
			windings.sort();
			// Assign the median winding to the entire curve chain.
			var winding = windings[1];
			for (var j = chain.length - 1; j >= 0; j--)
				chain[j]._winding = winding;
		}
		// Trace closed contours and insert them into the result.
		var result = new CompoundPath();
		result.addChildren(PathItem._tracePaths(segments, operator), true);
		// Delete the proxies
		path1.remove();
		if (path2)
			path2.remove();
		// And then, we are done.
		return result.reduce();
	},

	/**
	 * Returns the winding contribution of the given point with respect to this
	 * PathItem.
	 *
	 * @param  {Point} point the location for which to determine the winding
	 * direction
	 * @param  {Boolean} horizontal wether we need to consider this point as
	 * part of a horizontal curve
	 * @return {Number} the winding number
	 */
	_getWinding: function(point, horizontal) {
		return PathItem._getWinding(point, this._getMonoCurves(), horizontal);
	},

	/**
	 * {@grouptitle Boolean Path Operations}
	 *
	 * Merges the geometry of the specified path from this path's
	 * geometry and returns the result as a new path item.
	 * 
	 * @param {PathItem} path the path to unite with
	 * @return {PathItem} the resulting path item
	 */
	unite: function(path) {
		return this._computeBoolean(path, function(w) {
			return w === 1 || w === 0;
		}, false);
	},

	/**
	 * Intersects the geometry of the specified path with this path's
	 * geometry and returns the result as a new path item.
	 * 
	 * @param {PathItem} path the path to intersect with
	 * @return {PathItem} the resulting path item
	 */
	intersect: function(path) {
		return this._computeBoolean(path, function(w) {
			return w === 2;
		}, false);
	},

	/**
	 * Subtracts the geometry of the specified path from this path's
	 * geometry and returns the result as a new path item.
	 * 
	 * @param {PathItem} path the path to subtract
	 * @return {PathItem} the resulting path item
	 */
	subtract: function(path) {
		return this._computeBoolean(path, function(w) {
			return w === 1;
		}, true);
	},

	// Compound boolean operators combine the basic boolean operations such
	// as union, intersection, subtract etc.
	/**
	 * Excludes the intersection of the geometry of the specified path with
	 * this path's geometry and returns the result as a new group item.
	 * 
	 * @param {PathItem} path the path to exclude the intersection of
	 * @return {Group} the resulting group item
	 */
	exclude: function(path) {
		return new Group([this.subtract(path), path.subtract(this)]);
	},
	
	/**
	 * Splits the geometry of this path along the geometry of the specified
	 * path returns the result as a new group item.
	 * 
	 * @param {PathItem} path the path to divide by
	 * @return {Group} the resulting group item
	 */
	divide: function(path) {
		return new Group([this.subtract(path), this.intersect(path)]);
	},

// Mess with indentation in order to get more line-space below...
statics: {
	/**
	 * Private method for splitting a PathItem at the given intersections.
	 * The routine works for both self intersections and intersections 
	 * between PathItems.
	 * @param {CurveLocation[]} intersections Array of CurveLocation objects
	 */
	_splitPath: function(intersections) {
		var linearSegments;

		function resetLinear() {
			// Reset linear segments if they were part of a linear curve 
			// and if we are done with the entire curve.
			for (var i = 0, l = linearSegments.length; i < l; i++) {
				var segment = linearSegments[i];
				// FIXME: Don't reset the appropriate handle if the intersection
				// was on t == 0 && t == 1.
				segment._handleOut.set(0, 0);
				segment._handleIn.set(0, 0);
			}
		}

		for (var i = intersections.length - 1, curve, prevLoc; i >= 0; i--) {
			var loc = intersections[i],
				t = loc._parameter;
			// Check if we are splitting same curve multiple times
			if (prevLoc && prevLoc._curve === loc._curve) {
				// Scale parameter after previous split.
				t /= prevLoc._parameter;
			} else {
				if (linearSegments)
					resetLinear();
				curve = loc._curve;
				linearSegments = curve.isLinear() && [];
			}
			var newCurve,
				segment;
			// Split the curve at t, while ignoring linearity of curves
			if (newCurve = curve.divide(t, true, true)) {
				segment = newCurve._segment1;
				curve = newCurve.getPrevious();
			} else {
				segment = t < 0.5 ? curve._segment1 : curve._segment2;
			}
			// Link the new segment with the intersection on the other curve
			segment._intersection = loc.getIntersection();
			loc._segment = segment;
			if (linearSegments)
				linearSegments.push(segment);
			prevLoc = loc;
		}
		if (linearSegments)
			resetLinear();
	},

	/**
	 * Private static method that returns the winding contribution of the 
	 * given point with respect to a given set of monotone curves.
	 */
	_getWinding: function _getWinding(point, curves, horizontal) {
		var tolerance = /*#=*/ Numerical.TOLERANCE,
			x = point.x,
			y = point.y,
			xAfter = x + tolerance,
			xBefore = x - tolerance,
			windLeft = 0,
			windRight = 0,
			roots = [],
			abs = Math.abs;
		// Absolutely horizontal curves may return wrong results, since
		// the curves are monotonic in y direction and this is an
		// indeterminate state.
		if (horizontal) {
			var yTop = -Infinity,
				yBottom = Infinity;
			// Find the closest top and bottom intercepts for the same vertical
			// line.
			for (var i = 0, l = curves.length; i < l; i++) {
				v = curves[i];
				if (Curve.solveCubic(v, 0, x, roots, 0, 1) > 0) {
					for (var j = roots.length - 1; j >= 0; j--) {
						var y0 = Curve.evaluate(v, roots[j], 0).y;
						if (y0 > y + tolerance && y0 < yBottom) {
							yBottom = y0;
						} else if (y0 < y - tolerance && y0 > yTop) {
							yTop = y0;
						}
					}
				}
			}
			// Shift the point lying on the horizontal curves by
			// half of closest top and bottom intercepts.
			yTop = (yTop + y) / 2;
			yBottom = (yBottom + y) / 2;
			if (yTop > -Infinity)
				windLeft = _getWinding(new Point(x, yTop), curves);
			if (yBottom < Infinity)
				windRight = _getWinding(new Point(x, yBottom), curves);
		} else {
			// Find the winding number for right side of the curve, inclusive of
			// the curve itself, while tracing along its +-x direction.
			for (var i = 0, l = curves.length; i < l; i++) {
				var v = curves[i];
				if (Curve.solveCubic(v, 1, y, roots, 0, 1 - tolerance) === 1) {
					var t = roots[0],
						x0 = Curve.evaluate(v, t, 0).x,
						slope = Curve.evaluate(v, t, 1).y;
					// Take care of cases where the curve and the preceeding
					// curve merely touches the ray towards +-x direction, but
					// proceeds to the same side of the ray. This essentially is
					// not a crossing.
					// NOTE: The previous curve is stored at v[9], see
					// Path#_getMonoCurves() for details.
					if (abs(slope) < tolerance && !Curve.isLinear(v)
							|| t < tolerance
								&& slope * Curve.evaluate(v[9], t, 1).y < 0) {
						// TODO: Handle stationary points here!
					} else if (x0 <= xBefore) {
						windLeft += v[8];
					} else if (x0 >= xAfter) {
						windRight += v[8];
					}
				}
			}
		}
		return Math.max(abs(windLeft), abs(windRight));
	},

	/**
	 * Private method to trace closed contours from a set of segments according 
	 * to a set of constraints—winding contribution and a custom operator.
	 * 
	 * @param {Segment[]} segments Array of 'seed' segments for tracing closed
	 * contours
	 * @param {Function} the operator function that receives as argument the
	 * winding number contribution of a curve and returns a boolean value 
	 * indicating whether the curve should be  included in the final contour or
	 * not
	 * @return {Path[]} the contours traced
	 */
	_tracePaths: function(segments, operator, selfIx) {
		// Choose a default operator which will return all contours
		operator = operator || function() {
			return true;
		};
		var paths = [],
			// Values for getTangentAt() that are almost 0 and 1.
			// TODO: Correctly support getTangentAt(0) / (1)?
			ZERO = 1e-3,
			ONE = 1 - 1e-3;
		for (var i = 0, seg, startSeg, l = segments.length; i < l; i++) {
			seg = startSeg = segments[i];
			if (seg._visited || !operator(seg._winding))
				continue;
			var path = new Path({ insert: false }),
				inter = seg._intersection,
				startInterSeg = inter && inter._segment,
				added = false, // Wether a first segment as added already
				dir = 1;
			do {
				var handleIn = dir > 0 ? seg._handleIn : seg._handleOut,
					handleOut = dir > 0 ? seg._handleOut : seg._handleIn,
					interSeg;
				// If the intersection segment is valid, try switching to
				// it, with an appropriate direction to continue traversal.
				// Else, stay on the same contour.
				if (added && (!operator(seg._winding) || selfIx)
						&& (inter = seg._intersection)
						&& (interSeg = inter._segment)
						&& interSeg !== startSeg) {
					var c1 = seg.getCurve();
					if (dir > 0)
						c1 = c1.getPrevious();
					var t1 = c1.getTangentAt(dir < 1 ? ZERO : ONE, true),
						// Get both curves at the intersection (except the entry
						// curves) along with their winding values and tangents.
						c4 = interSeg.getCurve(),
						c3 = c4.getPrevious(),
						t3 = c3.getTangentAt(ONE, true),
						t4 = c4.getTangentAt(ZERO, true),
						// Cross product of the entry and exit tangent vectors
						// at the intersection, will let us select the correct
						// countour to traverse next.
						w3 = t1.cross(t3),
						w4 = t1.cross(t4);
					// Do not attempt to switch contours if we aren't absolutely
					// sure that there is a possible candidate.
					if (w3 * w4 !== 0) {
						var curve = w3 < w4 ? c3 : c4,
							nextCurve = operator(curve._segment1._winding)
								? curve
								: w3 < w4 ? c4 : c3,
							nextSeg = nextCurve._segment1;
						dir = nextCurve === c3 ? -1 : 1;
						// If we didn't manage to find a suitable direction for
						// next contour to traverse, stay on the same contour.
						if (nextSeg._visited && seg._path !== nextSeg._path
									|| !operator(nextSeg._winding)) {
							dir = 1;
						} else {
							// Switch to the intersection segment.
							seg._visited = interSeg._visited;
							seg = interSeg;
							if (nextSeg._visited) 
								dir = 1;
						}
					} else {
						dir = 1;
					}
					handleOut = dir > 0 ? seg._handleOut : seg._handleIn;
				}
				// Add the current segment to the path, and mark the added
				// segment as visited.
				path.add(new Segment(seg._point, added && handleIn, handleOut));
				added = true;
				seg._visited = true;
				// Move to the next segment according to the traversal direction
				seg = dir > 0 ? seg.getNext() : seg. getPrevious();
			} while (seg && !seg._visited
					&& seg !== startSeg && seg !== startInterSeg
					&& (seg._intersection || operator(seg._winding)));
			// Finish with closing the paths if necessary, correctly linking up
			// curves etc.
			if (seg && (seg === startSeg || seg === startInterSeg)) {
				path.firstSegment.setHandleIn((seg === startInterSeg
						? startInterSeg : seg)._handleIn);
				path.setClosed(true);
			} else {
				path.lastSegment._handleOut.set(0, 0);
			}
			// Add the path to the result.
			// Try to avoid stray segments and incomplete paths.
			var count = path._segments.length;
			if (count > 2 || count === 2 && path._closed && !path.isPolygon())
				paths.push(path);
		}
		return paths;
	}
}});

Path.inject(/** @lends Path# */{
	/**
	 * Private method that returns and caches all the curves in this Path, which
	 * are monotonically decreasing or increasing in the 'y' direction.
	 * Used by PathItem#_getWinding().
	 */
	_getMonoCurves: function() {
		var monoCurves = this._monoCurves,
			prevCurve;

		// Insert curve values into a cached array
		function insertCurve(v) {
			var y0 = v[1],
				y1 = v[7];
			// Add the winding direction to the end of the curve values.
			v[8] = y0 === y1
					? 0 // Horizontal
					: y0 > y1
						? -1 // Decreasing
						: 1; // Increasing
			// Add a reference to neighboring curves
			if (prevCurve) {
				v[9] = prevCurve;
				prevCurve[10] = v;
			}
			monoCurves.push(v);
			prevCurve = v;
		}

		// Handle bezier curves. We need to chop them into smaller curves 
		// with defined orientation, by solving the derivative curve for
		// Y extrema.
		function handleCurve(v) {
			// Filter out curves of zero length.
			// TODO: Do not filter this here.
			if (Curve.getLength(v) === 0)
				return;
			var y0 = v[1],
				y1 = v[3],
				y2 = v[5],
				y3 = v[7];
			if (Curve.isLinear(v)) {
				// Handling linear curves is easy.
				insertCurve(v);
			} else {
				// Split the curve at y extrema, to get bezier curves with clear
				// orientation: Calculate the derivative and find its roots.
				var a = 3 * (y1 - y2) - y0 + y3,
					b = 2 * (y0 + y2) - 4 * y1,
					c = y1 - y0,
					tolerance = /*#=*/ Numerical.TOLERANCE,
					roots = [];
				// Keep then range to 0 .. 1 (excluding) in the search for y
				// extrema.
				var count = Numerical.solveQuadratic(a, b, c, roots, tolerance,
						1 - tolerance);
				if (count === 0) {
					insertCurve(v);
				} else {
					roots.sort();
					var t = roots[0],
						parts = Curve.subdivide(v, t);
					insertCurve(parts[0]);
					if (count > 1) {
						// If there are two extremas, renormalize t to the range
						// of the second range and split again.
						t = (roots[1] - t) / (1 - t);
						// Since we already processed parts[0], we can override
						// the parts array with the new pair now.
						parts = Curve.subdivide(parts[1], t);
						insertCurve(parts[0]);
					}
					insertCurve(parts[1]);
				}
			}
		}

		if (!monoCurves) {
			// Insert curves that are monotonic in y direction into cached array
			monoCurves = this._monoCurves = [];
			var curves = this.getCurves(),
				segments = this._segments;
			for (var i = 0, l = curves.length; i < l; i++)
				handleCurve(curves[i].getValues());
			// If the path is not closed, we need to join the end points with a
			// straight line, just like how filling open paths works.
			if (!this._closed && segments.length > 1) {
				var p1 = segments[segments.length - 1]._point,
					p2 = segments[0]._point,
					p1x = p1._x, p1y = p1._y,
					p2x = p2._x, p2y = p2._y;
				handleCurve([p1x, p1y, p1x, p1y, p2x, p2y, p2x, p2y]);
			}
			// Link first and last curves
			monoCurves[0][9] = prevCurve = monoCurves[monoCurves.length - 1];
			prevCurve[10] = monoCurves[0];
		}
		return monoCurves;
	}
});

CompoundPath.inject(/** @lends CompoundPath# */{
	/**
	 * Private method that returns all the curves in this CompoundPath, which
	 * are monotonically decreasing or increasing in the 'y' direction.
	 * Used by PathItem#_getWinding().
	 */
	_getMonoCurves: function() {
		var children =  this._children,
			monoCurves = [];
		for (var i = 0, l = children.length; i < l; i++)
			monoCurves.push.apply(monoCurves, children[i]._getMonoCurves());
		return monoCurves;
	}
});