/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
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

PathItem.inject(new function() {
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
		path1 = reorientPath(path1.clone(false).applyMatrix());
		path2 = reorientPath(path2.clone(false).applyMatrix());
		var path1Clockwise = path1.isClockwise(),
			path2Clockwise = path2.isClockwise(),
			// Calculate all the intersections
			intersections = path1.getIntersections(path2);
		// Split intersections on both paths, by asking the first call to
		// collect the intersections on the other path for us and passing the
		// result of that on to the second call.
		splitPath(splitPath(intersections, true));
		// Do operator specific calculations before we begin
		//  Make both paths at clockwise orientation, except when @subtract = true
		//  We need both paths at opposit orientation for subtraction
		if (!path1Clockwise)
			path1.reverse();
		if (!(subtract ^ path2Clockwise))
			path2.reverse();
		path1Clockwise = true;
		path2Clockwise = !subtract;
		var paths = []
				.concat(path1._children || [path1])
				.concat(path2._children || [path2]),
			segments = [],
			result = new CompoundPath();
		// Step 1: Discard invalid links according to the boolean operator
		for (var i = 0, l = paths.length; i < l; i++) {
			var path = paths[i],
				parent = path._parent,
				clockwise = path.isClockwise(),
				segs = path._segments;
			path = parent instanceof CompoundPath ? parent : path;
			for (var j = segs.length - 1; j >= 0; j--) {
				var segment = segs[j],
					midPoint = segment.getCurve().getPoint(0.5),
					insidePath1 = path !== path1 && path1.contains(midPoint)
							&& (clockwise === path1Clockwise || subtract
									|| !testOnCurve(path1, midPoint)),
					insidePath2 = path !== path2 && path2.contains(midPoint)
							&& (clockwise === path2Clockwise
									|| !testOnCurve(path2, midPoint));
				if (operator(path === path1, insidePath1, insidePath2)) {
					// The segment is to be discarded. Don't add it to segments,
					// and mark it as invalid since it might still be found
					// through curves / intersections, see below.
					segment._invalid = true;
				} else {
					segments.push(segment);
				}
			}
		}
		// Step 2: Retrieve the resulting paths from the graph
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			if (segment._visited)
				continue;
			var path = new Path(),
				loc = segment._intersection,
				intersection = loc && loc.getSegment(true);
			if (segment.getPrevious()._invalid)
				segment.setHandleIn(intersection
						? intersection._handleIn
						: new Point(0, 0));
			do {
				segment._visited = true;
				if (segment._invalid && segment._intersection) {
					var inter = segment._intersection.getSegment(true);
					path.add(new Segment(segment._point, segment._handleIn,
							inter._handleOut));
					inter._visited = true;
					segment = inter;
				} else {
					path.add(segment.clone());
				}
				segment = segment.getNext();
			} while (segment && !segment._visited && segment !== intersection);
			// Avoid stray segments and incomplete paths
			var amount = path._segments.length;
			if (amount > 1 && (amount > 2 || !path.isPolygon())) {
				path.setClosed(true);
				result.addChild(path, true);
			} else {
				path.remove();
			}
		}
		// Delete the proxies
		path1.remove();
		path2.remove();
		// And then, we are done.
		return result.reduce();
	}

	function testOnCurve(path, point) {
		var curves = path.getCurves(),
			bounds = path.getBounds();
		if (bounds.contains(point)) {
			for (var i = 0, l = curves.length; i < l; i++) {
				var curve = curves[i];
				if (curve.getBounds().contains(point)
						&& curve.getParameterOf(point))
					return true;
			}
		}
		return false;
	}

	// Boolean operators are binary operator functions of the form:
	// function(isPath1, isInPath1, isInPath2)
	//
	// Operators return true if a segment in the operands is to be discarded.
	// They are called for each segment in the graph after all the intersections
	// between the operands are calculated and curves in the operands were split
	// at intersections.
	return /** @lends Path# */{
		/**
		 * Merges the geometry of the specified path from this path's
		 * geometry and returns the result as a new path item.
		 * 
		 * @param {PathItem} path the path to unite with
		 * @return {PathItem} the resulting path item
		 */
		unite: function(path) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return isInPath1 || isInPath2;
					});
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
					function(isPath1, isInPath1, isInPath2) {
						return !(isInPath1 || isInPath2);
					});
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
					function(isPath1, isInPath1, isInPath2) {
						return isPath1 && isInPath2 || !isPath1 && !isInPath1;
					}, true);
		},

		// Compound boolean operators combine the basic boolean operations such
		// as union, intersection, subtract etc. 
		// TODO: cache the split objects and find a way to properly clone them!
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
