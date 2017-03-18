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
            unite:     { '1': true, '2': true },
            intersect: { '2': true },
            subtract:  { '1': true },
            // exclude only needs -1 to support reorientPaths() when there are
            // no crossings. The actual boolean code uses unsigned winding.
            exclude:   { '1': true, '-1': true }
        };

    /*
     * Creates a clone of the path that we can modify freely, with its matrix
     * applied to its geometry. Calls #reduce() to simplify compound paths and
     * remove empty curves.
     */
    function preparePath(path, resolve) {
        return path.clone(false).reduce({ simplify: true })
                .transform(null, true, true);
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

    var scaleFactor = 1;
    var textAngle = 0;
    var fontSize = 5;

    var segmentOffset;
    var pathCount;

    function initializeReporting() {
        scaleFactor = Base.pick(window.scaleFactor, scaleFactor);
        textAngle = Base.pick(window.textAngle, 0);
        segmentOffset = {};
    }

    function computeBoolean(path1, path2, operation, options) {
        initializeReporting();
        var reportSegments = window.reportSegments;
        var reportWindings = window.reportWindings;
        var reportIntersections = window.reportIntersections;
        window.reportSegments = false;
        window.reportWindings = false;
        window.reportIntersections = false;
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
        window.reportSegments = reportSegments;
        window.reportWindings = reportWindings;
        window.reportIntersections = reportIntersections;
        // Give both paths the same orientation except for subtraction
        // and exclusion, where we need them at opposite orientation.
        if (_path2 && (operator.subtract || operator.exclude)
                ^ (_path2.isClockwise() ^ _path1.isClockwise()))
            _path2.reverse();
        // Split curves in intersections and self-intersections on both paths.
        var intersections = divideLocations(CurveLocation.expand(
                Curve.getIntersections(
                    // Note that for self-intersection, path2 is null.
                    _path1.getCurves().concat(_path2 ? _path2.getCurves() : [])
                )
            )),
            paths1 = _path1._children || [_path1],
            paths2 = _path2 && (_path2._children || [_path2]),
            segments = [],
            curves = [],
            paths;

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

        if (intersections.length) {
            // Collect all segments and curves of both involved operands.
            collect(paths1);
            if (paths2)
                collect(paths2);
            // Propagate the winding contribution. Winding contribution of
            // curves does not change between two intersections.
            // First, propagate winding contributions for curve chains starting
            // in all intersections:
            for (var i = 0, l = intersections.length; i < l; i++) {
                propagateWinding(intersections[i]._segment, _path1, _path2,
                        curves, operator);
            }
            for (var i = 0, l = segments.length; i < l; i++) {
                var segment = segments[i],
                    inter = segment._intersection;
                if (!segment._winding) {
                    propagateWinding(segment, _path1, _path2, curves, operator);
                }
                // See if all encountered segments in a path are overlaps.
                if (!(inter && inter._overlap))
                    segment._path._overlapsOnly = false;
            }
            paths = tracePaths(segments, operator);
        } else {
            // When there are no intersections, the result can be determined
            // through a much faster call to reorientPaths():
            paths = reorientPaths(
                    // Make sure reorientPaths() never works on original
                    // _children arrays by calling paths1.slice()
                    paths2 ? paths1.concat(paths2) : paths1.slice(),
                    function(w) {
                        return !!operator[w];
                    });
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

    function logIntersection(inter) {
        var other = inter._intersection;
        var log = ['Intersection', inter._id, 'id', inter.getPath()._id,
            'i', inter.getIndex(), 't', inter.getParameter(),
            'o', inter.hasOverlap(), 'p', inter.getPoint(),
            'Other', other._id, 'id', other.getPath()._id,
            'i', other.getIndex(), 't', other.getParameter(),
            'o', other.hasOverlap(), 'p', other.getPoint()];
        console.log(log.map(function(v) {
            return v == null ? '-' : v;
        }).join(' '));
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

    function clearCurveHandles(curves) {
        // Clear segment handles if they were part of a curve with no handles.
        for (var i = curves.length - 1; i >= 0; i--)
            curves[i].clearHandles();
    }

    /**
     * Reorients the specified paths.
     *
     * @param {Item[]} paths the paths of which the orientation needs to be
     *     reoriented
     * @param {Function} isInside determines if the inside of a path is filled.
     *     For non-zero fill rule this function would be implemented as follows:
     *
     *     function isInside(w) {
     *       return w != 0;
     *     }
     * @param {Boolean} [clockwise] if provided, the orientation of the root
     *     paths will be set to the orientation specified by `clockwise`,
     *     otherwise the orientation of the largest root child is used.
     * @returns {Item[]} the reoriented paths
    */
    function reorientPaths(paths, isInside, clockwise) {
        var length = paths && paths.length;
        if (length) {
            var lookup = Base.each(paths, function (path, i) {
                    // Build a lookup table with information for each path's
                    // original index and winding contribution.
                    this[path._id] = {
                        container: null,
                        winding: path.isClockwise() ? 1 : -1,
                        index: i
                    };
                }, {}),
                // Now sort the paths by their areas, from large to small.
                sorted = paths.slice().sort(function (a, b) {
                    return abs(b.getArea()) - abs(a.getArea());
                }),
                // Get reference to the first, largest path and insert it
                // already.
                first = sorted[0];
            if (clockwise == null)
                clockwise = first.isClockwise();
            // Now determine the winding for each path, from large to small.
            for (var i = 0; i < length; i++) {
                var path1 = sorted[i],
                    entry1 = lookup[path1._id],
                    point = path1.getInteriorPoint(),
                    containerWinding = 0;
                for (var j = i - 1; j >= 0; j--) {
                    var path2 = sorted[j];
                    // As we run through the paths from largest to smallest, for
                    // any current path, all potentially containing paths have
                    // already been processed and their orientation fixed.
                    // To achieve correct orientation of contained paths based
                    // on winding, we have to find one containing path with
                    // different "insideness" and set opposite orientation.
                    if (path2.contains(point)) {
                        var entry2 = lookup[path2._id];
                        containerWinding = entry2.winding;
                        entry1.winding += containerWinding;
                        entry1.container = entry2.exclude ? entry2.container
                                : path2;
                        break;
                    }
                }
                // Only keep paths if the "insideness" changes when crossing the
                // path, e.g. the inside of the path is filled and the outside
                // is not, or vice versa.
                if (isInside(entry1.winding) === isInside(containerWinding)) {
                    entry1.exclude = true;
                    // No need to delete excluded entries. Setting to null is
                    // enough, as #setChildren() can handle arrays with gaps.
                    paths[entry1.index] = null;
                } else {
                    // If the containing path is not excluded, we're done
                    // searching for the orientation defining path.
                    var container = entry1.container;
                    path1.setClockwise(container ? !container.isClockwise()
                            : clockwise);
                }
            }
        }
        return paths;
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

    function divideLocations(locations, include, clearLater) {
        if (window.reportIntersections) {
            console.log('Crossings', locations.length / 2);
            locations.forEach(function(inter) {
                if (inter._other)
                    return;
                logIntersection(inter);
                new Path.Circle({
                    center: inter.point,
                    radius: 2 * scaleFactor,
                    strokeColor: 'red',
                    strokeScaling: false
                });
            });
        }

        var results = include && [],
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            clearHandles = false,
            clearCurves = clearLater || [],
            clearLookup = clearLater && {},
            renormalizeLocs,
            prevCurve,
            prevTime;

        // When dealing with overlaps and crossings, divideLocations() is called
        // twice. If curve handles of curves that originally didn't have handles
        // are cleared after the first call , we loose  curve-time consistency
        // and CurveLocation#_time values become invalid.
        // In those situations, clearLater is passed as a container for all
        // curves of which the handles need to be cleared in the end.
        // Create a lookup table that allows us to quickly determine if a given
        // curve was resulting from an original curve without handles.
        function getId(curve) {
            return curve._path._id + '.' + curve._segment1._index;
        }

        for (var i = (clearLater && clearLater.length) - 1; i >= 0; i--) {
            var curve = clearLater[i];
            if (curve._path)
                clearLookup[getId(curve)] = true;
        }

        // Loop backwards through all sorted locations, from right to left, so
        // we can assume a predefined sequence for curve-time renormalization.
        for (var i = locations.length - 1; i >= 0; i--) {
            var loc = locations[i],
                // Retrieve curve-time before calling include(), because it may
                // be changed to the scaled value after splitting previously.
                // See CurveLocation#getCurve()
                time = loc._time,
                origTime = time,
                exclude = include && !include(loc),
                // Retrieve curve after calling include(), because it may cause
                // a change in the cached location values, see above.
                curve = loc._curve,
                segment;
            if (curve) {
                if (curve !== prevCurve) {
                    // This is a new curve, update clearHandles setting.
                    clearHandles = !curve.hasHandles()
                            || clearLookup && clearLookup[getId(curve)];
                    // Keep track of locations for later curve-time
                    // renormalization within the curve.
                    renormalizeLocs = [];
                    prevTime = null;
                    prevCurve = curve;
                } else if (prevTime >= tMin) {
                    // Rescale curve-time when we are splitting the same curve
                    // multiple times, if splitting was done previously.
                    time /= prevTime;
                }
            }
            if (exclude) {
                // Store excluded locations for later renormalization, in case
                // the same curve is divided to their left.
                if (renormalizeLocs)
                    renormalizeLocs.push(loc);
                continue;
            } else if (include) {
                results.unshift(loc);
            }
            prevTime = origTime;
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
                if (clearHandles)
                    clearCurves.push(curve, newCurve);
                segment = newCurve._segment1;
                // Handle locations that need their curve-time renormalized
                // within the same curve after dividing at this location.
                for (var j = renormalizeLocs.length - 1; j >= 0; j--) {
                    var l = renormalizeLocs[j];
                    l._time = (l._time - time) / (1 - time);
                }
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
        }

        if (window.reportIntersections) {
            console.log('Split Crossings');
            locations.forEach(function(inter) {
                if (!inter._other) {
                    logIntersection(inter);
                }
            });
        }

        // Clear curve handles right away if we're not storing them for later.
        if (!clearLater)
            clearCurveHandles(clearCurves);
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
        // Determine the index of the abscissa and ordinate values in the curve
        // values arrays, based on the direction:
        var ia = dir ? 1 : 0, // the abscissa index
            io = ia ^ 1, // the ordinate index
            pv = [point.x, point.y],
            pa = pv[ia], // the point's abscissa
            po = pv[io], // the point's ordinate
            // Use separate epsilons for winding contribution code.
            windingEpsilon = 1e-9,
            qualityEpsilon = 1e-6,
            paL = pa - windingEpsilon,
            paR = pa + windingEpsilon,
            windingL = 0,
            windingR = 0,
            onPath = false,
            quality = 1,
            roots = [],
            vPrev,
            vClose;

        function addWinding(v) {
            var o0 = v[io + 0],
                o3 = v[io + 6];
            if (po < min(o0, o3) || po > max(o0, o3)) {
                // If the curve is outside the ordinates' range, no intersection
                // with the ray is possible.
                return;
            }
            var a0 = v[ia + 0],
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
                if (a0 < paR && a3 > paL || a3 < paR && a0 > paL) {
                    onPath = true;
                }
                // If curve does not change in ordinate direction, windings will
                // be added by adjacent curves.
                // Bail out without updating vPrev at the end of the call.
                return;
            }
            // Determine the curve-time value corresponding to the point.
            var t =   po === o0 ? 0
                    : po === o3 ? 1
                    // If the abscissa is outside the curve, we can use any
                    // value except 0 (requires special handling). Use 1, as it
                    // does not require additional calculations for the point.
                    : paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3)
                    ? 1
                    : Curve.solveCubic(v, io, po, roots, 0, 1) > 0
                        ? roots[0]
                        : 1,
                a =   t === 0 ? a0
                    : t === 1 ? a3
                    : Curve.getPoint(v, t)[dir ? 'y' : 'x'],
                winding = o0 > o3 ? 1 : -1,
                windingPrev = vPrev[io] > vPrev[io + 6] ? 1 : -1,
                a3Prev = vPrev[ia + 6];
            if (po !== o0) {
                // Standard case, curve is not crossed at its starting point.
                if (a < paL) {
                    windingL += winding;
                } else if (a > paR) {
                    windingR += winding;
                } else {
                    onPath = true;
                }
                // Determine the quality of the winding calculation. Reduce the
                // quality with every crossing of the ray very close to the
                // path. This means that if the point is on or near multiple
                // curves, the quality becomes less than 0.5.
                if (a > pa - qualityEpsilon && a < pa + qualityEpsilon)
                    quality /= 2;
            } else {
                if (winding !== windingPrev) {
                    // Curve is crossed at starting point and winding changes
                    // from previous curve. Cancel winding from previous curve.
                    if (a0 < paL) {
                        windingL += winding;
                    } else if (a0 > paR) {
                        windingR += winding;
                    }
                } else if (a0 != a3Prev) {
                    // Handle a horizontal curve  between the current and
                    // previous non-horizontal curve. See
                    // #1261#issuecomment-282726147 for a detailed explanation:
                    if (a3Prev < paR && a > paR) {
                        // Right winding was not added before, so add it now.
                        windingR += winding;
                        onPath = true;
                    } else if (a3Prev > paL && a < paL) {
                        // Left winding was not added before, so add it now.
                        windingL += winding;
                        onPath = true;
                    }
                }
                // TODO: Determine how to handle quality when curve is crossed
                // at starting point. Do we always need to set to 0?
                quality = 0;
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
            var o0 = v[io + 0],
                o1 = v[io + 2],
                o2 = v[io + 4],
                o3 = v[io + 6];
            // Only handle curves that can cross the point's ordinate.
            if (po <= max(o0, o1, o2, o3) && po >= min(o0, o1, o2, o3)) {
                // Get the abscissas:
                var a0 = v[ia + 0],
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
                vClose = null;
            }
        }
        // Use the unsigned winding contributions when determining which areas
        // are part of the boolean result.
        windingL = abs(windingL);
        windingR = abs(windingR);
        // Return the calculated winding contributions along with a quality
        // value indicating how reliable the value really is.
        return {
            winding: max(windingL, windingR),
            windingL: windingL,
            windingR: windingR,
            quality: quality,
            onPath: onPath
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
        // Determine winding at three points in the chain. If a winding with
        // sufficient quality is found, use it. Otherwise use the winding with
        // the best quality.
        var offsets = [0.5, 0.25, 0.75],
            windingZero = { winding: 0, quality: 0 },
            winding = windingZero,
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin;
        for (var i = 0; i < offsets.length && winding.quality < 0.5; i++) {
            var length = totalLength * offsets[i];
            for (var j = 0, l = chain.length; j < l; j++) {
                var entry = chain[j],
                    curveLength = entry.length;
                if (length <= curveLength) {
                    var curve = entry.curve,
                        path = curve._path,
                        parent = path._parent,
                        t = Numerical.clamp(curve.getTimeAt(length), tMin, tMax),
                        pt = curve.getPointAtTime(t),
                        // Determine the direction in which to check the winding
                        // from the point (horizontal or vertical), based on the
                        // curve's direction at that point. If tangent is less
                        // than 45°, cast the ray vertically, else horizontally.
                        dir = abs(curve.getTangentAtTime(t).normalize().y)
                            < Math.SQRT1_2 ? 1 : 0;
                    if (parent instanceof CompoundPath)
                        path = parent;
                    // While subtracting, we need to omit this curve if it is
                    // contributing to the second operand and is outside the
                    // first operand.
                    var wind = !(operator.subtract && path2 && (
                            path === path1 &&
                                path2._getWinding(pt, dir, true).winding ||
                            path === path2 &&
                                !path1._getWinding(pt, dir, true).winding))
                            ? getWinding(pt, curves, dir, true)
                            : windingZero;
                    if (wind.quality > winding.quality)
                        winding = wind;
                    break;
                }
                length -= curveLength;
            }
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
        pathCount = 1;

        function labelSegment(seg, label, windingOnly) {
            var path = seg._path,
                inter = seg._intersection,
                other = inter && inter._segment,
                nx1 = inter && inter._next,
                nx2 = nx1 && nx1._next,
                nx3 = nx2 && nx2._next,
                intersections = {
                    'ix': inter,
                    'nx¹': nx1,
                    'nx²': nx2,
                    'nx³': nx3
                };
            if (windingOnly) {
                label += (seg._winding && seg._winding.winding);
            } else {
                label += '   id: ' + path._id + '.' + seg._index
                        + (other ? ' -> ' + other._path._id + '.' + other._index
                            : '')
                        + '   vi: ' + (seg._visited ? 1 : 0)
                        + '   pt: ' + seg._point
                        + '   vd: ' + (isValid(seg) || starts && isStart(seg))
                        + '   ov: ' + !!(inter && inter.hasOverlap())
                        + '   wi: ' + (seg._winding && seg._winding.winding);
                for (var key in intersections) {
                    var ix = intersections[key],
                        s = ix && ix._segment;
                    if (s) {
                        label += '   ' + key + ': ' + s._path._id + '.' + s._index
                                + '(' + ix._id + ')';
                    }
                }
                label += ' | ' + path._validOverlapsOnly + ', ' + path._overlapsOnly;
            }
            var item = path._parent instanceof CompoundPath
                        ? path._parent : path,
                color = item.strokeColor || item.fillColor || 'black',
                point = seg.point,
                key = Math.round(point.x / scaleFactor)
                    + ',' + Math.round(point.y / scaleFactor),
                offset = segmentOffset[key] || 0,
                size = fontSize * scaleFactor,
                text = new PointText({
                    point: point.add(new Point(size, size / 2)
                        .add(0, offset * size * 1.2)
                        .rotate(textAngle)),
                    content: label,
                    justification: 'left',
                    fillColor: color,
                    fontSize: fontSize
                });

            segmentOffset[key] = offset + 1;
            // TODO! PointText should have pivot in #point by default!
            text.pivot = text.globalToLocal(text.point);
            text.scale(scaleFactor);
            text.rotate(textAngle);
            new Path.Line({
                from: text.point,
                to: seg.point,
                strokeColor: color,
                strokeScaling: false
            });
            return text;
        }

        function drawSegment(seg, path, text, index) {
            if (!window.reportSegments || window.reportFilter != null
                    && pathCount != window.reportFilter)
                return;
            labelSegment(seg, '#' + pathCount + '.'
                            + (path ? path._segments.length + 1 : 1)
                            + ' (' + (index + 1) + '): ' + text);
        }

        if (window.reportWindings) {
            for (var i = 0; i < segments.length; i++) {
                labelSegment(segments[i], '', true);
            }
        }

        var paths = [],
            starts;

        function isValid(seg) {
            var winding;
            return !!(seg && !seg._visited && (!operator
                    || operator[(winding = seg._winding || {}).winding]
                        // Unite operations need special handling of segments
                        // with a winding contribution of two (part of both
                        // areas), which are only valid if they are part of the
                        // result's contour, not contained inside another area.
                        && !(operator.unite && winding.winding === 2
                            // No contour if both windings are non-zero.
                            && winding.windingL && winding.windingR)));
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
        function getCrossingSegments(segment, collectStarts) {
            var inter = segment._intersection,
                start = inter,
                crossings = [];
            if (collectStarts)
                starts = [segment];

            function collect(inter, end) {
                while (inter && inter !== end) {
                    var other = inter._segment,
                        path = other._path,
                        next = other.getNext() || path && path.getFirstSegment(),
                        nextInter = next && next._intersection;
                    if (window.reportSegments && other !== segment) {
                        console.log('getIntersection()'
                                + ', other: ' + other._path._id + '.' + other._index
                                + ', next: ' + next._path._id + '.'
                                    + next._index
                                + ', seg vis:' + !!other._visited
                                + ', next vis:' + !!next._visited
                                + ', next start:' + isStart(next)
                                + ', seg wi:' + (other._winding && other._winding.winding)
                                + ', next wi:' + (next._winding && next._winding.winding)
                                + ', other vd:' + (isValid(other) || isStart(other))
                                + ', next vd:' + (
                                    (isValid(next) || isStart(next))
                                    || nextInter && isValid(nextInter._segment))
                                + ', other ov: ' + !!(other._intersection
                                    && other._intersection.hasOverlap())
                                + ', next ov: ' + !!(next._intersection
                                    && next._intersection.hasOverlap())
                                + ', more: ' + (!!inter._next));
                    }
                    // See if this segment and the next are both not visited
                    // yet, or are bringing us back to the beginning, and are
                    // both valid, meaning they are part of the boolean result.
                    if (other !== segment && (isStart(other) || isStart(next)
                        || next && (isValid(other) && (isValid(next)
                            // If the next segment isn't valid, its intersection
                            // to which we may switch might be, so check that.
                            || nextInter && isValid(nextInter._segment))))) {
                        crossings.push(other);
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
            return crossings;
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
                    if (path1.getArea())
                        paths.push(path1.clone(false));
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
                // crossings, and if so, pick the best one:
                if (window.reportSegments && seg._intersection) {
                    var inter = seg._intersection;
                    console.log('-----\n'
                            + '#' + pathCount + '.'
                                + (path ? path._segments.length + 1 : 1)
                            + ': Before getIntersections()'
                            + ', seg: ' + seg._path._id + '.' + seg._index
                            + ', other: ' + inter._segment._path._id + '.'
                                + inter._segment._index);
                }
                var first = !path,
                    crossings = getCrossingSegments(seg, first),
                    // Get the other segment of the first found crossing.
                    other = crossings.shift(),
                    finished = !first && (isStart(seg) || isStart(other)),
                    cross = !finished && other;
                if (window.reportSegments && inter) {
                    console.log('After findBestIntersection()'
                            + ', seg: ' + seg._path._id + '.' + seg._index
                            + ', other: ' + inter._segment._path._id + '.'
                                + inter._segment._index);
                }
                if (first) {
                    path = new Path(Item.NO_INSERT);
                    // Clear branch to start a new one with each new path.
                    branch = null;
                }
                if (finished) {
                    drawSegment(seg, path, 'done', i);
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
                    // Add the branch's root segment as the last segment to try,
                    // to see if we get to a solution without crossing.
                    if (cross)
                        crossings.push(seg);
                    branch = {
                        start: path._segments.length,
                        crossings: crossings,
                        visited: visited = [],
                        handleIn: handleIn
                    };
                }
                if (cross) {
                    drawSegment(seg, path, 'cross', i);
                    seg = other;
                }
                // If an invalid segment is encountered, go back to the last
                // crossing and try other possible crossings, as well as not
                // crossing at the branch's root.
                if (!isValid(seg)) {
                    // We didn't manage to switch, so stop right here.
                    console.info('Invalid segment encountered #'
                            + pathCount + '.'
                            + (path ? path._segments.length + 1 : 1)
                            + ', id: ' + seg._path._id + '.' + seg._index
                            + ', multiple: ' + !!(inter && inter._next));
                    drawSegment(seg, path, 'invalid', i);
                    // Remove the already added segments, and mark them as not
                    // visited so they become available again as options.
                    path.removeSegments(branch.start);
                    for (var j = 0, k = visited.length; j < k; j++) {
                        var s = visited[j];
                        console.log('Unvisit ' + s._path._id + '.' + s._index);
                        visited[j]._visited = false;
                    }
                    visited.length = 0;
                    // Go back to the branch's root segment where the crossing
                    // happened, and try other crossings. Note that this also
                    // tests the root segment without crossing as it is added to
                    // the list of crossings when the branch is created above.
                    do {
                        seg = branch && branch.crossings.shift();
                        if (!seg) {
                            // If there are no segments left, try previous
                            // branches until we find one that works.
                            branch = branches.pop();
                            if (branch) {
                                visited = branch.visited;
                                handleIn = branch.handleIn;
                                console.info('Trying new branch', branches.length);
                            } else {
                                console.info('Boolean Operations run out of branches.');
                            }
                        }
                    } while (branch && !isValid(seg));
                    if (!seg)
                        break;
                }
                if (!cross) {
                    drawSegment(seg, path, 'add', i);
                }
                // Add the segment to the path, and mark it as visited.
                // But first we need to look ahead. If we encounter the end of
                // an open path, we need to treat it the same way as the fill of
                // an open path would: Connecting the last and first segment
                // with a straight line, ignoring the handles.
                var next = seg.getNext();
                path.add(new Segment(seg._point, handleIn,
                        next && seg._handleOut));
                if (window.reportSegments) {
                    console.log('#' + pathCount + '.' + path._segments.length
                            + ': Added', seg._path._id + '.' + seg._index
                            + ': ' + path.lastSegment);
                }
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
                    if (window.reportSegments) {
                        console.log('#' + pathCount + '.'
                                + (path._segments.length + 1)
                                + ': Boolean operation completed');
                    }
                }
            } else if (path) {
                // Only complain about open paths if they would actually contain
                // an area when closed. Open paths that can silently discarded
                // can occur due to epsilons, e.g. when two segments are so
                // close to each other that they are considered the same
                // location, but the winding calculation still produces a valid
                // number due to their slight differences producing a tiny area.
                var area = path.getArea();
                if (abs(area) >= /*#=*/Numerical.GEOMETRIC_EPSILON) {
                    // This path wasn't finished and is hence invalid.
                    // Report the error to the console for the time being.
                    var colors = ['cyan', 'green', 'orange', 'yellow'];
                    var color = new Color(
                            colors[pathCount % (colors.length - 1)]);
                    console.error('%cBoolean operation results in open path',
                            'background: ' + color.toCSS() + '; color: #fff;',
                            'segments =', path._segments.length,
                            'length =', path.getLength(),
                            'area=', area,
                            '#' + pathCount + '.' +
                                (path ? path._segments.length + 1 : 1));
                    if (window.reportTraces) {
                        paper.project.activeLayer.addChild(path);
                        color.alpha = 0.5;
                        path.strokeColor = color;
                        path.strokeWidth = 3;
                        path.strokeScaling = false;
                    }
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
         * @param {Boolean} [clockwise] if provided, the orientation of the root
         *     paths will be set to the orientation specified by `clockwise`,
         *     otherwise the orientation of the largest root child is used.
         * @return {PahtItem} a reference to the item itself, reoriented
         */
        reorient: function(nonZero, clockwise) {
            var children = this._children;
            if (children && children.length) {
                this.setChildren(reorientPaths(this.removeChildren(),
                        function(w) {
                            // Handle both even-odd and non-zero rule.
                            return !!(nonZero ? w : w & 1);
                        },
                        clockwise));
            } else if (clockwise !== undefined) {
                this.setClockwise(clockwise);
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
