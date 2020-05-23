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

/**
 * @name CollisionDetection
 * @namespace
 * @private
 * @author Jan Boesenberg <jan.boesenberg@gmail.com>
 */
var CollisionDetection = /** @lends CollisionDetection */{
    /**
     * Finds collisions between axis aligned bounding boxes of items.
     *
     * This function takes the bounds of all items in the items1 and items2
     * arrays and calls findBoundsCollisions().
     *
     * @param {Array} items1 Array of items for which collisions should be
     *     found.
     * @param {Array} [items2] Array of items  that the first array should be
     *     compared with. If not provided, collisions between items within
     *     the first array will be returned.
     * @param {Number} [tolerance] If provided, the tolerance will be added to
     *     all sides of each bounds when checking for collisions.
     * @returns {Array} Array containing for the bounds at the same index in
     *     items1 an array of the indexes of colliding bounds in items2
     */
    findItemBoundsCollisions: function(items1, items2, tolerance) {
        function getBounds(items) {
            var bounds = new Array(items.length);
            for (var i = 0; i < items.length; i++) {
                var rect = items[i].getBounds();
                bounds[i] = [rect.left, rect.top, rect.right, rect.bottom];
            }
            return bounds;
        }

        var bounds1 = getBounds(items1),
            bounds2 = !items2 || items2 === items1
                ? bounds1
                : getBounds(items2);
        return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
    },

    /**
     * Finds collisions between curves bounds. For performance reasons this
     * uses broad bounds of the curve, which can be calculated much faster than
     * the actual bounds. Broad bounds guarantee to contain the full curve,
     * but they are usually larger than the actual bounds of a curve.
     *
     * This function takes the broad bounds of all curve values in the curves1
     * and curves2 arrays and calls findBoundsCollisions().
     *
     * @param {Array} curves1 Array of curve values for which collisions should
     *     be found.
     * @param {Array} [curves2] Array of curve values that the first array
     *     should be compared with. If not provided, collisions between curve
     *     bounds within the first arrray will be returned.
     * @param {Number} [tolerance] If provided, the tolerance will be added to
     *     all sides of each bounds when checking for collisions.
     * @param {Boolean} [bothAxis] If true, the sweep is performed along both
     *     axis, and the results include collisions for both: `{ hor, ver }`.
     * @returns {Array} Array containing for the bounds at the same index in
     *     curves1 an array of the indexes of colliding bounds in curves2
     */
    findCurveBoundsCollisions: function(curves1, curves2, tolerance, bothAxis) {
        function getBounds(curves) {
            var min = Math.min,
                max = Math.max,
                bounds = new Array(curves.length);
            for (var i = 0; i < curves.length; i++) {
                var v = curves[i];
                bounds[i] = [
                    min(v[0], v[2], v[4], v[6]),
                    min(v[1], v[3], v[5], v[7]),
                    max(v[0], v[2], v[4], v[6]),
                    max(v[1], v[3], v[5], v[7])
                ];
            }
            return bounds;
        }

        var bounds1 = getBounds(curves1),
            bounds2 = !curves2 || curves2 === curves1
                ? bounds1
                : getBounds(curves2);
        if (bothAxis) {
            var hor = this.findBoundsCollisions(
                    bounds1, bounds2, tolerance || 0, false, true),
                ver = this.findBoundsCollisions(
                    bounds1, bounds2, tolerance || 0, true, true),
                list = [];
            for (var i = 0, l = hor.length; i < l; i++) {
                list[i] = { hor: hor[i], ver: ver[i] };
            }
            return list;
        }
        return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
    },

    /**
     * Finds collisions between two sets of bounding rectangles.
     *
     * The collision detection is implemented as a sweep and prune algorithm
     * with sweep either along the x or y axis (primary axis) and immediate
     * check on secondary axis for potential pairs.
     *
     * Each entry in the bounds arrays must be an array of length 4 with
     * x0, y0, x1, and y1 as the array elements.
     *
     * The returned array has the same length as bounds1. Each entry
     * contains an array with all indices of overlapping bounds of
     * bounds2 (or bounds1 if bounds2 is not provided) sorted
     * in ascending order.
     *
     * If the second bounds array parameter is null, collisions between bounds
     * within the first bounds array will be found. In this case the indexed
     * returned for each bounds will not contain the bounds' own index.
     *
     *
     * @param {Array} boundsA Array of bounds objects for which collisions
     *     should be found.
     * @param {Array} [boundsB] Array of bounds that the first array should
     *     be compared with. If not provided, collisions between bounds within
     *     the first arrray will be returned.
     * @param {Number} [tolerance] If provided, the tolerance will be added to
     *     all sides of each bounds when checking for collisions.
     * @param {Boolean} [sweepVertical] If true, the sweep is performed along
     *     the y-axis.
     * @param {Boolean} [onlySweepAxisCollisions] If true, no collision checks
     *     will be done on the secondary axis.
     * @returns {Array} Array containing for the bounds at the same index in
     *     boundsA an array of the indexes of colliding bounds in boundsB
     */
    findBoundsCollisions: function(boundsA, boundsB, tolerance,
        sweepVertical, onlySweepAxisCollisions) {
        var self = !boundsB || boundsA === boundsB,
            allBounds = self ? boundsA : boundsA.concat(boundsB),
            lengthA = boundsA.length,
            lengthAll = allBounds.length;

        // Binary search utility function.
        // For multiple same entries, this returns the rightmost entry.
        // https://en.wikipedia.org/wiki/Binary_search_algorithm#Procedure_for_finding_the_rightmost_element
        function binarySearch(indices, coord, value) {
            var lo = 0,
                hi = indices.length;
            while (lo < hi) {
                var mid = (hi + lo) >>> 1; // Same as Math.floor((hi + lo) / 2)
                if (allBounds[indices[mid]][coord] < value) {
                    lo = mid + 1;
                } else {
                    hi = mid;
                }
            }
            return lo - 1;
        }

        // Set coordinates for primary and secondary axis depending on sweep
        // direction. By default we sweep in horizontal direction, which
        // means x is the primary axis.
        var pri0 = sweepVertical ? 1 : 0,
            pri1 = pri0 + 2,
            sec0 = sweepVertical ? 0 : 1,
            sec1 = sec0 + 2;
        // Create array with all indices sorted by lower boundary on primary
        // axis.
        var allIndicesByPri0 = new Array(lengthAll);
        for (var i = 0; i < lengthAll; i++) {
            allIndicesByPri0[i] = i;
        }
        allIndicesByPri0.sort(function(i1, i2) {
            return allBounds[i1][pri0] - allBounds[i2][pri0];
        });
        // Sweep along primary axis. Indices of active bounds are kept in an
        // array sorted by higher boundary on primary axis.
        var activeIndicesByPri1 = [],
            allCollisions = new Array(lengthA);
        for (var i = 0; i < lengthAll; i++) {
            var curIndex = allIndicesByPri0[i],
                curBounds = allBounds[curIndex],
                // The original index in boundsA or boundsB:
                origIndex = self ? curIndex : curIndex - lengthA,
                isCurrentA = curIndex < lengthA,
                isCurrentB = self || !isCurrentA,
                curCollisions = isCurrentA ? [] : null;
            if (activeIndicesByPri1.length) {
                // remove (prune) indices that are no longer active.
                var pruneCount = binarySearch(activeIndicesByPri1, pri1,
                        curBounds[pri0] - tolerance) + 1;
                activeIndicesByPri1.splice(0, pruneCount);
                // Add collisions for current index.
                if (self && onlySweepAxisCollisions) {
                    // All active indexes can be added, no further checks needed
                    curCollisions = curCollisions.concat(activeIndicesByPri1);
                   // Add current index to collisions of all active indexes
                    for (var j = 0; j < activeIndicesByPri1.length; j++) {
                        var activeIndex = activeIndicesByPri1[j];
                        allCollisions[activeIndex].push(origIndex);
                    }
                } else {
                    var curSec1 = curBounds[sec1],
                        curSec0 = curBounds[sec0];
                    for (var j = 0; j < activeIndicesByPri1.length; j++) {
                        var activeIndex = activeIndicesByPri1[j],
                            activeBounds = allBounds[activeIndex],
                            isActiveA = activeIndex < lengthA,
                            isActiveB = self || activeIndex >= lengthA;

                        // Check secondary axis bounds if necessary.
                        if (
                            onlySweepAxisCollisions ||
                            (
                                isCurrentA && isActiveB ||
                                isCurrentB && isActiveA
                            ) && (
                                curSec1 >= activeBounds[sec0] - tolerance &&
                                curSec0 <= activeBounds[sec1] + tolerance
                            )
                        ) {
                            // Add current index to collisions of active
                            // indices and vice versa.
                            if (isCurrentA && isActiveB) {
                                curCollisions.push(
                                    self ? activeIndex : activeIndex - lengthA);
                            }
                            if (isCurrentB && isActiveA) {
                                allCollisions[activeIndex].push(origIndex);
                            }
                        }
                    }
                }
            }
            if (isCurrentA) {
                if (boundsA === boundsB) {
                    // If both arrays are the same, add self collision.
                    curCollisions.push(curIndex);
                }
                // Add collisions for current index.
                allCollisions[curIndex] = curCollisions;
            }
            // Add current index to active indices. Keep array sorted by
            // their higher boundary on the primary axis.s
            if (activeIndicesByPri1.length) {
                var curPri1 = curBounds[pri1],
                    index = binarySearch(activeIndicesByPri1, pri1, curPri1);
                activeIndicesByPri1.splice(index + 1, 0, curIndex);
            } else {
                activeIndicesByPri1.push(curIndex);
            }
        }
        // Sort collision indices in ascending order.
        for (var i = 0; i < allCollisions.length; i++) {
            var collisions = allCollisions[i];
            if (collisions) {
                collisions.sort(function(i1, i2) { return i1 - i2; });
            }
        }
        return allCollisions;
    }
};
