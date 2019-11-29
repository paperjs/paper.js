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
 */
var CollisionDetection = new (function() {
    return /** @lends CollisionDetection */ {
        /**
         * Finds collisions between items.
         * ToDO: Add description
         *
         * @param {Array} items1
         * @param {Array} items2
         * @param {Number} [tolerance]
         * @param {Boolean} [sweepVertical]
         * @param {Boolean} [onlySweepAxisCollisions]
         * @returns {Array}
         */
        findItemBoundsCollisions: function(
            items1,
            items2,
            tolerance,
            sweepVertical,
            onlySweepAxisCollisions
        ) {
            var boundsArr1 = new Array(items1.length);
            var boundsArr2;
            for (var i = 0; i < boundsArr1.length; i++) {
                var bounds = items1[i].bounds;
                boundsArr1[i] = [
                    bounds.left,
                    bounds.top,
                    bounds.right,
                    bounds.bottom
                ];
            }
            if (items2) {
                if (items2 === items1) {
                    boundsArr2 = boundsArr1;
                } else {
                    boundsArr2 = new Array(items2.length);
                    for (var i = 0; i < boundsArr2.length; i++) {
                        var bounds = items2[i].bounds;
                        boundsArr2[i] = [
                            bounds.left,
                            bounds.top,
                            bounds.right,
                            bounds.bottom
                        ];
                    }
                }
            }
            return this.findBoundsCollisions(
                boundsArr1,
                boundsArr2,
                tolerance || 0,
                sweepVertical,
                onlySweepAxisCollisions
            );
        },

        /**
         * ToDO: Add description
         *
         *
         *
         *
         * @param {Array} curvesValues1
         * @param {Array} curvesValues2
         * @param {Number} [tolerance]
         * @param {Boolean} [sweepVertical]
         * @param {Boolean} [onlySweepAxisCollisions]
         * @returns {Array}
         */
        findCurveBoundsCollisions: function(
            curvesValues1,
            curvesValues2,
            tolerance,
            sweepVertical,
            onlySweepAxisCollisions
        ) {
            var min = Math.min,
                max = Math.max;
            var boundsArr1 = new Array(curvesValues1.length);
            var boundsArr2;
            for (var i = 0; i < boundsArr1.length; i++) {
                var v1 = curvesValues1[i];
                boundsArr1[i] = [
                    min(v1[0], v1[2], v1[4], v1[6]),
                    min(v1[1], v1[3], v1[5], v1[7]),
                    max(v1[0], v1[2], v1[4], v1[6]),
                    max(v1[1], v1[3], v1[5], v1[7])
                ];
            }
            if (curvesValues2) {
                if (curvesValues2 === curvesValues1) {
                    boundsArr2 = boundsArr1;
                } else {
                    boundsArr2 = new Array(curvesValues2.length);
                    for (var i = 0; i < boundsArr2.length; i++) {
                        var v2 = curvesValues2[i];
                        boundsArr2[i] = [
                            min(v2[0], v2[2], v2[4], v2[6]),
                            min(v2[1], v2[3], v2[5], v2[7]),
                            max(v2[0], v2[2], v2[4], v2[6]),
                            max(v2[1], v2[3], v2[5], v2[7])
                        ];
                    }
                }
            }
            return this.findBoundsCollisions(
                boundsArr1,
                boundsArr2,
                tolerance || 0,
                sweepVertical,
                onlySweepAxisCollisions
            );
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
         * The returned array has the same length as boundsArr1. Each entry
         * contains an array with all indexes of overlapping bounds of 
         * boundsArr2 (or boundsArr1 if boundsArr2 is not provided) sorted
         * in ascending order.
         *
         * @param {Array} boundsArr1
         * @param {Array} boundsArr2
         * @param {Number} [tolerance] If provided, the tolerance will be added
         *                             to all sides of each bounds when checking
         *                             for collisions.
         * @param {Boolean} [sweepVertical] If set to ture, the sweep is done
         *                                  along the y axis.
         * @param {Boolean} [onlySweepAxisCollisionss] If set to true, no collision
         *                                          checks will be done on the 
         *                                          secondary axis.
         * @returns {Array}
         */
        findBoundsCollisions: function(
            boundsA,
            boundsB,
            tolerance,
            sweepVertical,
            onlySweepAxisCollisions
        ) {
            // Binary search utility function.
            // For multiple same entries, this returns the rightmost entry.
            // https://en.wikipedia.org/wiki/Binary_search_algorithm#Procedure_for_finding_the_rightmost_element
            var lo, hi;
            var binarySearch = function(indexes, coordinateValue, coordinate) {
                lo = 0;
                hi = indexes.length;
                while (lo < hi) {
                    var mid = (hi + lo) >>> 1; // same as Math.floor((hi + lo)/2)
                    if (allBounds[indexes[mid]][coordinate] < coordinateValue) {
                        lo = mid + 1;
                    } else {
                        hi = mid;
                    }
                }
                return lo - 1;
            };

            //
            var self = !boundsB || boundsA === boundsB;
            var allBounds = self ? boundsA : boundsA.concat(boundsB);
            var countA = boundsA.length;
            var countAll = allBounds.length;

            // Set coordinates for primary and secondary axis depending on sweep
            // direction. By default we sweep in horizontal direction, which
            // means x is the primary axis.
            var coordP0 = sweepVertical ? 1 : 0;
            var coordP1 = coordP0 + 2;
            var coordS0 = sweepVertical ? 0 : 1;
            var coordS1 = coordS0 + 2;

            // Create array with all indexes sorted by lower boundary on primary
            // axis.
            var allIndexesByP0 = new Array(countAll);
            for (var i = 0; i < countAll; i++) {
                allIndexesByP0[i] = i;
            }
            allIndexesByP0.sort(function(i1, i2) {
                return allBounds[i1][coordP0] - allBounds[i2][coordP0];
            });
            // Sweep along primary axis. Indexes of active bounds are kept in an
            // array sorted by higher boundary on primary axis.
            var activeIndexesByP1 = [];
            var allCollisions = new Array(countA);
            for (var i = 0; i < countAll; i++) {
                var currentIndex = allIndexesByP0[i];
                var currentBounds = allBounds[currentIndex];
                var currentOriginalIndex = self
                    ? currentIndex
                    : currentIndex - countA; // index in boundsA or boundsB array
                var isCurrentA = currentIndex < countA;
                var isCurrentB = self || currentIndex >= countA;
                var currentCollisions = isCurrentA ? [] : null;
                if (activeIndexesByP1.length) {
                    // remove (prune) indexes that are no longer active
                    var pruneCount =
                        binarySearch(
                            activeIndexesByP1,
                            currentBounds[coordP0] - tolerance,
                            coordP1
                        ) + 1;
                    activeIndexesByP1.splice(0, pruneCount);
                    // add collisions for current index
                    if (self && onlySweepAxisCollisions) {
                        currentCollisions = currentCollisions.concat(
                            activeIndexesByP1.slice()
                        );
                        for (var j = 0; j < activeIndexesByP1.length; j++) {
                            var activeIndex = activeIndexesByP1[j];
                            allCollisions[activeIndex].push(currentOriginalIndex);
                        }
                    } else {
                        var currentS1 = currentBounds[coordS1];
                        var currentS0 = currentBounds[coordS0];
                        for (var j = 0; j < activeIndexesByP1.length; j++) {
                            var activeIndex = activeIndexesByP1[j];
                            var isActiveA = activeIndex < countA;
                            var isActiveB = self || activeIndex >= countA;
                            // check secondary axis bounds
                            if (
                                onlySweepAxisCollisions ||
                                (((isCurrentA && isActiveB) ||
                                    (isCurrentB && isActiveA)) &&
                                    currentS1 >=
                                        allBounds[activeIndex][coordS0] -
                                            tolerance &&
                                        currentS0 <=
                                            allBounds[activeIndex][coordS1] +
                                                tolerance)) {
                                // Add current index to collisions of active
                                // indexes and vice versa.
                                if (isCurrentA && isActiveB) {
                                    currentCollisions.push(
                                        self
                                            ? activeIndex
                                            : activeIndex - countA
                                    );
                                }
                                if (isCurrentB && isActiveA) {
                                    allCollisions[activeIndex].push(
                                        currentOriginalIndex
                                    );
                                }
                            }
                        }
                    }
                }
                if (isCurrentA) {
                    if (boundsA === boundsB) {
                        currentCollisions.push(currentIndex);
                    }
                    // add collisions for current index
                    allCollisions[currentIndex] = currentCollisions;
                }
                // add current index to active indexes. Keep array sorted by
                // their higher boundary on the primary axis
                if (activeIndexesByP1.length) {
                    var currentP1 = currentBounds[coordP1];
                    var insertIndex =
                        binarySearch(activeIndexesByP1, currentP1, coordP1) + 1;
                    activeIndexesByP1.splice(insertIndex, 0, currentIndex);
                } else {
                    activeIndexesByP1.push(currentIndex);
                }
            }
            // Sort collisions ascending by index
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
})();
