/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2019, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
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
     * @param {Boolean} [sweepVertical] If true, the sweep is performed along
     *     the y-axis.
     * @param {Boolean} [onlySweepAxisCollisions] If true, no collision checks
     *     will be done on the secondary axis.
     * @returns {Array} Array containing for the bounds at the same index in
     *     items1 an array of the indexes of colliding bounds in items2
     */
    findItemBoundsCollisions: function(items1, items2, tolerance,
            sweepVertical, onlySweepAxisCollisions) {
        var bounds1 = new Array(items1.length),
            bounds2;
        for (var i = 0; i < items1.length; i++) {
            var bounds = items1[i].bounds;
            bounds1[i] = [bounds.left, bounds.top, bounds.right, bounds.bottom];
        }
        if (items2) {
            if (items2 === items1) {
                bounds2 = bounds1;
            } else {
                bounds2 = new Array(items2.length);
                for (var i = 0; i < items2.length; i++) {
                    var bounds = items2[i].bounds;
                    bounds2[i] = [bounds.left, bounds.top, bounds.right,
                        bounds.bottom];
                }
            }
        }
        return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0,
                sweepVertical, onlySweepAxisCollisions);
    },

    /**
     * Finds collisions between curves bounds. For performance reasons this
     * uses broad bounds of the curve, which can be calculated much faster than
     * the actual bounds. Broad bounds guarantee to contain the full curve,
     * but they are usually larger than the actual bounds of a curve.
     *
     * This function takes the broad bounds of all curve values in the
     * curveValues1 and curveValues2 arrays and calls findBoundsCollisions().
     *
     * @param {Array} curvesValues1 Array of curve values for which collisions
     *     should be found.
     * @param {Array} [curvesValues2] Array of curve values that the first
     *     array should be compared with. If not provided, collisions between
     *     curve bounds within the first arrray will be returned.
     * @param {Number} [tolerance] If provided, the tolerance will be added to
     *     all sides of each bounds when checking for collisions.
     * @param {Boolean} [sweepVertical] If true, the sweep is performed along
     *     the y-axis.
     * @param {Boolean} [onlySweepAxisCollisions] If true, no collision checks
     *     will be done on the secondary axis.
     * @returns {Array} Array containing for the bounds at the same index in
     *     curveValues1 an array of the indexes of colliding bounds in
     *     curveValues2
     */
    findCurveBoundsCollisions: function(curvesValues1, curvesValues2,
            tolerance, sweepVertical, onlySweepAxisCollisions) {
        var min = Math.min,
            max = Math.max,
            bounds1 = new Array(curvesValues1.length),
            bounds2;
        for (var i = 0; i < bounds1.length; i++) {
            var v1 = curvesValues1[i];
            bounds1[i] = [
                min(v1[0], v1[2], v1[4], v1[6]),
                min(v1[1], v1[3], v1[5], v1[7]),
                max(v1[0], v1[2], v1[4], v1[6]),
                max(v1[1], v1[3], v1[5], v1[7])
            ];
        }
        if (curvesValues2) {
            if (curvesValues2 === curvesValues1) {
                bounds2 = bounds1;
            } else {
                bounds2 = new Array(curvesValues2.length);
                for (var i = 0; i < bounds2.length; i++) {
                    var v2 = curvesValues2[i];
                    bounds2[i] = [
                        min(v2[0], v2[2], v2[4], v2[6]),
                        min(v2[1], v2[3], v2[5], v2[7]),
                        max(v2[0], v2[2], v2[4], v2[6]),
                        max(v2[1], v2[3], v2[5], v2[7])
                    ];
                }
            }
        }
        return this.findBoundsCollisions(bounds1, bounds2,
                tolerance || 0, sweepVertical, onlySweepAxisCollisions);
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
        // Binary search utility function.
        // For multiple same entries, this returns the rightmost entry.
        // https://en.wikipedia.org/wiki/Binary_search_algorithm#Procedure_for_finding_the_rightmost_element
        var self = !boundsB || boundsA === boundsB,
            allBounds = self ? boundsA : boundsA.concat(boundsB),
            countA = boundsA.length,
            countAll = allBounds.length,
            lo, hi;

        function binarySearch(indices, coordinateValue, coordinate) {
            lo = 0;
            hi = indices.length;
            while (lo < hi) {
                var mid = (hi + lo) >>> 1; // Same as Math.floor((hi + lo) / 2)
                if (allBounds[indices[mid]][coordinate] < coordinateValue) {
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
        var coordP0 = sweepVertical ? 1 : 0,
            coordP1 = coordP0 + 2,
            coordS0 = sweepVertical ? 0 : 1,
            coordS1 = coordS0 + 2;
        // Create array with all indices sorted by lower boundary on primary
        // axis.
        var allIndicesByP0 = new Array(countAll);
        for (var i = 0; i < countAll; i++) {
            allIndicesByP0[i] = i;
        }
        allIndicesByP0.sort(function(i1, i2) {
            return allBounds[i1][coordP0] - allBounds[i2][coordP0];
        });
        // Sweep along primary axis. Indices of active bounds are kept in an
        // array sorted by higher boundary on primary axis.
        var activeIndicesByP1 = [],
            allCollisions = new Array(countA);
        for (var i = 0; i < countAll; i++) {
            var currentIndex = allIndicesByP0[i],
                currentBounds = allBounds[currentIndex],
                currentOriginalIndex = self  // index in boundsA or boundsB
                    ? currentIndex
                    : currentIndex - countA,
                isCurrentA = currentIndex < countA,
                isCurrentB = self || currentIndex >= countA,
                currentCollisions = isCurrentA ? [] : null;
            if (activeIndicesByP1.length) {
                // remove (prune) indices that are no longer active
                var pruneCount = binarySearch(activeIndicesByP1,
                        currentBounds[coordP0] - tolerance, coordP1) + 1;
                activeIndicesByP1.splice(0, pruneCount);
                // add collisions for current index
                if (self && onlySweepAxisCollisions) {
                    // All active indexes can be added, no further checks needed
                    currentCollisions = currentCollisions.concat(
                        activeIndicesByP1.slice());
                   // Add current index to collisions of all active indexes
                    for (var j = 0; j < activeIndicesByP1.length; j++) {
                        var activeIndex = activeIndicesByP1[j];
                        allCollisions[activeIndex].push(currentOriginalIndex);
                    }
                } else {
                    var currentS1 = currentBounds[coordS1],
                        currentS0 = currentBounds[coordS0];
                    for (var j = 0; j < activeIndicesByP1.length; j++) {
                        var activeIndex = activeIndicesByP1[j],
                            isActiveA = activeIndex < countA,
                            isActiveB = self || activeIndex >= countA;
                        // Check secondary axis bounds if necessary
                        if (onlySweepAxisCollisions ||
                            (((isCurrentA && isActiveB) ||
                                (isCurrentB && isActiveA)) &&
                                currentS1 >=
                                    allBounds[activeIndex][coordS0] -
                                        tolerance &&
                                    currentS0 <=
                                        allBounds[activeIndex][coordS1] +
                                            tolerance)) {
                            // Add current index to collisions of active
                            // indices and vice versa.
                            if (isCurrentA && isActiveB) {
                                currentCollisions.push(
                                    self ? activeIndex : activeIndex - countA);
                            }
                            if (isCurrentB && isActiveA) {
                                allCollisions[activeIndex].push(
                                    currentOriginalIndex);
                            }
                        }
                    }
                }
            }
            if (isCurrentA) {
                if (boundsA === boundsB) {
                    // if both arrays are the same, add self collision
                    currentCollisions.push(currentIndex);
                }
                // add collisions for current index
                allCollisions[currentIndex] = currentCollisions;
            }
            // add current index to active indices. Keep array sorted by
            // their higher boundary on the primary axis
            if (activeIndicesByP1.length) {
                var currentP1 = currentBounds[coordP1],
                    insertIndex =
                        binarySearch(activeIndicesByP1, currentP1, coordP1) + 1;
                activeIndicesByP1.splice(insertIndex, 0, currentIndex);
            } else {
                activeIndicesByP1.push(currentIndex);
            }
        }
        // Sort collision indices in ascending order.
        for (var i = 0; i < allCollisions.length; i++) {
            if (allCollisions[i]) {
                allCollisions[i].sort(function(i1, i2) {
                    return i1 - i2;
                });
            }
        }
        return allCollisions;
    }
};
