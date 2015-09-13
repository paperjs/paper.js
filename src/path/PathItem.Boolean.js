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

    // Creates a cloned version of the path that we can modify freely, with its
    // matrix applied to its geometry. Calls #reduce() to simplify compound
    // paths and remove empty curves, and #reorient() to make sure all paths
    // have correct winding direction.
    function preparePath(path) {
        return path.clone(false).reduce().reorient().transform(null, true, true);
    }

    // Boolean operators return true if a curve with the given winding
    // contribution contributes to the final result or not. They are called
    // for each curve in the graph after curves in the operands are
    // split at intersections.
    function computeBoolean(path1, path2, operation) {
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
        // console.time('intersection');
        var locations = _path1._getIntersections(_path2, null, []);
        // console.timeEnd('inter');
        if (_path2) {
            // console.time('self-intersection');
            // Resolve self-intersections on both source paths and add them to
            // the locations too:
            // var self = [];
            _path1._getIntersections(null, null, locations);
            _path2._getIntersections(null, null, locations);
            /*
            self.forEach(function(inter) {
                new Path.Circle({
                    center: inter.point,
                    radius: 3,
                    fillColor: 'red'
                });
            });
            console.log(self);
            */
            // console.timeEnd('self-intersection');
        }
        // console.timeEnd('intersection');
        splitPath(Curve._filterIntersections(locations, true));

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
        // does not change between two intersections.
        // First, propagate winding contributions for curve chains starting in
        // all intersections:
        for (var i = 0, l = locations.length; i < l; i++) {
            propagateWinding(locations[i]._segment, _path1, _path2, monoCurves,
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
        // Trace closed contours and insert them into the result.
        var result = new CompoundPath(Item.NO_INSERT);
        result.addChildren(tracePaths(segments, monoCurves, operation), true);
        // See if the CompoundPath can be reduced to just a simple Path.
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

    /**
     * Private method for splitting a PathItem at the given intersections.
     * The routine works for both self intersections and intersections
     * between PathItems.
     *
     * @param {CurveLocation[]} intersections Array of CurveLocation objects
     */
    function splitPath(intersections) {
        if (window.reportIntersections) {
            console.log('Intersections', intersections.length);
            intersections.forEach(function(inter) {
                if (inter._other)
                    return;
                var other = inter._intersection;
                var log = ['CurveLocation', inter._id, 'p', inter.getPath()._id,
                    'i', inter.getIndex(), 't', inter._parameter,
                    'o', !!inter._overlap,
                    'Other', other._id, 'p', other.getPath()._id,
                    'i', other.getIndex(), 't', other._parameter,
                    'o', !!other._overlap];
                new Path.Circle({
                    center: inter.point,
                    radius: 3,
                    strokeColor: 'green'
                });
                console.log(log.map(function(v) {
                    return v == null ? '-' : v
                }).join(' '));
            });
        }

        // TODO: Make public in API, since useful!
        var tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            noHandles = false,
            clearSegments = [];

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
                noHandles = !curve.hasHandles();
            }
            var segment;
            if (t < tMin) {
                segment = curve._segment1;
            } else if (t > tMax) {
                segment = curve._segment2;
            } else {
                // Split the curve at t, passing true for ignoreStraight to not
                // force the result of splitting straight curves straight.
                var newCurve = curve.divide(t, true, true);
                segment = newCurve._segment1;
                curve = newCurve.getPrevious();
                // Keep track of segments of once straight curves, so they can
                // be set back straight at the end.
                if (noHandles)
                    clearSegments.push(segment);
            }
            // Link the new segment with the intersection on the other curve
            segment._intersection = loc._intersection;
            loc._segment = segment;
            prev = loc;
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
        var epsilon = /*#=*/Numerical.GEOMETRIC_EPSILON,
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
            // TODO: Don't we need to pass on testContains here?
            if (yTop > -Infinity)
                windLeft = getWinding(new Point(px, yTop), curves);
            if (yBottom < Infinity)
                windRight = getWinding(new Point(px, yBottom), curves);
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
        var epsilon = /*#=*/Numerical.GEOMETRIC_EPSILON;
            chain = [],
            startSeg = segment,
            totalLength = 0,
            windingSum = 0;
        do {
            var curve = segment.getCurve(),
                length = curve.getLength();
            chain.push({ segment: segment, curve: curve, length: length });
            totalLength += length;
            segment = segment.getNext();
        } while (segment && !segment._intersection && segment !== startSeg);
        // Calculate the average winding among three evenly distributed
        // points along this curve chain as a representative winding number.
        // This selection gives a better chance of returning a correct
        // winding than equally dividing the curve chain, with the same
        // (amortised) time.
        for (var i = 0; i < 3; i++) {
            // Try the points at 1/4, 2/4 and 3/4 of the total length:
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
        for (var j = chain.length - 1; j >= 0; j--) {
            var seg = chain[j].segment,
                inter = seg._intersection,
                wind = winding;
            // We need to handle the edge cases of overlapping curves
            // differently based on the type of operation, and adjust the
            // winding number accordingly:
            if (inter && inter._overlap) {
                switch (operation) {
                case 'unite':
                    if (wind === 1)
                        wind = 2;
                    break;
                case 'intersect':
                    if (wind === 2)
                        wind = 1;
                    break;
                }
            }
            seg._winding = wind;
        }
    }

    var segmentOffset = {};
    var pathIndices = {};
    var pathIndex = 0;

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
    function tracePaths(segments, monoCurves, operation) {
        var segmentCount = 0;
        var pathCount = 0;
        var textAngle = 20;
        var fontSize = 5 / paper.project.activeLayer.scaling.x;

        function labelSegment(seg, text, color) {
            var point = seg.point;
            var key = Math.round(point.x) + ',' + Math.round(point.y);
            var offset = segmentOffset[key] || 0;
            segmentOffset[key] = offset + 1;
            var text = new PointText({
                point: point.add(new Point(fontSize, fontSize / 2)
                        .rotate(textAngle).add(0, offset * fontSize * 1.2)),
                content: text,
                justification: 'left',
                fillColor: color,
                fontSize: fontSize
            });
            // TODO! PointText should have pivot in #point by default!
            text.pivot = text.globalToLocal(text.point);
            text.rotation = textAngle;
        }

        function drawSegment(seg, text, index, color) {
            if (!window.reportSegments)
                return;
            new Path.Circle({
                center: seg.point,
                radius: fontSize / 2,
                strokeColor: color,
                strokeScaling: false
            });
            var inter = seg._intersection;
            labelSegment(seg, '#' + (pathCount + 1) + '.'
                            + (path ? path._segments.length + 1 : 1)
                            + ' ' + (segmentCount++) + '/' + index + ': ' + text
                    + '   v: ' + !!seg._visited
                    + '   p: ' + seg._path._id
                    + '   x: ' + seg._point.x
                    + '   y: ' + seg._point.y
                    + '   op: ' + operator(seg._winding)
                    + '   o: ' + (inter && inter._overlap || 0)
                    + '   w: ' + seg._winding
                    , color);
        }



        for (var i = 0; i < (window.reportWindings ? segments.length : 0); i++) {
            var seg = segments[i];
                path = seg._path,
                id = path._id,
                point = seg.point,
                inter = seg._intersection;
            if (!(id in pathIndices))
                pathIndices[id] = ++pathIndex;

            labelSegment(seg, '#' + pathIndex + '.' + (i + 1)
                    + '   i: ' + !!inter
                    + '   p: ' + seg._path._id
                    + '   x: ' + seg._point.x
                    + '   y: ' + seg._point.y
                    + '   o: ' + (inter && inter._overlap || 0)
                    + '   w: ' + seg._winding
                    , 'green');
        }

        var paths = [],
            operator = operators[operation],
            epsilon = /*#=*/Numerical.EPSILON,
            // Values for getTangentAt() that are almost 0 and 1.
            // NOTE: Even though getTangentAt() supports 0 and 1 instead of
            // tMin and tMax, we still need to use this instead, as other issues
            // emerge from switching to 0 and 1 in edge cases.
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin;
        for (var i = 0, l = segments.length; i < l; i++) {
            var seg = segments[i];
            if (seg._visited || !operator(seg._winding)) {
                // drawSegment(seg, seg._visited ? 'visited' : 'filtered', i, 'red');
                continue;
            }
            var path = new Path(Item.NO_INSERT),
                startSeg = seg,
                inter = seg._intersection,
                otherSeg = inter && inter._segment,
                otherStartSeg = otherSeg,
                added = false; // Whether a first segment as added already
            do {
                var handleIn = added && seg._handleIn;
                // If the intersection segment is valid, try switching to
                // it, with an appropriate direction to continue traversal.
                // Else, stay on the same contour.
                if (added && otherSeg && otherSeg !== startSeg) {
                    if (otherSeg._path === seg._path) { // Self-intersection
                        drawSegment(seg, 'self-int', i, 'red');
                        // Switch to the intersection segment, as we need to
                        // resolving self-Intersections.
                        seg = otherSeg;
                    } else if (operation !== 'exclude' && operator(seg._winding)) {
                        // Do not switch to the intersection as the segment
                        // is part of the boolean result.
                        drawSegment(seg, 'keep', i, 'black');
                    } else if (operation !== 'intersect' && inter._overlap) {
                        // Switch to the overlapping intersection segment
                        // if its winding number along the curve is 1, to
                        // leave the overlapping area.
                        // NOTE: We cannot check the next (overlapping)
                        // segment since its winding number will always be 2
                        drawSegment(seg, 'overlap', i, 'orange');
                        var curve = otherSeg.getCurve();
                        if (getWinding(curve.getPointAt(0.5, true),
                                monoCurves, curve.isHorizontal()) === 1) {
                            seg = otherSeg;
                        }
                    } else {
                        var t = seg.getCurve().getTangentAt(tMin, true),
                            // Get both curves at the intersection
                            // (except the entry curves).
                            c2 = otherSeg.getCurve(),
                            c1 = c2.getPrevious(),
                            // Calculate their winding values and tangents.
                            t1 = c1.getTangentAt(tMax, true),
                            t2 = c2.getTangentAt(tMin, true);
                            // Cross product of the entry and exit tangent
                            // vectors at the intersection, will let us select
                            // the correct contour to traverse next.
                        if (Math.abs(t.cross(t1) * t.cross(t2)) > epsilon) {
                            seg = otherSeg;
                            drawSegment(seg, 'switch', i, 'green');
                        } else {
                            drawSegment(seg, 'no cross', i, 'blue');
                        }
                    }
                } else {
                    drawSegment(seg, 'keep', i, 'black');
                }
                // Add the current segment to the path, and mark the added
                // segment as visited.
                path.add(new Segment(seg._point, handleIn, seg._handleOut));
                seg._visited = true;
                added = true;
                // Move to the next segment according to the traversal direction
                seg = seg.getNext();
                inter = seg && seg._intersection;
                otherSeg = inter && inter._segment;
                if (window.reportSegments) {
                    console.log(seg, seg && !seg._visited,
                        seg !== startSeg, seg !== otherStartSeg,
                        inter, seg && operator(seg._winding));
                }
            } while (seg && seg !== startSeg && seg !== otherStartSeg
                    // Exclusion switches on each intersection, we need to look
                    // ahead & carry on if the other segment wasn't visited yet.
                    && (!seg._visited || operation === 'exclude'
                        && otherSeg && !otherSeg._visited)
                    && (inter || operator(seg._winding)));
            // Finish with closing the paths if necessary, correctly linking up
            // curves etc.
            if (seg === startSeg || seg === otherStartSeg) {
                path.firstSegment.setHandleIn(seg._handleIn);
                path.setClosed(true);
                if (window.reportSegments) {
                    console.log('Boolean operation completed',
                            '#' + (pathCount + 1) + '.' +
                            (path ? path._segments.length + 1 : 1));
                }
            } else {
                // path.lastSegment._handleOut.set(0, 0);
                console.error('Boolean operation results in open path, segs =',
                        path._segments.length, 'length = ', path.getLength(),
                        '#' + (pathCount + 1) + '.' +
                        (path ? path._segments.length + 1 : 1));
                path = null;
            }
            // Add the path to the result, while avoiding stray segments and
            // paths that are incomplete or cover no area.
            // As an optimization, only check paths with 4 or less segments
            // for their area, and assume that they cover an area when more.
            if (path && (path._segments.length > 4
                    || !Numerical.isZero(path.getArea())))
                paths.push(path);
            if (window.reportSegments) {
                pathCount++;
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
