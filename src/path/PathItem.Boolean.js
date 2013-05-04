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

PathItem.inject({

	// A boolean operator is a binary operator function of the form
	// function(isPath1, isInPath1, isInPath2)
	//
	// Operators return true if a curve in the operands is to be removed,
	// and they aare called for each curve segment in the graph after all the
	// intersections between the operands are calculated and curves in the
	// operands were split at intersections.
	//
	// These functions should have a name ("union", "subtraction" etc. below),
	// if we need to do operator specific operations on paths inside the
	// computeBoolean function.
	// For example: If the name of the operator is "subtraction" then we need to
	// reverse the second operand. Subtraction is neither associative nor
	// commutative.
	//
	//  The boolean operator return a Boolean value indicating whether to
	// keep the curve or not.
	//  return true - discard the curve
	//  return false - keep the curve
	unite: function(path, _cache) {
		return this._computeBoolean(this, path,
				function union(isPath1, isInPath1, isInPath2) {
					return isInPath1 || isInPath2;
				}, _cache);
	},

	intersect: function(path, _cache) {
		return this._computeBoolean(this, path,
				function intersection(isPath1, isInPath1, isInPath2) {
					return !(isInPath1 || isInPath2);
				}, _cache);
	},

	subtract: function(path, _cache) {
		return this._computeBoolean(this, path,
				function subtraction(isPath1, isInPath1, isInPath2) {
					return isPath1 && isInPath2 || !isPath1 && !isInPath1;
				}, _cache);
	},

	// Compound boolean operators combine the basic boolean operations such as
	// union, intersection, subtract etc. 
	// TODO: cache the split objects and find a way to properly clone them!
	// a.k.a. eXclusiveOR
	exclude: function(path) {
		return new Group([this.subtract(path), path.subtract(this)]);
	},

	// Divide path1 by path2
	divide: function(path) {
		return new Group([this.subtract(path), this.intersect(path)]);
	},

	_splitPath: function(_ixs, other) {
		// Sort function for sorting intersections in the descending order
		function sortIx(a, b) {
			return b.parameter - a.parameter;
		}
		var pathIds = {},
			paths = [];
		for (var i = 0, l = _ixs.length; i < l; i++) {
			var ix = other ? _ixs[i].getIntersection() : _ixs[i],
				path = ix.getPath(),
				curve = ix.getCurve();
			// Add each path only once to the array
			if (!pathIds[path._id]) {
				paths.push(path);
				pathIds[path._id] = true;
			}
			if (!curve._ixParams)
				curve._ixParams = [];
			curve._ixParams.push({
				parameter: ix.getParameter(),
				pair: ix.getIntersection()
			});
		}
		for (var i = 0, l = paths.length; i < l; i++) {
			var path = paths[i],
				segments = path._segments;
			for (var j = segments.length - 1; j >= 0; j--) {
				var nextNode = segments[j],
					curve = nextNode.getCurve(),
					ixs = curve._ixParams,
					amount = ixs && ixs.length;
				if (amount > 0) {
					ixs.sort(sortIx);
					var isLinear = curve.isLinear(),
						vals = null,
						segment;
					for (var k = 0; k < amount; k++) {
						var ix = ixs[k],
							t = ix.parameter;
						if (!vals)
							vals = curve.getValues();
						if (t === 0 || t === 1) {
							// Intersection is on an existing node: No need to
							// create a new segment, we just link the
							// corresponding intersections together
							segment = t === 0 ? curve.segment1 : curve.segment2;
						} else {
							var parts = Curve.subdivide(vals, t),
								left = parts[0],
								right = parts[1],
								segment = new Segment(
										new Point(right[0], right[1]));
							if (!isLinear) {
								curve.segment1.handleOut = new Point(
										left[2] - left[0],
										left[3] - left[1]);
								curve.segment2.handleIn = new Point(
										right[4] - right[6],
										right[5] - right[7]);
								segment.handleIn = new Point(
										left[4] - left[6], 
										left[5] - left[7]);
								segment.handleOut = new Point(
										right[2] - left[6],
										right[3] - left[7]);
							}
							path.insert(j + 1,  segment);
							curve = nextNode.getCurve();
							vals = left;
						}
						segment._ixPair = ix.pair;
						segment._ixPair._segment = segment;
						// Readjust parameters after splitting
						for (var n = k + 1; n < amount; n++)
							ixs[n].parameter /= t;
					}
				}
			}
		}
	},

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
	_reorientCompoundPath: function(path) {
		if (!(path instanceof CompoundPath)) {
			path.closed = true;
			return path.clockwise;
		}
		var children = path.children, len = children.length, baseWinding;
		var bounds = new Array(len);
		var tmparray = new Array(len);
		baseWinding = children[0].clockwise;
		// Omit the first path
		for (i = 0; i < len; i++) {
			children[i].closed = true;
			bounds[i] = children[i].bounds;
			tmparray[i] = 0;
		}
		for (i = 0; i < len; i++) {
			var p1 = children[i];
			for (j = 0; j < len; j++) {
				var p2 = children[j];
				if (i !== j && bounds[i].contains(bounds[j])) {
					tmparray[j]++;
				}
			}
		}
		for (i = 1; i < len; i++) {
			if (tmparray[i] % 2 === 0) {
				children[i].clockwise = baseWinding;
			}
		}
		return baseWinding;
	},

	_reversePath: function(path) {
		var baseWinding;
		if (path instanceof CompoundPath) {
			var children = path.children, i, len;
			for (i = 0, len = children.length; i < len; i++) {
				children[i].reverse();
				children[i]._curves = null;
			}
			baseWinding = children[0].clockwise;
		} else {
			path.reverse();
			baseWinding = path.clockwise;
			path._curves = null;
		}
		return baseWinding;
	},

	_computeBoolean: function(path1, path2, operator, _splitCache) {
		var _path1, _path2, path1Clockwise, path2Clockwise;
		var ixs, path1Id, path2Id;
		// We do not modify the operands themselves
		// The result might not belong to the same type
		// i.e. subtraction(A:Path, B:Path):CompoundPath etc.
		_path1 = path1.clone();
		_path2 = path2.clone();
		_path1.style = _path2.style = null;
		_path1.selected = _path2.selected = false;
		path1Clockwise = this._reorientCompoundPath(_path1);
		path2Clockwise = this._reorientCompoundPath(_path2);
		path1Id = _path1.id;
		path2Id = _path2.id;
		// Calculate all the intersections
		ixs = (_splitCache && _splitCache.intersections)?
		_splitCache.intersections : _path1.getIntersections(_path2);
		// if we have a empty _splitCache object as an operand,
		// skip calculating boolean and cache the intersections
		if (_splitCache && !_splitCache.intersections) {
			_splitCache.intersections = ixs;
			return;
		}
		this._splitPath(ixs, false);
		this._splitPath(ixs, true);
		path1Id = _path1.id;
		path2Id = _path2.id;
		// Do operator specific calculations before we begin
		if (operator.name === "subtraction") {
			path2Clockwise = this._reversePath(_path2);
		}

		var i, j, len, path, crv;
		var paths = [];
		if (_path1 instanceof CompoundPath) {
			paths = paths.concat(_path1.children);
		} else {
			paths = [ _path1 ];
		}
		if (_path2 instanceof CompoundPath) {
			paths = paths.concat(_path2.children);
		} else {
			paths.push(_path2);
		}
		// step 1: discard invalid links according to the boolean operator
		var lastNode, firstNode, nextNode, midPoint, insidePath1, insidePath2;
		var thisId, thisWinding, contains, subtractionOp = (operator.name === 'subtraction');
		for (i = 0, len = paths.length; i < len; i++) {
			insidePath1 = insidePath2 = false;
			path = paths[i];
			thisId = (path.parent instanceof CompoundPath)? path.parent.id : path.id;
			thisWinding = path.clockwise;
			lastNode = path.lastSegment;
			firstNode = path.firstSegment;
			nextNode = null;
			while (nextNode !== firstNode) {
				nextNode = (nextNode)? nextNode.previous: lastNode;
				crv = nextNode.curve;
				midPoint = crv.getPoint(0.5);
				if (thisId !== path1Id) {
					contains = _path1.
					contains(midPoint);
					insidePath1 = (thisWinding === path1Clockwise || subtractionOp)? contains :
					contains && !this._testOnCurve(_path1, midPoint);
				}
				if (thisId !== path2Id) {
					contains = _path2.contains(midPoint);
					insidePath2 = (thisWinding === path2Clockwise)? contains :
					contains && !this._testOnCurve(_path2, midPoint);
				}
				if (operator(thisId === path1Id, insidePath1, insidePath2)) {
					crv._INVALID = true;
					// markPoint(midPoint, '+');
				}
			}
		}

		// Final step: Retrieve the resulting paths from the graph
		var boolResult = new CompoundPath();
		var node, nuNode, nuPath, nodeList = [], handle;
		for (i = 0, len = paths.length; i < len; i++) {
			nodeList = nodeList.concat(paths[i].segments);
		}
		for (i = 0, len = nodeList.length; i < len; i++) {
			node = nodeList[i];
			if (node.curve._INVALID || node._visited) { continue; }
			path = node.path;
			thisId = (path.parent instanceof CompoundPath)? path.parent.id : path.id;
			thisWinding = path.clockwise;
			nuPath = new Path();
			firstNode = null;
			firstNode_ix = null;
			if (node.previous.curve._INVALID) {
				node.handleIn = (node._ixPair)?
				node._ixPair.getIntersection()._segment.handleIn : [ 0, 0 ];
			}
			while (node && !node._visited && (node !== firstNode && node !== firstNode_ix)) {
				node._visited = true;
				firstNode = (firstNode)? firstNode: node;
				firstNode_ix = (!firstNode_ix && firstNode._ixPair)?
				firstNode._ixPair.getIntersection()._segment: firstNode_ix;
				// node._ixPair is this node's intersection CurveLocation object
				// node._ixPair.getIntersection() is the other CurveLocation object this node intersects with
				nextNode = (node._ixPair && node.curve._INVALID)? node._ixPair.getIntersection()._segment : node;
				if (node._ixPair) {
					nextNode._visited = true;
					nuNode = new Segment(node.point, node.handleIn, nextNode.handleOut);
					nuPath.add(nuNode);
					node = nextNode;
					path = node.path;
					thisWinding = path.clockwise;
				} else {
					nuPath.add(node);
				}
				node = node.next;
			}
			if (nuPath.segments.length > 1) {
				// avoid stray segments and incomplete paths
				if (nuPath.segments.length > 2 || !nuPath.curves[0].isLinear()) {
					nuPath.closed = true;
					boolResult.addChild(nuPath, true);
				}
			}
		}
		// Delete the proxies
		_path1.remove();
		_path2.remove();
		// And then, we are done.
		return boolResult.reduce();
	},

	_testOnCurve: function(path, point) {
		var res = 0;
		var crv = path.getCurves();
		var i = 0;
		var bounds = path.bounds;
		if (bounds && bounds.contains(point)) {
			for(i = 0; i < crv.length && !res; i++) {
				var crvi = crv[i];
				if (crvi.bounds.contains(point) && crvi.getParameterOf(point)) {
					res = 1;
				}
			}
		}
		return res;
	}
});
