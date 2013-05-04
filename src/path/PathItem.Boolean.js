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
 *  - paperjs Path and CompoundPath objects
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

	function splitPath(intersections, collectOthers) {
		// Sort intersections by paths ids, curve index and parameter, so we
		// can loop through all intersections, divide paths and never need to
		// readjust indices.
		intersections.sort(function(loc1, loc2) {
			var path1 = loc1.getPath(),
				path2 = loc2.getPath();
			return path1 === path2
					// We can add parameter (0 <= t <= 1) to index (a integer)
					// to compare both at the same time
					? (loc1.getIndex() + loc1.getParameter())
						- (loc2.getIndex() + loc2.getParameter())
					: path1._id - path2._id;
		});
		var others = collectOthers && [];
		for (var i = intersections.length - 1; i >= 0; i--) {
			var loc = intersections[i],
				other = loc.getIntersection(),
				curve = loc.divide(),
				// When the curve doesn't need to be divided since t = 0, 1,
				// #divide() returns null and we can use the existing segment.
				segment = curve && curve.getSegment1() || loc.getSegment();
			if (others)
				others.push(other);
			other.__segment = segment;
			segment._ixPair = other;
		}
		return others;
	}

	/**
	 * To deal with a HTML canvas requirement where CompoundPaths' child contours
	 * has to be of different winding direction for correctly filling holes.
	 * But if some individual countours are disjoint, i.e. islands, we have to
	 * reorient them so that
	 *   the holes have opposit winding direction (already handled by paperjs)
	 *   islands has to have same winding direction (as the first child of the path)
	 *
	 * Does NOT handle selfIntersecting CompoundPaths.
	 *
	 * @param  {CompoundPath} path - Input CompoundPath, Note: This path could be modified if need be.
	 * @return {boolean}	  the winding direction of the base contour(true if clockwise)
	 */
	function reorientPath(path) {
		if (path instanceof CompoundPath) {
			var children = path._children,
				length = children.length,
				bounds = new Array(length),
				counters = new Array(length),
				clockwise = children[0].isClockwise();
			for (var i = 0; i < length; i++) {
				bounds[i] = children[i].getBounds();
				counters[i] = 0;
			}
			for (var i = 0; i < length; i++) {
				for (var j = 1; j < length; j++) {
					if (i !== j && bounds[i].contains(bounds[j]))
						counters[j]++;
				}
			}
			// Omit the first child
			for (var i = 1; i < length; i++) {
				if (counters[i] % 2 === 0) {
					children[i].setClockwise(clockwise);
				}
			}
		}
		return path;
	}

	function computeBoolean(path1, path2, operator, subtract, _cache) {
		// We do not modify the operands themselves
		// The result might not belong to the same type
		// i.e. subtraction(A:Path, B:Path):CompoundPath etc.
		var _path1 = reorientPath(path1.clone()),
			_path2 = reorientPath(path2.clone()),
			path1Clockwise = _path1.isClockwise(),
			path2Clockwise = _path2.isClockwise(),
			path1Id = _path1.id,
			path2Id = _path2.id,
			// Calculate all the intersections
			intersections = _cache && _cache.intersections
					|| _path1.getIntersections(_path2);
		// if we have a empty _cache object as an operand, skip calculating
		// boolean and cache the intersections
		if (_cache && !_cache.intersections) {
			// TODO: Don't we need to clear up and remove _path1 & _path2 again?
			return _cache.intersections = intersections;
		}
		// Now split intersections on both curves, by asking the first call to
		// collect the 'other' intersections for us and passing that on to the
		// second call.
		splitPath(splitPath(intersections, true));
		// Do operator specific calculations before we begin
		if (subtract) {
			_path2.reverse();
			path2Clockwise = !path2Clockwise;
		}

		var paths = []
				.concat(_path1._children || [_path1])
				.concat(_path2._children || [_path2]),
			nodes = [],
			result = new CompoundPath();
		// Step 1: Discard invalid links according to the boolean operator
		for (var i = 0, l = paths.length; i < l; i++) {
			var path = paths[i],
				parent = path._parent,
				id = parent instanceof CompoundPath ? parent._id : path._id,
				clockwise = path.isClockwise(),
				segments = path._segments,
				insidePath1 = false,
				insidePath2 = false;
			for (var j = segments.length - 1; j >= 0; j--) {
				var segment = segments[j],
					midPoint = segment.getCurve().getPoint(0.5);
				if (id !== path1Id) {
					insidePath1 = _path1.contains(midPoint)
							&& (clockwise === path1Clockwise || subtract
									|| !testOnCurve(_path1, midPoint));
				}
				if (id !== path2Id) {
					insidePath2 = _path2.contains(midPoint)
							&& (clockwise === path2Clockwise
									|| !testOnCurve(_path2, midPoint));
				}
				if (operator(id === path1Id, insidePath1, insidePath2)) {
					segment._INVALID = true;
					// markPoint(midPoint, '+');
				} else {
					nodes.push(segment);
				}
			}
		}
		// Step 2: Retrieve the resulting paths from the graph
		for (var i = 0, l = nodes.length; i < l; i++) {
			var node = nodes[i];
			if (node._visited)
				continue;
			var path = node.path,
				nuPath = new Path(),
				firstNode = node,
				intersectNode = null;
			if (node.getPrevious()._INVALID) {
				node.setHandleIn(node._ixPair
						? node._ixPair.getIntersection().__segment._handleIn
						: Point.create(0, 0));
			}
			while (node && !node._visited && node !== intersectNode) {
				node._visited = true;
				intersectNode = intersectNode || firstNode._ixPair
						&& firstNode._ixPair.getIntersection().__segment;
				// node._ixPair is this node's intersection CurveLocation object
				// node._ixPair.getIntersection() is the other CurveLocation object this node intersects with
				if (node._ixPair) {
					var nextNode = node._INVALID
							? node._ixPair.getIntersection().__segment
							: node;
					nuPath.add(new Segment(node._point, node._handleIn,
							nextNode._handleOut));
					nextNode._visited = true;
					node = nextNode;
				} else {
					nuPath.add(node);
				}
				node = node.getNext();
			}
			// Avoid stray segments and incomplete paths
			if (nuPath._segments.length > 2) {
				nuPath.setClosed(true);
				result.addChild(nuPath, true);
			} else {
				nuPath.remove();
			}
		}
		// Delete the proxies
		_path1.remove();
		_path2.remove();
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

	// A boolean operator is a binary operator function of the form
	// function(isPath1, isInPath1, isInPath2)
	//
	// Operators return true if a curve in the operands is to be removed,
	// and they aare called for each curve segment in the graph after all the
	// intersections between the operands are calculated and curves in the
	// operands were split at intersections.
	//
	//  The boolean operator return a Boolean value indicating whether to
	// keep the curve or not.
	//  return true - discard the curve
	//  return false - keep the curve

	return {
		unite: function(path, _cache) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return isInPath1 || isInPath2;
					}, false, _cache);
		},

		intersect: function(path, _cache) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return !(isInPath1 || isInPath2);
					}, false, _cache);
		},

		subtract: function(path, _cache) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return isPath1 && isInPath2 || !isPath1 && !isInPath1;
					}, true, _cache);
		},

		// Compound boolean operators combine the basic boolean operations such
		// as union, intersection, subtract etc. 
		// TODO: cache the split objects and find a way to properly clone them!
		// a.k.a. eXclusiveOR
		exclude: function(path) {
			return new Group([this.subtract(path), path.subtract(this)]);
		},

		// Divide path1 by path2
		divide: function(path) {
			return new Group([this.subtract(path), this.intersect(path)]);
		}
	};
});
