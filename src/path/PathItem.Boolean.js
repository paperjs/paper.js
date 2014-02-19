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

PathItem.inject(new function() { // FIXME: Is new necessary?
    /**
     * To deal with a HTML5 canvas requirement where CompoundPaths' child
     * contours has to be of different winding direction for correctly filling
     * holes. But if some individual countours are disjoint, i.e. islands, we
     * have to reorient them so that:
     * - the holes have opposit winding direction (already handled by paper.js)
     * - islands have to have the same winding direction as the first child
     *
     * NOTE: Does NOT handle self-intersecting CompoundPaths.
     */
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

    function computeBoolean(path1, path2, operator, subtract) {
		// We do not modify the operands themselves
		// The result might not belong to the same type
		// i.e. subtraction(A:Path, B:Path):CompoundPath etc.
		// Also apply matrices to both paths in case they were transformed.
		var singlePathOp = path1 === path2;
		path1 = reorientPath(path1.clone(false).applyMatrix());
		if (!singlePathOp)
			path2 = reorientPath(path2.clone(false).applyMatrix());
		// Do operator specific calculations before we begin
		// Make both paths at clockwise orientation, except when @subtract = true
		// We need both paths at opposit orientation for subtraction
		if (!path1.isClockwise())
			path1.reverse();
		if (!singlePathOp && !(subtract ^ path2.isClockwise()))
			path2.reverse();
		var intersections, i, j, l, lj, segment, wind,
			point, startSeg, crv, length, parent, v, horizontal,
			curveChain = [],
			windings = [],
			lengths = [],
			windMedian, lenCurves,
			paths = [],
			segments = [],
			// Aggregate of all curves in both operands, monotonic in y
			monoCurves = [],
			result = new CompoundPath(),
			random = Math.random,
			abs = Math.abs,
			tolerance = /*#=*/ Numerical.TOLERANCE,
			getWinding = PathItem._getWinding;
			// Split curves at intersections on both paths.
			intersections = singlePathOp ? path1.getSelfIntersections(true)
					: path1.getIntersections(path2, true);
			PathItem._splitPath(intersections);
		// Collect all sub paths and segments
		paths.push.apply(paths, path1._children || [path1]);
		if (!singlePathOp)
			paths.push.apply(paths, path2._children || [path2]);

		for (i = 0, l = paths.length; i < l; i++) {
			segments.push.apply(segments, paths[i].getSegments());
			monoCurves.push.apply(monoCurves, paths[i]._getMonotoneCurves());
		}
		// Propagate the winding contribution. Winding contribution of curves
		// does not change between two intersections.
		// First, sort all segments with an intersection to the begining.
		segments.sort(function(a, b) {
			var ixa = a._intersection,
				ixb = b._intersection;
			if (!ixa && !ixb || ixa && ixb)
				return 0;
			return ixa ? -1 : 1;
		});
		for (i = 0, l = segments.length; i < l; i++) {
			segment = segments[i];
			if (segment._winding != null)
				continue;
			// Here we try to determine the most probable winding number
			// contribution for this curve-chain. Once we have enough
			// confidence in the winding contribution, we can propagate it
			// until the intersection or end of a curve chain.
			curveChain.length = lengths.length = 0;
			lenCurves = 0;
			startSeg = segment;
			do {
				curveChain.push(segment);
				lenCurves += segment.getCurve().getLength();
				lengths.push(lenCurves);
				// Continue with next curve
				segment = segment.getNext();
			} while (segment && !segment._intersection && segment !== startSeg);


			// Select the median winding of three random points along this
			// curve chain, as a representative winding number. The
			// random selection gives a better chance of returning a
			// correct winding than equally dividing the curve chain, with
			// the same (amortised) time.
			windings.length = 0;
			for (wind = 0; wind < 3; wind++) {
				length = lenCurves * random();
				for (j = 0, lj = lengths.length ; j <= lj; j++)
					if (lengths[j] >= length) {
						length = j > 0 ? length - lengths[j-1] : length;
						break;
					}
				crv = curveChain[j].getCurve();
				point = crv.getPointAt(length);
				v = crv.getValues();
				horizontal = (Curve.isLinear(v) && abs(v[1] - v[7]) < tolerance);
				windMedian = getWinding(point, monoCurves, horizontal);
				// While subtracting, we need to omit this curve if this 
				// curve is contributing to the second operand and is outside
				// the first operand.
				parent = crv._path;
				if (parent._parent instanceof CompoundPath)
					parent = parent._parent;
				if (subtract && (parent._id === path2._id &&
							!path1._getWinding(point, horizontal) ||
							(parent._id === path1._id &&
							path2._getWinding(point, horizontal)))) {
					windMedian = 0;
				}
				windings[wind] = windMedian;
			}
			windings.sort();
			windMedian = windings[1];
			// Assign the winding to the entire curve chain
			for (j = curveChain.length - 1; j >= 0; j--)
				curveChain[j]._winding = windMedian;
		}
		// Trace closed contours and insert them into the result;
		paths = PathItem._tracePaths(segments, operator);
		for (i = 0, l = paths.length; i < l; i++)
			result.addChild(paths[i], true);
		// Delete the proxies
		path1.remove();
		if (!singlePathOp)
			path2.remove();
		// And then, we are done.
		return result.reduce();
    }

    // Boolean operators return true if a curve with the given winding 
    // contribution contributes to the final result or not. They are called
    // for each curve in the graph after curves in the operands are
    // split at intersections.
    return /** @lends Path# */{
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
			return computeBoolean(this, path,
						function(w) { return w === 1 || w === 0; }, false);
		},

		/**
		 * Intersects the geometry of the specified path with this path's
		 * geometry and returns the result as a new path item.
		 * 
		 * @param {PathItem} path the path to intersect with
		 * @return {PathItem} the resulting path item
		 */
		intersect: function(path) {
			return computeBoolean(this, path,
						function(w) { return w === 2; }, false);
		},

		/**
		 * Subtracts the geometry of the specified path from this path's
		 * geometry and returns the result as a new path item.
		 * 
		 * @param {PathItem} path the path to subtract
		 * @return {PathItem} the resulting path item
		 */
		subtract: function(path) {
			return computeBoolean(this, path,
						function(w) { return w === 1; }, true);
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
		}
    };
});
