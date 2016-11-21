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
    var min = Math.min,
        max = Math.max,
        abs = Math.abs,
        // Set up lookup tables for each operator, to decide if a given segment
        // is to be considered a part of the solution, or to be discarded, based
        // on its winding contribution, as calculated by propagateWinding().
        // Boolean operators return true if a segment with the given winding
        // contribution contributes to the final result or not. They are applied
        // to for each segment after the paths are split at crossings.
        operators = {
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
        return resolve
            ? res.resolveCrossings().reorient(res.getFillRule() === 'nonzero')
            : res;
    }

    function createResult(ctor, paths, reduce, path1, path2, options) {
        var result = new ctor(Item.NO_INSERT);
        result.addChildren(paths, true);
        // See if the item can be reduced to just a simple Path.
        if (reduce)
            result = result.reduce({ simplify: true });
        if (!(options && options.insert === false)) {
            // Insert the resulting path above whichever of the two paths appear
            // further up in the stack.
            result.insertAbove(path2 && path1.isSibling(path2)
                    && path1.getIndex() < path2.getIndex() ? path2 : path1);
        }
        // Copy over the input path attributes, excluding matrix and we're done.
        result.copyAttributes(path1, true);
        return result;
    }

    function computeBoolean(path1, path2, operation, options) {
        // Only support subtract and intersect operations when computing stroke
        // based boolean operations.
        if (options && options.stroke &&
                /^(subtract|intersect)$/.test(operation))
            return computeStrokeBoolean(path1, path2, operation === 'subtract');
        // We do not modify the operands themselves, but create copies instead,
        // fas produced by the calls to preparePath().
        // NOTE: The result paths might not belong to the same type i.e.
        // subtract(A:Path, B:Path):CompoundPath etc.
        var _path1 = preparePath(path1, true),
            _path2 = path2 && path1 !== path2 && preparePath(path2, true),
            // Retrieve the operator lookup table for winding numbers.
            operator = operators[operation];
        // Add a simple boolean property to check for a given operation,
        // e.g. `if (operator.unite)`
        operator[operation] = true;
        // Give both paths the same orientation except for subtraction
        // and exclusion, where we need them at opposite orientation.
        if (_path2 && (operator.subtract || operator.exclude)
                ^ (_path2.isClockwise() ^ _path1.isClockwise()))
            _path2.reverse();
        // Split curves at crossings on both paths. Note that for self-
        // intersection, path2 is null and getIntersections() handles it.
        var crossings = divideLocations(
                CurveLocation.expand(_path1.getCrossings(_path2))),
            paths1 = _path1._children || [_path1],
            paths2 = _path2 && (_path2._children || [_path2]),
            segments = [],
            curves = [],
            paths;

        // When there are no crossings, and the two paths are not contained
        // within each other, the result can be known ahead of tracePaths(),
        // largely simplifying the processing required:
        if (!crossings.length) {
            // If we have two operands, check their bounds to find cases where
            // one path is fully contained in another. These cases cannot be
            // simplified, we still need tracePaths() for them.
            var ok = true;
            if (paths2) {
                for (var i1 = 0, l1 = paths1.length; i1 < l1 && ok; i1++) {
                    var bounds1 = paths1[i1].getBounds();
                    for (var i2 = 0, l2 = paths2.length; i2 < l2 && ok; i2++) {
                        var bounds2 = paths2[i2].getBounds();
                        // If either of the bounds fully contains the other,
                        // skip the simple approach and delegate to tracePaths()
                        ok = !bounds1._containsRectangle(bounds2) &&
                             !bounds2._containsRectangle(bounds1);
                    }
                }
            }
            if (ok) {
                // See #1113 for a description of how to deal with operators:
                paths = operator.unite || operator.exclude ? [_path1, _path2]
                        : operator.subtract ? [_path1]
                        // No result, but let's return an empty path to keep
                        // chainability and transfer styles to the result.
                        : operator.intersect ? [new Path(Item.NO_INSERT)]
                        : null;
            }
        }

        function collect(paths) {
            for (var i = 0, l = paths.length; i < l; i++) {
                var path = paths[i];
                segments.push.apply(segments, path._segments);
                curves.push.apply(curves, path.getCurves());
                // See if all encountered segments in a path are overlaps, to
                // be able to separately handle fully overlapping paths.
                path._overlapsOnly = true;
            }
        }

        if (!paths) {
            // Collect all segments and curves of both involved operands.
            collect(paths1);
            if (paths2)
                collect(paths2);
            // Propagate the winding contribution. Winding contribution of
            // curves does not change between two crossings.
            // First, propagate winding contributions for curve chains starting
            // in all crossings:
            for (var i = 0, l = crossings.length; i < l; i++) {
                propagateWinding(crossings[i]._segment, _path1, _path2, curves,
                        operator);
            }
            for (var i = 0, l = segments.length; i < l; i++) {
                var segment = segments[i],
                    inter = segment._intersection;
                if (segment._winding == null) {
                    propagateWinding(segment, _path1, _path2, curves, operator);
                }
                // See if all encountered segments in a path are overlaps.
                if (!(inter && inter._overlap))
                    segment._path._overlapsOnly = false;
            }
            paths = tracePaths(segments, operator);
        }

        return createResult(CompoundPath, paths, true, path1, path2, options);
    }

    function computeStrokeBoolean(path1, path2, subtract) {
        var _path1 = preparePath(path1),
            _path2 = preparePath(path2),
            crossings = _path1.getCrossings(_path2),
            paths = [];

        function addPath(path) {
            // Simple see if the point halfway across the open path is inside
            // path2, and include / exclude the path based on the operator.
            if (_path2.contains(path.getPointAt(path.getLength() / 2))
                    ^ subtract) {
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
     *     path-item at.
     * @param {Function} [include] a function that determines if dividing should
     *     happen at a given location.
     * @return {CurveLocation[]} the locations at which the involved path-items
     *     were divided
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
            var loc = locations[i],
                // Retrieve curve-time before calling include(), because it may
                // be changed to the scaled value after splitting previously.
                // See CurveLocation#getCurve(), #resolveCrossings()
                time = loc._time;
            if (include) {
                if (!include(loc))
                    continue;
                results.unshift(loc);
            }
            // Retrieve curve after calling include(), because it may cause a
            // change in the cached location values, see above.
            var curve = loc._curve,
                origTime = time,
                segment;
            if (curve !== prevCurve) {
                // This is a new curve, update noHandles setting.
                noHandles = !curve.hasHandles();
            } else if (prevTime > tMin) {
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
     * Returns the winding contribution number of the given point in respect
     * to the shapes described by the passed curves.
     *
     * See #1073#issuecomment-226942348 and #1073#issuecomment-226946965 for a
     * detailed description of the approach developed by @iconexperience to
     * precisely determine the winding contribution in all known edge cases.
     *
     * @param {Point} point the location for which to determine the winding
     *     contribution
     * @param {Curve[]} curves the curves that describe the shape against which
     *     to check, as returned by {@link Path#getCurves()} or
     *     {@link CompoundPath#getCurves()}
     * @param {Number} [dir=0] the direction in which to determine the
     *     winding contribution, `0`: in x-direction, `1`: in y-direction
     * @param {Boolean} [closed=false] determines how areas should be closed
     *     when a curve is part of an open path, `false`: area is closed with a
     *     straight line, `true`: area is closed taking the handles of the first
     *     and last segment into account
     * @param {Boolean} [dontFlip=false] controls whether the algorithm is
     *     allowed to flip direction if it is deemed to produce better results
     * @return {Object} an object containing the calculated winding number, as
     *     well as an indication whether the point was situated on the contour
     * @private
     */
    function getWinding(point, curves, dir, closed, dontFlip) {
        var epsilon = /*#=*/Numerical.WINDING_EPSILON,
            // Determine the index of the abscissa and ordinate values in the
            // curve values arrays, based on the direction:
            ia = dir ? 1 : 0, // the abscissa index
            io = dir ? 0 : 1, // the ordinate index
            pv = [point.x, point.y],
            pa = pv[ia], // the point's abscissa
            po = pv[io], // the point's ordinate
            paL = pa - epsilon,
            paR = pa + epsilon,
            windingL = 0,
            windingR = 0,
            pathWindingL = 0,
            pathWindingR = 0,
            onPath = false,
            onPathWinding = 0,
            onPathCount = 0,
            roots = [],
            vPrev,
            vClose;

        function addWinding(v) {
            var o0 = v[io],
                o3 = v[io + 6];
            if (po < min(o0, o3) || po > max(o0, o3)) {
                // If the curve is outside the ordinates' range, no intersection
                // with the ray is possible.
                return;
            }
            var a0 = v[ia],
                a1 = v[ia + 2],
                a2 = v[ia + 4],
                a3 = v[ia + 6];
            if (o0 === o3) {
                // A horizontal curve is not necessarily between two non-
                // horizontal curves. We have to take cases like these into
                // account:
                //          +-----+
                //     +----+     |
                //          +-----+
                if (a1 < paR && a3 > paL || a3 < paR && a1 > paL) {
                    onPath = true;
                }
                // If curve does not change in ordinate direction, windings will
                // be added by adjacent curves.
                // Bail out without updating vPrev at the end of the call.
                return;
            }
            var t =   po === o0 ? 0
                    : po === o3 ? 1
                    : paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3)
                    ? 0.5
                    : Curve.solveCubic(v, io, po, roots, 0, 1) === 1
                        ? roots[0]
                        : 0.5,
                a =   t === 0 ? a0
                    : t === 1 ? a3
                    : Curve.getPoint(v, t)[dir ? 'y' : 'x'],
                winding = o0 > o3 ? 1 : -1,
                windingPrev = vPrev[io] > vPrev[io + 6] ? 1 : -1,
                a3Prev = vPrev[ia + 6];
            if (po !== o0) {
                // Standard case, curve is not crossed at its starting point.
                if (a < paL) {
                    pathWindingL += winding;
                } else if (a > paR) {
                    pathWindingR += winding;
                } else {
                    onPath = true;
                    pathWindingL += winding;
                    pathWindingR += winding;
                }
            } else if (winding !== windingPrev) {
                // Curve is crossed at starting point and winding changes from
                // previous curve. Cancel the winding from previous curve.
                if (a3Prev < paR) {
                    pathWindingL += winding;
                }
                if (a3Prev > paL) {
                    pathWindingR += winding;
                }
            } else if (a3Prev < paL && a > paL || a3Prev > paR && a < paR) {
                // Point is on a horizontal curve between the previous non-
                // horizontal and the current curve.
                onPath = true;
                if (a3Prev < paL) {
                    // left winding was added before, now add right winding.
                    pathWindingR += winding;
                } else if (a3Prev > paR) {
                    // right winding was added before, not add left winding.
                    pathWindingL += winding;
                }
            }
            vPrev = v;
            // If we're on the curve, look at the tangent to decide whether to
            // flip direction to better determine a reliable winding number:
            // If the tangent is parallel to the direction, call getWinding()
            // again with flipped direction and return that result instead.
            return !dontFlip && a > paL && a < paR
                    && Curve.getTangent(v, t)[dir ? 'x' : 'y'] === 0
                    && getWinding(point, curves, dir ? 0 : 1, closed, true);
        }

        function handleCurve(v) {
            // Get the ordinates:
            var o0 = v[io],
                o1 = v[io + 2],
                o2 = v[io + 4],
                o3 = v[io + 6];
            // Only handle curves that can cross the point's ordinate.
            if (po <= max(o0, o1, o2, o3) && po >= min(o0, o1, o2, o3)) {
                // Get the abscissas:
                var a0 = v[ia],
                    a1 = v[ia + 2],
                    a2 = v[ia + 4],
                    a3 = v[ia + 6],
                    // Get monotone curves. If the curve is outside the point's
                    // abscissa, it can be treated as a monotone curve:
                    monoCurves = paL > max(a0, a1, a2, a3) ||
                                 paR < min(a0, a1, a2, a3)
                            ? [v] : Curve.getMonoCurves(v, dir),
                    res;
                for (var i = 0, l = monoCurves.length; i < l; i++) {
                    // Calling addWinding() my lead to direction flipping, in
                    // which case we already have the result and can return it.
                    if (res = addWinding(monoCurves[i]))
                        return res;
                }
            }
        }

        for (var i = 0, l = curves.length; i < l; i++) {
            var curve = curves[i],
                path = curve._path,
                v = curve.getValues(),
                res;
            if (!i || curves[i - 1]._path !== path) {
                // We're on a new (sub-)path, so we need to determine values of
                // the last non-horizontal curve on this path.
                vPrev = null;
                // If the path is not closed, connect the first and last segment
                // based on the value of `closed`:
                // - `false`: Connect with a straight curve, just like how
                //   filling open paths works.
                // - `true`: Connect with a curve that takes the segment handles
                //   into account, just like how closed paths behave.
                if (!path._closed) {
                    vClose = Curve.getValues(
                            path.getLastCurve().getSegment2(),
                            curve.getSegment1(),
                            null, !closed);
                    // This closing curve is a potential candidate for the last
                    // non-horizontal curve.
                    if (vClose[io] !== vClose[io + 6]) {
                        vPrev = vClose;
                    }
                }

                if (!vPrev) {
                    // Walk backwards through list of the path's curves until we
                    // find one that is not horizontal.
                    // Fall-back to the first curve's values if none is found:
                    vPrev = v;
                    var prev = path.getLastCurve();
                    while (prev && prev !== curve) {
                        var v2 = prev.getValues();
                        if (v2[io] !== v2[io + 6]) {
                            vPrev = v2;
                            break;
                        }
                        prev = prev.getPrevious();
                    }
                }
            }

            // Calling handleCurve() my lead to direction flipping, in which
            // case we already have the result and can return it.
            if (res = handleCurve(v))
                return res;

            if (i + 1 === l || curves[i + 1]._path !== path) {
                // We're at the last curve of the current (sub-)path. If a
                // closing curve was calculated at the beginning of it, handle
                // it now to treat the path as closed:
                if (vClose && (res = handleCurve(vClose)))
                    return res;
                if (onPath && !pathWindingL && !pathWindingR) {
                    // If the point is on the path and the windings canceled
                    // each other, we treat the point as if it was inside the
                    // path. A point inside a path has a winding of [+1,-1]
                    // for clockwise and [-1,+1] for counter-clockwise paths.
                    // If the ray is cast in y direction (dir == 1), the
                    // windings always have opposite sign.
                    var add = path.isClockwise(closed) ^ dir ? 1 : -1;
                    windingL += add;
                    windingR -= add;
                    onPathWinding += add;
                } else {
                    windingL += pathWindingL;
                    windingR += pathWindingR;
                    pathWindingL = pathWindingR = 0;
                }
                if (onPath)
                    onPathCount++;
                onPath = false;
                vClose = null;
            }
        }
        if (!windingL && !windingR) {
            windingL = windingR = onPathWinding;
        }
        windingL = windingL && (2 - abs(windingL) % 2);
        windingR = windingR && (2 - abs(windingR) % 2);
        // Return the calculated winding contribution and detect if we are
        // on the contour of the area by comparing windingL and windingR.
        // This is required when handling unite operations, where a winding
        // number of 2 is not part of the result unless it's the contour:
        return {
            winding: max(windingL, windingR),
            windingL: windingL,
            windingR: windingR,
            onContour: !windingL ^ !windingR,
            onPathCount: onPathCount
        };
    }

    function propagateWinding(segment, path1, path2, curves, operator) {
        // Here we try to determine the most likely winding number contribution
        // for the curve-chain starting with this segment. Once we have enough
        // confidence in the winding contribution, we can propagate it until the
        // next intersection or end of a curve chain.
        var chain = [],
            start = segment,
            totalLength = 0,
            winding;
        do {
            var curve = segment.getCurve(),
                length = curve.getLength();
            chain.push({ segment: segment, curve: curve, length: length });
            totalLength += length;
            segment = segment.getNext();
        } while (segment && !segment._intersection && segment !== start);
        // Sample the point at a middle of the chain to get its winding:
        var length = totalLength / 2;
        for (var j = 0, l = chain.length; j < l; j++) {
            var entry = chain[j],
                curveLength = entry.length;
            if (length <= curveLength) {
                var curve = entry.curve,
                    path = curve._path,
                    parent = path._parent,
                    t = curve.getTimeAt(length),
                    pt = curve.getPointAtTime(t),
                    // Determine the direction in which to check the winding
                    // from the point (horizontal or vertical), based on the
                    // curve's direction at that point.
                    dir = abs(curve.getTangentAtTime(t).normalize().y) < 0.5
                            ? 1 : 0;
                if (parent instanceof CompoundPath)
                    path = parent;
                // While subtracting, we need to omit this curve if it is
                // contributing to the second operand and is outside the
                // first operand.
                winding = !(operator.subtract && path2 && (
                        path === path1 &&
                            path2._getWinding(pt, dir, true).winding ||
                        path === path2 &&
                            !path1._getWinding(pt, dir, true).winding))
                        ? getWinding(pt, curves, dir, true)
                        : { winding: 0 };
                break;
            }
            length -= curveLength;
        }
        // Now assign the winding to the entire curve chain.
        for (var j = chain.length - 1; j >= 0; j--) {
            chain[j].segment._winding = winding;
        }
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
            starts;

        function isValid(seg) {
            var winding;
            return !!(seg && !seg._visited && (!operator
                    || operator[(winding = seg._winding || {}).winding]
                    // Unite operations need special handling of segments with a
                    // winding contribution of two (part of both involved areas)
                    // but which are also part of the contour of the result.
                    || operator.unite && winding.onContour));
        }

        function isStart(seg) {
            if (seg) {
                for (var i = 0, l = starts.length; i < l; i++) {
                    if (seg === starts[i])
                        return true;
                }
            }
            return false;
        }

        function visitPath(path) {
            var segments = path._segments;
            for (var i = 0, l = segments.length; i < l; i++) {
                segments[i]._visited = true;
            }
        }

        // If there are multiple possible intersections, find the ones that's
        // either connecting back to start or are not visited yet, and will be
        // part of the boolean result:
        function getIntersections(segment, collectStarts) {
            var inter = segment._intersection,
                start = inter,
                inters = [];
            if (collectStarts)
                starts = [segment];

            function collect(inter, end) {
                while (inter && inter !== end) {
                    var other = inter._segment,
                        path = other._path,
                        next = other.getNext() || path && path.getFirstSegment(),
                        nextInter = next && next._intersection;
                    // See if this segment and the next are both not visited
                    // yet, or are bringing us back to the beginning, and are
                    // both valid, meaning they are part of the boolean result.
                    if (other !== segment && (isStart(other) || isStart(next)
                        || next && (isValid(other) && (isValid(next)
                            // If the next segment isn't valid, its intersection
                            // to which we may switch might be, so check that.
                            || nextInter && isValid(nextInter._segment))))) {
                        inters.push(inter);
                    }
                    if (collectStarts)
                        starts.push(other);
                    inter = inter._next;
                }
            }

            if (inter) {
                collect(inter);
                // Find the beginning of the linked intersections and loop all
                // the way back to start, to collect all valid intersections.
                while (inter && inter._prev)
                    inter = inter._prev;
                collect(inter, start);
            }
            return inters;
        }

        // Sort segments to give non-ambiguous segments the preference as
        // starting points when tracing: prefer segments with no intersections
        // over intersections, and process intersections with overlaps last:
        segments.sort(function(seg1, seg2) {
            var inter1 = seg1._intersection,
                inter2 = seg2._intersection,
                over1 = !!(inter1 && inter1._overlap),
                over2 = !!(inter2 && inter2._overlap),
                path1 = seg1._path,
                path2 = seg2._path;
            // Use bitwise-or to sort cases where only one segment is an overlap
            // or intersection separately, and fall back on natural order within
            // the path.
            return over1 ^ over2
                    ? over1 ? 1 : -1
                    // NOTE: inter1 & 2 are objects, convert to boolean first
                    // as otherwise toString() is called on them.
                    : !inter1 ^ !inter2
                        ? inter1 ? 1 : -1
                        // All other segments, also when comparing two overlaps
                        // or two intersections, are sorted by their order.
                        // Sort by path id to group segments on the same path.
                        : path1 !== path2
                            ? path1._id - path2._id
                            : seg1._index - seg2._index;
        });

        for (var i = 0, l = segments.length; i < l; i++) {
            var seg = segments[i],
                valid = isValid(seg),
                path = null,
                finished = false,
                closed = true,
                branches = [],
                branch,
                visited,
                handleIn;
            // If all encountered segments in a path are overlaps, we may have
            // two fully overlapping paths that need special handling.
            if (valid && seg._path._overlapsOnly) {
                // TODO: Don't we also need to check for multiple overlaps?
                var path1 = seg._path,
                    path2 = seg._intersection._segment._path;
                if (path1.compare(path2)) {
                    // Only add the path to the result if it has an area.
                    if ((operator.unite || operator.intersect)
                            && path1.getArea()) {
                        paths.push(path1.clone(false));
                    }
                    // Now mark all involved segments as visited.
                    visitPath(path1);
                    visitPath(path2);
                    valid = false;
                }
            }
            // Do not start with invalid segments (segments that were already
            // visited, or that are not going to be part of the result).
            while (valid) {
                // For each segment we encounter, see if there are multiple
                // intersections, and if so, pick the best one:
                var first = !path,
                    intersections = getIntersections(seg, first),
                    inter = intersections.shift(),
                    // Get the other segment on the intersection.
                    other = inter && inter._segment,
                    finished = !first && (isStart(seg) || isStart(other)),
                    cross = !finished && other;
                if (first) {
                    path = new Path(Item.NO_INSERT);
                    // Clear branch to start a new one with each new path.
                    branch = null;
                }
                if (finished) {
                    // If we end up on the first or last segment of an operand,
                    // copy over its closed state, to support mixed open/closed
                    // scenarios as described in #1036
                    if (seg.isFirst() || seg.isLast())
                        closed = seg._path._closed;
                    seg._visited = true;
                    break;
                }
                if (cross && branch) {
                    // If we're about to cross, start a new branch and add the
                    // current one to the list of branches.
                    branches.push(branch);
                    branch = null;
                }
                if (!branch) {
                    branch = {
                        start: path._segments.length,
                        segment: seg,
                        intersections: intersections,
                        visited: visited = [],
                        handleIn: handleIn
                    };
                }
                if (cross)
                    seg = other;
                // If an invalid segment is encountered, go back to the last
                // crossing and try the other direction by not crossing at the
                // intersection.
                if (!isValid(seg)) {
                    // Remove the already added segments, and mark them as not
                    // visited so they become available again as options.
                    path.removeSegments(branch.start);
                    for (var j = 0, k = visited.length; j < k; j++) {
                        visited[j]._visited = false;
                    }
                    // Go back to the segment at which the crossing happened,
                    // and try other crossings first.
                    if (inter = branch.intersections.shift()) {
                        seg = inter._segment;
                        visited.length = 0;
                    } else {
                        // If there are no crossings left, try not crossing:
                        // Restore the previous branch and keep adding to it,
                        // but stop once we run out of branches to try.
                        if (!(branch = branches.pop()) ||
                            !isValid(seg = branch.segment))
                            break;
                        visited = branch.visited;
                    }
                    handleIn = branch.handleIn;
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
                visited.push(seg);
                // If this is the end of an open path, go back to its first
                // segment but ignore its handleIn (see above for handleOut).
                seg = next || seg._path.getFirstSegment();
                handleIn = next && next._handleIn;
            }
            if (finished) {
                if (closed) {
                    // Carry over the last handleIn to the first segment.
                    path.firstSegment.setHandleIn(handleIn);
                    path.setClosed(closed);
                }
                // Only add finished paths that cover an area to the result.
                if (path.getArea() !== 0) {
                    paths.push(path);
                }
            }
        }
        return paths;
    }

    return /** @lends PathItem# */{
        /**
         * Returns the winding contribution number of the given point in respect
         * to this PathItem.
         *
         * @param {Point} point the location for which to determine the winding
         *     contribution
         * @param {Number} [dir=0] the direction in which to determine the
         *     winding contribution, `0`: in x-direction, `1`: in y-direction
         * @return {Number} the winding number
         */
        _getWinding: function(point, dir, closed) {
            return getWinding(point, this.getCurves(), dir, closed);
        },

        /**
         * {@grouptitle Boolean Path Operations}
         *
         * Unites the geometry of the specified path with this path's geometry
         * and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         *
         * @param {PathItem} path the path to unite with
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         */
        unite: function(path, options) {
            return computeBoolean(this, path, 'unite', options);
        },

        /**
         * Intersects the geometry of the specified path with this path's
         * geometry and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.stroke=false] {Boolean} whether the operation should
         *     be performed on the stroke or on the fill of the first path
         *
         * @param {PathItem} path the path to intersect with
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         */
        intersect: function(path, options) {
            return computeBoolean(this, path, 'intersect', options);
        },

        /**
         * Subtracts the geometry of the specified path from this path's
         * geometry and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.stroke=false] {Boolean} whether the operation should
         *     be performed on the stroke or on the fill of the first path
         *
         * @param {PathItem} path the path to subtract
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         */
        subtract: function(path) {
            return computeBoolean(this, path, 'subtract');
        },

        /**
         * Excludes the intersection of the geometry of the specified path with
         * this path's geometry and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         *
         * @param {PathItem} path the path to exclude the intersection of
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting group item
         */
        exclude: function(path, options) {
            return computeBoolean(this, path, 'exclude', options);
        },

        /**
         * Splits the geometry of this path along the geometry of the specified
         * path returns the result as a new group item. This is equivalent to
         * calling {@link #subtract(path)} and {@link #subtract(path)} and
         * putting the results into a new group.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.stroke=false] {Boolean} whether the operation should
         *     be performed on the stroke or on the fill of the first path
         *
         * @param {PathItem} path the path to divide by
         * @param {Object} [options] the boolean operation options
         * @return {Group} the resulting group item
         */
        divide: function(path, options) {
            return createResult(Group, [
                    this.subtract(path, options),
                    this.intersect(path, options)
                ], true, this, path, options);
        },

        /*
         * Resolves all crossings of a path item by splitting the path or
         * compound-path in each self-intersection and tracing the result.
         * If possible, the existing path / compound-path is modified if the
         * amount of resulting paths allows so, otherwise a new path /
         * compound-path is created, replacing the current one.
         *
         * @return {PahtItem} the resulting path item
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
                    return inter._overlap && (hasOverlaps = true) ||
                            inter.isCrossing() && (hasCrossings = true);
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
                    if (hasOverlap(prev) && hasOverlap(next)) {
                        seg.remove();
                        prev._handleOut._set(0, 0);
                        next._handleIn._set(0, 0);
                        // If the curve that is left has no length, remove it
                        // altogether. Check for paths with only one segment
                        // before removal, since `prev.getCurve() == null`.
                        if (prev !== seg && !prev.getCurve().hasLength()) {
                            // Transfer handleIn when removing segment:
                            next._handleIn.set(prev._handleIn);
                            prev.remove();
                        }
                    }
                }
                // _time of intersections may be out of synch. Calling getTime()
                // on intersections makes sure that _time has correct value.
                for (var i = 0; i < intersections.length; i++) {
                    intersections[i].getTime();
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
            // Determine how to return the paths: First try to recycle the
            // current path / compound-path, if the amount of paths does not
            // require a conversion.
            var length = paths.length,
                item;
            if (length > 1 && children) {
                if (paths !== children)
                    this.setChildren(paths);
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
                item.addChildren(paths);
                item = item.reduce();
                item.copyAttributes(this);
                this.replaceWith(item);
            }
            return item;
        },

        /**
         * Fixes the orientation of the sub-paths of a compound-path, assuming
         * that non of its sub-paths intersect, by reorienting them so that they
         * are of different winding direction than their containing paths,
         * except for disjoint sub-paths, i.e. islands, which are oriented so
         * that they have the same winding direction as the the biggest path.
         *
         * @param {Boolean} [nonZero=false] controls if the non-zero fill-rule
         *     is to be applied, by counting the winding of each nested path and
         *     discarding sub-paths that do not contribute to the final result
         * @return {PahtItem} a reference to the item itself, reoriented
         */
        reorient: function(nonZero) {
            var children = this._children,
                length = children && children.length;
            if (length > 1) {
                // Build a lookup table with information for each path's
                // original index and winding contribution.
                var lookup = Base.each(children, function(path, i) {
                        this[path._id] = {
                            winding: path.isClockwise() ? 1 : -1,
                            index: i
                        };
                    }, {}),
                    // Now sort the paths by their areas, from large to small.
                    sorted = this.removeChildren().sort(function (a, b) {
                        return abs(b.getArea()) - abs(a.getArea());
                    }),
                    // Get reference to the first, largest path and insert it
                    // already.
                    first = sorted[0],
                    paths = [];
                // Always insert paths at their original index. With exclusion,
                // this produces null entries, but #setChildren() handles those.
                paths[lookup[first._id].index] = first;
                // Walk through the sorted paths, from largest to smallest.
                // Skip the first path, as it is already added.
                for (var i1 = 1; i1 < length; i1++) {
                    var path1 = sorted[i1],
                        entry1 = lookup[path1._id],
                        point = path1.getInteriorPoint(),
                        isContained = false,
                        container = null,
                        exclude = false;
                    for (var i2 = i1 - 1; i2 >= 0 && !container; i2--) {
                        var path2 = sorted[i2];
                        // We run through the paths from largest to smallest,
                        // meaning that for any current path, all potentially
                        // containing paths have already been processed and
                        // their orientation has been fixed. Since we want to
                        // achieve alternating orientation of contained paths,
                        // all we have to do is to find one include path that
                        // contains the current path, and then set the
                        // orientation to the opposite of the containing path.
                        if (path2.contains(point)) {
                            var entry2 = lookup[path2._id];
                            if (nonZero && !isContained) {
                                entry1.winding += entry2.winding;
                                // Remove path if rule is nonzero and winding
                                // of path and containing path is not zero.
                                if (entry1.winding && entry2.winding) {
                                    exclude = entry1.exclude = true;
                                    break;
                                }
                            }
                            isContained = true;
                            // If the containing path is not excluded, we're
                            // done searching for the orientation defining path.
                            container = !entry2.exclude && path2;
                        }
                    }
                    if (!exclude) {
                        // Set to the opposite orientation of containing path,
                        // or the same orientation as the first path if the path
                        // is not contained in any other path.
                        path1.setClockwise(container
                                ? !container.isClockwise()
                                : first.isClockwise());
                        paths[entry1.index] = path1;
                    }
                }
                this.setChildren(paths);
            }
            return this;
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
                // the center of its bounding rectangle, we shoot a ray in x
                // direction and select a point between the first consecutive
                // intersections of the ray on the left.
                var curves = this.getCurves(),
                    y = point.y,
                    intercepts = [],
                    roots = [];
                // Process all y-monotone curves that intersect the ray at y:
                for (var i = 0, l = curves.length; i < l; i++) {
                    var v = curves[i].getValues(),
                        o0 = v[1],
                        o1 = v[3],
                        o2 = v[5],
                        o3 = v[7];
                    if (y >= min(o0, o1, o2, o3) && y <= max(o0, o1, o2, o3)) {
                        var monoCurves = Curve.getMonoCurves(v);
                        for (var j = 0, m = monoCurves.length; j < m; j++) {
                            var mv = monoCurves[j],
                                mo0 = mv[1],
                                mo3 = mv[7];
                            // Only handle curves that are not horizontal and
                            // that can cross the point's ordinate.
                            if ((mo0 !== mo3) &&
                                (y >= mo0 && y <= mo3 || y >= mo3 && y <= mo0)){
                                var x = y === mo0 ? mv[0]
                                    : y === mo3 ? mv[6]
                                    : Curve.solveCubic(mv, 1, y, roots, 0, 1)
                                        === 1
                                        ? Curve.getPoint(mv, roots[0]).x
                                        : (mv[0] + mv[6]) / 2;
                                intercepts.push(x);
                            }
                        }
                    }
                }
                if (intercepts.length > 1) {
                    intercepts.sort(function(a, b) { return a - b; });
                    point.x = (intercepts[0] + intercepts[1]) / 2;
                }
            }
            return point;
        }
    };
});
