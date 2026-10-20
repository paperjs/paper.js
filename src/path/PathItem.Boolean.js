/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
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
 * @author Jan Boesenberg <jan.boesenberg@gmail.com>
 * @author Jürg Lehni <juerg@scratchdisk.com>
 */
PathItem.inject(new function() {
    var min = Math.min,
        max = Math.max,
        abs = Math.abs,
        // The boolean operators decide if an area is part of the result, from
        // whether it is inside each of the two operands.
        operators = {
            unite: function(inside1, inside2) {
                return inside1 || inside2;
            },
            intersect: function(inside1, inside2) {
                return inside1 && inside2;
            },
            subtract: function(inside1, inside2) {
                return inside1 && !inside2;
            },
            exclude: function(inside1, inside2) {
                return inside1 !== inside2;
            }
        };

    function getPaths(path) {
        return path._children || [path];
    }

    /*
     * Creates a clone of the path that we can modify freely, with its matrix
     * applied to its geometry. Calls #reduce() to simplify compound paths and
     * remove empty curves, and closes open paths if required.
     */
    function preparePath(path, close) {
        var res = path
            .clone(false)
            .reduce({ simplify: true })
            .transform(null, true, true);
        return close ? closePaths(res) : res;
    }

    /*
     * Closes the open paths of the path item with straight lines, as filling
     * them does.
     */
    function closePaths(item) {
        var paths = getPaths(item);
        for (var i = 0, l = paths.length; i < l; i++) {
            var path = paths[i];
            if (!path._closed && !path.isEmpty()) {
                // Close with epsilon tolerance, to avoid tiny straight
                // that would cause issues with intersection detection.
                // If the ends meet, this joins them and keeps the curve
                // that ends there. Only a new closing curve is straight
                // (#1929):
                var count = path._segments.length;
                path.closePath(/*#=*/Numerical.EPSILON);
                if (path._segments.length === count) {
                    path.getFirstSegment().setHandleIn(0, 0);
                    path.getLastSegment().setHandleOut(0, 0);
                }
            }
        }
        return item;
    }


    function createResult(paths, simplify, path1, path2, options) {
        var result = new CompoundPath(Item.NO_INSERT);
        result.addChildren(paths, true);
        // See if the item can be reduced to just a simple Path.
        result = result.reduce({ simplify: simplify });
        if (Base.pick(options && options.insert, paper.settings.insertItems)) {
            // Insert the resulting path above whichever of the paths that are
            // siblings of path1 appears furthest up in the stack:
            var above = path1,
                others = [].concat(path2 || []);
            for (var i = 0, l = others.length; i < l; i++) {
                var other = others[i];
                if (path1.isSibling(other)
                        && other.getIndex() > above.getIndex())
                    above = other;
            }
            result.insertAbove(above);
        }
        // Copy over the input path attributes, excluding matrix and we're done.
        result.copyAttributes(path1, true);
        return result;
    }

    function filterIntersection(inter) {
        // TODO: Change isCrossing() to also handle overlaps (hasOverlap())
        // that are actually involved in a crossing! For this we need proper
        // overlap range detection / merging first... But as we call
        // #resolveCrossings() first in boolean operations, removing all
        // self-touching areas in paths, this works for the known use cases.
        // The ideal implementation would deal with it in a way outlined in:
        // https://github.com/paperjs/paper.js/issues/874#issuecomment-168332391
        return inter.hasOverlap() || inter.isCrossing();
    }

    function traceBoolean(path1, path2, operation, options) {
        // Only support subtract and intersect operations when computing stroke
        // based boolean operations (options.split = true).
        if (options && (options.trace == false || options.stroke) &&
                /^(subtract|intersect)$/.test(operation))
            return splitBoolean(path1, path2, operation, options);
        // We do not modify the operands themselves, but trace copies of them.
        // NOTE: The result paths might not belong to the same type i.e.
        // subtract(A:Path, B:Path):CompoundPath etc.
        var paths = tracePaths(getOperands(path1,
                combinePaths(path2, operation)), operators[operation]);
        return createResult(paths, true, path1, path2, options);
    }

    /*
     * Combines a list of paths into the one path that path1 is operated on
     * with, pairwise in a balanced tree so that each step only meets results
     * of similar size. To subtract them, we subtract their union.
     */
    function combinePaths(paths, operation) {
        var list = [].concat(paths),
            combine = operation === 'subtract' ? 'unite' : operation;
        while (list.length > 1) {
            var next = [];
            for (var i = 0, l = list.length; i < l; i += 2) {
                next.push(i + 1 < l ? traceBoolean(list[i], list[i + 1],
                        combine, { insert: false }) : list[i]);
            }
            list = next;
        }
        return list[0];
    }


    function splitBoolean(path1, path2, operation, options) {
        var _path1 = preparePath(path1),
            _path2 = preparePath(combinePaths(path2, operation)),
            crossings = _path1.getIntersections(_path2, filterIntersection),
            subtract = operation === 'subtract',
            divide = operation === 'divide',
            pieces = [],
            paths = [];

        // Split the paths of path1 at all crossings, backwards so the earlier
        // locations stay valid. A split returns the part after it, or for a
        // closed path, the path itself, opened at the split, so pieces are
        // only tested once all splitting is done (#1540):
        for (var i = crossings.length - 1; i >= 0; i--) {
            var crossing = crossings[i],
                split = crossing.getPath(),
                path = crossing.split();
            if (path) {
                // Clear the handles on both sides of the split, as they might
                // have belonged to curves:
                path.getFirstSegment().setHandleIn(0, 0);
                split.getLastSegment().setHandleOut(0, 0);
                if (pieces.indexOf(path) === -1)
                    pieces.push(path);
            }
        }
        // Add what's left of the paths of path1, split or not, which for a
        // compound path are its children (#1541):
        var children = _path1._children || [_path1];
        for (var i = 0, l = children.length; i < l; i++) {
            if (pieces.indexOf(children[i]) === -1)
                pieces.push(children[i]);
        }
        // Simply see if the point halfway across each piece is inside path2,
        // and include or exclude it based on the operation.
        for (var i = 0, l = pieces.length; i < l; i++) {
            var piece = pieces[i];
            if (divide || _path2.contains(
                    piece.getPointAt(piece.getLength() / 2)) ^ subtract)
                paths.unshift(piece);
        }
        return createResult(paths, false, path1, path2, options);
    }

    /*
     * Returns the winding of the point against the curve values, as the sum of
     * the curve's parts that cross a ray from it in x-direction, upwards as +1
     * and downwards as -1. Both reorientPaths() and the graph's components
     * tell with it which path lies inside which.
     */
    function getRayWinding(point, v) {
        var winding = 0,
            x = point.x,
            y = point.y;
        // Only curves that reach the ray at all:
        if (y >= min(v[1], v[3], v[5], v[7]) && y <= max(v[1], v[3], v[5], v[7])
                && x < max(v[0], v[2], v[4], v[6])) {
            var monoCurves = Curve.getMonoCurves(v),
                roots = [];
            for (var i = 0, l = monoCurves.length; i < l; i++) {
                var mv = monoCurves[i],
                    y0 = mv[1],
                    y3 = mv[7],
                    dir = y0 < y3 ? 1 : y0 > y3 ? -1 : 0;
                if (dir && y >= min(y0, y3) && y < max(y0, y3)) {
                    // The monotone curve crosses the ray once. solveCubic()
                    // can miss it close to the ends, where it is at the end:
                    var px = Curve.solveCubic(mv, 1, y, roots, 0, 1) > 0
                            ? Curve.getPoint(mv, roots[0]).x
                            : abs(y - y0) < abs(y - y3) ? mv[0] : mv[6];
                    if (px > x)
                        winding += dir;
                }
            }
        }
        return winding;
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
     * @return {Item[]} the reoriented paths
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
            // create lookup containing potentially overlapping path bounds
            var collisions = CollisionDetection.findItemBoundsCollisions(sorted,
                    null, Numerical.GEOMETRIC_EPSILON);
            if (clockwise == null)
                clockwise = first.isClockwise();
            // Now determine the winding for each path, from large to small.
            for (var i = 0; i < length; i++) {
                var path1 = sorted[i],
                    entry1 = lookup[path1._id],
                    containerWinding = 0,
                    indices = collisions[i];
                if (indices) {
                    var point = null; // interior point, only get it if required.
                    for (var j = indices.length - 1; j >= 0; j--) {
                        if (indices[j] < i) {
                            point = point || path1.getInteriorPoint();
                            var path2 = sorted[indices[j]];
                            // As we run through the paths from largest to
                            // smallest, for any current path, all potentially
                            // containing paths have already been processed and
                            // their orientation fixed. To achieve correct
                            // orientation of contained paths based on winding,
                            // find one containing path with different
                            // "insideness" and set opposite orientation.
                            var curves = path2.getCurves(),
                                winding = 0;
                            for (var k = 0, n = curves.length; k < n; k++) {
                                winding += getRayWinding(point,
                                        curves[k].getValues());
                            }
                            if (winding) {
                                var entry2 = lookup[path2._id];
                                containerWinding = entry2.winding;
                                entry1.winding += containerWinding;
                                entry1.container = entry2.exclude
                                    ? entry2.container : path2;
                                break;
                            }
                        }
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
                    path1.setClockwise(
                            container ? !container.isClockwise() : clockwise);
                }
            }
        }
        return paths;
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
     * @param {Curve[]} curves The curves that describe the shape against which
     *     to check, as returned by {@link Path#curves} or
     *     {@link CompoundPath#curves}.
     * @param {Boolean} [dir=false] the direction in which to determine the
     *     winding contribution, `false`: in x-direction, `true`: in y-direction
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
        // `curves` can either be an array of curves, or an object containing of
        // the form `{ hor: [], ver: [] }` (see `curveCollisionsMap`), with each
        // key / value pair holding only those curves that can be crossed by a
        // horizontal / vertical line through the point to be checked.
        var curvesList = Array.isArray(curves)
            ? curves
            : curves[dir ? 'hor' : 'ver'];
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
            pathWindingL = 0,
            pathWindingR = 0,
            onPath = false,
            onAnyPath = false,
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
                    pathWindingL += winding;
                } else if (a > paR) {
                    pathWindingR += winding;
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
                // Curve is crossed at starting point.
                if (winding !== windingPrev) {
                    // Winding changes from previous curve, cancel its winding.
                    if (a0 < paL) {
                        pathWindingL += winding;
                    } else if (a0 > paR) {
                        pathWindingR += winding;
                    }
                } else if (a0 != a3Prev) {
                    // Handle a horizontal curve between the current and
                    // previous non-horizontal curve. See
                    // #1261#issuecomment-282726147 for a detailed explanation:
                    if (a3Prev < paR && a > paR) {
                        // Right winding was not added before, so add it now.
                        pathWindingR += winding;
                        onPath = true;
                    } else if (a3Prev > paL && a < paL) {
                        // Left winding was not added before, so add it now.
                        pathWindingL += winding;
                        onPath = true;
                    }
                }
                quality /= 4;
            }
            vPrev = v;
            // If we're on the curve, look at the tangent to decide whether to
            // flip direction to better determine a reliable winding number:
            // If the tangent is parallel to the direction, call getWinding()
            // again with flipped direction and return that result instead.
            return !dontFlip && a > paL && a < paR
                    && Curve.getTangent(v, t)[dir ? 'x' : 'y'] === 0
                    && getWinding(point, curves, !dir, closed, true);
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

        for (var i = 0, l = curvesList.length; i < l; i++) {
            var curve = curvesList[i],
                path = curve._path,
                v = curve.getValues(),
                res;
            if (!i || curvesList[i - 1]._path !== path) {
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

            if (i + 1 === l || curvesList[i + 1]._path !== path) {
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
                    // If the ray is cast in y direction (dir == true), the
                    // windings always have opposite sign.
                    pathWindingL = pathWindingR = path.isClockwise(closed) ^ dir
                            ? 1 : -1;
                }
                windingL += pathWindingL;
                windingR += pathWindingR;
                pathWindingL = pathWindingR = 0;
                if (onPath) {
                    onAnyPath = true;
                    onPath = false;
                }
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
            onPath: onAnyPath
        };
    }

    /*
     * Returns the part of the curve values v between the curve times, with its
     * ends moved to the given points, along with their handles. Straight
     * curves remain straight.
     */
    function getPart(v, hasHandles, time1, time2, point1, point2) {
        var part;
        if (hasHandles) {
            part = Curve.getPart(v, time1, time2).slice();
            var dx1 = point1.x - part[0],
                dy1 = point1.y - part[1],
                dx2 = point2.x - part[6],
                dy2 = point2.y - part[7];
            part[0] += dx1;
            part[1] += dy1;
            part[2] += dx1;
            part[3] += dy1;
            part[4] += dx2;
            part[5] += dy2;
            part[6] += dx2;
            part[7] += dy2;
        } else {
            part = [point1.x, point1.y, point1.x, point1.y,
                    point2.x, point2.y, point2.x, point2.y];
        }
        return part;
    }

    /**
     * Creates a planar graph of the operands' curves: All intersections become
     * vertices, the pieces of curves between them edges, and the edges bound
     * faces with a known winding for each operand.
     *
     * @param {PathItem[]} operands the operands, with closed paths only
     * @return {Object} the graph's vertices, edges, half-edges and faces
     */
    function createGraph(operands) {
        var curves = [],
            curveOperands = [],
            offsets = {},
            nonZeros = [],
            bounds = null;
        for (var i = 0, l = operands.length; i < l; i++) {
            var operand = operands[i],
                paths = getPaths(operand);
            nonZeros.push(operand.getFillRule() === 'nonzero');
            bounds = bounds ? bounds.unite(operand.getBounds())
                    : operand.getBounds();
            for (var j = 0, k = paths.length; j < k; j++) {
                var pathCurves = paths[j].getCurves();
                offsets[paths[j]._id] = curves.length;
                for (var m = 0, n = pathCurves.length; m < n; m++) {
                    curves.push(pathCurves[m]);
                    curveOperands.push(i);
                }
            }
        }
        // Points closer than epsilon are one vertex. It is relative to the size
        // of the operands, but not below the resolution of their coordinates:
        var resolution = Numerical.getEpsilon(max(
                    abs(bounds.left), abs(bounds.right),
                    abs(bounds.top), abs(bounds.bottom))),
            epsilon = max(resolution,
                bounds.getTopLeft().getDistance(bounds.getBottomRight())
                    * /*#=*/Numerical.GEOMETRIC_EPSILON),
            values = [],
            cuts = [],
            xs = [],
            ys = [],
            isEnds = [];

        function addCut(index, time, point, isEnd) {
            cuts[index].push({ time: time, point: xs.length });
            xs.push(point.x);
            ys.push(point.y);
            isEnds.push(isEnd);
        }

        // 1. Cut the curves at their ends and at all intersections, including
        // those within the same operand and the ends of overlaps:
        for (var i = 0, l = curves.length; i < l; i++) {
            var curve = curves[i];
            values.push(curve.getValues());
            cuts.push([]);
            addCut(i, 0, curve._segment1._point, true);
            addCut(i, 1, curve._segment2._point, true);
        }
        // The curves whose bounds come within 2 epsilon of each other, for the
        // intersections and the hot pixels below:
        var collisions = CollisionDetection.findCurveBoundsCollisions(
                values, values, 2 * epsilon),
            locations = CurveLocation.expand(Curve.getIntersections(curves,
                null, null, null, null, false, epsilon, collisions));
        for (var i = 0, l = locations.length; i < l; i++) {
            var loc = locations[i],
                curve = loc.getCurve();
            addCut(offsets[curve._path._id] + curve.getIndex(), loc.getTime(),
                    loc.getPoint(), false);
        }

        // 2. Merge points closer than epsilon into vertices, through union-find
        // on the points sorted by x. A vertex takes the position of a curve end
        // if it has one, so the operands' own vertices stay where they are:
        var count = xs.length,
            parents = new Array(count),
            order = new Array(count);
        for (var i = 0; i < count; i++)
            parents[i] = order[i] = i;

        function getRoot(i) {
            while (parents[i] !== i)
                i = parents[i] = parents[parents[i]];
            return i;
        }

        order.sort(function(a, b) {
            return xs[a] - xs[b];
        });
        for (var i = 0; i < count; i++) {
            var a = order[i];
            for (var j = i + 1; j < count && xs[order[j]] - xs[a] <= epsilon;
                    j++) {
                var b = order[j],
                    dx = xs[b] - xs[a],
                    dy = ys[b] - ys[a];
                if (dx * dx + dy * dy <= epsilon * epsilon)
                    parents[getRoot(a)] = getRoot(b);
            }
        }
        var vertexIndices,
            vertices;

        function createVertices() {
            vertexIndices = {};
            vertices = [];
            for (var i = 0; i < count; i++) {
                var root = getRoot(i),
                    index = vertexIndices[root];
                if (index === undefined) {
                    index = vertexIndices[root] = vertices.length;
                    vertices.push({ x: xs[i], y: ys[i], isEnd: isEnds[i],
                            point: i, outgoing: [] });
                } else if (isEnds[i] && !vertices[index].isEnd) {
                    vertices[index] = { x: xs[i], y: ys[i], isEnd: true,
                            point: i, outgoing: [] };
                }
            }
        }

        createVertices();

        function getVertex(point) {
            return vertexIndices[getRoot(point)];
        }

        // The piece of curve i between two cuts, with its ends moved to their
        // vertices, along with their handles:
        function getPiece(i, cut1, cut2) {
            return getPart(values[i], curves[i].hasHandles(), cut1.time,
                    cut2.time, vertices[getVertex(cut1.point)],
                    vertices[getVertex(cut2.point)]);
        }

        function sortCuts(list) {
            return list.sort(function(a, b) {
                return a.time - b.time;
            });
        }

        // 2b. Cut the curves where they pass within epsilon of a vertex, the
        // hot pixels of snap rounding. Moving the pieces to their vertices
        // can bring them within epsilon of further ones, so the pieces of each
        // cut are tested again, until none passes a vertex. As cuts only use
        // existing vertices, this ends:
        // The vertices that may cut curve i, as the ones within 2 epsilon of
        // its bounds, since its pieces stay within epsilon of it. Each vertex
        // lies on a curve that it cuts, so we find it among the cuts of the
        // curves whose bounds come that close:
        function getHotPixels(i) {
            var v = values[i],
                left = min(v[0], v[2], v[4], v[6]) - 2 * epsilon,
                top = min(v[1], v[3], v[5], v[7]) - 2 * epsilon,
                right = max(v[0], v[2], v[4], v[6]) + 2 * epsilon,
                bottom = max(v[1], v[3], v[5], v[7]) + 2 * epsilon,
                indices = collisions[i],
                hotPixels = [];
            for (var j = 0, k = indices.length; j < k; j++) {
                var list = cuts[indices[j]];
                for (var m = 0, n = list.length; m < n; m++) {
                    var index = getVertex(list[m].point),
                        vertex = vertices[index];
                    if (vertex.x >= left && vertex.x <= right
                            && vertex.y >= top && vertex.y <= bottom
                            && hotPixels.indexOf(index) === -1)
                        hotPixels.push(index);
                }
            }
            return hotPixels.sort(function(a, b) {
                return a - b;
            });
        }

        // The pieces of a curve that a vertex may cut, as the ones that don't
        // end in it, and whose bounds come within epsilon of it:
        function isNearPiece(piece, index, vertex) {
            var v = piece.values,
                x = vertex.x,
                y = vertex.y;
            return getVertex(piece.cut1.point) !== index
                    && getVertex(piece.cut2.point) !== index
                    && x >= min(v[0], v[2], v[4], v[6]) - epsilon
                    && x <= max(v[0], v[2], v[4], v[6]) + epsilon
                    && y >= min(v[1], v[3], v[5], v[7]) - epsilon
                    && y <= max(v[1], v[3], v[5], v[7]) + epsilon;
        }

        function addPiece(pieces, i, cut1, cut2) {
            pieces.push({
                values: getPiece(i, cut1, cut2),
                cut1: cut1,
                cut2: cut2
            });
        }

        for (var i = 0, l = curves.length; i < l; i++) {
            var candidates = getHotPixels(i);
            if (candidates.length) {
                var list = sortCuts(cuts[i]),
                    pieces = [];
                for (var j = 1, k = list.length; j < k; j++)
                    addPiece(pieces, i, list[j - 1], list[j]);
                while (pieces.length) {
                    var piece = pieces.pop();
                    for (var j = 0, k = candidates.length; j < k; j++) {
                        var index = candidates[j],
                            vertex = vertices[index];
                        if (isNearPiece(piece, index, vertex)) {
                            var point = new Point(vertex.x, vertex.y),
                                t = Curve.getNearestTime(piece.values, point);
                            if (t > 0 && t < 1 && point.isClose(
                                    Curve.getPoint(piece.values, t), epsilon)) {
                                var cut1 = piece.cut1,
                                    cut2 = piece.cut2,
                                    cut = {
                                        time: curves[i].hasHandles()
                                            ? cut1.time
                                                + (cut2.time - cut1.time) * t
                                            : Curve.getNearestTime(values[i],
                                                point),
                                        point: vertex.point
                                    };
                                cuts[i].push(cut);
                                addPiece(pieces, i, cut1, cut);
                                addPiece(pieces, i, cut, cut2);
                                break;
                            }
                        }
                    }
                }
            }
        }

        // 2c. Merge the vertices that pieces shorter than 4 epsilon join: As
        // the hot pixels reach 2 epsilon, the order of the edges around such
        // vertices can't be told apart. Merged vertices span up to about 5
        // epsilon, the precision of the result:
        var pieces = [];
        for (var i = 0, l = curves.length; i < l; i++) {
            var list = sortCuts(cuts[i]);
            for (var j = 1, k = list.length; j < k; j++) {
                var cut1 = list[j - 1],
                    cut2 = list[j];
                if (getVertex(cut1.point) !== getVertex(cut2.point)
                        && Curve.getLength(getPiece(i, cut1, cut2))
                            < 4 * epsilon)
                    pieces.push([cut1.point, cut2.point]);
            }
        }
        if (pieces.length) {
            for (var i = 0, l = pieces.length; i < l; i++) {
                var root1 = getRoot(pieces[i][0]),
                    root2 = getRoot(pieces[i][1]);
                if (root1 !== root2)
                    parents[root1] = root2;
            }
            createVertices();
        }

        // 3. Create the edges between the vertices along each curve, with the
        // change in winding of each operand when crossing them from right to
        // left. Coincident pieces become one edge that adds up their changes:
        var edges = [],
            edgesByVertex = [];

        function getCoincidence(edge1, edge2) {
            // Compare points along edge2 to edge1, and return the direction
            // of edge2 relative to edge1 if they coincide, or 0:
            var v1 = edge1.values,
                v2 = edge2.values,
                times = [];
            for (var i = 1; i <= 3; i++) {
                var point = Curve.getPoint(v2, i / 4),
                    time = Curve.getNearestTime(v1, point);
                if (!point.isClose(Curve.getPoint(v1, time), epsilon))
                    return 0;
                times.push(time);
            }
            return times[0] < times[2] ? 1 : -1;
        }

        function addEdge(edge) {
            // Look up the edges between the same vertices by the first one:
            var first = min(edge.from, edge.to),
                last = max(edge.from, edge.to),
                list = edgesByVertex[first] || (edgesByVertex[first] = []);
            for (var i = 0, l = list.length; i < l; i++) {
                var other = list[i],
                    direction = max(other.from, other.to) === last
                        && getCoincidence(other, edge);
                if (direction) {
                    for (var j = 0; j < 2; j++)
                        other.windings[j] += direction * edge.windings[j];
                    return;
                }
            }
            list.push(edge);
            edges.push(edge);
        }

        for (var i = 0, l = curves.length; i < l; i++) {
            var list = cuts[i], // Sorted in 2c.
                isStraight = !curves[i].hasHandles(),
                prev = list[0];
            for (var j = 1, k = list.length; j < k; j++) {
                var cut = list[j],
                    from = getVertex(prev.point),
                    to = getVertex(cut.point),
                    part = getPiece(i, prev, cut);
                // Drop pieces that start and end in the same vertex, unless
                // they form a loop that is longer than the pieces that vertices
                // merge, see above:
                if (from !== to || Curve.getLength(part) >= 4 * epsilon) {
                    var windings = [0, 0];
                    windings[curveOperands[i]] = 1;
                    addEdge({
                        values: part,
                        from: from,
                        to: to,
                        isStraight: isStraight,
                        windings: windings,
                        curve: i,
                        time1: prev.time,
                        time2: cut.time
                    });
                }
                prev = cut;
            }
        }

        // 4. Sort the half-edges leaving each vertex by angle. Edge i has the
        // half-edges 2 * i, leaving from its start, and 2 * i + 1, leaving
        // from its end. Their angles are measured to points a short distance
        // along them, where tangent curves already separate, but no other
        // vertex is reached yet:
        var halfEdges = [];

        function getSide(halfEdge1, halfEdge2) {
            // Half-edges that leave a vertex tangentially and can't be told
            // apart where their angles are measured: Tell on which side of the
            // first one the second one runs, half way along the shorter one,
            // as they don't cross before they end, or return 0 if it doesn't
            // run alongside the first one there:
            var v1 = halfEdge1.values,
                v2 = halfEdge2.values,
                edge2 = halfEdge2.edge,
                length = min(halfEdge1.edge.length, edge2.length) / 2,
                point = Curve.getPoint(v2, edge2.isStraight
                        ? length / edge2.length
                        : Curve.getTimeAt(v2, length)),
                time = Curve.getNearestTime(v1, point);
            return time > 0 && time < 1
                    ? Curve.getTangent(v1, time).cross(
                        point.subtract(Curve.getPoint(v1, time))) > 0 ? -1 : 1
                    : 0;
        }

        // The range of angles of a half-edge's control polygon, which contains
        // all directions in which it leaves its vertex, or null if the range
        // isn't within a half-plane:
        function getDirections(v) {
            var angles = [];
            for (var i = 0; i < 6; i += 2) {
                var dx = v[i + 2] - v[i],
                    dy = v[i + 3] - v[i + 1];
                if (dx || dy)
                    angles.push(Math.atan2(dy, dx));
            }
            var first = angles[0],
                from = 0,
                to = 0;
            for (var i = 1, l = angles.length; i < l; i++) {
                var difference = (angles[i] - first + 3 * Math.PI)
                        % (2 * Math.PI) - Math.PI;
                from = min(from, difference);
                to = max(to, difference);
            }
            return to - from < Math.PI
                    ? { start: (first + from + 2 * Math.PI) % (2 * Math.PI),
                        width: to - from }
                    : null;
        }

        // Sort the half-edges by their ranges of directions and return true,
        // if these are apart far enough that the points where their angles
        // are measured below lie over 2 epsilon apart: These points lie within
        // the ranges, at least half the shortest chord along the half-edges,
        // and so at least cos(width / 2) times that away from the vertex:
        function sortByDirections(outgoing) {
            var distance = Infinity;
            for (var j = 0, k = outgoing.length; j < k; j++) {
                var halfEdge = halfEdges[outgoing[j]],
                    v = halfEdge.values;
                halfEdge.directions = getDirections(v);
                if (!halfEdge.directions)
                    return false;
                distance = min(distance,
                        Math.sqrt((v[6] - v[0]) * (v[6] - v[0])
                            + (v[7] - v[1]) * (v[7] - v[1])) / 2);
            }
            var sorted = outgoing.slice().sort(function(a, b) {
                    return halfEdges[a].directions.start
                            - halfEdges[b].directions.start;
                }),
                gap = Infinity,
                width = 0;
            for (var j = 0, k = sorted.length; j < k; j++) {
                var directions1 = halfEdges[sorted[j]].directions,
                    directions2 = halfEdges[sorted[(j + 1) % k]].directions;
                gap = min(gap, directions2.start - directions1.start
                        - directions1.width + (j + 1 < k ? 0 : 2 * Math.PI));
                width = max(width, directions1.width);
            }
            if (gap > 0 && distance * Math.cos(width / 2)
                    * Math.sin(min(gap, Math.PI / 2)) > 2 * epsilon) {
                for (var j = 0, k = sorted.length; j < k; j++)
                    outgoing[j] = sorted[j];
                return true;
            }
            return false;
        }

        for (var i = 0, l = edges.length; i < l; i++) {
            var edge = edges[i],
                v = edge.values;
            edge.reversed = [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]];
            halfEdges.push(
                { edge: edge, values: v, from: edge.from, to: edge.to },
                { edge: edge, values: edge.reversed, from: edge.to,
                    to: edge.from });
            vertices[edge.from].outgoing.push(2 * i);
            vertices[edge.to].outgoing.push(2 * i + 1);
        }
        for (var i = 0, l = vertices.length; i < l; i++) {
            var vertex = vertices[i],
                outgoing = vertex.outgoing;
            // Up to two half-edges are in the same cyclic order either way,
            // and where their ranges of directions are apart far enough,
            // these give the order already:
            if (outgoing.length > 2 && !sortByDirections(outgoing)) {
                var distance = Infinity;
                for (var j = 0, k = outgoing.length; j < k; j++) {
                    var edge = halfEdges[outgoing[j]].edge;
                    edge.length = edge.length || Curve.getLength(edge.values);
                    distance = min(distance, edge.length / 2);
                }
                for (var j = 0, k = outgoing.length; j < k; j++) {
                    var halfEdge = halfEdges[outgoing[j]],
                        v = halfEdge.values,
                        point = Curve.getPoint(v, halfEdge.edge.isStraight
                                ? distance / halfEdge.edge.length
                                : Curve.getTimeAt(v, distance));
                    halfEdge.point = point;
                    halfEdge.angle = Math.atan2(point.y - vertex.y,
                            point.x - vertex.x);
                }
                // Start the order after the largest gap between the angles,
                // so that half-edges which are hard to tell apart are not
                // separated by the turn from pi to -pi:
                outgoing.sort(function(a, b) {
                    return halfEdges[a].angle - halfEdges[b].angle;
                });
                var start = -Math.PI,
                    gap = 0;
                for (var j = 0, k = outgoing.length; j < k; j++) {
                    var angle = halfEdges[outgoing[j]].angle,
                        previous = halfEdges[outgoing[(j || k) - 1]].angle,
                        difference = (angle - previous + 2 * Math.PI)
                            % (2 * Math.PI) || 2 * Math.PI;
                    if (difference > gap) {
                        gap = difference;
                        start = angle;
                    }
                }
                for (var j = 0, k = outgoing.length; j < k; j++) {
                    var halfEdge = halfEdges[outgoing[j]];
                    halfEdge.angle = (halfEdge.angle - start + 2 * Math.PI)
                            % (2 * Math.PI);
                }
                outgoing.sort(function(a, b) {
                    var halfEdge1 = halfEdges[a],
                        halfEdge2 = halfEdges[b];
                    return halfEdge1.point.isClose(halfEdge2.point, epsilon)
                            && getSide(halfEdge1, halfEdge2)
                            || halfEdge1.angle - halfEdge2.angle;
                });
            }
            for (var j = 0, k = outgoing.length; j < k; j++)
                halfEdges[outgoing[j]].position = j;
        }
        // Walking along a face with the face on the left, the next half-edge
        // leaves the reached vertex right before the one we came back on, in
        // counter-clockwise order:
        for (var i = 0, l = halfEdges.length; i < l; i++) {
            var outgoing = vertices[halfEdges[i].to].outgoing,
                position = halfEdges[i ^ 1].position;
            halfEdges[i].next = outgoing[(position || outgoing.length) - 1];
        }

        // 5. Collect the faces, each on the left of its half-edges, and their
        // signed areas, which are negative for the outside of each connected
        // component of the graph:
        var faces = [];
        for (var i = 0, l = halfEdges.length; i < l; i++) {
            if (halfEdges[i].face === undefined) {
                var face = { halfEdges: [], area: 0, windings: null,
                        component: null },
                    index = i;
                do {
                    var halfEdge = halfEdges[index];
                    halfEdge.face = face;
                    face.halfEdges.push(index);
                    face.area += Curve.getArea(halfEdge.values);
                    index = halfEdge.next;
                } while (index !== i);
                faces.push(face);
            }
        }

        // 6. Propagate the windings from the outside of each connected
        // component of the graph across its edges. A component that lies
        // within others gets the windings of its outside from a ray cast
        // against their edges:
        var components = [],
            rays = [],
            bounds = [];
        for (var i = 0, l = faces.length; i < l; i++) {
            var face = faces[i];
            if (!face.component) {
                var component = {
                        edges: [],
                        bounds: [Infinity, Infinity, -Infinity, -Infinity],
                        outside: face
                    },
                    list = [face];
                face.component = component;
                for (var j = 0; j < list.length; j++) {
                    var indices = list[j].halfEdges;
                    if (list[j].area < component.outside.area)
                        component.outside = list[j];
                    for (var k = 0, n = indices.length; k < n; k++) {
                        var other = halfEdges[indices[k] ^ 1].face;
                        if (!other.component) {
                            other.component = component;
                            list.push(other);
                        }
                    }
                }
                var vertex = vertices[
                        halfEdges[component.outside.halfEdges[0]].from];
                components.push(component);
                rays.push([vertex.x, vertex.y, Infinity, vertex.y]);
                bounds.push(component.bounds);
            }
        }
        // Collect the edges and bounds of each component, to cast each ray
        // only against the components whose bounds it reaches:
        for (var i = 0, l = edges.length; i < l; i++) {
            var edge = edges[i],
                v = edge.values,
                component = halfEdges[2 * i].face.component,
                b = component.bounds;
            component.edges.push(edge);
            b[0] = min(b[0], v[0], v[2], v[4], v[6]);
            b[1] = min(b[1], v[1], v[3], v[5], v[7]);
            b[2] = max(b[2], v[0], v[2], v[4], v[6]);
            b[3] = max(b[3], v[1], v[3], v[5], v[7]);
        }
        var collisions = CollisionDetection.findBoundsCollisions(rays, bounds,
                0, true);
        for (var i = 0, l = components.length; i < l; i++) {
            var outside = components[i].outside,
                point = new Point(rays[i][0], rays[i][1]),
                indices = collisions[i],
                windings = [0, 0];
            for (var j = 0, k = indices.length; j < k; j++) {
                if (indices[j] !== i) {
                    var list = components[indices[j]].edges;
                    for (var m = 0, n = list.length; m < n; m++) {
                        var edge = list[m],
                            winding = getRayWinding(point, edge.values);
                        windings[0] += winding * edge.windings[0];
                        windings[1] += winding * edge.windings[1];
                    }
                }
            }
            outside.windings = windings;
            var queue = [outside];
            for (var j = 0; j < queue.length; j++) {
                var face = queue[j],
                    indices = face.halfEdges;
                for (var k = 0, n = indices.length; k < n; k++) {
                    var index = indices[k],
                        other = halfEdges[index ^ 1].face;
                    if (!other.windings) {
                        // The face on the left of a half-edge has the higher
                        // winding when the half-edge runs along its edge:
                        var windings = halfEdges[index].edge.windings,
                            sign = index & 1 ? -1 : 1;
                        other.windings = [
                            face.windings[0] - sign * windings[0],
                            face.windings[1] - sign * windings[1]
                        ];
                        queue.push(other);
                    }
                }
            }
        }
        return {
            curves: curves,
            values: values,
            vertices: vertices,
            edges: edges,
            halfEdges: halfEdges,
            faces: faces,
            nonZeros: nonZeros,
            epsilon: epsilon
        };
    }

    /**
     * Traces the outlines of the areas that the operator includes, along the
     * edges of the operands' graph that have the result on their left and not
     * on their right. At each vertex, we turn through the result until the
     * next of them, which keeps contours apart that only touch.
     *
     * @param {PathItem[]} operands the operands, with closed paths only
     * @param {Function} operator decides if a face is part of the result, from
     *     whether it is inside each of the operands
     * @return {Path[]} the traced paths
     */
    function tracePaths(operands, operator) {
        var graph = createGraph(operands),
            halfEdges = graph.halfEdges,
            faces = graph.faces,
            nonZeros = graph.nonZeros;
        for (var i = 0, l = faces.length; i < l; i++) {
            var face = faces[i],
                windings = face.windings;
            face.isInside = !!operator(
                    nonZeros[0] ? !!windings[0] : !!(windings[0] & 1),
                    nonZeros[1] ? !!windings[1] : !!(windings[1] & 1));
        }

        function isBoundary(index) {
            return halfEdges[index].face.isInside
                    && !halfEdges[index ^ 1].face.isInside;
        }

        // The curve times along a half-edge, and if the next one continues
        // it along the same curve:
        function getTimes(index) {
            var edge = halfEdges[index].edge;
            return index & 1 ? [edge.time2, edge.time1]
                    : [edge.time1, edge.time2];
        }

        function isContinued(index, next) {
            return halfEdges[index].edge.curve === halfEdges[next].edge.curve
                    && getTimes(index)[1] === getTimes(next)[0];
        }

        var paths = [],
            isVisited = [];
        for (var i = 0, l = halfEdges.length; i < l; i++) {
            if (!isVisited[i] && isBoundary(i)) {
                var contour = [],
                    index = i;
                do {
                    isVisited[index] = true;
                    contour.push(index);
                    index = halfEdges[index].next;
                    while (!isBoundary(index))
                        index = halfEdges[index ^ 1].next;
                } while (index !== i);
                // Start where a piece doesn't continue the one before it, as
                // the pieces of a closed curve don't continue across its end:
                var length = contour.length,
                    start = 0;
                while (start < length && isContinued(
                        contour[(start || length) - 1], contour[start]))
                    start++;
                // Join the pieces of the same curve that follow each other
                // back into one part of it:
                var segments = [],
                    handleIn = null;
                for (var j = 0; j < length;) {
                    var first = contour[(start + j) % length],
                        last = first;
                    while (++j < length && isContinued(last,
                            contour[(start + j) % length]))
                        last = contour[(start + j) % length];
                    var edge = halfEdges[first].edge,
                        isStraight = edge.isStraight,
                        v = first === last
                            ? halfEdges[first].values
                            : getPart(graph.values[edge.curve], !isStraight,
                                getTimes(first)[0], getTimes(last)[1],
                                graph.vertices[halfEdges[first].from],
                                graph.vertices[halfEdges[last].to]);
                    segments.push(new Segment(new Point(v[0], v[1]),
                            handleIn,
                            !isStraight && new Point(v[2] - v[0], v[3] - v[1])));
                    handleIn = !isStraight
                            && new Point(v[4] - v[6], v[5] - v[7]);
                }
                if (handleIn)
                    segments[0].setHandleIn(handleIn);
                var path = new Path(Item.NO_INSERT);
                path.setSegments(segments);
                path.setClosed(true);
                // Only add paths that cover an area to the result.
                if (path.getArea() !== 0)
                    paths.push(path);
            }
        }
        return paths;
    }

    /*
     * Prepares the operands of a boolean operation. Without path2, the
     * operation resolves path1 on its own.
     */
    function getOperands(path1, path2) {
        var operands = [preparePath(path1, true)];
        if (path2)
            operands.push(preparePath(path2, true));
        return operands;
    }

    return /** @lends PathItem# */{
        statics: {
            // The graph of a boolean operation, to check its planarity in
            // the tests:
            _createGraph: function(path1, path2) {
                return createGraph(getOperands(path1, path2));
            }
        },

        /**
         * Returns the winding contribution number of the given point in respect
         * to this PathItem.
         *
         * @param {Point} point the location for which to determine the winding
         *     contribution
         * @param {Number} [dir=0] the direction in which to determine the
         *     winding contribution, `0`: in x-direction, `1`: in y-direction
         * @return {Object} an object containing the calculated winding number, as
         *     well as an indication whether the point was situated on the contour
         */
        _getWinding: function(point, dir, closed) {
            return getWinding(point, this.getCurves(), dir, closed);
        },

        /**
         * {@grouptitle Boolean Path Operations}
         *
         * Unites the geometry of the specified path with this path's geometry
         * and returns the result as a new path item. With an array of paths,
         * the result covers the areas inside any of them or this path. Each
         * path keeps its own fill rule.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above all paths
         *     involved in the operation
         *
         * @param {PathItem|PathItem[]} path the path or paths to unite with
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         *
         * @example {@paperscript}
         * var result = new Path.RegularPolygon([50, 50], 3, 40)
         *     .unite(new Path.Circle([50, 50], 25));
         * result.fillColor = 'red';
         *
         * @example {@paperscript}
         * // Uniting many paths at once:
         * var circles = [];
         * for (var i = 0; i < 6; i++) {
         *     circles.push(new Path.Circle([30 + i * 20, 50], 20));
         * }
         * var result = circles[0].unite(circles.slice(1));
         * result.fillColor = 'red';
         */
        unite: function(path, options) {
            return traceBoolean(this, path, 'unite', options);
        },

        /**
         * Intersects the geometry of the specified path with this path's
         * geometry and returns the result as a new path item. With an array of
         * paths, the result covers the areas inside all of them and this path.
         * Each path keeps its own fill rule.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above all paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating all paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections, keeping the parts of
         *     the curves that intersect with the areas of all other paths.
         *
         * @param {PathItem|PathItem[]} path the path or paths to intersect
         *     with
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         *
         * @example {@paperscript}
         * var result = new Path.RegularPolygon([50, 50], 3, 40)
         *     .intersect(new Path.Circle([50, 50], 25));
         * result.fillColor = 'red';
         */
        intersect: function(path, options) {
            return traceBoolean(this, path, 'intersect', options);
        },

        /**
         * Subtracts the geometry of the specified path from this path's
         * geometry and returns the result as a new path item. With an array of
         * paths, the result covers the areas inside this path and outside all
         * of them. Each path keeps its own fill rule.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above all paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating all paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections, removing the parts of
         *     the curves that intersect with the area of any other path.
         *
         * @param {PathItem|PathItem[]} path the path or paths to subtract
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         *
         * @example {@paperscript}
         * var result = new Path.RegularPolygon([50, 50], 3, 40)
         *     .subtract(new Path.Circle([50, 50], 25));
         * result.fillColor = 'red';
         */
        subtract: function(path, options) {
            return traceBoolean(this, path, 'subtract', options);
        },

        /**
         * Excludes the intersection of the geometry of the specified path with
         * this path's geometry and returns the result as a new path item. With
         * an array of paths, the result covers the areas inside an odd number
         * of the paths, this one included. Each path keeps its own fill rule.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above all paths
         *     involved in the operation
         *
         * @param {PathItem|PathItem[]} path the path or paths to exclude the
         *     intersection of
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         *
         * @example {@paperscript}
         * var result = new Path.RegularPolygon([50, 50], 3, 40)
         *     .exclude(new Path.Circle([50, 50], 25));
         * result.fillColor = 'red';
         */
        exclude: function(path, options) {
            return traceBoolean(this, path, 'exclude', options);
        },

        /**
         * Splits the geometry of this path along the geometry of the specified
         * path returns the result as a new group item. This is equivalent to
         * calling {@link #subtract(path)} and {@link #intersect(path)} and
         * putting the results into a new group.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating both paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections.
         *
         * @param {PathItem} path the path to divide by
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         */
        divide: function(path, options) {
            return options && (options.trace == false || options.stroke)
                    ? splitBoolean(this, path, 'divide', options)
                    : createResult([
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
         * @return {PathItem} the resulting path item
         */
        resolveCrossings: function() {
            var children = this._children,
                // Trace the outline of the area that the path item fills
                // according to its fill rule, without the curves inside it:
                paths = tracePaths([closePaths(this.clone(false))],
                    function(inside) {
                        return inside;
                    });
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
         * @param {Boolean} [clockwise] if provided, the orientation of the root
         *     paths will be set to the orientation specified by `clockwise`,
         *     otherwise the orientation of the largest root child is used.
         * @return {PathItem} a reference to the item itself, reoriented
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
            // contains() includes the boundary, but a point on the path isn't
            // interior, e.g. a vertex shared with another path (#1837):
            if (!this.contains(point) || this.getNearestPoint(point)
                    .isClose(point, /*#=*/Numerical.GEOMETRIC_EPSILON)) {
                // Since there is no guarantee that a poly-bezier path contains
                // the center of its bounding rectangle, we shoot a ray in x
                // direction and select a point between the first consecutive
                // intersections of the ray on the left. The ray runs through
                // the middle of the band around the center where no
                // y-monotone curve starts or ends, so that it crosses the path
                // instead of touching it or running along it (#1837):
                var curves = this.getCurves(),
                    monoCurves = [],
                    ys = [],
                    intercepts = [],
                    roots = [];
                for (var i = 0, l = curves.length; i < l; i++)
                    Base.push(monoCurves, Curve.getMonoCurves(
                            curves[i].getValues()));
                for (var i = 0, l = monoCurves.length; i < l; i++)
                    ys.push(monoCurves[i][1], monoCurves[i][7]);
                ys.sort(function(a, b) { return a - b; });
                // The center lies between the top and the bottom of the
                // bounds, which are among the ys, unless the path is flat:
                var y = point.y,
                    below = y,
                    above = y;
                for (var i = 0, l = ys.length; i < l && above === y; i++) {
                    if (ys[i] <= y) {
                        below = ys[i];
                    } else {
                        above = ys[i];
                    }
                }
                y = point.y = (below + above) / 2;
                for (var i = 0, l = monoCurves.length; i < l; i++) {
                    var mv = monoCurves[i],
                        mo0 = mv[1],
                        mo3 = mv[7];
                    if (y > min(mo0, mo3) && y < max(mo0, mo3)) {
                        intercepts.push(
                                Curve.solveCubic(mv, 1, y, roots, 0, 1) === 1
                                    ? Curve.getPoint(mv, roots[0]).x
                                    : (mv[0] + mv[6]) / 2);
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
