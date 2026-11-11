/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

import type { Rectangle } from '../basic/Rectangle.ts'

// The bounds as [x0, y0, x1, y1]:
type Bounds = number[]

// @author Jan Boesenberg <jan.boesenberg@gmail.com>

/**
 * Finds collisions between axis aligned bounding boxes of items.
 *
 * This function takes the bounds of all items in the items1 and items2
 * arrays and calls findBoundsCollisions().
 *
 * @param items1 Array of items for which collisions should be
 *     found.
 * @param items2 Array of items  that the first array should be
 *     compared with. If not provided, collisions between items within
 *     the first array will be returned.
 * @param tolerance If provided, the tolerance will be added to
 *     all sides of each bounds when checking for collisions.
 * @return Array containing for the bounds at the same index in
 *     items1 an array of the indexes of colliding bounds in items2
 */
export function findItemBoundsCollisions(
  items1: { bounds: Rectangle }[],
  items2?: { bounds: Rectangle }[],
  tolerance?: number
): number[][] {
  function getBounds(items: { bounds: Rectangle }[]): Bounds[] {
    const bounds = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].bounds
      bounds[i] = [rect.left, rect.top, rect.right, rect.bottom]
    }
    return bounds
  }

  const bounds1 = getBounds(items1)
  const bounds2 =
    !items2 || items2 === items1
      ? bounds1
      : getBounds(items2)
  return findBoundsCollisions(bounds1, bounds2, tolerance || 0)
}

/**
 * Finds collisions between curves bounds. For performance reasons this
 * uses broad bounds of the curve, which can be calculated much faster than
 * the actual bounds. Broad bounds guarantee to contain the full curve,
 * but they are usually larger than the actual bounds of a curve.
 *
 * This function takes the broad bounds of all curve values in the curves1
 * and curves2 arrays and calls findBoundsCollisions().
 *
 * @param curves1 Array of curve values for which collisions should
 *     be found.
 * @param curves2 Array of curve values that the first array
 *     should be compared with. If not provided, collisions between curve
 *     bounds within the first array will be returned.
 * @param tolerance If provided, the tolerance will be added to
 *     all sides of each bounds when checking for collisions.
 * @return Array containing for the bounds at the same index in
 *     curves1 an array of the indexes of colliding bounds in curves2
 */
export function findCurveBoundsCollisions(
  curves1: number[][],
  curves2?: number[][],
  tolerance?: number
): number[][] {
  function getBounds(curves: number[][]): Bounds[] {
    const { min, max } = Math
    const bounds = new Array(curves.length)
    for (let i = 0; i < curves.length; i++) {
      const v = curves[i]
      bounds[i] = [
        min(v[0], v[2], v[4], v[6]),
        min(v[1], v[3], v[5], v[7]),
        max(v[0], v[2], v[4], v[6]),
        max(v[1], v[3], v[5], v[7])
      ]
    }
    return bounds
  }

  const bounds1 = getBounds(curves1)
  const bounds2 =
    !curves2 || curves2 === curves1
      ? bounds1
      : getBounds(curves2)
  return findBoundsCollisions(bounds1, bounds2, tolerance || 0)
}

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
 * @param boundsA Array of bounds objects for which collisions
 *     should be found.
 * @param boundsB Array of bounds that the first array should
 *     be compared with. If not provided, collisions between bounds within
 *     the first array will be returned.
 * @param tolerance If provided, the tolerance will be added to
 *     all sides of each bounds when checking for collisions.
 * @param sweepVertical If true, the sweep is performed along
 *     the y-axis.
 * @return Array containing for the bounds at the same index in
 *     boundsA an array of the indexes of colliding bounds in boundsB
 */
