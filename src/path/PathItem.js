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
	 * @name PathItem#getIntersections(path, sorted)
	 * @function
	 *
	 * @param {PathItem} path the other item to find the intersections with
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
	getIntersections: function(path, _expand) {
		// First check the bounds of the two paths. If they don't intersect,
		// we don't need to iterate through their curves.
		var selfOp = this === path;
		if (!selfOp && !this.getBounds().touches(path.getBounds()))
			return [];
		var locations = [],
			curves1 = this.getCurves(),
			curves2 = selfOp ? curves1 : path.getCurves(),
			matrix1 = this._matrix.orNullIfIdentity(),
			matrix2 = selfOp ? matrix1 : path._matrix.orNullIfIdentity(),
			length1 = curves1.length,
			length2 = selfOp ? length1 : curves2.length,
			values2 = [],
			ZERO = /*#=*/ Numerical.EPSILON,
			ONE = 1 - /*#=*/ Numerical.EPSILON;
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues(matrix2);
		for (var i = 0; i < length1; i++) {
			var curve1 = curves1[i],
				values1 = selfOp ? values2[i] : curve1.getValues(matrix1);
			if (selfOp) {
				// First check for self-intersections within the same curve
				var seg1 = curve1.getSegment1(),
					seg2 = curve1.getSegment2(),
					h1 = seg1._handleOut,
					h2 = seg2._handleIn;
				// Check if extended handles of endpoints of this curve
				// intersects each other. We cannot have a self intersection
				// within this curve if they don't intersect due to convex-hull
				// property.
				if (new Line(seg1._point.subtract(h1), h1, true).intersect(
						new Line(seg2._point.subtract(h2), h2, true), false)) {
					var parts = Curve.subdivide(values1),
						before = locations.length;
					Curve.getIntersections(parts[0], parts[1], curve1, curve1,
							locations, 0, ONE); // tMax
					// Check if a location was added by comparing length before.
					if (locations.length > before) {
						var loc = locations[before];
						// Since the curve has split itself, we need to adjust
						// the parameters for both locations.
						loc._parameter /= 2;
						loc._parameter2 = 0.5 + loc._parameter2 / 2;
					}
				}
			}
			// Check for intersections with other curves
			for (var j = selfOp ? i + 1 : 0; j < length2; j++) {
				Curve.getIntersections(values1, values2[j], curve1,
						curves2[j], locations,
						// Avoid end point intersections on consecutive curves
						// when self intersecting.
						selfOp && (j === i + 1 || j === length2 - 1 && i === 0)
							? ZERO : 0, // tMin
						ONE); // tMax
			}
		}
		// Now filter the locations and process _expand:
		var last = locations.length - 1;
		// Merge intersections very close to the end of a curve to the begining
		// of the next curve.
		for (var i = last; i >= 0; i--) {
			var loc = locations[i],
				next = loc._curve.getNext(),
				next2 = loc._curve2.getNext();
			if (next && loc._parameter >= ONE) {
				loc._parameter = 0;
				loc._curve = next;
			}
			if (next2 && loc._parameter2 >= ONE) {
				loc._parameter2 = 0;
				loc._curve2 = next2;
			}
		}

		// Compare helper to filter locations
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

		if (last > 0) {
			locations.sort(compare);
			// Filter out duplicate locations
			for (var i = last; i >= 0; i--) {
				if (locations[i].equals(i === 0
						? locations[last] : locations[i - 1])) {
					locations.splice(i, 1);
					last--;
				}
			}
		}
		if (_expand) {
			for (var i = last; i >= 0; i--)
				locations.push(locations[i].getIntersection());
			locations.sort(compare);
		}
		return locations;
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
	 * @param  {Point} point the location for which to determine the winding
	 * direction
	 * @param  {Boolean} horizontal wether we need to consider this point as
	 * part of a horizontal curve
	 * @return {Number} the winding number
	 */
	_getWinding: function(point, horizontal) {
		return PathItem._getWinding(point, this._getMonoCurves(), horizontal);
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
