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

/**
 * @name PathItem
 *
 * @class The PathItem class is the base for any items that describe paths
 * and offer standardised methods for drawing and path manipulation, such as
 * {@link Path} and {@link CompoundPath}.
 *
 * @extends Item
 */
var PathItem = Item.extend(/** @lends PathItem# */{
	_class: 'PathItem',

	initialize: function PathItem() {
		// Do nothing.
	},

	/**
	 * Returns all intersections between two {@link PathItem} items as an array
	 * of {@link CurveLocation} objects. {@link CompoundPath} items are also
	 * supported.
	 *
	 * @param {PathItem} path the other item to find the intersections to.
	 * @return {CurveLocation[]} the locations of all intersection between the
	 * paths
	 * @example {@paperscript}
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * var secondPath = path.clone();
	 * var intersectionGroup = new Group();
	 *
	 * function onFrame(event) {
	 * 	secondPath.rotate(3);
	 *
	 * 	var intersections = path.getIntersections(secondPath);
	 * 	intersectionGroup.removeChildren();
	 *
	 * 	for (var i = 0; i < intersections.length; i++) {
	 * 		var intersectionPath = new Path.Circle({
	 * 			center: intersections[i].point,
	 * 			radius: 4,
	 * 			fillColor: 'red'
	 * 		});
	 * 		intersectionGroup.addChild(intersectionPath);
	 * 	}
	 * }
	 */
	getIntersections: function(path, expand) {
		// First check the bounds of the two paths. If they don't intersect,
		// we don't need to iterate through their curves.
		if (!this.getBounds().touches(path.getBounds()))
			return [];
		var locations = [],
			curves1 = this.getCurves(),
			curves2 = path.getCurves(),
			matrix1 = this._matrix.orNullIfIdentity(),
			matrix2 = path._matrix.orNullIfIdentity(),
			length1 = curves1.length,
			length2 = curves2.length,
			values2 = [];
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues(matrix2);
		for (var i = 0; i < length1; i++) {
			var curve1 = curves1[i],
				values1 = curve1.getValues(matrix1);
			for (var j = 0; j < length2; j++)
				Curve.getIntersections(values1, values2[j], curve1, curves2[j],
						locations);
		}
		
		return PathItem._conditionIntersections(locations, expand);
	},

	getSelfIntersections: function(expand){
		var locations = [],
			locs = [],
			curves = this.getCurves(),
			length = curves.length - 1,
			matrix = this._matrix.orNullIfIdentity(),
			values = [],
			curve1, values1, parts, i, j, k, ix, from, to, param, v1, v2,
			EPSILON =  /*#=*/ Numerical.EPSILON,
			EPSILON1s = 1-EPSILON;
		for (i = 0; i <= length; i++)
			values[i] = curves[i].getValues(matrix);
		for (i = 0; i <= length; i++) {
			curve1 = curves[i];
			values1 = values[i];
			// First check for self-intersections within the same curve
			from = curve1.getSegment1();
			to = curve1.getSegment2();
			v1 = from._handleOut;
			v2 = to._handleIn;
			// Check if extended handles of endpoints of this curve intersects
			// each other. We cannot have a self intersection within this curve
			// if they don't intersect due to convex-hull property.
			ix = new paper.Line(from._point.subtract(v1), v1.multiply(2), true)
					.intersect(new paper.Line(to._point.subtract(v2),
						v2.multiply(2), true), false);
			if (ix) {
				parts = paper.Curve.subdivide(values1);
				locs.length = 0;
				Curve.getIntersections(parts[0], parts[1], curve1, curve1, locs);
				for (j = locs.length - 1; j >= 0; j--) {
					ix = locs[j];
					if (ix._parameter <= EPSILON1s) {
						ix._parameter = ix._parameter * 0.5;
						ix._parameter2 = 0.5 + ix._parameter2 * 0.5;
						break;
					}
				}
				if (j >= 0)
					locations.push(ix);
			}
			// Check for intersections with other curves
			for (j = i + 1; j <= length; j++){
				// Avoid end point intersections on consecutive curves
				if (j === i + 1 || (j === length && i === 0)) {
					locs.length = 0;
					Curve.getIntersections(values1, values[j], curve1,
							curves[j], locs);
					for (k = locs.length - 1; k >= 0; k--) {
						param = locs[k].getParameter();
						if (param < EPSILON1s && param > EPSILON)
							locations.push(locs[k]);
					}
				} else {
					paper.Curve.getIntersections(values1, values[j], curve1,
							curves[j], locations);
				}
			}
		}
		return PathItem._conditionIntersections(locations, expand);
	},

	setPathData: function(data) {
		// This is a very compact SVG Path Data parser that works both for Path
		// and CompoundPath.

		// First split the path data into parts of command-coordinates pairs
		// Commands are any of these characters: mzlhvcsqta
		var parts = data.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/ig),
			coords,
			relative = false,
			control,
			current = new Point(); // the current position

		function getCoord(index, coord, isCurrent) {
			var val = parseFloat(coords[index]);
			if (relative)
				val += current[coord];
			if (isCurrent)
				current[coord] = val;
			return val;
		}

		function getPoint(index, isCurrent) {
			return new Point(
				getCoord(index, 'x', isCurrent),
				getCoord(index + 1, 'y', isCurrent)
			);
		}

		// First clear the previous content
		this.clear();

		for (var i = 0, l = parts.length; i < l; i++) {
			var part = parts[i],
				cmd = part[0],
				lower = cmd.toLowerCase();
			// Match all coordinate values
			coords = part.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g);
			var length = coords && coords.length;
			relative = cmd === lower;
			switch (lower) {
			case 'm':
			case 'l':
				for (var j = 0; j < length; j += 2)
					this[j === 0 && lower === 'm' ? 'moveTo' : 'lineTo'](
							getPoint(j, true));
				control = current;
				break;
			case 'h':
			case 'v':
				var coord = lower == 'h' ? 'x' : 'y';
				for (var j = 0; j < length; j++) {
					getCoord(j, coord, true);
					this.lineTo(current);
				}
				control = current;
				break;
			case 'c':
				for (var j = 0; j < length; j += 6) {
					this.cubicCurveTo(
							getPoint(j),
							control = getPoint(j + 2),
							getPoint(j + 4, true));
				}
				break;
			case 's':
				// Smooth cubicCurveTo
				for (var j = 0; j < length; j += 4) {
					this.cubicCurveTo(
							// Calculate reflection of previous control points
							current.multiply(2).subtract(control),
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 'q':
				for (var j = 0; j < length; j += 4) {
					this.quadraticCurveTo(
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 't':
				// Smooth quadraticCurveTo
				for (var j = 0; j < length; j += 2) {
					this.quadraticCurveTo(
							// Calculate reflection of previous control points
							control = current.multiply(2).subtract(control),
							getPoint(j, true));
				}
				break;
			case 'a':
				// TODO: Implement Arcs!
				break;
			case 'z':
				this.closePath();
				break;
			}
		}
	},

	_canComposite: function() {
		// A path with only a fill  or a stroke can be directly blended, but if
		// it has both, it needs to be drawn into a separate canvas first.
		return !(this.hasFill() && this.hasStroke());
	},

	/**
	 * Returns the winding contribution of the given point with respect to this
	 * PathItem.
	 *
	 * @param  {Object} point          Point to determine the winding direction 
	 *                                 about.
	 * @param  {Boolean} horizontal    Boolean value indicating if we need to
	 *                                 consider this point as part of a 
	 *                                 horizontal curve.
	 * @return {Number}                Winding number.
	 */
	_getWinding: function(point, horizontal) {
		var curves = this._getMonotoneCurves();
		return PathItem._getWindingNumber(point, curves, horizontal);
	},

	_contains: function(point) {
		// NOTE: point is reverse transformed by _matrix, so we don't need to 
		// apply here.
/*#*/ if (__options.nativeContains) {
		// To compare with native canvas approach:
		var ctx = CanvasProvider.getContext(1, 1);
		// Abuse clip = true to get a shape for ctx.isPointInPath().
		this._draw(ctx, new Base({ clip: true }));
		var res = ctx.isPointInPath(point.x, point.y, this.getWindingRule());
		CanvasProvider.release(ctx);
		return res;
/*#*/ } else { // !__options.nativeContains
		var winding = this._getWinding(point);
		return !!(this.getWindingRule() === 'evenodd' ? winding & 1 : winding);
/*#*/ } // !__options.nativeContains
	},

	statics: {
	/**
	 * Private method for splitting a PathItem at the given intersections.
	 * The routine works for both self intersections and intersections 
	 * between PathItems.
	 * @param  {Array} intersections Array of CurveLocation objects
	 */
	_splitPath: function(intersections) {
		var loc, i, j, node1, node2, t, segment,
			path1, isLinear, crv, crvNew,
			newSegments = [],
			tolerance = /*#=*/ Numerical.EPSILON;
		for (i = intersections.length - 1; i >= 0; i--) {
			node1 = intersections[i];
			path1 = node1.getPath();
			// Check if we are splitting same curve multiple times
			if (node2 && node2.getPath() === path1 &&
					node2._curve === node1._curve) {
				// Use the result of last split and interpolate the parameter.
				crv = crvNew;
				t = node1._parameter / node2._parameter;
			} else {
				crv = node1._curve;
				t = node1._parameter;
				isLinear = crv.isLinear();
				newSegments.length = 0;
			}
			// Split the curve at t, while ignoring linearity of curves
			if ((crvNew = crv.divide(t, true, true)) === null){
				if (t >= 1-tolerance) {
					segment = crv._segment2;
				} else if (t <= tolerance) {
					segment = crv._segment1;
				} else {
					// Determine the closest segment by comparing curve lengths
					segment = crv.getLength(0, t) < crv.getLength(t, 1)
							? crv._segment1 : crv._segment2;
				}
				crvNew = crv;
			} else {
				segment = crvNew.getSegment1();
				crvNew = crvNew.getPrevious();
			}
			// Link the new segment with the intersection on the other curve
			segment._intersection = node1.getIntersection();
			node1._segment = segment;
			node2 = node1;
			// Reset linear segments if they were part of a linear curve 
			// and if we are done with the entire curve.
			newSegments.push(segment);
			loc = intersections[i - 1];
			if (!(loc && loc.getPath() === path1 &&
					loc._curve === node1._curve) && isLinear)
				for (j = newSegments.length-1; j >= 0; j--) {
					segment = newSegments[j];
					// FIXME: Don't reset the appropriate handle if the intersections were on t==0 && t==1
					segment._handleOut.set(0, 0);
					segment._handleIn.set(0, 0);
				}
		}
	},

	/**
	 * Private static method that returns the winding contribution of the 
	 * given point with respect to a given set of monotone curves
	 * 
	 */
	_getWindingNumber: function(point, curves, horizontal) {
		function getTangent(v, t) {
			var tan, sign, i;
			sign = t === 0 ? 2 : (t === 1 ? -2 : 0);
			if (sign !== 0) {
				i = sign > 0 ? 0 : 6;
				if (Curve.isLinear(v)) {
					// Return slope from this point that follows the direction
					// of the line
					sign *= 3;
					tan = new Point(v[i+sign] - v[i], v[i+sign+1] - v[i+1]);
				} else {
					// Return the first or last handle
					tan = new Point(v[i+sign] - v[i], v[i+sign+1] - v[i+1]);
				}
			} else {
				tan = Curve.evaluate(v, t, 1);
			}
			return tan;
		}

		var i, j, li, t, x0, y0, wind, v, slope, stationary,
			tolerance = /*#=*/ Numerical.TOLERANCE,
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
				yBot = Infinity;
			// Find the closest yIntercepts in the same vertical line
			for (i = 0, li = curves.length-1; i <= li; i++) {
				v = curves[i];
				if (Curve.solveCubic(v, 0, x, roots, 0, 1) > 0) {
					for (j = roots.length - 1; j >= 0; j--) {
						t = roots[j];
						y0 = Curve.evaluate(v, t, 0).y;
						if (y0 > y+tolerance && y0 < yBot) {
							yBot = y0;
						} else if (y0 < y-tolerance && y0 > yTop) {
							yTop = y0;
						}
					}
				}
			}
			// Shift the point lying on the horizontal curves by
			// half of closest top and bottom intercepts.
			yTop = (yTop + y) / 2;
			yBot = (yBot + y) / 2;
			windLeft = yTop > -Infinity
					? PathItem._getWindingNumber(new Point(x, yTop), curves)
					: 0;
			windRight = yBot < Infinity
					? PathItem._getWindingNumber(new Point(x, yBot), curves)
					: 0;
			return Math.max(windLeft, windRight);
		}
		// Find the winding number for right hand side of the curve,
		// inclusive of the curve itself, while tracing along its ±x direction.
		for (i = 0, li = curves.length-1; i <= li; i++) {
			v = curves[i];
			if (Curve.solveCubic(v, 1, y, roots, -tolerance, 1 + -tolerance) === 1) {
				t = roots[0];
				if ( t >= -tolerance && t <= tolerance)
					t = 0;
				x0 = Curve.evaluate(v, t, 0).x;
				slope = getTangent(v, t).y;
				stationary = !Curve.isLinear(v) && abs(slope) < tolerance;
				// Take care of cases where the curve and the preceeding
				// curve merely touches the ray towards ±x direction, but
				// proceeds to the same side of the ray. This essentially is
				// not a crossing.
				if (t === 0){
					// The previous curve's reference is stored at index:9,
					// see Path#_getMonotoneCurves for details.
					var v2 = v[9];
					if (abs(v2[6] - v[0]) < tolerance && abs(v2[7] - v[1]) < tolerance){
						var slope2 = getTangent(v2, 1).y;
						if(slope * slope2 > 0)
							stationary = true;
					}
				}
				wind = v[8];
				if (x0 <= xBefore && !stationary)
					windLeft += wind;
				if (x0 >= xAfter && !stationary)
					windRight += wind;
			}
		}
		return Math.max(abs(windLeft), abs(windRight));
	},

	/**
	 * Private method to trace closed contours from a set of segments according 
	 * to a set of constraints —winding contribution and a custom operator.
	 * 
	 * @param  {Array} segments Array of 'seed' segments for tracing closed
	 *                          contours.
	 * @param  {Function} operator A function. It must take one argument, which
	 *                             is the winding number contribution of a 
	 *                             curve, and should return a boolean value 
	 *                             indicating whether the curve should be 
	 *                             included in the final contour or not.
	 * @return {Array}          Array of contours traced.
	 */
	_tracePaths: function(segments, operator) {
		// Utility function. Correctly returns entry and exit tangents of an
		// intersection, even when the curve[s] are linear.
		function getEntryExitTangents(seg) {
			var c2 = seg.getCurve(),
				c1 = c2.getPrevious(), t = 1e-3;
			// Avoid zero length curves
			c1 = c1.getLength() === 0 ? c1.getPrevious() : c1;
			c2 = c2.getLength() === 0 ? c2.getNext() : c2;
			var v1 = c1.getValues(),
				v2 = c2.getValues(),
				pnt = seg.getPoint(),
				ret = [seg.getHandleIn(), seg.getHandleOut()];
			if (ret[0].getLength() === 0) {
				ret[0] = new Point(pnt.x - v1[2], pnt.y - v1[3]).normalize();
			} else {
				ret[0] = Curve.evaluate(v1, 1-t, 1).normalize(-1);
			}
			if (ret[1].getLength() === 0) {
				ret[1] = new Point(pnt.x - v2[4], pnt.y - v2[5]).normalize();
			} else {
				ret[1] = Curve.evaluate(v2, t, 1).normalize();
			}
			return ret;
		}
		// Choose a default operator which will return all contours
		if (!operator)
			operator = function(){ return true; };
		var seg, startSeg, startSegIx, i, j, len, path, ixOther, firstHandleIn,
			c1, c3, c4, t1, tan, crv, ixOtherSeg, nextSeg, nextHandleIn,
			nextHandleOut, direction, entryExitTangents,
			// Tangents of all curves at an intersection, except the entry curve
			crvTan = [{}, {}],
			// Compare curve tangents to sort them counter clockwise.
			crvTanCompare = function(a, b){ return a.w - b.w; },
			paths = [];
		for (i = 0, len = segments.length; i < len; i++) {
			startSeg = seg = segments[i];
			if (seg._visited || !operator(seg._winding))
				continue;
			// Initialise a new path chain with the seed segment.
			path = new paper.Path();
			ixOther = seg._intersection;
			startSegIx = ixOther ? ixOther._segment : null;
			firstHandleIn = null;
			direction = 1;
				// DEBUG:--------------------------------------------------------
				// hilightCrvN("all");
				// hilightCrvN("next", seg.getCurve());
				// DEBUG:--------------------------------------------------------
			do {
				nextHandleIn = direction > 0 ? seg._handleIn : seg._handleOut;
				nextHandleOut = direction > 0 ? seg._handleOut : seg._handleIn;
				ixOther = seg._intersection;
				// If the intersection segment is valid, try switching to
				// it, with an appropriate direction to continue traversal.
				// else, stay on the same contour.
				if (ixOther && (ixOtherSeg = ixOther._segment) &&
						ixOtherSeg !== startSeg && firstHandleIn) {
					entryExitTangents = getEntryExitTangents(seg);
					c1 = seg.getCurve();
					if (direction < 1) {
						entryExitTangents.reverse();
					} else {
						c1 = c1.getPrevious();
					}
					t1 = entryExitTangents[0];
					entryExitTangents = getEntryExitTangents(ixOtherSeg);
					c4 = crvTan[1].c = ixOtherSeg.getCurve();
					c3 = crvTan[0].c = c4.getPrevious();
					// Avoid zero length curves
					c3 = crvTan[0].c = c3.getLength() === 0 ? c3.getPrevious() : c3;
					c4 = crvTan[1].c = c4.getLength() === 0 ? c4.getNext() : c4;
					crvTan[0].t = entryExitTangents[0];
					crvTan[1].t = entryExitTangents[1];
							// DEBUG:--------------------------------------------------------
							// annotateTan(seg.point, t1.normalize(20), "t1", true);
							// annotateTan(seg.point, crvTan[0].t.normalize(20), "t2");
							// annotateTan(seg.point, crvTan[1].t.normalize(20), "t3");
							// DEBUG:--------------------------------------------------------
					// cross product of the entry and exit tangent vectors at
					// the intersection, will let us select the correct countour
					// to traverse next.
					for (j = 0; j < 2; j++) {
						tan = crvTan[j].t;
						crvTan[j].w = t1.x * tan.y - tan.x * t1.y;
					}
					// Do not attempt to switch contours if we aren't absolutely
					// sure that there is a possible candidate.
					if (crvTan[0].w * crvTan[1].w !== 0) {
						crvTan.sort(crvTanCompare);
						j = 0;
						do {
							crv = crvTan[j++].c;
							nextSeg = crv.getSegment1();
							direction = crv === c3 ? -1 : 1;
									// DEBUG:--------------------------------------------------------
									// hilightCrvN("nextSeg", nextSeg, "#f00");
									// hilightCrvN("nextCrv", crv, "#f00");
									// DEBUG:--------------------------------------------------------
						} while (j < 2 && !operator(nextSeg._winding));
					} else {
						nextSeg = null;
					}
					// If we didn't manage to find a suitable direction for next
					// contour to traverse, stay on the same contour.
					if (!nextSeg || nextSeg && ((nextSeg._visited &&
								seg.getPath() !== nextSeg.getPath()) ||
							!operator(nextSeg._winding))) {
						direction = 1;
					} else {
						// Switch to the intersection segment.
						seg._visited = ixOtherSeg._visited;
						seg = ixOtherSeg;
						if (nextSeg._visited) 
							direction = 1;
					}
						// DEBUG:--------------------------------------------------------
						// hilightCrvN("nextCrv");
						// hilightCrvN("nextSeg", nextSeg, "#0f0");
						// DEBUG:--------------------------------------------------------
					nextHandleOut = direction > 0 ? seg._handleOut : seg._handleIn;
				}
					// DEBUG:--------------------------------------------------------
					// hilightCrvN("next", seg.getCurve());
					// DEBUG:--------------------------------------------------------
				// Add the current segment to the path, and mark
				// the added segment as visited.
				if (!firstHandleIn) {
					firstHandleIn = nextHandleIn;
					nextHandleIn = null;
				}
				path.add(new paper.Segment(seg._point, nextHandleIn,
						nextHandleOut));
				seg._visited = true;
				// Move to the next segment according to the traversal direction
				seg = direction > 0 ? seg.getNext() : seg. getPrevious();

					// DEBUG:--------------------------------------------------------
					// seg && hilightCrvN("next", direction ? seg.getCurve() : seg.getCurve().getPrevious(), "#a0a");
					// DEBUG:--------------------------------------------------------
					
			} while(seg && seg !== startSeg && seg !== startSegIx &&
					!seg._visited && (seg._intersection || operator(seg._winding)));
			// Finish with closing the paths if necessary,
			// correctly linking up curves etc.
			if (seg && (seg == startSeg || seg == startSegIx)){
				path.firstSegment.setHandleIn((seg == startSegIx)?
						startSegIx._handleIn : seg._handleIn);
				path.setClosed(true);
			} else {
				path.lastSegment._handleOut.set(0, 0);
			}
			// Add the path to the result
			// Try to avoid stray segments and incomplete paths.
			if ((path.closed && path.segments.length) || path.segments.length > 2 ||
					(path.closed && path.segments.length === 2 &&
					(!path.getCurves()[0].isLinear() ||
					!path.getCurves()[1].isLinear()))) {
				paths.push(path);
			} else {
				path.remove();
			}
		}
			// DEBUG:--------------------------------------------------------
			// hilightCrvN("all");
			// DEBUG:--------------------------------------------------------
		return paths;
	},

	_tracePathsOld: function(segments, operator) {
		var seg, nextSeg, startSeg, startSegIx, i, len, ixOther, prev,
			ixOtherSeg, c1, c2, c3,
			wind, w1, w3, s1, s3, path, nextHandleIn,
			paths = [];
		for (i = 0, len = segments.length; i < len; i++) {
			startSeg = seg = segments[i];
			if (seg._visited || !operator(seg._winding))
				continue;
			// Initialise a new path chain with the seed segment.
			path = new paper.Path();
			wind = seg._winding;
			ixOther = seg._intersection;
			startSegIx = ixOther ? ixOther._segment : null;
			// Set the correct handles for this segment
			prev = seg.getPrevious();
			if (ixOther && prev && prev._visited)
				seg._handleIn = new paper.Point(0, 0);
			do {
				nextHandleIn = nextHandleIn || seg._handleIn;
				path.add(new paper.Segment(seg._point, nextHandleIn,
						seg._handleOut));
				nextHandleIn = null;
				seg._visited = true;
				seg = (seg._nextPathSegment ? seg._nextPathSegment :
						seg).getNext();
				// This segments's _intersection property holds a reference to
				// the intersection on the other curve.
				ixOther = seg ? seg._intersection : null;
				if (ixOther && (ixOtherSeg = ixOther._segment) &&
						ixOtherSeg !== startSeg) {
					c1 = seg.getCurve();
					c2 = c1.getPrevious();
					c3 = ixOtherSeg.getCurve();
					// c2 is the entry point in the direction we are 
					// traversing the graph; sort c1 and c3 curves based on c2.
					w1 = c1._segment1._winding;
					w3 = c3._segment1._winding;
					nextSeg = null;
					s1 = c1.getSegment1();
					s3 = c3.getSegment1();
					if (wind === w1 && !s1._visited) {
						nextSeg = s1;
					} else if (wind === w3 && !s3._visited) {
						nextSeg = s3;
					}
					if (nextSeg)
						nextHandleIn = seg._handleIn;
					seg = nextSeg || seg;
					seg._winding = wind;
				}
			} while(seg && seg !== startSeg && seg !== startSegIx &&
					!seg._visited && operator(seg._winding));
			// Finish with closing the paths if necessary, correctly
			// linking up curves etc.
			if (seg && (seg == startSeg || seg == startSegIx)){
				if (path.segments.length === 1) {
					// This is still a valid path, in case of self-Intersections
					path.add(new paper.Segment(seg._point, seg._handleIn, null));
				} else {
					path.firstSegment.setHandleIn((seg == startSegIx)?
							startSegIx._handleIn : startSeg._handleIn);
				}
			}
			path.setClosed(true);
			// Add the path to the result
			// Try to avoid stray segments and incomplete paths.
			if (path.segments.length > 2 || (path.segments.length === 2 &&
					(!path.getCurves()[0].isLinear() ||
					!path.getCurves()[1].isLinear()))) {
				paths.push(path);
			} else {
				path.remove();
			}
		}
		return paths;
	},

	_conditionIntersections: function(locations, expand) {
		function compare(loc1, loc2) {
			var path1 = loc1.getPath(),
				path2 = loc2.getPath();
			return path1 === path2
					// We can add parameter (0 <= t <= 1) to index 
					// (a integer) to compare both at the same time
					? (loc1.getIndex() + loc1.getParameter())
							- (loc2.getIndex() + loc2.getParameter())
					// Sort by path id to group all locations on the same path.
					: path1._id - path2._id;
		}
		// Remove duplicate intersections near curve endings
		var loc, locNext,
			tolerance = Numerical.EPSILON,
			tolerance1 = 1 - tolerance,
			abs = Math.abs;
		// Merge intersections very close to the end of a curve to the
		// begining of the next curve
		for (var i = locations.length-1; i >= 0; i--) {
			loc = locations[i];
			locNext = loc._curve.getNext();
			if (loc._parameter >= tolerance1 && locNext) {
				loc._parameter = 0;
				loc._curve = locNext;
			}
			locNext = loc._curve2.getNext();
			if (loc._parameter2 >= tolerance1 && locNext) {
				loc._parameter2 = 0;
				loc._curve2 = locNext;
			}
		}
		if (locations.length > 1) {
			locations.sort(compare);
			for (var length1 = locations.length - 1, i = length1; i >= 0; i--) {
				loc = locations[i];
				locNext = (i === 0)? locations[length1] : locations[i-1];
				if (abs(loc._parameter - locNext._parameter) < tolerance &&
						loc._curve === locNext._curve &&
						abs(loc._parameter2 - locNext._parameter2) < tolerance &&
						loc._curve2 === locNext._curve2) {
					locations.splice(i, 1);
					--length1;
				}
			}
		}
		if (expand) {
			for (var i = locations.length-1; i >= 0; i--) {
				loc = locations[i];
				locations.push(loc.getIntersection());
			}
			locations.sort(compare);
		}
		return locations;
	},
	}

	/**
	 * Smooth bezier curves without changing the amount of segments or their
	 * points, by only smoothing and adjusting their handle points, for both
	 * open ended and closed paths.
	 *
	 * @name PathItem#smooth
	 * @function
	 *
	 * @example {@paperscript}
	 * // Smoothing a closed shape:
	 *
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * // Select the path, so we can see its handles:
	 * path.fullySelected = true;
	 *
	 * // Create a copy of the path and move it 100pt to the right:
	 * var copy = path.clone();
	 * copy.position.x += 100;
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 *
	 * @example {@paperscript height=220}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 50));
	 *
	 * var y = 5;
	 * var x = 3;
	 *
	 * for (var i = 0; i < 28; i++) {
	 *     y *= -1.1;
	 *     x *= 1.1;
	 *     path.lineBy(x, y);
	 * }
	 *
	 * // Create a copy of the path and move it 100pt down:
	 * var copy = path.clone();
	 * copy.position.y += 120;
	 *
	 * // Set its stroke color to red:
	 * copy.strokeColor = 'red';
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 */

	/**
	 * {@grouptitle Postscript Style Drawing Commands}
	 *
	 * On a normal empty {@link Path}, the point is simply added as the path's
	 * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
	 * created as a child and the point is added as its first segment.
	 *
	 * @name PathItem#moveTo
	 * @function
	 * @param {Point} point
	 */

	// DOCS: Document #lineTo()
	/**
	 * @name PathItem#lineTo
	 * @function
	 * @param {Point} point
	 */

	/**
	 * Adds a cubic bezier curve to the path, defined by two handles and a to
	 * point.
	 *
	 * @name PathItem#cubicCurveTo
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	/**
	 * Adds a quadratic bezier curve to the path, defined by a handle and a to
	 * point.
	 *
	 * @name PathItem#quadraticCurveTo
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: Document PathItem#curveTo() 'paramater' param.
	/**
	 * Draws a curve from the position of the last segment point in the path
	 * that goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one segment to the path.
	 *
	 * @name PathItem#curveTo
	 * @function
	 * @param {Point} through the point through which the curve should go
	 * @param {Point} to the point where the curve should end
	 * @param {Number} [parameter=0.5]
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Move your mouse around the view below:
	 *
	 * var myPath;
	 * function onMouseMove(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 		myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw a curve through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.curveTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
	 */

	/**
	 * Draws an arc from the position of the last segment point in the path that
	 * goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} through the point where the arc should pass through
	 * @param {Point} to the point where the arc should end
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * var firstPoint = new Point(30, 75);
	 * path.add(firstPoint);
	 *
	 * // The point through which we will create the arc:
	 * var throughPoint = new Point(40, 40);
	 *
	 * // The point at which the arc will end:
	 * var toPoint = new Point(130, 75);
	 *
	 * // Draw an arc through 'throughPoint' to 'toPoint'
	 * path.arcTo(throughPoint, toPoint);
	 *
	 * // Add a red circle shaped path at the position of 'throughPoint':
	 * var circle = new Path.Circle(throughPoint, 3);
	 * circle.fillColor = 'red';
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 *
	 * var myPath;
	 * function onMouseDrag(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 	    myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw an arc through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.arcTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
	 *
	 * // When the mouse is released, deselect the path
	 * // and fill it with black.
	 * function onMouseUp(event) {
	 * 	myPath.selected = false;
	 * 	myPath.fillColor = 'black';
	 * }
	 */
	/**
	 * Draws an arc from the position of the last segment point in the path to
	 * the specified point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} to the point where the arc should end
	 * @param {Boolean} [clockwise=true] specifies whether the arc should be
	 *        drawn in clockwise direction.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 75));
	 * path.arcTo(new Point(130, 75));
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 * path2.add(new Point(180, 25));
	 *
	 * // To draw an arc in anticlockwise direction,
	 * // we pass 'false' as the second argument to arcTo:
	 * path2.arcTo(new Point(280, 25), false);
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 * var myPath;
	 *
	 * // The mouse has to move at least 20 points before
	 * // the next mouse drag event is fired:
	 * tool.minDistance = 20;
	 *
	 * // When the user clicks, create a new path and add
	 * // the current mouse position to it as its first segment:
	 * function onMouseDown(event) {
	 * 	myPath = new Path();
	 * 	myPath.strokeColor = 'black';
	 * 	myPath.add(event.point);
	 * }
	 *
	 * // On each mouse drag event, draw an arc to the current
	 * // position of the mouse:
	 * function onMouseDrag(event) {
	 * 	myPath.arcTo(event.point);
	 * }
	 */

	/**
	 * Closes the path. When closed, Paper.js connects the first and last
	 * segments.
	 *
	 * @name PathItem#closePath
	 * @function
	 * @see Path#closed
	 */

	/**
	 * {@grouptitle Relative Drawing Commands}
	 *
	 * If called on a {@link CompoundPath}, a new {@link Path} is created as a
	 * child and a point is added as its first segment relative to the
	 * position of the last segment of the current path.
	 *
	 * @name PathItem#moveBy
	 * @function
	 * @param {Point} to
	 */

	/**
	 * Adds a segment relative to the last segment point of the path.
	 *
	 * @name PathItem#lineBy
	 * @function
	 * @param {Point} to the vector which is added to the position of the last
	 * segment of the path, to get to the position of the new segment.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 50, y: 50}
	 * path.add(25, 25);
	 *
	 * // Add a segment relative to the last segment of the path.
	 * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
	 * path.lineBy(50, 0);
	 *
	 * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
	 * path.lineBy(0, 50);
	 *
	 * @example {@paperscript height=300}
	 * // Drawing a spiral using lineBy:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add the first segment at {x: 50, y: 50}
	 * path.add(view.center);
	 *
	 * // Loop 500 times:
	 * for (var i = 0; i < 500; i++) {
	 * 	// Create a vector with an ever increasing length
	 * 	// and an angle in increments of 45 degrees
	 * 	var vector = new Point({
	 * 	    angle: i * 45,
	 * 	    length: i / 2
	 * 	});
	 * 	// Add the vector relatively to the last segment point:
	 * 	path.lineBy(vector);
	 * }
	 *
	 * // Smooth the handles of the path:
	 * path.smooth();
	 *
	 * // Uncomment the following line and click on 'run' to see
	 * // the construction of the path:
	 * // path.selected = true;
	 */

	// DOCS: Document Path#curveBy()
	/**
	 * @name PathItem#curveBy
	 * @function
	 * @param {Point} through
	 * @param {Point} to
	 * @param {Number} [parameter=0.5]
	 */

	// DOCS: Document Path#cubicCurveBy()
	/**
	 * @name PathItem#cubicCurveBy
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	// DOCS: Document Path#quadraticCurveBy()
	/**
	 * @name PathItem#quadraticCurveBy
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: Document Path#arcBy(through, to)
	/**
	 * @name PathItem#arcBy
	 * @function
	 * @param {Point} through
	 * @param {Point} to
	 */

	// DOCS: Document Path#arcBy(to, clockwise)
	/**
	 * @name PathItem#arcBy
	 * @function
	 * @param {Point} to
	 * @param {Boolean} [clockwise=true]
	 */
});
