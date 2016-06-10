/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
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
 * @author Harikrishnan Gopalakrishnan <hari.exeption@gmail.com>
 * @author Jan Boesenberg <development@iconexperience.com>
 * @author Juerg Lehni <juerg@scratchdisk.com>
 * http://hkrish.com/playground/paperjs/booleanStudy.html
 */
PathItem.inject(new function() {
    // Set up lookup tables for each operator, to decide if a given segment is
    // to be considered a part of the solution, or to be discarded, based on its
    // winding contribution, as calculated by propagateWinding().
    // Boolean operators return true if a segment with the given winding
    // contribution contributes to the final result or not. They are applied to
    // for each segment after the paths are split at crossings.
    var operators = {
        unite:     { 1: true },
        intersect: { 2: true },
        subtract:  { 1: true },
        exclude:   { 1: true }
    };

    /*
     * Creates a clone of the path that we can modify freely, with its matrix
     * applied to its geometry. Calls #reduce() to simplify compound paths and
     * remove empty curves, #resolveCrossings() to resolve self-intersection
     * make sure all paths have correct winding direction.
     */
    function preparePath(path, resolve) {
        var res = path.clone(false).reduce({ simplify: true })
                .transform(null, true, true);
        return resolve ? res.resolveCrossings() : res;
    }

    function createResult(ctor, paths, reduce, path1, path2) {
        var result = new ctor(Item.NO_INSERT);
        result.addChildren(paths, true);
        // See if the item can be reduced to just a simple Path.
        if (reduce)
            result = result.reduce({ simplify: true });
        // Insert the resulting path above whichever of the two paths appear
        // further up in the stack.
        result.insertAbove(path2 && path1.isSibling(path2)
                && path1.getIndex() < path2.getIndex() ? path2 : path1);
        // Copy over the input path attributes, excluding matrix and we're done.
        result.copyAttributes(path1, true);
        return result;
    }

    function computeBoolean(path1, path2, operation) {
        // Retrieve the operator lookup table for winding numbers.
        var operator = operators[operation];
        // Add a simple boolean property to check for a given operation,
        // e.g. `if (operator.unite)`
        operator[operation] = true;
        // If path1 is open, delegate to computeOpenBoolean()
        if (!path1._children && !path1._closed)
            return computeOpenBoolean(path1, path2, operator);
        // We do not modify the operands themselves, but create copies instead,
        // fas produced by the calls to preparePath().
        // Note that the result paths might not belong to the same type
        // i.e. subtraction(A:Path, B:Path):CompoundPath etc.
        var _path1 = preparePath(path1, true),
            _path2 = path2 && path1 !== path2 && preparePath(path2, true);
        // Give both paths the same orientation except for subtraction
        // and exclusion, where we need them at opposite orientation.
        if (_path2 && (operator.subtract || operator.exclude)
                ^ (_path2.isClockwise() ^ _path1.isClockwise()))
            _path2.reverse();
        // Split curves at crossings on both paths. Note that for self-
        // intersection, path2 is null and getIntersections() handles it.
        var crossings = divideLocations(
                CurveLocation.expand(_path1.getCrossings(_path2))),
            segments = [],
            // Aggregate of all curves in both operands, monotonic in y.
            monoCurves = [];

        function collect(paths) {
            for (var i = 0, l = paths.length; i < l; i++) {
                var path = paths[i];
                segments.push.apply(segments, path._segments);
                monoCurves.push.apply(monoCurves, path._getMonoCurves());
                // Keep track if there are valid intersections other than
                // overlaps in each path.
                path._overlapsOnly = path._validOverlapsOnly = true;
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
                    operator);
        }
        // Now process the segments that are not part of any intersecting chains
        for (var i = 0, l = segments.length; i < l; i++) {
            var segment = segments[i],
                inter = segment._intersection;
            if (segment._winding == null) {
                propagateWinding(segment, _path1, _path2, monoCurves, operator);
            }
            // See if there are any valid segments that aren't part of overlaps.
            // This information is used to determine where to start tracing the
            // path, and how to treat encountered invalid segments.
            if (!(inter && inter._overlap)) {
                var path = segment._path;
                path._overlapsOnly = false;
                // This is not an overlap. If it is valid, take note that there
                // are valid intersections other than overlaps in this path.
                if (operator[segment._winding])
                    path._validOverlapsOnly = false;
            }
        }
        return createResult(CompoundPath, tracePaths(segments, operator), true,
                    path1, path2);
    }

    function computeOpenBoolean(path1, path2, operator) {
        // Only support subtract and intersect operations between an open
        // and a closed path. Assume that compound-paths are closed.
        // TODO: Should we complain about not supported operations?
        if (!path2 || !path2._children && !path2._closed
                || !operator.subtract && !operator.intersect)
            return null;
        var _path1 = preparePath(path1, false),
            _path2 = preparePath(path2, false),
            crossings = _path1.getCrossings(_path2),
            sub = operator.subtract,
            paths = [];

        function addPath(path) {
            // Simple see if the point halfway across the open path is inside
            // path2, and include / exclude the path based on the operator.
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
        return createResult(Group, paths, false, path1, path2);
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
            prev = prev._previous;
        }
        // Now walk to the end of the existing chain to find an empty spot, but
        // stop if we find `to`, to avoid adding it again.
        while (from._next && from._next !== to)
            from = from._next;
        // If we're reached the end of the list, we can add it.
        if (!from._next) {
            // Go back to beginning of the other chain, and link the two up.
            while (to._previous)
                to = to._previous;
            from._next = to;
            to._previous = from;
        }
    }

    /**
     * Divides the path-items at the given locations.
     *
     * @param {CurveLocation[]} locations an array of the locations to split the
     * path-item at.
     * @private
     */
    function divideLocations(locations, include) {
        var results = include && [],
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            noHandles = false,
            clearCurves = [],
            prevCurve,
            prevTime;

        for (var i = locations.length - 1; i >= 0; i--) {
            var loc = locations[i];
            // Call include() before retrieving _curve, because it might cause a
            // change in the cached location values (see #resolveCrossings()).
            if (include) {
                if (!include(loc))
                    continue;
                results.unshift(loc);
            }
            var curve = loc._curve,
                time = loc._time,
                origTime = time,
                segment;
            if (curve !== prevCurve) {
                // This is a new curve, update noHandles setting.
                noHandles = !curve.hasHandles();
            } else if (prevTime >= tMin && prevTime <= tMax ) {
                // Scale parameter when we are splitting same curve multiple
                // times, but only if splitting was done previously.
                time /= prevTime;
            }
            if (time < tMin) {
                segment = curve._segment1;
            } else if (time > tMax) {
                segment = curve._segment2;
            } else {
                // Split the curve at time, passing true for _setHandles to
                // always set the handles on the sub-curves even if the original
                // curve had no handles.
                var newCurve = curve.divideAtTime(time, true);
                // Keep track of curves without handles, so they can be cleared
                // again at the end.
                if (noHandles)
                    clearCurves.push(curve, newCurve);
                segment = newCurve._segment1;
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
            prevTime = origTime;
        }
        // Clear segment handles if they were part of a curve with no handles,
        // once we are done with the entire curve.
        for (var i = 0, l = clearCurves.length; i < l; i++) {
            clearCurves[i].clearHandles();
        }
        return results || locations;
    }

    /**
     * Private method that returns the winding contribution of the given point
     * with respect to a given set of monotonic curves.
     */
    function getWinding(point, curves, operator, horizontal) {
        var epsilon = /*#=*/Numerical.WINDING_EPSILON,
            px = point.x,
            py = point.y,
            windLeft = 0,
            windRight = 0,
            length = curves.length,
            roots = [],
            abs = Math.abs;
        // Horizontal curves may return wrong results, since the curves are
        // monotonic in y direction and this is an indeterminate state.
        if (horizontal) {
            var yTop = -Infinity,
                yBottom = Infinity,
                yBefore = py - epsilon,
                yAfter = py + epsilon;
            // Find the closest top and bottom intercepts for the vertical line.
            for (var i = 0; i < length; i++) {
                var values = curves[i].values,
                    count = Curve.solveCubic(values, 0, px, roots, 0, 1);
                for (var j = count - 1; j >= 0; j--) {
                    var y = Curve.getPoint(values, roots[j]).y;
                    if (y < yBefore && y > yTop) {
                        yTop = y;
                    } else if (y > yAfter && y < yBottom) {
                        yBottom = y;
                    }
                }
            }
            // Shift the point lying on the horizontal curves by half of the
            // closest top and bottom intercepts.
            yTop = (yTop + py) / 2;
            yBottom = (yBottom + py) / 2;
            if (yTop > -Infinity)
                windLeft = getWinding(new Point(px, yTop), curves, operator);
            if (yBottom < Infinity)
                windRight = getWinding(new Point(px, yBottom), curves, operator);
        } else {
            var xBefore = px - epsilon,
                xAfter = px + epsilon,
                prevWinding,
                prevXEnd,
                // Separately count the windings for points on curves.
                windLeftOnCurve = 0,
                windRightOnCurve = 0,
                isOnCurve = false;
            for (var i = 0; i < length; i++) {
                var curve = curves[i],
                    winding = curve.winding,
                    values = curve.values,
                    yStart = values[1],
                    yEnd = values[7];
                // The first curve of a loop holds the last curve with non-zero
                // winding. Retrieve and use it here (See _getMonoCurve()).
                if (curve.last) {
                    // Get the end x coordinate and winding of the last
                    // non-horizontal curve, which will be the previous
                    // non-horizontal curve for the first curve in the loop.
                    prevWinding = curve.last.winding;
                    prevXEnd = curve.last.values[6];
                    // Reset the on curve flag for each loop.
                    isOnCurve = false;
                }
                // Since the curves are monotonic in y direction, we can just
                // compare the endpoints of the curve to determine if the ray
                // from query point along +-x direction will intersect the
                // monotonic curve.
                if (py >= yStart && py <= yEnd || py >= yEnd && py <= yStart) {
                    if (winding) {
                        // Calculate the x value for the ray's intersection.
                        var x = py === yStart ? values[0]
                            : py === yEnd ? values[6]
                            : Curve.solveCubic(values, 1, py, roots, 0, 1) === 1
                            ? Curve.getPoint(values, roots[0]).x
                            : null;
                        if (x != null) {
                            // Test if the point is on the current mono-curve.
                            if (x >= xBefore && x <= xAfter) {
                                isOnCurve = true;
                            } else if (
                                // Count the intersection of the ray with the
                                // monotonic curve if the crossing is not the
                                // start of the curve, except if the winding
                                // changes...
                                (py !== yStart || winding !== prevWinding)
                                // ...and the point is not on the curve or on
                                // the horizontal connection between the last
                                // non-horizontal curve's end point and the
                                // current curve's start point.
                                && !(py === yStart
                                    && (px - x) * (px - prevXEnd) < 0)) {
                                if (x < xBefore) {
                                    windLeft += winding;
                                } else if (x > xAfter) {
                                    windRight += winding;
                                }
                            }
                        }
                        // Update previous winding and end coordinate whenever
                        // the ray intersects a non-horizontal curve.
                        prevWinding = winding;
                        prevXEnd = values[6];
                    // Test if the point is on the horizontal curve.
                    } else if ((px - values[0]) * (px - values[6]) <= 0) {
                        isOnCurve = true;
                    }
                }
                // If we are at the end of a loop and the point was on a curve
                // of the loop, we increment / decrement the on-curve winding
                // numbers as if the point was inside the path.
                if (isOnCurve && (i >= length - 1 || curves[i + 1].last)) {
                    windLeftOnCurve += 1;
                    windRightOnCurve -= 1;
                }
            }
            // Use the on-curve windings if no other intersections were found or
            // if they canceled each other. On single paths this ensures that
            // the overall winding is 1 if the point was on a monotonic curve.
            if (windLeft === 0 && windRight === 0) {
                windLeft = windLeftOnCurve;
                windRight = windRightOnCurve;
            }
        }
        // We need to handle the winding contribution differently when dealing
        // with unite operations, so that it will be 1 for any point on the
        // outside path, since we are not considering a contribution of 2 a part
        // of the result, but would have to for outside points. See #1054
        return operator && operator.unite && !windLeft ^ !windRight ? 1
                : Math.max(abs(windLeft), abs(windRight));
    }

    function propagateWinding(segment, path1, path2, monoCurves, operator) {
        // Here we try to determine the most likely winding number contribution
        // for the curve-chain starting with this segment. Once we have enough
        // confidence in the winding contribution, we can propagate it until the
        // next intersection or end of a curve chain.
        var chain = [],
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
        // Calculate the average winding among three evenly distributed points
        // along this curve chain as a representative winding number.
        for (var i = 0; i < 3; i++) {
            // Sample the points at 3 equal intervals along the total length:
            var length = totalLength * (i + 1) / 4;
            for (var j = 0, l = chain.length; j < l; j++) {
                var entry = chain[j],
                    curveLength = entry.length;
                if (length <= curveLength) {
                    var curve = entry.curve,
                        path = curve._path,
                        parent = path._parent,
                        t = curve.getTimeAt(length),
                        pt = curve.getPointAtTime(t),
                        hor = Math.abs(curve.getTangentAtTime(t).y)
                                < /*#=*/Numerical.TRIGONOMETRIC_EPSILON;
                    if (parent instanceof CompoundPath)
                        path = parent;
                    // While subtracting, we need to omit this curve if it is
                    // contributing to the second operand and is outside the
                    // first operand.
                    if (!(operator.subtract && path2
                            && (path === path1
                                && path2._getWinding(pt, operator, hor)
                            || path === path2
                                && !path1._getWinding(pt, operator, hor)))) {
                        windingSum += getWinding(pt, monoCurves, operator, hor);
                    }
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
     * Private method to trace closed paths from a list of segments, according
     * to a the their winding number contribution and a custom operator.
     *
     * @param {Segment[]} segments array of segments to trace closed paths
     * @param {Function} operator the operator lookup table that receives as key
     *     the winding number contribution of a curve and returns a boolean
     *     value indicating whether the curve should be included in result
     * @return {Path[]} the traced closed paths
     */
    function tracePaths(segments, operator) {
        var paths = [],
            start,
            otherStart;

        function isValid(seg) {
            return !!(!seg._visited && (!operator || operator[seg._winding]));
        }

        function isStart(seg) {
            return seg === start || seg === otherStart;
        }

        // If there are multiple possible intersections, find the one that's
        // either connecting back to start or is not visited yet, and will be
        // part of the boolean result:
        function findBestIntersection(inter, exclude, strict) {
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
                // be an overlap.
                // If this pass does not yield a result, the non-strict mode is
                // used, in which invalid current segments are tolerated, and
                // overlaps for the next segment are allowed.
                if (seg !== exclude && (isStart(seg) || isStart(nextSeg)
                    || !seg._visited && !nextSeg._visited
                    // Self-intersections (!operator) don't need isValid() calls
                    && (!operator
                        || (!strict || isValid(seg))
                        // Do not consider nextSeg in strict mode if it is part
                        // of an overlap, in order to give non-overlapping
                        // options that might follow the priority over overlaps.
                        && (!(strict && nextInter && nextInter._overlap)
                            && isValid(nextSeg)
                            // If the next segment isn't valid, its intersection
                            // to which we may switch might be, so check that.
                            || !strict && nextInter
                            && isValid(nextInter._segment))
                    )))
                    return inter;
                // If it's no match, continue with the next linked intersection.
                inter = inter._next;
            }
            return null;
        }

        for (var i = 0, l = segments.length; i < l; i++) {
            var path = null,
                finished = false,
                seg = segments[i],
                inter = seg._intersection,
                handleIn;
            // If all encountered segments in a path are overlaps (regardless if
            // valid or not), we may have two fully overlapping paths that need
            // special handling.
            if (!seg._visited && seg._path._overlapsOnly) {
                // TODO: Don't we also need to check for multiple overlaps?
                var path1 = seg._path,
                    path2 = inter._segment._path,
                    segments1 = path1._segments,
                    segments2 = path2._segments;
                if (Base.equals(segments1, segments2)) {
                    // Only add the path to the result if it has an area.
                    if ((operator.unite || operator.intersect)
                            && path1.getArea()) {
                        paths.push(path1.clone(false));
                    }
                    // Now mark all involved segments as visited.
                    for (var j = 0, k = segments1.length; j < k; j++) {
                        segments1[j]._visited = segments2[j]._visited = true;
                    }
                }
            }
            // Do not start paths with invalid segments (segments that were
            // already visited, or that are not going to be part of the result).
            // Also don't start in overlaps, unless all segments are part of
            // overlaps, in which case we have no other choice.
            if (!isValid(seg) || !seg._path._validOverlapsOnly
                    && inter && seg._winding && inter._overlap)
                continue;
            start = otherStart = null;
            while (true) {
                // For each segment we encounter, see if there are multiple
                // intersections, and if so, pick the best one:
                inter = inter && (findBestIntersection(inter, seg, true)
                        || findBestIntersection(inter, seg, false)) || inter;
                // Get the reference to the other segment on the intersection.
                var other = inter && inter._segment;
                if (isStart(seg)) {
                    finished = true;
                } else if (other) {
                    if (isStart(other)) {
                        finished = true;
                        // Switch the segment, but do not update handleIn
                        seg = other;
                    } else if (isValid(other)) {
                        // We are at a crossing and the other segment is part of
                        // the boolean result, switch over.
                        // We need to mark overlap segments as visited when
                        // processing intersection and subtraction.
                        if (operator && inter._overlap
                                && (operator.intersect || operator.subtract)) {
                            seg._visited = true;
                        }
                        seg = other;
                    }
                }
                // Bail out if we're done, or if we encounter an already visited
                // next segment.
                if (finished || seg._visited) {
                    // It doesn't hurt to set again to share some code.
                    seg._visited = true;
                    break;
                }
                // If there are only valid overlaps and we encounter and invalid
                // segment, bail out immediately. Otherwise we need to be more
                // tolerant due to complex situations of crossing.
                if (seg._path._validOverlapsOnly && !isValid(seg))
                    break;
                if (!path) {
                    path = new Path(Item.NO_INSERT);
                    start = seg;
                    otherStart = other;
                }
                // Add the segment to the path, and mark it as visited.
                // But first we need to look ahead. If we encounter the end of
                // an open path, we need to treat it the same way as the fill of
                // an open path would: Connecting the last and first segment
                // with a straight line, ignoring the handles.
                var next = seg.getNext();
                path.add(new Segment(seg._point, handleIn,
                        next && seg._handleOut));
                seg._visited = true;
                // If this is the end of an open path, go back to its first
                // segment but ignore its handleIn (see above for handleOut).
                seg = next || seg._path.getFirstSegment();
                handleIn = next && next._handleIn;
                inter = seg._intersection;
            }
            if (finished) {
                // Finish with closing the paths, and carrying over the last
                // handleIn to the first segment.
                path.firstSegment.setHandleIn(handleIn);
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
         * @return {Number} the winding number
         */
        _getWinding: function(point, operator, horizontal) {
            return getWinding(point, this._getMonoCurves(), operator,
                    horizontal);
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
            return createResult(Group, [this.subtract(path),
                    this.intersect(path)], true, this, path);
        },

        /*
         * Resolves all crossings of a path item, first by splitting the path or
         * compound-path in each self-intersection and tracing the result, then
         * fixing the orientation of the resulting sub-paths by making sure that
         * all sub-paths are of different winding direction than the first path,
         * except for when individual sub-paths are disjoint, i.e. islands,
         * which are reoriented so that:
         * - The holes have opposite winding direction.
         * - Islands have to have the same winding direction as the first child.
         * If possible, the existing path / compound-path is modified if the
         * amount of resulting paths allows so, otherwise a new path /
         * compound-path is created, replacing the current one.
         */
        resolveCrossings: function() {
            var children = this._children,
                // Support both path and compound-path items
                paths = children || [this];

            function hasOverlap(seg) {
                var inter = seg && seg._intersection;
                return inter && inter._overlap;
            }

            // First collect all overlaps and crossings while taking not of the
            // existence of both.
            var hasOverlaps = false,
                hasCrossings = false,
                intersections = this.getIntersections(null, function(inter) {
                    return inter._overlap && (hasOverlaps = true)
                            || inter.isCrossing() && (hasCrossings = true);
                });
            intersections = CurveLocation.expand(intersections);
            if (hasOverlaps) {
                // First divide in all overlaps, and then remove the inside of
                // the resulting overlap ranges.
                var overlaps = divideLocations(intersections, function(inter) {
                    return inter._overlap;
                });
                for (var i = overlaps.length - 1; i >= 0; i--) {
                    var seg = overlaps[i]._segment,
                        prev = seg.getPrevious(),
                        next = seg.getNext();
                    if (seg._path && hasOverlap(prev) && hasOverlap(next)) {
                        seg.remove();
                        prev._handleOut.set(0, 0);
                        next._handleIn.set(0, 0);
                        var curve = prev.getCurve();
                        if (curve.isStraight() && curve.getLength() === 0)
                            prev.remove();
                    }
                }
            }
            if (hasCrossings) {
                // Divide any remaining intersections that are still part of
                // valid paths after the removal of overlaps.
                divideLocations(intersections, hasOverlaps && function(inter) {
                    // Check both involved curves to see if they're still valid,
                    // meaning they are still part of their paths.
                    var curve1 = inter.getCurve(),
                        // Do not call getCurve() on the other intersection yet,
                        // as it too is in the intersections array and will be
                        // divided later. But do check if its current curve is
                        // still valid. This is required by some very rare edge
                        // cases, related to intersections on the same curve.
                        curve2 = inter._intersection._curve,
                        seg = inter._segment;
                    if (curve1 && curve2 && curve1._path && curve2._path) {
                        return true;
                    } else if (seg) {
                        // Remove all intersections that were involved in the
                        // handling of overlaps, to not confuse tracePaths().
                        seg._intersection = null;
                    }
                });
                // Finally resolve self-intersections through tracePaths()
                paths = tracePaths(Base.each(paths, function(path) {
                    this.push.apply(this, path._segments);
                }, []));
            }
            // By now, all paths are non-overlapping, but might be fully
            // contained inside each other.
            // Next we adjust their orientation based on on further checks:
            var length = paths.length,
                item;
            if (length > 1) {
                // First order the paths by the area of their bounding boxes.
                // Make a clone of paths as it may still be the children array.
                paths = paths.slice().sort(function (a, b) {
                    return b.getBounds().getArea() - a.getBounds().getArea();
                });
                var first = paths[0],
                    items = [first],
                    excluded = {},
                    isNonZero = this.getFillRule() === 'nonzero',
                    windings = isNonZero && Base.each(paths, function(path) {
                        this.push(path.isClockwise() ? 1 : -1);
                    }, []);
                // Walk through paths, from largest to smallest.
                // The first, largest child can be skipped.
                for (var i = 1; i < length; i++) {
                    var path = paths[i],
                        point = path.getInteriorPoint(),
                        isContained = false,
                        container = null,
                        exclude = false;
                    for (var j = i - 1; j >= 0 && !container; j--) {
                        // We run through the paths from largest to smallest,
                        // meaning that for any current path, all potentially
                        // containing paths have already been processed and
                        // their orientation has been fixed. Since we want to
                        // achieve alternating orientation of contained paths,
                        // all we have to do is to find one include path that
                        // contains the current path, and then set the
                        // orientation to the opposite of the containing path.
                        if (paths[j].contains(point)) {
                            if (isNonZero && !isContained) {
                                windings[i] += windings[j];
                                // Remove path if rule is nonzero and winding
                                // of path and containing path is not zero.
                                if (windings[i] && windings[j]) {
                                    exclude = excluded[i] = true;
                                    break;
                                }
                            }
                            isContained = true;
                            // If the containing path is not excluded, we're
                            // done searching for the orientation defining path.
                            container = !excluded[j] && paths[j];
                        }
                    }
                    if (!exclude) {
                        // Set to the opposite orientation of containing path,
                        // or the same orientation as the first path if the path
                        // is not contained in any other path.
                        path.setClockwise(container ? !container.isClockwise()
                                : first.isClockwise());
                        items.push(path);
                    }
                }
                // Replace paths with the processed items list:
                paths = items;
                length = items.length;
            }
            // First try to recycle the current path / compound-path, if the
            // amount of paths do not require a conversion.
            if (length > 1 && children) {
                if (paths !== children) {
                    // TODO: Fix automatic child-orientation in CompoundPath,
                    // and stop passing true for _preserve.
                    this.setChildren(paths, true); // Preserve orientation
                }
                item = this;
            } else if (length === 1 && !children) {
                if (paths[0] !== this)
                    this.setSegments(paths[0].removeSegments());
                item = this;
            }
            // Otherwise create a new compound-path and see if we can reduce it,
            // and attempt to replace this item with it.
            if (!item) {
                item = new CompoundPath(Item.NO_INSERT);
                item.addChildren(paths, true); // Preserve orientation
                item = item.reduce();
                item.copyAttributes(this);
                this.replaceWith(item);
            }
            return item;
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
            last;

        // Insert curve values into a cached array
        function insertCurve(v) {
            var y0 = v[1],
                y1 = v[7],
                // Look at the slope of the line between the mono-curve's anchor
                // points with some tolerance to decide if it is horizontal.
                winding = Math.abs((y0 - y1) / (v[0] - v[6]))
                        < /*#=*/Numerical.GEOMETRIC_EPSILON
                    ? 0 // Horizontal
                    : y0 > y1
                        ? -1 // Decreasing
                        : 1, // Increasing
                curve = { values: v, winding: winding };
            monoCurves.push(curve);
            // Keep track of the last non-horizontal curve (with winding).
            if (winding)
                last = curve;
        }

        // Handle bezier curves. We need to chop them into smaller curves with
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
            if (Curve.isStraight(v)
                    || y0 >= y1 === y1 >= y2 && y1 >= y2 === y2 >= y3) {
                // Straight curves and curves with end and control points sorted
                // in y direction are guaranteed to be monotonic in y direction.
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
                // Add information about the last curve with non-zero winding,
                // as required in getWinding().
                monoCurves[0].last = last;
            }
        }
        return monoCurves;
    },

    /**
     * Returns a point that is guaranteed to be inside the path.
     *
     * @bean
     * @type Point
     */
    getInteriorPoint: function() {
        var bounds = this.getBounds(),
            point = bounds.getCenter(true);
        if (!this.contains(point)) {
            // Since there is no guarantee that a poly-bezier path contains
            // the center of its bounding rectangle, we shoot a ray in
            // +x direction from the center and select a point between
            // consecutive intersections of the ray.
            var curves = this._getMonoCurves(),
                roots = [],
                y = point.y,
                intercepts = [];
            for (var i = 0, l = curves.length; i < l; i++) {
                var values = curves[i].values;
                if (curves[i].winding === 1
                        && y > values[1] && y <= values[7]
                        || y >= values[7] && y < values[1]) {
                    var count = Curve.solveCubic(values, 1, y, roots, 0, 1);
                    for (var j = count - 1; j >= 0; j--) {
                        intercepts.push(Curve.getPoint(values, roots[j]).x);
                    }
                }
            }
            intercepts.sort(function(a, b) { return a - b; });
            point.x = (intercepts[0] + intercepts[1]) / 2;
        }
        return point;
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
    }
});