export function findBoundsCollisions(
  boundsA: Bounds[],
  boundsB?: Bounds[],
  tolerance?: number,
  sweepVertical?: boolean
): number[][] {
  const self = !boundsB || boundsA === boundsB
  const allBounds = self ? boundsA : boundsA.concat(boundsB)
  const lengthA = boundsA.length
  const lengthAll = allBounds.length

  // Binary search utility function.
  // For multiple same entries, this returns the rightmost entry.
  // https://en.wikipedia.org/wiki/Binary_search_algorithm#Procedure_for_finding_the_rightmost_element
  function binarySearch(indices: number[], coord: number, value: number) {
    let low = 0
    let high = indices.length
    while (low < high) {
      const middle = (high + low) >>> 1 // Same as Math.floor((high + low) / 2)
      if (allBounds[indices[middle]][coord] < value) {
        low = middle + 1
      } else {
        high = middle
      }
    }
    return low - 1
  }

  // Set coordinates for primary and secondary axis depending on sweep
  // direction. By default we sweep in horizontal direction, which
  // means x is the primary axis.
  const pri0 = sweepVertical ? 1 : 0
  const pri1 = pri0 + 2
  const sec0 = sweepVertical ? 0 : 1
  const sec1 = sec0 + 2
  // Create array with all indices sorted by lower boundary on primary
  // axis.
  const allIndicesByPri0 = new Array(lengthAll)
  for (let i = 0; i < lengthAll; i++) {
    allIndicesByPri0[i] = i
  }
  allIndicesByPri0.sort((i1, i2) => allBounds[i1][pri0] - allBounds[i2][pri0])
  // Sweep along primary axis. Indices of active bounds are kept in an
  // array sorted by higher boundary on primary axis.
  const activeIndicesByPri1 = []
  const allCollisions = new Array(lengthA)
  for (let i = 0; i < lengthAll; i++) {
    const currentIndex = allIndicesByPri0[i]
    const currentBounds = allBounds[currentIndex]
    // The original index in boundsA or boundsB:
    const originalIndex = self ? currentIndex : currentIndex - lengthA
    const isCurrentA = currentIndex < lengthA
    const isCurrentB = self || !isCurrentA
    const currentCollisions = isCurrentA ? [] : null
    if (activeIndicesByPri1.length) {
      // remove (prune) indices that are no longer active.
      const pruneCount = binarySearch(
        activeIndicesByPri1,
        pri1,
        currentBounds[pri0] - tolerance
      ) + 1
      activeIndicesByPri1.splice(0, pruneCount)
      // Add collisions for current index.
      const currentSec1 = currentBounds[sec1]
      const currentSec0 = currentBounds[sec0]
      for (let j = 0; j < activeIndicesByPri1.length; j++) {
        const activeIndex = activeIndicesByPri1[j]
        const activeBounds = allBounds[activeIndex]
        const isActiveA = activeIndex < lengthA
        const isActiveB = self || activeIndex >= lengthA

        // Check secondary axis bounds.
        if (
          (
            isCurrentA && isActiveB ||
            isCurrentB && isActiveA
          ) &&
          currentSec1 >= activeBounds[sec0] - tolerance &&
          currentSec0 <= activeBounds[sec1] + tolerance
        ) {
          // Add current index to collisions of active
          // indices and vice versa.
          if (isCurrentA && isActiveB) {
            currentCollisions.push(
              self ? activeIndex : activeIndex - lengthA
            )
          }
          if (isCurrentB && isActiveA) {
            allCollisions[activeIndex].push(originalIndex)
          }
        }
      }
    }
    if (isCurrentA) {
      if (boundsA === boundsB) {
        // If both arrays are the same, add self collision.
        currentCollisions.push(currentIndex)
      }
      // Add collisions for current index.
      allCollisions[currentIndex] = currentCollisions
    }
    // Add current index to active indices. Keep array sorted by
    // their higher boundary on the primary axis.
    if (activeIndicesByPri1.length) {
      const currentPri1 = currentBounds[pri1]
      const index = binarySearch(activeIndicesByPri1, pri1, currentPri1)
      activeIndicesByPri1.splice(index + 1, 0, currentIndex)
    } else {
      activeIndicesByPri1.push(currentIndex)
    }
  }
  // Sort collision indices in ascending order.
  for (const collisions of allCollisions) {
    collisions?.sort((i1, i2) => i1 - i2)
  }
  return allCollisions
}
