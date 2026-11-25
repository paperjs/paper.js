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

import {
  EPSILON,
  HitResult,
  Matrix,
  Point,
  Size,
  hyphenate
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { Path } from '../path/Path.ts'
import type { Item } from './Item.ts'
import type { Project } from './Project.ts'
import type { HitTestOptions } from './HitResult.ts'

// NOTE: Documentation is in Item#hitTest(), which Project shares
export function hitTest(
  owner: Item | Project,
  point: PointLike,
  options?: HitTestOptions
): HitResult | null {
  return owner._hitTest(Point.from(point), HitResult.getOptions(options))
}

// NOTE: Documentation is in Item#hitTestAll(), which Project shares
export function hitTestAll(
  owner: Item | Project,
  point: PointLike,
  options?: HitTestOptions
): HitResult[] {
  const all = []
  owner._hitTest(
    Point.from(point),
    Object.assign(Object.create(HitResult.getOptions(options)), { all })
  )
  return all
}

// Hit-test the children of the item or project, from the top down:
export function hitTestChildren(
  owner: Item | Project,
  point: Point,
  options: HitTestOptions,
  viewMatrix?: Matrix | null,
  _exclude?: Item | null
): HitResult | null {
  // NOTE: _exclude is only used in Group#_hitTestChildren()
  // to exclude #clipItem
  const children = owner._children
  if (children) {
    // Loop backwards, so items that get drawn last are tested first.
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      const res = (
        child !== _exclude &&
        child._hitTest(point, options, viewMatrix)
      )
      // Only return the found result if we're not asked to collect
      // all matches through hitTestAll()
      if (res && !options.all) {
        return res
      }
    }
  }
  return null
}

