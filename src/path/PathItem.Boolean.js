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
            // Insert the resulting path above whichever of the two paths appear
            // further up in the stack.
            result.insertAbove(path2 && path1.isSibling(path2)
                    && path1.getIndex() < path2.getIndex() ? path2 : path1);
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
        // Without path2, the operation resolves path1 on its own.
        // NOTE: The result paths might not belong to the same type i.e.
        // subtract(A:Path, B:Path):CompoundPath etc.
        var operands = [preparePath(path1, true)];
        if (path2)
            operands.push(preparePath(path2, true));
        var paths = tracePaths(operands, operators[operation]);
        return createResult(paths, true, path1, path2, options);
    }


    function splitBoolean(path1, path2, operation, options) {
        var _path1 = preparePath(path1),
            _path2 = preparePath(path2),
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
                            if (path2.contains(point)) {
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

    /**
     * Traces the outlines of the areas that the operator includes, through a
     * planar graph of the operands' curves: All intersections become vertices,
     * the pieces of curves between them edges, and the edges bound faces with
     * a known winding for each operand.
     *
     * @param {PathItem[]} operands the operands, with closed paths only
     * @param {Function} operator decides if a face is part of the result, from
     *     whether it is inside each of the operands
     * @return {Path[]} the traced paths
     */
    function tracePaths(operands, operator) {
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
        var epsilon = max(Numerical.getEpsilon(max(
                    abs(bounds.left), abs(bounds.right),
                    abs(bounds.top), abs(bounds.bottom))),
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
        var locations = CurveLocation.expand(Curve.getIntersections(curves,
                null, null, null, null, false, epsilon));
        for (var i = 0, l = locations.length; i < l; i++) {
            var loc = locations[i],
                curve = loc.getCurve();
            addCut(offsets[curve._path._id] + curve.getIndex(), loc.getTime(),
                    loc.getPoint(), false);
        }
        /*DEBUG*/var farPairs = 0;
        if (typeof process !== 'undefined' && process.env.GRAPH_CHECK) {
            for (var i = 0, l = locations.length; i < l; i++) {
                var d = locations[i].getPoint().getDistance(locations[i]._intersection.getPoint());
                if (d > epsilon) { farPairs++; if (process.env.GRAPH_FAR) console.log('FAR', d, 'eps', epsilon, locations[i].getPoint().toString(), locations[i]._intersection.getPoint().toString(), 't', locations[i].getTime(), locations[i]._intersection.getTime(), 'overlap', locations[i].hasOverlap(), '\n  c1', locations[i].getCurve().getValues().join(','), '\n  c2', locations[i]._intersection.getCurve().getValues().join(',')); }
            }
        }/*END*/

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
        var vertexIndices = {},
            vertices = [];
        for (var i = 0; i < count; i++) {
            var root = getRoot(i),
                index = vertexIndices[root];
            if (index === undefined) {
                index = vertexIndices[root] = vertices.length;
                vertices.push({ x: xs[i], y: ys[i], isEnd: isEnds[i],
                        outgoing: [] });
            } else if (isEnds[i] && !vertices[index].isEnd) {
                vertices[index] = { x: xs[i], y: ys[i], isEnd: true,
                        outgoing: [] };
            }
        }

        function getVertex(point) {
            return vertexIndices[getRoot(point)];
        }

        // 3. Create the edges between the vertices along each curve, with the
        // change in winding of each operand when crossing them from right to
        // left. Coincident pieces become one edge that adds up their changes:
        var edges = [],
            edgesByVertices = {};

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
            var from = edge.from,
                to = edge.to,
                key = min(from, to) + ',' + max(from, to),
                list = edgesByVertices[key] || (edgesByVertices[key] = []);
            for (var i = 0, l = list.length; i < l; i++) {
                var other = list[i],
                    direction = getCoincidence(other, edge);
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
            var list = cuts[i].sort(function(a, b) {
                    return a.time - b.time;
                }),
                v = values[i],
                isStraight = !curves[i].hasHandles(),
                prev = list[0];
            for (var j = 1, k = list.length; j < k; j++) {
                var cut = list[j],
                    from = getVertex(prev.point),
                    to = getVertex(cut.point),
                    p1 = vertices[from],
                    p2 = vertices[to],
                    part;
                if (isStraight) {
                    part = [p1.x, p1.y, p1.x, p1.y, p2.x, p2.y, p2.x, p2.y];
                } else {
                    // Move the ends of the piece to its vertices, along with
                    // their handles:
                    part = Curve.getPart(v, prev.time, cut.time).slice();
                    var dx1 = p1.x - part[0],
                        dy1 = p1.y - part[1],
                        dx2 = p2.x - part[6],
                        dy2 = p2.y - part[7];
                    part[0] += dx1;
                    part[1] += dy1;
                    part[2] += dx1;
                    part[3] += dy1;
                    part[4] += dx2;
                    part[5] += dy2;
                    part[6] += dx2;
                    part[7] += dy2;
                }
                // Drop pieces that start and end in the same vertex, unless
                // they form a loop that is larger than the vertex:
                if (from !== to || Curve.getLength(part) > 2 * epsilon) {
                    var windings = [0, 0];
                    windings[curveOperands[i]] = 1;
                    addEdge({
                        values: part,
                        from: from,
                        to: to,
                        isStraight: isStraight, source: i,
                        windings: windings
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
        for (var i = 0, l = edges.length; i < l; i++) {
            var edge = edges[i],
                v = edge.values,
                length = Curve.getLength(v);
            edge.reversed = [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]];
            halfEdges.push(
                { edge: edge, values: v, from: edge.from, to: edge.to,
                    length: length },
                { edge: edge, values: edge.reversed, from: edge.to,
                    to: edge.from, length: length });
            vertices[edge.from].outgoing.push(2 * i);
            vertices[edge.to].outgoing.push(2 * i + 1);
        }
        for (var i = 0, l = vertices.length; i < l; i++) {
            var vertex = vertices[i],
                outgoing = vertex.outgoing,
                distance = Infinity;
            for (var j = 0, k = outgoing.length; j < k; j++)
                distance = min(distance, halfEdges[outgoing[j]].length / 8);
            for (var j = 0, k = outgoing.length; j < k; j++) {
                var halfEdge = halfEdges[outgoing[j]],
                    v = halfEdge.values,
                    point = Curve.getPoint(v, halfEdge.edge.isStraight
                            ? distance / halfEdge.length
                            : Curve.getTimeAt(v, distance));
                halfEdge.angle = Math.atan2(point.y - vertex.y,
                        point.x - vertex.x);
            }
            outgoing.sort(function(a, b) {
                return halfEdges[a].angle - halfEdges[b].angle;
            });
            for (var j = 0, k = outgoing.length; j < k; j++)
                halfEdges[outgoing[j]].position = j;
        }

        // Walking along a face with the face on the left, the next half-edge
        // leaves the reached vertex right before the one we came back on, in
        // counter-clockwise order:
        function getNext(index) {
            var outgoing = vertices[halfEdges[index].to].outgoing,
                position = halfEdges[index ^ 1].position;
            return outgoing[(position || outgoing.length) - 1];
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
                    index = getNext(index);
                } while (index !== i);
                faces.push(face);
            }
        }

        // 6. Propagate the windings from the outside of each connected
        // component of the graph across its edges. A component that lies
        // within others gets the windings of its outside from a ray cast
        // against their edges:
        var components = [];
        for (var i = 0, l = faces.length; i < l; i++) {
            var face = faces[i];
            if (!face.component) {
                var component = [face];
                face.component = component;
                for (var j = 0; j < component.length; j++) {
                    var indices = component[j].halfEdges;
                    for (var k = 0, n = indices.length; k < n; k++) {
                        var other = halfEdges[indices[k] ^ 1].face;
                        if (!other.component) {
                            other.component = component;
                            component.push(other);
                        }
                    }
                }
                components.push(component);
            }
        }

        function getRayWindings(point, component) {
            // Count the edges of other components that cross a ray from the
            // point in x-direction, upwards as +1 and downwards as -1:
            var windings = [0, 0],
                roots = [];
            for (var i = 0, l = edges.length; i < l; i++) {
                var edge = edges[i];
                if (halfEdges[2 * i].face.component !== component) {
                    var monoCurves = Curve.getMonoCurves(edge.values);
                    for (var j = 0, k = monoCurves.length; j < k; j++) {
                        var mv = monoCurves[j],
                            y0 = mv[1],
                            y3 = mv[7],
                            dir = y0 < y3 ? 1 : y0 > y3 ? -1 : 0;
                        if (dir && point.y >= min(y0, y3)
                                && point.y < max(y0, y3)
                                && Curve.solveCubic(mv, 1, point.y, roots,
                                    0, 1) > 0
                                && Curve.getPoint(mv, roots[0]).x > point.x) {
                            for (var m = 0; m < 2; m++)
                                windings[m] += dir * edge.windings[m];
                        }
                    }
                }
            }
            return windings;
        }

        for (var i = 0, l = components.length; i < l; i++) {
            var component = components[i],
                outside = component[0];
            for (var j = 1, k = component.length; j < k; j++) {
                if (component[j].area < outside.area)
                    outside = component[j];
            }
            var vertex = vertices[halfEdges[outside.halfEdges[0]].from];
            outside.windings = l > 1
                    ? getRayWindings(new Point(vertex.x, vertex.y), component)
                    : [0, 0];
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

        // 7. Trace the half-edges that have the result on their left and not
        // on their right. At each vertex, we turn through the result until the
        // next of them, which keeps contours apart that only touch:
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

        /*DEBUG*/if (typeof process !== 'undefined' && process.env.GRAPH_CHECK) {
            var bad = 0;
            for (var i = 0; i < halfEdges.length; i += 2) {
                var wl = halfEdges[i].face.windings, wr = halfEdges[i + 1].face.windings, d = halfEdges[i].edge.windings;
                if (wl[0] - wr[0] !== d[0] || wl[1] - wr[1] !== d[1]) bad++;
            }
            if (bad) console.log('INCONSISTENT', bad, 'of', halfEdges.length / 2, 'farPairs', farPairs);
            if (bad && process.env.GRAPH_CLASSIFY) {
                var ecs2 = edges.map(function(e) { var v = e.values; return new Curve(new Point(v[0], v[1]), new Point(v[2] - v[0], v[3] - v[1]), new Point(v[4] - v[6], v[5] - v[7]), new Point(v[6], v[7])); });
                var missed = 0, overlapsMissed = 0, onEdge = 0, minDist = Infinity;
                for (var a = 0; a < ecs2.length; a++) for (var b = a + 1; b < ecs2.length; b++) {
                    ecs2[a].getIntersections(ecs2[b]).forEach(function(l) {
                        var pt = l.point, ok = [edges[a].from, edges[a].to, edges[b].from, edges[b].to].some(function(vi) { return pt.isClose(new Point(vertices[vi].x, vertices[vi].y), epsilon); });
                        if (!ok) { if (l.hasOverlap()) overlapsMissed++; else missed++; }
                    });
                }
                vertices.forEach(function(v, vi) {
                    var p = new Point(v.x, v.y);
                    edges.forEach(function(e) {
                        if (e.from !== vi && e.to !== vi) {
                            var t = Curve.getNearestTime(e.values, p), d = Curve.getPoint(e.values, t).getDistance(p);
                            if (d <= epsilon) { onEdge++; if (process.env.GRAPH_VOE) console.log('VOE vertex', vi, v.x, v.y, 'isEnd', v.isEnd, 'degree', v.outgoing.length, 'edge', e.from, e.to, 't', t, 'd', d, 'eps', epsilon, 'src', curves[e.source]._path._id + ':' + curves[e.source].getIndex(), values[e.source].join(',')); v.outgoing.forEach(function(h) { var he = halfEdges[h], c = curves[he.edge.source]; console.log('   out', h, he.from, '->', he.to, c._path._id + ':' + c.getIndex(), values[he.edge.source].join(','), he.edge.windings.join('/')); }); cuts[e.source].forEach(function(cut) { console.log('   cut', cut.time, cut.point, getVertex(cut.point), xs[cut.point], ys[cut.point]); }); }
                            else minDist = Math.min(minDist, d / epsilon);
                        }
                    });
                });
                console.log('CLASS far=' + farPairs + ' crossing=' + missed + ' overlap=' + overlapsMissed + ' vertexOnEdge=' + onEdge + ' nearestOther=' + minDist.toFixed(1));
            }
            if (bad && process.env.GRAPH_PLANAR) {
                var ecs = edges.map(function(e) { var v = e.values; return new Curve(new Point(v[0], v[1]), new Point(v[2] - v[0], v[3] - v[1]), new Point(v[4] - v[6], v[5] - v[7]), new Point(v[6], v[7])); });
                for (var a = 0; a < ecs.length; a++) for (var b = a + 1; b < ecs.length; b++) {
                    ecs[a].getIntersections(ecs[b]).forEach(function(l) {
                        var pt = l.point, ok = [edges[a].from, edges[a].to, edges[b].from, edges[b].to].some(function(vi) { return pt.isClose(new Point(vertices[vi].x, vertices[vi].y), epsilon); });
                        if (!ok) console.log('MISSED', a, b, pt.toString(), l.hasOverlap(), 'eps', epsilon, '\n  A', edges[a].values.join(','), '\n  B', edges[b].values.join(','));
                    });
                }
                vertices.forEach(function(v, vi) {
                    var o = v.outgoing;
                    for (var k = 0; k < o.length; k++) {
                        var h1 = halfEdges[o[k]], h2 = halfEdges[o[(k + 1) % o.length]];
                        if (o.length > 1 && Math.abs(h1.angle - h2.angle) < 1e-6) console.log('TIE at', vi, v.x, v.y, h1.angle, h2.angle, '\n  srcA', values[h1.edge.source].join(','), curves[h1.edge.source].getIndex(), curves[h1.edge.source]._path._id, '\n  srcB', values[h2.edge.source].join(','), curves[h2.edge.source].getIndex(), curves[h2.edge.source]._path._id, '\n  A', h1.values.join(','), '\n  B', h2.values.join(','));
                    }
                });
            }
        }/*END*/
        var paths = [],
            isVisited = [];
        for (var i = 0, l = halfEdges.length; i < l; i++) {
            if (!isVisited[i] && isBoundary(i)) {
                var path = new Path(Item.NO_INSERT),
                    segments = [],
                    index = i,
                    handleIn = null;
                do {
                    var halfEdge = halfEdges[index],
                        v = halfEdge.values,
                        isStraight = halfEdge.edge.isStraight;
                    isVisited[index] = true;
                    segments.push(new Segment(new Point(v[0], v[1]),
                            handleIn,
                            !isStraight && new Point(v[2] - v[0], v[3] - v[1])));
                    handleIn = !isStraight
                            && new Point(v[4] - v[6], v[5] - v[7]);
                    index = getNext(index);
                    while (!isBoundary(index))
                        index = getNext(index ^ 1);
                } while (index !== i);
                if (handleIn)
                    segments[0].setHandleIn(handleIn);
                path.setSegments(segments);
                path.setClosed(true);
                // Only add paths that cover an area to the result.
                if (path.getArea() !== 0)
                    paths.push(path);
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
         * and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         *
         * @param {PathItem} path the path to unite with
         * @param {Object} [options] the boolean operation options
         * @return {PathItem} the resulting path item
         *
         * @example {@paperscript}
         * var result = new Path.RegularPolygon([50, 50], 3, 40)
         *     .unite(new Path.Circle([50, 50], 25));
         * result.fillColor = 'red';
         */
        unite: function(path, options) {
            return traceBoolean(this, path, 'unite', options);
        },

        /**
         * Intersects the geometry of the specified path with this path's
         * geometry and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating both paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections, keeping the parts of
         *     the curves that intersect with the area of the second path.
         *
         * @param {PathItem} path the path to intersect with
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
         * geometry and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating both paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections, removing the parts of
         *     the curves that intersect with the area of the second path.
         *
         * @param {PathItem} path the path to subtract
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
         * this path's geometry and returns the result as a new path item.
         *
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         *
         * @param {PathItem} path the path to exclude the intersection of
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
