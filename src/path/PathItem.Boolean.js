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
 * Supported
 *  - Path and CompoundPath items
 *  - Boolean Union
 *  - Boolean Intersection
 *  - Boolean Subtraction
 *  - Boolean Exclusion
 *  - Resolving a self-intersecting Path items
 *  - Boolean operations on self-intersecting Paths items
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

    /*
     * Creates a clone of the path that we can modify freely, with its matrix
     * applied to its geometry. Calls #reduce() to simplify compound paths and
     * remove empty curves, #resolveCrossings() to resolve self- intersection
     * and #reorient() to make sure all paths have correct winding direction.
     */
    function preparePath(path, resolve) {
        var res = path.clone(false).reduce().transform(null, true, true);
        return resolve ? res.resolveCrossings().reorient() : res;
    }

    function finishBoolean(ctor, paths, path1, path2, reduce) {
        var result = new ctor(Item.NO_INSERT);
        result.addChildren(paths, true);
        // See if the item can be reduced to just a simple Path.
        if (reduce)
            result = result.reduce();
        // Insert the resulting path above whichever of the two paths appear
        // further up in the stack.
        result.insertAbove(path2 && path1.isSibling(path2)
                && path1.getIndex() < path2.getIndex()
                    ? path2 : path1);
        // Copy over the left-hand item's style and we're done.
        // TODO: Consider using Item#_clone() for this, but find a way to not
        // clone children / name (content).
        result.setStyle(path1._style);
        return result;
    }

    // Boolean operators return true if a curve with the given winding
    // contribution contributes to the final result or not. They are called
    // for each curve in the graph after curves in the operands are
    // split at crossings.
    function computeBoolean(path1, path2, operation) {
        // If path1 is open, delegate to computeOpenBoolean()
        if (!path1._children && !path1._closed)
            return computeOpenBoolean(path1, path2, operation);
        // We do not modify the operands themselves, but create copies instead,
        // fas produced by the calls to preparePath().
        // Note that the result paths might not belong to the same type
        // i.e. subtraction(A:Path, B:Path):CompoundPath etc.
        var _path1 = preparePath(path1, true),
            _path2 = path2 && path1 !== path2 && preparePath(path2, true);
        // Give both paths the same orientation except for subtraction
        // and exclusion, where we need them at opposite orientation.
        if (_path2 && /^(subtract|exclude)$/.test(operation)
                ^ (_path2.isClockwise() !== _path1.isClockwise()))
            _path2.reverse();
        // Split curves at crossings on both paths. Note that for self-
        // intersection, path2 is null and getIntersections() handles it.
        var crossings = CurveLocation.expand(_path1.getCrossings(_path2));
        divideLocations(crossings);

        var segments = [],
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
        collect(_path1._children || [_path1]);
        if (_path2)
            collect(_path2._children || [_path2]);
        // Propagate the winding contribution. Winding contribution of curves
        // does not change between two crossings.
        // First, propagate winding contributions for curve chains starting in
        // all crossings:
        for (var i = 0, l = crossings.length; i < l; i++) {
            propagateWinding(crossings[i]._segment, _path1, _path2, monoCurves,
                    operation);
        }
        // Now process the segments that are not part of any intersecting chains
        for (var i = 0, l = segments.length; i < l; i++) {
            var segment = segments[i];
            if (segment._winding == null) {
                propagateWinding(segment, _path1, _path2, monoCurves,
                        operation);
            }
        }
        return finishBoolean(CompoundPath, tracePaths(segments, operation),
                path1, path2, true);
    }

    function computeOpenBoolean(path1, path2, operation) {
        // Only support subtract and intersect operations between an open
        // and a closed path. Assume that compound-paths are closed.
        // TODO: Should we complain about not supported operations?
        if (!path2 || !path2._children && !path2._closed
                || !/^(subtract|intersect)$/.test(operation))
            return null;
        var _path1 = preparePath(path1, false),
            _path2 = preparePath(path2, false),
            crossings = _path1.getCrossings(_path2),
            sub = operation === 'subtract',
            paths = [];

        function addPath(path) {
            // Simple see if the point halfway across the open path is inside
            // path2, and include / exclude the path based on the operation.
            if (_path2.contains(path.getPointAt(path.getLength() / 2)) ^ sub) {
                paths.unshift(path);
                return true;
            }
        }

        // Now loop backwards through all crossings, split the path and check
        // the new path that was split off for inclusion.
        for (var i = crossings.length - 1; i >= 0; i--) {
            var path = crossings[i].split();
            if (path) {
                // See if we can add the path, and if so, clear the first handle
                // at the split, because it might have been a curve.
                if (addPath(path))
                    path.getFirstSegment().setHandleIn(0, 0);
                // Clear the other side of the split too, which is always the
                // end of the remaining _path1.
                _path1.getLastSegment().setHandleOut(0, 0);
            }
        }
        // At the end, check what's left from our path after all the splitting.
        addPath(_path1);
        return finishBoolean(Group, paths, path1, path2);
    }

    /*
     * Creates linked lists between intersections through their _next and _prev
     * properties.
     *
     * @private
     */
    function linkIntersections(from, to) {
        // Only create the link if it's not already in the existing chain, to
        // avoid endless recursions. First walk to the beginning of the chain,
        // and abort if we find `to`.
        var prev = from;
        while (prev) {
            if (prev === to)
                return;
            prev = prev._prev;
        }
        // Now walk to the end of the existing chain to find an empty spot, but
        // stop if we find `to`, to avoid adding it again.
        while (from._next && from._next !== to)
            from = from._next;
        // If we're reached the end of the list, we can add it.
        if (!from._next) {
            // Go back to beginning of the other chain, and link the two up.
            while (to._prev)
                to = to._prev;
            from._next = to;
            to._prev = from;
        }
    }

    /**
     * Divides the path-items at the given locations.
     *
     * @param {CurveLocation[]} locations an array of the locations to split the
     * path-item at.
     * @private
     */
    function divideLocations(locations) {
        var tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            noHandles = false,
            clearSegments = [],
            prevCurve,
            prevT;

        for (var i = locations.length - 1; i >= 0; i--) {
            var loc = locations[i],
                curve = loc._curve,
                t = loc._parameter,
                origT = t;
            if (curve !== prevCurve) {
                // This is a new curve, update noHandles setting.
                noHandles = !curve.hasHandles();
            } else if (prevT > 0) {
                // Scale parameter when we are splitting same curve multiple
                // times, but avoid dividing by zero.
                t /= prevT;
            }
            var segment;
            if (t < tMin) {
                segment = curve._segment1;
            } else if (t > tMax) {
                segment = curve._segment2;
            } else {
                // Split the curve at t, passing true for _setHandles to always
                // set the handles on the sub-curves even if the original curve
                // had no handles.
                segment = curve.divide(t, true, true)._segment1;
                // Keep track of segments of curves without handles, so they can
                // be cleared again at the end.
                if (noHandles)
                    clearSegments.push(segment);
            }
            loc._setSegment(segment);
            // Create links from the new segment to the intersection on the
            // other curve, as well as from there back. If there are multiple
            // intersections on the same segment, we create linked lists between
            // the intersections through linkIntersections(), linking both ways.
            var inter = segment._intersection,
                dest = loc._intersection;
            if (inter) {
                linkIntersections(inter, dest);
                // Each time we add a new link to the linked list, we need to
                // add links from all the other entries to the new entry.
                var other = inter;
                while (other) {
                    linkIntersections(other._intersection, inter);
                    other = other._next;
                }
            } else {
                segment._intersection = dest;
            }
            prevCurve = curve;
            prevT = origT;
        }
        // Clear segment handles if they were part of a curve with no handles,
        // once we are done with the entire curve.
        for (var i = 0, l = clearSegments.length; i < l; i++) {
            clearSegments[i].clearHandles();
        }
    }

    /**
     * Private method that returns the winding contribution of the given point
     * with respect to a given set of monotone curves.
     */
    function getWinding(point, curves, horizontal, testContains) {
        var epsilon = /*#=*/Numerical.WINDING_EPSILON,
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            px = point.x,
            py = point.y,
            windLeft = 0,
            windRight = 0,
            roots = [],
            abs = Math.abs;
        // Absolutely horizontal curves may return wrong results, since
        // the curves are monotonic in y direction and this is an
        // indeterminate state.
        if (horizontal) {
            var yTop = -Infinity,
                yBottom = Infinity,
                yBefore = py - epsilon,
                yAfter = py + epsilon;
            // Find the closest top and bottom intercepts for the same vertical
            // line.
            for (var i = 0, l = curves.length; i < l; i++) {
                var values = curves[i].values;
                if (Curve.solveCubic(values, 0, px, roots, 0, 1) > 0) {
                    for (var j = roots.length - 1; j >= 0; j--) {
                        var y = Curve.getPoint(values, roots[j]).y;
                        if (y < yBefore && y > yTop) {
                            yTop = y;
                        } else if (y > yAfter && y < yBottom) {
                            yBottom = y;
                        }
                    }
                }
            }
            // Shift the point lying on the horizontal curves by
            // half of closest top and bottom intercepts.
            yTop = (yTop + py) / 2;
            yBottom = (yBottom + py) / 2;
            if (yTop > -Infinity)
                windLeft = getWinding(new Point(px, yTop), curves, false,
                        testContains);
            if (yBottom < Infinity)
                windRight = getWinding(new Point(px, yBottom), curves, false,
                        testContains);
        } else {
            var xBefore = px - epsilon,
                xAfter = px + epsilon;
            // Find the winding number for right side of the curve, inclusive of
            // the curve itself, while tracing along its +-x direction.
            var startCounted = false,
                prevCurve,
                prevT;
            for (var i = 0, l = curves.length; i < l; i++) {
                var curve = curves[i],
                    values = curve.values,
                    winding = curve.winding;
                // Since the curves are monotone in y direction, we can just
                // compare the endpoints of the curve to determine if the
                // ray from query point along +-x direction will intersect
                // the monotone curve. Results in quite significant speedup.
                if (winding && (winding === 1
                        && py >= values[1] && py <= values[7]
                        || py >= values[7] && py <= values[1])
                    && Curve.solveCubic(values, 1, py, roots, 0, 1) === 1) {
                    var t = roots[0];
                    // Due to numerical precision issues, two consecutive curves
                    // may register an intercept twice, at t = 1 and 0, if y is
                    // almost equal to one of the endpoints of the curves.
                    // But since curves may contain more than one loop of curves
                    // and the end point on the last curve of a loop would not
                    // be registered as a double, we need to filter these cases:
                    if (!( // = the following conditions will be excluded:
                        // Detect and exclude intercepts at 'end' of loops
                        // if the start of the loop was already counted.
                        // This also works for the last curve: [i + 1] == null
                        t > tMax && startCounted && curve.next !== curves[i + 1]
                        // Detect 2nd case of a consecutive intercept, but make
                        // sure we're still on the same loop.
                        || t < tMin && prevT > tMax
                            && curve.previous === prevCurve)) {
                        var x = Curve.getPoint(values, t).x,
                            slope = Curve.getTangent(values, t).y,
                            counted = false;
                        // Take care of cases where the curve and the preceding
                        // curve merely touches the ray towards +-x direction,
                        // but proceeds to the same side of the ray.
                        // This essentially is not a crossing.
                        if (Numerical.isZero(slope) && !Curve.isStraight(values)
                                // Does the slope over curve beginning change?
                                || t < tMin && slope * Curve.getTangent(
                                    curve.previous.values, 1).y < 0
                                // Does the slope over curve end change?
                                || t > tMax && slope * Curve.getTangent(
                                    curve.next.values, 0).y < 0) {
                            if (testContains && x >= xBefore && x <= xAfter) {
                                ++windLeft;
                                ++windRight;
                                counted = true;
                            }
                        } else if (x <= xBefore) {
                            windLeft += winding;
                            counted = true;
                        } else if (x >= xAfter) {
                            windRight += winding;
                            counted = true;
                        }
                        // Detect the beginning of a new loop by comparing with
                        // the previous curve, and set startCounted accordingly.
                        // This also works for the first loop where i - 1 == -1
                        if (curve.previous !== curves[i - 1])
                            startCounted = t < tMin && counted;
                    }
                    prevCurve = curve;
                    prevT = t;
                }
            }
        }
        return Math.max(abs(windLeft), abs(windRight));
    }

    function propagateWinding(segment, path1, path2, monoCurves, operation) {
        // Here we try to determine the most probable winding number
        // contribution for the curve-chain starting with this segment. Once we
        // have enough confidence in the winding contribution, we can propagate
        // it until the next intersection or end of a curve chain.
        var epsilon = /*#=*/Numerical.GEOMETRIC_EPSILON,
            chain = [],
            start = segment,
            totalLength = 0,
            windingSum = 0;
        do {
            var curve = segment.getCurve(),
                length = curve.getLength();
            chain.push({ segment: segment, curve: curve, length: length });
            totalLength += length;
            segment = segment.getNext();
        } while (segment && !segment._intersection && segment !== start);
        // Calculate the average winding among three evenly distributed
        // points along this curve chain as a representative winding number.
        // This selection gives a better chance of returning a correct
        // winding than equally dividing the curve chain, with the same
        // (amortised) time.
        for (var i = 0; i < 3; i++) {
            // Sample the points at 1/4, 2/4 and 3/4 of the total length:
            var length = totalLength * (i + 1) / 4;
            for (var k = 0, m = chain.length; k < m; k++) {
                var node = chain[k],
                    curveLength = node.length;
                if (length <= curveLength) {
                    // If the selected location on the curve falls onto its
                    // beginning or end, use the curve's center instead.
                    if (length < epsilon || curveLength - length < epsilon)
                        length = curveLength / 2;
                    var curve = node.curve,
                        path = curve._path,
                        parent = path._parent,
                        pt = curve.getPointAt(length),
                        hor = curve.isHorizontal();
                    if (parent instanceof CompoundPath)
                        path = parent;
                    // While subtracting, we need to omit this curve if this
                    // curve is contributing to the second operand and is
                    // outside the first operand.
                    windingSum += operation === 'subtract' && path2
                        && (path === path1 && path2._getWinding(pt, hor)
                        || path === path2 && !path1._getWinding(pt, hor))
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
    function tracePaths(segments, operation) {
        var paths = [],
            start,
            otherStart,
            operator = operators[operation],
            // Adjust winding contributions for specific operations on overlaps:
            overlapWinding = {
                unite: { 1: 2 },
                intersect: { 2: 1 }
            }[operation];

        function isValid(seg, adjusted) {
            if (seg._visited)
                return false;
            if (!operator) // For self-intersection, we're always valid!
                return true;
            var winding = seg._winding,
                inter = seg._intersection;
            if (inter && adjusted && overlapWinding && inter.isOverlap())
                winding = overlapWinding[winding] || winding;
            return operator(winding);
        }

        function isStart(seg) {
            return seg === start || seg === otherStart;
        }

        // If there are multiple possible intersections, find the one that's
        // either connecting back to start or is not visited yet, and will be
        // part of the boolean result:
        function findBestIntersection(inter, strict) {
            if (!inter._next)
                return inter;
            while (inter) {
                var seg = inter._segment,
                    nextSeg = seg.getNext(),
                    nextInter = nextSeg._intersection;
                // See if this segment and the next are both not visited yet, or
                // are bringing us back to the beginning, and are both part of
                // the boolean result.
                // Handling overlaps correctly here is tricky, requiring two
                // passes, first with strict = true, then false:
                // In strict mode, the current and the next segment are both
                // checked for validity, and only the current one is allowed to
                // be an overlap (passing true for unadjusted in isValid()).
                // If this pass does not yield a result, the non-strict mode is
                // used, in which invalid current segments are tolerated, and
                // overlaps for the next segment are allowed as long as they are
                // valid when not adjusted.
                if (isStart(nextSeg)
                    || !seg._visited && !nextSeg._visited
                    // Self-intersections (!operator) don't need isValid() calls
                    && (!operator
                        // Do not use the overlap-adjusted winding here since an
                        // overlap crossing might have brought us here, in which
                        // case isValid(seg) might be false.
                        || (!strict || isValid(seg))
                        // Do not consider nextSeg in strict mode if it is part
                        // of an overlap, in order to give non-overlapping
                        // options that might follow the priority over overlaps.
                        && (!(strict && nextInter && nextInter.isOverlap())
                            && isValid(nextSeg)
                            // If the next segment isn't valid, its intersection
                            // to which we may switch might be, so check that.
                            || !strict && nextInter
                            && isValid(nextInter._segment))
                    ))
                    return inter;
                // If it's no match, continue with the next linked intersection.
                inter = inter._next;
            }
            return null;
        }

        function findStartSegment(inter, next) {
            while (inter) {
                var seg = inter._segment;
                if (isStart(seg))
                    return seg;
                inter = inter[next ? '_next' : '_prev'];
            }
        }

        for (var i = 0, l = segments.length; i < l; i++) {
            var seg = segments[i],
                path = null,
                finished = false;
            // Do not start a chain with already visited segments, and segments
            // that are not going to be part of the resulting operation.
            if (!isValid(seg, true))
                continue;
            start = otherStart = null;
            while (!finished) {
                var inter = seg._intersection,
                    handleIn = path && seg._handleIn;
                // Once we started a chain, see if there are multiple
                // intersections, and if so, pick the best one:
                inter = inter && (findBestIntersection(inter, true)
                        || findBestIntersection(inter, false)) || inter;
                // Get a reference to the other segment on the intersection.
                var other = inter && inter._segment;
                // If we are at a crossing and the other segment is part of the
                // boolean result, switch to it.
                if (other && isValid(other))
                    seg = other;
                // If the new segment is visited already, check if we're back
                // at the start.
                if (seg._visited) {
                    finished = isStart(seg);
                    if (!finished && inter) {
                        // See if any of the intersections is the start segment,
                        // and if so finish the path.
                        var found = findStartSegment(inter, true)
                            || findStartSegment(inter, false);
                        if (found) {
                            seg = found;
                            finished = true;
                        }
                    }
                    break;
                }
                if (!path) {
                    path = new Path(Item.NO_INSERT);
                    start = seg;
                    otherStart = other;
                }
                // Add the segment to the path, and mark it as visited.
                path.add(new Segment(seg._point, handleIn, seg._handleOut));
                seg._visited = true;
                seg = seg.getNext();
                finished = isStart(seg);
            }
            // Finish with closing the paths if necessary, correctly linking up
            // curves etc.
            if (finished) {
                path.firstSegment.setHandleIn(seg._handleIn);
                path.setClosed(true);
            } else if (path) {
                var length = path.getLength();
                // Only complain about open paths if they are long enough.
                if (length >= /*#=*/Numerical.GEOMETRIC_EPSILON) {
                    // This path wasn't finished and is hence invalid.
                    // Report the error to the console for the time being.
                    console.error('Boolean operation resulted in open path',
                            'segments =', path._segments.length,
                            'length =', length);
                }
                path = null;
            }
            // Add the path to the result, while avoiding stray segments and
            // paths that are incomplete or cover no area.
            // As an optimization, only check paths with 8 or less segments
            // for their area, and assume that they cover an area when more.
            if (path && (path._segments.length > 8
                    || !Numerical.isZero(path.getArea()))) {
                paths.push(path);
                path = null;
            }
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
         * the winding about a point
         * @return {Number} the winding number
         */
        _getWinding: function(point, horizontal, testContains) {
            return getWinding(point, this._getMonoCurves(),
                    horizontal, testContains);
        },

        /**
         * {@grouptitle Boolean Path Operations}
         *
         * Merges the geometry of the specified path with this path's geometry
         * and returns the result as a new path item.
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

        /**
         * Excludes the intersection of the geometry of the specified path with
         * this path's geometry and returns the result as a new path item.
         *
         * @param {PathItem} path the path to exclude the intersection of
         * @return {PathItem} the resulting group item
         */
        exclude: function(path) {
            return computeBoolean(this, path, 'exclude');
        },

        /**
         * Splits the geometry of this path along the geometry of the specified
         * path returns the result as a new group item. This is equivalent to
         * calling {@link #subtract(path)} and {@link #subtract(path)} and
         * putting the results into a new group.
         *
         * @param {PathItem} path the path to divide by
         * @return {Group} the resulting group item
         */
        divide: function(path) {
            return finishBoolean(Group,
                    [this.subtract(path), this.intersect(path)],
                    this, path, true);
        },

        resolveCrossings: function() {
            var crossings = this.getCrossings();
            if (!crossings.length)
                return this;
            divideLocations(CurveLocation.expand(crossings));
            var paths = this._children || [this],
                segments = [];
            for (var i = 0, l = paths.length; i < l; i++) {
                segments.push.apply(segments, paths[i]._segments);
            }
            return finishBoolean(CompoundPath, tracePaths(segments),
                    this, null, false);
        }
    };
});

Path.inject(/** @lends Path# */{
    /**
     * Private method that returns and caches all the curves in this Path,
     * which are monotonically decreasing or increasing in the y-direction.
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
            if (Curve.isStraight(v)) {
                // Handling straight curves is easy.
                insertCurve(v);
            } else {
                // Split the curve at y extrema, to get bezier curves with clear
                // orientation: Calculate the derivative and find its roots.
                var a = 3 * (y1 - y2) - y0 + y3,
                    b = 2 * (y0 + y2) - 4 * y1,
                    c = y1 - y0,
                    tMin = /*#=*/Numerical.CURVETIME_EPSILON,
                    tMax = 1 - tMin,
                    roots = [],
                    // Keep then range to 0 .. 1 (excluding) in the search for y
                    // extrema.
                    n = Numerical.solveQuadratic(a, b, c, roots, tMin, tMax);
                if (n === 0) {
                    insertCurve(v);
                } else {
                    roots.sort();
                    var t = roots[0],
                        parts = Curve.subdivide(v, t);
                    insertCurve(parts[0]);
                    if (n > 1) {
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
                        xIntercepts.push(Curve.getPoint(values, roots[j]).x);
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
    // NOTE: Does NOT handle self-intersecting CompoundPaths on itself, but
    // the boolean code above resolves these before calling reorient().
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