// The hit-test of a single item and its children, see Item#_hitTest():
export function hitTestItem(
  item: Item,
  point: Point,
  options: HitTestOptions,
  parentViewMatrix?: Matrix | null
): HitResult | null {
  // Shells of hosted items are rejected by their bounds below, as
  // checking for emptiness would load them:
  if (
    item._locked ||
    !item._visible ||
    item._guide && !options.guides ||
    !item._shell && item.isEmpty()
  ) {
    return null
  }

  // Check if the point is within the bounds including stroke and handles
  // + tolerance, but only if the item does not have children, since
  // we'd have to travel up the chain already to determine these bounds.
  // Shells of hosted items know them without loading their children.
  const matrix = item._matrix
  // If this is the first one in the recursion, the point is in global
  // coordinates, so transform it by the item's globalMatrix:
  const pointMatrix = parentViewMatrix ? matrix : item.globalMatrix
  // Keep the accumulated matrices up to this item in options, so we
  // can keep calculating the correct _tolerancePadding values.
  const viewMatrix = parentViewMatrix
    ? parentViewMatrix.appended(matrix)
    : // If this is the first one in the recursion, factor in the
      // zoom of the view and the globalMatrix of the item.
      pointMatrix.prepended(item.view._matrix)
  // Calculate the transformed padding as 2D size that describes the
  // transformed tolerance circle / ellipse. Make sure it's never 0
  // since we're using it for division (see checkBounds()).
  // HitResult.getOptions() sets the tolerance:
  const tolerance = Math.max(options.tolerance!, EPSILON)
  // Hit-tests are performed in the item's local coordinate space,
  // while the tolerance is in project coordinates. To calculate the
  // correct 2D padding for tolerance, we therefore need to apply the
  // inverted accumulated matrices without the view's matrix.
  const tolerancePadding = (options._tolerancePadding = new Size(
    Matrix._getCircleExtents(
      tolerance,
      viewMatrix.prepended(item.view._matrix.inverted())._shiftless().invert()
    )
  ))
  // Transform point to local coordinates.
  const localPoint = pointMatrix._inverseTransform(point)
  // If the matrix is non-reversible, point will now be `null`:
  if (
    !localPoint ||
    (item._shell || !item._children) &&
    !item
      .getBounds({ internal: true, stroke: true, handle: true })
      .expand(tolerancePadding.multiply(2))
      ._containsPoint(localPoint)
  ) {
    return null
  }

  // See if we should check self (own content), by filtering for type,
  // guides and selected items if that's required.
  const checkSelf = !(
    options.guides && !item._guide ||
    options.selected && !item.selected ||
    options.class && !(item instanceof options.class)
  )
  const { match } = options
  // Set before checkPoint() reads a part of it:
  let bounds!: Rectangle
  let res: HitResult | null = null

  const filter = (hit: HitResult | HitResult[] | null): HitResult | null => {
    // Path#_hitTestSelf() returns a list of all its hits when we're
    // collecting them, see hitTestAll():
    if (Array.isArray(hit)) {
      let first: HitResult | null = null
      for (const entry of hit) {
        const res = filter(entry)
        first = first || res
      }
      return first
    }
    let result = hit
    if (result && match && !match(result)) {
      result = null
    }
    // If we're collecting all matches, add it to options.all, with its
    // point in project coordinates, as it won't be returned through the
    // ancestors that transform it below:
    if (result && options.all) {
      if (result.point) {
        result.point = item.globalMatrix.transform(result.point)
      }
      options.all.push(result)
    }
    return result
  }

  const checkPoint = (type: string, part?: string) => {
    const pt = part ? bounds[part] : item.position
    // Since there are transformations, we cannot simply use a numerical
    // tolerance value. Instead, we divide by a padding size, see above.
    if (localPoint.subtract(pt).divide(tolerancePadding).length <= 1) {
      return new HitResult(type, item, {
        name: part ? hyphenate(part) : type,
        point: pt
      })
    }
    return null
  }

  const checkPosition = options.position
  const checkCenter = options.center
  const checkBounds = options.bounds
  // Ignore top level layers by checking for _parent:
  if (
    checkSelf &&
    item._parent &&
    (checkPosition || checkCenter || checkBounds)
  ) {
    if (checkCenter || checkBounds) {
      // Get the internal, untransformed bounds, as we check against
      // transformed points.
      bounds = item.internalBounds
    }
    res = (
      checkPosition && checkPoint('position') ||
      checkCenter && checkPoint('center', 'center') ||
      null
    )
    if (!res && checkBounds) {
      // TODO: Move these into a static property on Rectangle?
      const points = [
        'topLeft', 'topRight', 'bottomLeft', 'bottomRight',
        'leftCenter', 'topCenter', 'rightCenter', 'bottomCenter'
      ]
      for (let i = 0; i < 8 && !res; i++) {
        res = checkPoint('bounds', points[i])
      }
    }
    res = filter(res)
  }

  if (!res) {
    res = (
      item._hitTestChildren(localPoint, options, viewMatrix) || (
        // NOTE: We don't call match on _hitTestChildren() because
        // it is already called internally.
        checkSelf &&
        filter(
          item._hitTestSelf(
            localPoint,
            options,
            viewMatrix,
            // If the item has a non-scaling stroke, we need to
            // apply the inverted viewMatrix to stroke dimensions.
            item.strokeScaling ? null : viewMatrix._shiftless().invert()
          )
        )
      ) ||
      null
    )
  }
  // Transform the point back to the outer coordinate system, unless it
  // was collected in project coordinates already, see filter():
  if (res?.point && !options.all) {
    res.point = pointMatrix.transform(res.point)
  }
  return res
}

// NOTE: Documentation is in Item#intersects()
export function intersectsItem(
  item1: Item,
  item2: Item,
  matrix?: Matrix | null
): boolean {
  const path1 = item1._asPathItem()
  const path2 = item2._asPathItem()
  const matrix1 = path1._matrix
  const matrix2 = matrix ?? path2._matrix

  // Checks whether a point of any of the path's sub-paths lies inside
  // the other path, which then contains it, as the outlines don't cross:
  function contains(
    path: Item, matrix: Matrix,
    other: Item, otherMatrix: Matrix
  ) {
    for (const child of path._children ?? [path]) {
      const segment = (child as Path)._segments[0]
      const point = (
        segment &&
        otherMatrix._inverseTransform(matrix._transformPoint(segment._point))
      )
      if (point && other._contains(point)) {
        return true
      }
    }
    return false
  }

  // Tell getIntersections() to return as soon as some intersections are
  // found, because all we care for here is there are some or none:
  return (
    path1.getIntersections(path2, null, matrix, true).length > 0 ||
    contains(path2, matrix2, path1, matrix1) ||
    contains(path1, matrix1, path2, matrix2)
  )
}
