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

PathItem.inject(new function() {
    var operators = {
        unite: function(w) {
            return w === 1 || w === 0;
        },

        intersect: function(w) {
            return w === 2;
        },

        subtract: function(w) {
            return w === 1;
        },

        exclude: function(w) {
            return w === 1;
        }
    };

    // Boolean operators return true if a curve with the given winding
    // contribution contributes to the final result or not. They are called
    // for each curve in the graph after curves in the operands are
    // split at intersections.
    function computeBoolean(path1, path2, operation) {
        var operator = operators[operation];
        // Creates a cloned version of the path that we can modify freely, with
        // its matrix applied to its geometry. Calls #reduce() to simplify
        // compound paths and remove empty curves, and #reorient() to make sure
        // all paths have correct winding direction.
        function preparePath(path) {
            return path.clone(false).reduce().reorient().transform(null, true,
                    true);
        }

        // We do not modify the operands themselves, but create copies instead,
        // fas produced by the calls to preparePath().
        // Note that the result paths might not belong to the same type
        // i.e. subtraction(A:Path, B:Path):CompoundPath etc.
        var _path1 = preparePath(path1),
            _path2 = path2 && path1 !== path2 && preparePath(path2);
        // Give both paths the same orientation except for subtraction
        // and exclusion, where we need them at opposite orientation.
        if (_path2 && /^(subtract|exclude)$/.test(operation)
                ^ (_path2.isClockwise() !== _path1.isClockwise()))
            _path2.reverse();
        // Split curves at intersections on both paths. Note that for self
        // intersection, _path2 will be null and getIntersections() handles it.
        splitPath(_path1.getIntersections(_path2, null, true));

        var chain = [],
            segments = [],
            // Aggregate of all curves in both operands, monotonic in y
            monoCurves = [],
            tolerance = /*#=*/Numerical.TOLERANCE;

        function collect(paths) {
            for (var i = 0, l = paths.length; i < l; i++) {
                var path = paths[i];
                segments.push.apply(segments, path._segments);
                monoCurves.push.apply(monoCurves, path._getMonoCurves());
            }
        }

        // Collect all segments and monotonic curves
        collect(_path1._children || [_path1]);
        if (_path2)
            collect(_path2._children || [_path2]);
        // Propagate the winding contribution. Winding contribution of curves
        // does not change between two intersections.
        // First, sort all segments with an intersection to the beginning.
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
            chain.length = 0;
            var startSeg = segment,
                totalLength = 0,
                windingSum = 0;
            do {
                var length = segment.getCurve().getLength();
                chain.push({ segment: segment, length: length });
                totalLength += length;
                segment = segment.getNext();
            } while (segment && !segment._intersection && segment !== startSeg);
            // Calculate the average winding among three evenly distributed
            // points along this curve chain as a representative winding number.
            // This selection gives a better chance of returning a correct
            // winding than equally dividing the curve chain, with the same
            // (amortised) time.
            for (var j = 0; j < 3; j++) {
                // Try the points at 1/4, 2/4 and 3/4 of the total length:
                var length = totalLength * (j + 1) / 4;
                for (k = 0, m = chain.length; k < m; k++) {
                    var node = chain[k],
                        curveLength = node.length;
                    if (length <= curveLength) {
                        // If the selected location on the curve falls onto its
                        // beginning or end, use the curve's center instead.
                        if (length <= tolerance
                                || curveLength - length <= tolerance)
                            length = curveLength / 2;
                        var curve = node.segment.getCurve(),
                            pt = curve.getPointAt(length),
                            // Determine if the curve is a horizontal linear
                            // curve by checking the slope of it's tangent.
                            hor = curve.isLinear() && Math.abs(curve
                                    .getTangentAt(0.5, true).y) <= tolerance,
                            path = curve._path;
                        if (path._parent instanceof CompoundPath)
                            path = path._parent;
                        // While subtracting, we need to omit this curve if this
                        // curve is contributing to the second operand and is
                        // outside the first operand.
                        windingSum += operation === 'subtract' && _path2
                            && (path === _path1 && _path2._getWinding(pt, hor)
                            || path === _path2 && !_path1._getWinding(pt, hor))
                            ? 0
                            : getWinding(pt, monoCurves, hor);
                        break;
                    }
                    length -= curveLength;
                }
            }
            // Assign the average winding to the entire curve chain.
            var winding = Math.round(windingSum / 3);
            for (var j = chain.length - 1; j >= 0; j--)
                chain[j].segment._winding = winding;
        }
        // Trace closed contours and insert them into the result.
        var result = new CompoundPath(Item.NO_INSERT);
        result.insertAbove(path1);
        result.addChildren(tracePaths(segments, operator), true);
        // See if the CompoundPath can be reduced to just a simple Path.
        result = result.reduce();
        // Copy over the left-hand item's style and we're done.
        // TODO: Consider using Item#_clone() for this, but find a way to not
        // clone children / name (content).
        result.setStyle(path1._style);
        return result;
    }

    /**
     * Private method for splitting a PathItem at the given intersections.
     * The routine works for both self intersections and intersections
     * between PathItems.
     * @param {CurveLocation[]} intersections Array of CurveLocation objects
     */
    function splitPath(intersections) {
        var tMin = /*#=*/Numerical.TOLERANCE,
            tMax = 1 - tMin,
            linearHandles;

        function resetLinear() {
            // Reset linear segments if they were part of a linear curve
            // and if we are done with the entire curve.
            for (var i = 0, l = linearHandles.length; i < l; i++)
                linearHandles[i].set(0, 0);
        }

        for (var i = intersections.length - 1, curve, prev; i >= 0; i--) {
            var loc = intersections[i],
                t = loc._parameter;
            // Check if we are splitting same curve multiple times, but avoid
            // dividing with zero.
            if (prev && prev._curve === loc._curve && prev._parameter > 0) {
                // Scale parameter after previous split.
                t /= prev._parameter;
            } else {
                curve = loc._curve;
                if (linearHandles)
                    resetLinear();
                linearHandles = curve.isLinear() ? [
                        curve._segment1._handleOut,
                        curve._segment2._handleIn
                    ] : null;
            }
            var newCurve,
                segment;
            // Split the curve at t, while ignoring linearity of curves
            if (newCurve = curve.divide(t, true, true)) {
                segment = newCurve._segment1;
                curve = newCurve.getPrevious();
                if (linearHandles)
                    linearHandles.push(segment._handleOut, segment._handleIn);
            } else {
                segment = t < tMin
                    ? curve._segment1
                    : t > tMax
                        ? curve._segment2
                        : curve.getPartLength(0, t) < curve.getPartLength(t, 1)
                            ? curve._segment1
                            : curve._segment2;
            }
            // Link the new segment with the intersection on the other curve
            segment._intersection = loc.getIntersection();
            loc._segment = segment;
            prev = loc;
        }
        if (linearHandles)
            resetLinear();
    }

    /**
     * Private method that returns the winding contribution of the  given point
     * with respect to a given set of monotone curves.
     */
    function getWinding(point, curves, horizontal, testContains) {
        var tolerance = /*#=*/Numerical.TOLERANCE,
            tMin = tolerance,
            tMax = 1 - tMin,
            x = point.x,
            y = point.y,
            windLeft = 0,
            windRight = 0,
            roots = [];
        // Absolutely horizontal curves may return wrong results, since
        // the curves are monotonic in y direction and this is an
        // indeterminate state.
        if (horizontal) {
            var yTop = -Infinity,
                yBottom = Infinity,
                yBefore = y - tolerance,
                yAfter = y + tolerance;
            // Find the closest top and bottom intercepts for the same vertical
            // line.
            for (var i = 0, l = curves.length; i < l; i++) {
                var values = curves[i].values;
                if (Curve.solveCubic(values, 0, x, roots, 0, 1) > 0) {
                    for (var j = roots.length - 1; j >= 0; j--) {
                        var y0 = Curve.evaluate(values, roots[j], 0).y;
                        if (y0 < yBefore && y0 > yTop) {
                            yTop = y0;
                        } else if (y0 > yAfter && y0 < yBottom) {
                            yBottom = y0;
                        }
                    }
                }
            }
            // Shift the point lying on the horizontal curves by
            // half of closest top and bottom intercepts.
            yTop = (yTop + y) / 2;
            yBottom = (yBottom + y) / 2;
            if (yTop > -Infinity)
                windLeft = getWinding(new Point(x, yTop), curves);
            if (yBottom < Infinity)
                windRight = getWinding(new Point(x, yBottom), curves);
        } else {
            var xBefore = x - tolerance,
                xAfter = x + tolerance;
            // Find the winding number for right side of the curve, inclusive of
            // the curve itself, while tracing along its +-x direction.
            for (var i = 0, l = curves.length; i < l; i++) {
                var curve = curves[i],
                    values = curve.values,
                    winding = curve.winding,
                    next = curve.next;
                    // Since the curves are monotone in y direction, we can just
                    // compare the endpoints of the curve to determine if the
                    // ray from query point along +-x direction will intersect
                    // the monotone curve. Results in quite significant speedup.
                if (winding && (winding === 1
                        && y >= values[1] && y <= values[7]
                        || y >= values[7] && y <= values[1])
                    && Curve.solveCubic(values, 1, y, roots, 0,
                        // If the next curve is horizontal, we have to include
                        // the end of this curve to make sure we won't miss an
                        // intercept.
                        !next.winding
                            && next.values[1] === y ? 1 : tMax) === 1) {
                    var t = roots[0],
                        x0 = Curve.evaluate(values, t, 0).x,
                        slope = Curve.evaluate(values, t, 1).y;
                    // Take care of cases where the curve and the preceding
                    // curve merely touches the ray towards +-x direction, but
                    // proceeds to the same side of the ray. This essentially is
                    // not a crossing.
                    if (Numerical.isZero(slope) && !Curve.isLinear(values)
                            || t < tMin && slope * Curve.evaluate(
                                curve.previous.values, t, 1).y < 0) {
                        if (testContains && x0 >= xBefore && x0 <= xAfter) {
                            ++windLeft;
                            ++windRight;
                        }
                    } else if (x0 <= xBefore) {
                        windLeft += winding;
                    } else if (x0 >= xAfter) {
                        windRight += winding;
                    }
                }
            }
        }
        return Math.max(Math.abs(windLeft), Math.abs(windRight));
    }

    /**
     * Private method to trace closed contours from a set of segments according
     * to a set of constraints-winding contribution and a custom operator.
     *
     * @param {Segment[]} segments Array of 'seed' segments for tracing closed
     * contours
     * @param {Function} the operator function that receives as argument the
     * winding number contribution of a curve and returns a boolean value
     * indicating whether the curve should be  included in the final contour or
     * not
     * @return {Path[]} the contours traced
     */
    function tracePaths(segments, operator, selfOp) {
        var paths = [],
            // Values for getTangentAt() that are almost 0 and 1.
            // TODO: Correctly support getTangentAt(0) / (1)?
            tMin = /*#=*/Numerical.TOLERANCE,
            tMax = 1 - tMin;
        for (var i = 0, seg, startSeg, l = segments.length; i < l; i++) {
            seg = startSeg = segments[i];
            if (seg._visited || !operator(seg._winding))
                continue;
            var path = new Path(Item.NO_INSERT),
                inter = seg._intersection,
                startInterSeg = inter && inter._segment,
                added = false, // Whether a first segment as added already
                dir = 1;
            do {
                var handleIn = dir > 0 ? seg._handleIn : seg._handleOut,
                    handleOut = dir > 0 ? seg._handleOut : seg._handleIn,
                    interSeg;
                // If the intersection segment is valid, try switching to
                // it, with an appropriate direction to continue traversal.
                // Else, stay on the same contour.
                if (added && (!operator(seg._winding) || selfOp)
                        && (inter = seg._intersection)
                        && (interSeg = inter._segment)
                        && interSeg !== startSeg) {
                    if (selfOp) {
                        // Switch to the intersection segment, if we are
                        // resolving self-Intersections.
                        seg._visited = interSeg._visited;
                        seg = interSeg;
                        dir = 1;
                    } else {
                        var c1 = seg.getCurve();
                        if (dir > 0)
                            c1 = c1.getPrevious();
                        var t1 = c1.getTangentAt(dir < 1 ? tMin : tMax, true),
                            // Get both curves at the intersection (except the
                            // entry curves).
                            c4 = interSeg.getCurve(),
                            c3 = c4.getPrevious(),
                            // Calculate their winding values and tangents.
                            t3 = c3.getTangentAt(tMax, true),
                            t4 = c4.getTangentAt(tMin, true),
                            // Cross product of the entry and exit tangent
                            // vectors at the intersection, will let us select
                            // the correct contour to traverse next.
                            w3 = t1.cross(t3),
                            w4 = t1.cross(t4);
                        if (w3 * w4 !== 0) {
                            // Do not attempt to switch contours if we aren't
                            // sure that there is a possible candidate.
                            var curve = w3 < w4 ? c3 : c4,
                                nextCurve = operator(curve._segment1._winding)
                                    ? curve
                                    : w3 < w4 ? c4 : c3,
                                nextSeg = nextCurve._segment1;
                            dir = nextCurve === c3 ? -1 : 1;
                            // If we didn't find a suitable direction for next
                            // contour to traverse, stay on the same contour.
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
            // Add the path to the result, while avoiding stray segments and
            // incomplete paths. The amount of segments for valid paths depend
            // on their geometry:
            // - Closed paths with only straight lines (polygons) need more than
            //   two segments.
            // - Closed paths with curves can consist of only one segment.
            // - Open paths need at least two segments.
            if (path._segments.length >
                    (path._closed ? path.isPolygon() ? 2 : 0 : 1))
                paths.push(path);
        }
        return paths;
    }

    return /** @lends PathItem# */{
        /**
         * Returns the winding contribution of the given point with respect to
         * this PathItem.
         *
         * @param {Point} point the location for which to determine the winding
         * direction
         * @param {Boolean} horizontal whether we need to consider this point as
         * part of a horizontal curve
         * @param {Boolean} testContains whether we need to consider this point
         * as part of stationary points on the curve itself, used when checking
         * the winding about a point.
         * @return {Number} the winding number
         */
        _getWinding: function(point, horizontal, testContains) {
            return getWinding(point, this._getMonoCurves(),
                    horizontal, testContains);
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
            return computeBoolean(this, path, 'unite');
        },

        /**
         * Intersects the geometry of the specified path with this path's
         * geometry and returns the result as a new path item.
         *
         * @param {PathItem} path the path to intersect with
         * @return {PathItem} the resulting path item
         */
        intersect: function(path) {
            return computeBoolean(this, path, 'intersect');
        },

        /**
         * Subtracts the geometry of the specified path from this path's
         * geometry and returns the result as a new path item.
         *
         * @param {PathItem} path the path to subtract
         * @return {PathItem} the resulting path item
         */
        subtract: function(path) {
            return computeBoolean(this, path, 'subtract');
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
            return computeBoolean(this, path, 'exclude');
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

Path.inject(/** @lends Path# */{
    /**
     * Private method that returns and caches all the curves in this Path, which
     * are monotonically decreasing or increasing in the y-direction.
     * Used by getWinding().
     */
    _getMonoCurves: function() {
        var monoCurves = this._monoCurves,
            prevCurve;

        // Insert curve values into a cached array
        function insertCurve(v) {
            var y0 = v[1],
                y1 = v[7],
                curve = {
                    values: v,
                    winding: y0 === y1
                        ? 0 // Horizontal
                        : y0 > y1
                            ? -1 // Decreasing
                            : 1, // Increasing
                    // Add a reference to neighboring curves.
                    previous: prevCurve,
                    next: null // Always set it for hidden class optimization.
                };
            if (prevCurve)
                prevCurve.next = curve;
            monoCurves.push(curve);
            prevCurve = curve;
        }

        // Handle bezier curves. We need to chop them into smaller curves  with
        // defined orientation, by solving the derivative curve for y extrema.
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
                    tolerance = /*#=*/Numerical.TOLERANCE,
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
                        // If there are two extrema, renormalize t to the range
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
            if (monoCurves.length > 0) {
                // Link first and last curves
                var first = monoCurves[0],
                    last = monoCurves[monoCurves.length - 1];
                first.previous = last;
                last.next = first;
            }
        }
        return monoCurves;
    },

    /**
     * Returns a point that is guaranteed to be inside the path.
     *
     * @type Point
     * @bean
     */
    getInteriorPoint: function() {
        var bounds = this.getBounds(),
            point = bounds.getCenter(true);
        if (!this.contains(point)) {
            // Since there is no guarantee that a poly-bezier path contains
            // the center of its bounding rectangle, we shoot a ray in
            // +x direction from the center and select a point between
            // consecutive intersections of the ray
            var curves = this._getMonoCurves(),
                roots = [],
                y = point.y,
                xIntercepts = [];
            for (var i = 0, l = curves.length; i < l; i++) {
                var values = curves[i].values;
                if ((curves[i].winding === 1
                        && y >= values[1] && y <= values[7]
                        || y >= values[7] && y <= values[1])
                        && Curve.solveCubic(values, 1, y, roots, 0, 1) > 0) {
                    for (var j = roots.length - 1; j >= 0; j--)
                        xIntercepts.push(Curve.evaluate(values, roots[j], 0).x);
                }
                if (xIntercepts.length > 1)
                    break;
            }
            point.x = (xIntercepts[0] + xIntercepts[1]) / 2;
        }
        return point;
    },

    reorient: function() {
        // Paths that are not part of compound paths should never be counter-
        // clockwise for boolean operations.
        this.setClockwise(true);
        return this;
    }
});

CompoundPath.inject(/** @lends CompoundPath# */{
    /**
     * Private method that returns all the curves in this CompoundPath, which
     * are monotonically decreasing or increasing in the 'y' direction.
     * Used by getWinding().
     */
    _getMonoCurves: function() {
        var children = this._children,
            monoCurves = [];
        for (var i = 0, l = children.length; i < l; i++)
            monoCurves.push.apply(monoCurves, children[i]._getMonoCurves());
        return monoCurves;
    },

    /*
     * Fixes the orientation of a CompoundPath's child paths by first ordering
     * them according to their area, and then making sure that all children are
     * of different winding direction than the first child, except for when
     * some individual contours are disjoint, i.e. islands, they are reoriented
     * so that:
     * - The holes have opposite winding direction.
     * - Islands have to have the same winding direction as the first child.
     */
    // NOTE: Does NOT handle self-intersecting CompoundPaths.
    reorient: function() {
        var children = this.removeChildren().sort(function(a, b) {
            return b.getBounds().getArea() - a.getBounds().getArea();
        });
        if (children.length > 0) {
            this.addChildren(children);
            var clockwise = children[0].isClockwise();
            // Skip the first child
            for (var i = 1, l = children.length; i < l; i++) {
                var point = children[i].getInteriorPoint(),
                    counters = 0;
                for (var j = i - 1; j >= 0; j--) {
                    if (children[j].contains(point))
                        counters++;
                }
                children[i].setClockwise(counters % 2 === 0 && clockwise);
            }
        }
        return this;
    }
});
