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
var CollisionDetection = new function() {  

  return /** @lends CollisionDetection */{
    /**
     * Finds overlaps between items. 
     * If items1 and items2 are provided, this finds the overlaps between items of the first array and items of the second array. 
     * If only items1 is provided, it will find the overlaps between items in this array.
     * 
     * 
     * 
     * 
     * @param {*} items1 
     * @param {*} items2 
     * @param {*} tolerance 
     */
    findItemOverlaps: function(items1, items2, tolerance) {
      var boundsArr1 = new Array(items1.length);
      var boundsArr2;
      for (var i = 0; i < boundsArr1.length; i++) {
        var bounds = items1[i].bounds;
        boundsArr1[i] = [bounds.left, bounds.top, bounds.right, bounds.bottom];
      }
      if (items2) {
        boundsArr2 = new Array(items2.length);
        for (var i = 0; i < boundsArr2.length; i++) {
          var bounds = items2[i].bounds;
          boundsArr2[i] = [bounds.left, bounds.top, bounds.right, bounds.bottom];
        }
      }
      return this.findBoundsOverlaps(boundsArr1, boundsArr2, tolerance || 0);
    },


     /**
     *
     * Each entry in the bounds arrays must be an array of length 4 with x0, y0, x1, and y1 as the array elements.
     * 
     * 
     * The collision detection is implemented as a sweep and prune operation in horizontal direction with immediate check
     * of vertical overlap of potential pairs.
     *
     * @param boundsArr1
     * @param boundsArr2
     * @param tolerance
     * @returns {Array}
     * @private
     */
    findBoundsOverlaps: function(boundsArr1, boundsArr2, tolerance) {
      var len1 = boundsArr1.length;
      var lenAll = len1 + (boundsArr2 ? boundsArr2.length : 0);
      var self = !boundsArr2;
      var boundsArr = self ? boundsArr1 : boundsArr1.concat(boundsArr2);

      // calculate overall bounds limits of array 2
      var boundsLimits2;
      if (!self && boundsArr2.length) {
        boundsLimits2 = boundsArr2[0].slice();
        for (var i = 0; i < 4; i++) {
          for (var j = 0; j < boundsArr2.length; j++) {
            if (i < 2 ? boundsArr2[j][i] < boundsLimits2[i] : boundsArr2[j][i] > boundsLimits2[i]) boundsLimits2[i] = boundsArr2[j][i];
          }
          boundsLimits2[i] = boundsLimits2[i] + (i < 2 ? -tolerance : tolerance);
        }
      }

      // sorted contains indexes sorted ascending by left boundary
      var sorted = new Array(lenAll);
      for (var i = 0; i < lenAll; i++) {
        sorted[i] = i;
      }
      sorted.sort(function (a, b) {
        return boundsArr[a][0] - boundsArr[b][0];
      });
      var started = []; // contains started indexes, sorted ascending by right boundary
      var overlaps = new Array(len1);
      for (var i = 0; i < sorted.length; i++) {
        var index = sorted[i];
        var indexBounds = boundsArr[index];
        if (!boundsLimits2 || index >= len1 ||
          (indexBounds[0] <= boundsLimits2[2] && indexBounds[2] >= boundsLimits2[0] &&
          indexBounds[1] <= boundsLimits2[3] && indexBounds[3] >= boundsLimits2[1])) {
          var index2 = self ? index : index - len1;
          // index is start of boundary
          var is1 = index < len1;
          var is2 = self || index >= len1;
          var indexOverlaps = is1 ? [] : null;
          if (started.length) {
            var minX = indexBounds[0] - tolerance;
            // Remove all started indexes with a right bound smaller than the current index's left bound.
            // After that all started indexes will be within tolerance.
            while (started.length && boundsArr[started[0]][2] < minX) {
              started.shift();
            }
            // Add current index to overlaps of started indexes and vice versa.
            for (var j = 0; j < started.length; j++) {
              var startedIndex = started[j];
              // check vertical bounds
              if (indexBounds[3] >= boundsArr[startedIndex][1] - tolerance &&
                indexBounds[1] <= boundsArr[startedIndex][3] + tolerance) {
                if (is1 && (self || startedIndex >= len1)) {
                  indexOverlaps.push(self ? startedIndex : startedIndex - len1);
                }
                if (is2 && startedIndex < len1) {
                  overlaps[startedIndex].push(index2)
                }
              }
            }
          }
          if (is1) {
            // add overlaps for this index
            overlaps[index] = indexOverlaps;
          }
          // add current index to started indexes. Keep the order of the started index so they are sorted ascending by
          // their right boundary
          if (started.length) {
            var indexRightBound = boundsArr[index][2];
            var lo = 0;
            var hi = started.length;
            while (lo < hi) {
              var mid = (hi + lo) >>> 1;
              if (indexRightBound > boundsArr[started[mid]][2]) {
                lo = mid + 1;
              } else {
                hi = mid;
              }
            }
            started.splice(lo, 0, index);
          } else {
            started.push(index);
          }
        }
      }
      // sort overlaps ascending by index
      for (var i = 0; i < overlaps.length; i++) {
        if (overlaps[i]) {
          overlaps[i].sort(function(a, b) {
            return a - b;
          });
        }
      }
      return overlaps;
    }

  };
};
