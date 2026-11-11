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
  Item,
  KAPPA,
  Path,
  Point,
  Rectangle,
  Segment,
  Size,
  isPlainObject,
  isRectangle,
  readEllipse,
  readRectangle
} from '../internal.ts'

// The properties of the named forms besides their geometry, set on the path:
export type PathProps = { [key: string]: any }

// The segments of the unit circle, as [point, handleIn, handleOut]:
// From the right, as SVG converts ellipses, so dashes match (#601):
const ellipseSegments = [
  [[1, 0], [0, -KAPPA], [0, KAPPA]],
  [[0, 1], [KAPPA, 0], [-KAPPA, 0]],
  [[-1, 0], [0, KAPPA], [0, -KAPPA]],
  [[0, -1], [-KAPPA, 0], [KAPPA, 0]]
]

export function createLine(...args: any[]): Path {
  const { from, to, ...props } = getNamedArguments(args, ['from', 'to'])
  return createPath([new Segment(from), new Segment(to)], false, props)
}

export function createCircle(...args: any[]): Path {
  const { center, radius, ...props } = getNamedArguments(args, [
    'center',
    'radius'
  ])
  return createEllipsePath(Point.from(center), Size.from(radius), props)
}

export function createRectangle(arg0: any, arg1?: any): Path {
  // The named form, or a rectangle followed by the corner radius, or the
  // point and the size, or the two points that describe it:
  const { radius: corner, ...object } =
    arg1 === undefined
      ? isPlainObject(arg0)
        ? arg0
        : { rectangle: arg0 }
      : isRectangle(arg0)
        ? { rectangle: arg0, radius: arg1 }
        : { rectangle: new Rectangle(arg0, arg1) }
  const [rect, props] = readRectangle(object)
  const radius = corner && Size.from(corner)
  // From the top left, as SVG converts rectangles, so dashes match (#601):
  const tl = rect._getTopLeft(true)
  const tr = rect._getTopRight(true)
  const br = rect._getBottomRight(true)
  const bl = rect._getBottomLeft(true)
  let segments: Segment[]
  if (!radius || radius.isZero()) {
    segments = [
      new Segment(tl),
      new Segment(tr),
      new Segment(br),
      new Segment(bl)
    ]
  } else {
    const { width: rx, height: ry } = Size.min(
      radius,
      rect._getSize(true).divide(2)
    )
    const hx = rx * KAPPA
    const hy = ry * KAPPA
    segments = [
      new Segment(tl.add(rx, 0), [-hx, 0], null),
      new Segment(tr.subtract(rx, 0), null, [hx, 0]),
      new Segment(tr.add(0, ry), [0, -hy], null),
      new Segment(br.subtract(0, ry), null, [0, hy]),
      new Segment(br.subtract(rx, 0), [hx, 0]),
      new Segment(bl.add(rx, 0), null, [-hx, 0]),
      new Segment(bl.subtract(0, ry), [0, hy]),
      new Segment(tl.add(0, ry), null, [0, -hy])
    ]
  }
  return createPath(segments, true, props)
}

export function createEllipse(rectangle: any): Path {
  const object = isPlainObject(rectangle) ? rectangle : { rectangle }
  // Placed by its center and radius, or by the rectangle around it:
  const { center, radius, props } = readEllipse(object)
  return createEllipsePath(center, radius, props)
}

export function createArc(...args: any[]): Path {
  const { from, through, to, ...props } = getNamedArguments(args, [
    'from',
    'through',
    'to'
  ])
  // Draw the arc on a temporary path, and create the result from its
  // segments like all the other factories:
  const arc = new Path(Item.NO_INSERT)
  arc.moveTo(from)
  arc.arcTo(through, to)
  return createPath(arc._segments, false, props)
}

export function createRegularPolygon(...args: any[]): Path {
  const { center, sides, radius, ...props } = getNamedArguments(args, [
    'center',
    'sides',
    'radius'
  ])
  const centerPoint = Point.from(center)
  const step = -360 / sides
  // Start at the top as Illustrator does: at the top vertex, or the right
  // end of the top edge with an even number of sides, counterclockwise:
  const offset = sides % 2 ? 0 : -0.5
  const vector = new Point(0, -radius)
  const segments = new Array(sides)
  for (let i = 0; i < sides; i++) {
    segments[i] = new Segment(
      centerPoint.add(vector.rotate((i + offset) * step))
    )
  }
  return createPath(segments, true, props)
}

export function createStar(...args: any[]): Path {
  const { center, points, radius1, radius2, ...props } = getNamedArguments(
    args,
    ['center', 'points', 'radius1', 'radius2']
  )
  const centerPoint = Point.from(center)
  const count = points * 2
  const step = 360 / count
  const vector = new Point(0, -1)
  const segments = new Array(count)
  for (let i = 0; i < count; i++) {
    segments[i] = new Segment(
      centerPoint.add(
        vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)
      )
    )
  }
  return createPath(segments, true, props)
}

// Read the arguments by their names, from the single plain object of the
// named form or by their positions:
function getNamedArguments(args: any[], names: string[]): PathProps {
  return args.length === 1 && isPlainObject(args[0])
    ? args[0]
    : Object.fromEntries(names.map((name, index) => [name, args[index]]))
}

function createPath(
  segments: Segment[],
  closed: boolean,
  { insert, project, parent, ...props }: PathProps
): Path {
  // Let Item#_initialize() handle the insertion:
  const path = new Path({ insert, project, parent })
  path._add(segments)
  // No need to use setter for _closed since _add() called _changed().
  path._closed = closed
  // Set named arguments at the end, since some depend on geometry to be
  // defined (e.g. #clockwise)
  return path.set(props)
}

function createEllipsePath(
  center: Point,
  radius: Size,
  props: PathProps
): Path {
  const { width, height } = radius
  const segments = ellipseSegments.map(
    ([[x, y], [inX, inY], [outX, outY]]) =>
      new Segment(
        center.add(x * width, y * height),
        [inX * width, inY * height],
        [outX * width, outY * height]
      )
  )
  return createPath(segments, true, props)
}
