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

import {
  Item,
  KAPPA,
  Path,
  Point,
  Rectangle,
  Segment,
  Size,
  isPlainObject,
  readEllipse,
  readRectangle
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { RectangleLike } from '../basic/Rectangle.ts'

// The properties of the named forms besides their geometry, set on the path:
type PathProps = { [key: string]: any }

// The segments of the unit circle, as [point, handleIn, handleOut]:
const ellipseSegments = [
  [[-1, 0], [0, KAPPA], [0, -KAPPA]],
  [[0, -1], [-KAPPA, 0], [KAPPA, 0]],
  [[1, 0], [0, -KAPPA], [0, KAPPA]],
  [[0, 1], [KAPPA, 0], [-KAPPA, 0]]
]

/**
 * Adds the factories of shaped paths to Path, used with `new`, e.g.
 * `new Path.Circle(center, radius)`. Path calls it from its static block, as
 * its binding isn't initialized yet while that runs.
 *
 * @private
 */
export function defineConstructors(ctor: typeof Path) {
  Object.assign(ctor, {
    Line: function (...args: any[]) {
      const { from, to, ...props } = getNamedArguments(args, ['from', 'to'])
      return createPath([new Segment(from), new Segment(to)], false, props)
    },

    Circle: function (...args: any[]) {
      const { center, radius, ...props } = getNamedArguments(args, [
        'center',
        'radius'
      ])
      return createEllipse(Point.from(center), Size.from(radius), props)
    },

    Rectangle: function (arg0: any, arg1?: any) {
      // The named form, or a rectangle followed by the corner radius, or the
      // point and the size, or the two points that describe it:
      const { radius, ...object } =
        arg1 === undefined
          ? isPlainObject(arg0)
            ? arg0
            : { rectangle: arg0 }
          : isPoint(arg0)
            ? { rectangle: new Rectangle(arg0, arg1) }
            : { rectangle: arg0, radius: arg1 }
      const [rect, props] = readRectangle(object)
      const size = radius && Size.from(radius)
      const bl = rect._getBottomLeft(true)
      const tl = rect._getTopLeft(true)
      const tr = rect._getTopRight(true)
      const br = rect._getBottomRight(true)
      let segments: Segment[]
      if (size && !size.isZero()) {
        const { width: rx, height: ry } = Size.min(
          size,
          rect._getSize(true).divide(2)
        )
        const hx = rx * KAPPA
        const hy = ry * KAPPA
        segments = [
          new Segment(bl.add(rx, 0), null, [-hx, 0]),
          new Segment(bl.subtract(0, ry), [0, hy]),
          new Segment(tl.add(0, ry), null, [0, -hy]),
          new Segment(tl.add(rx, 0), [-hx, 0], null),
          new Segment(tr.subtract(rx, 0), null, [hx, 0]),
          new Segment(tr.add(0, ry), [0, -hy], null),
          new Segment(br.subtract(0, ry), null, [0, hy]),
          new Segment(br.subtract(rx, 0), [hx, 0])
        ]
      } else {
        segments = [
          new Segment(bl),
          new Segment(tl),
          new Segment(tr),
          new Segment(br)
        ]
      }
      return createPath(segments, true, props)
    },

    Ellipse: function (rectangle: any) {
      const object = isPlainObject(rectangle) ? rectangle : { rectangle }
      // Placed by its center and radius, or by the rectangle around it:
      const { center, radius, props } = readEllipse(object)
      return createEllipse(center, radius, props)
    },

    Arc: function (...args: any[]) {
      const { from, through, to, ...props } = getNamedArguments(args, [
        'from',
        'through',
        'to'
      ])
      // Draw the arc on a temporary path, and create the result
      // from its segments like all the other constructors:
      const arc = new Path(Item.NO_INSERT)
      arc.moveTo(from)
      arc.arcTo(through, to)
      return createPath(arc._segments, false, props)
    },

    RegularPolygon: function (...args: any[]) {
      const { center, sides, radius, ...props } = getNamedArguments(args, [
        'center',
        'sides',
        'radius'
      ])
      const centerPoint = Point.from(center)
      const step = -360 / sides
      // Start at the top as Illustrator does: at the top vertex, or
      // the right end of the top edge with an even number of sides,
      // counterclockwise:
      const offset = sides % 2 ? 0 : -0.5
      const vector = new Point(0, -radius)
      const segments = []
      for (let i = 0; i < sides; i++) {
        segments.push(
          new Segment(centerPoint.add(vector.rotate((i + offset) * step)))
        )
      }
      return createPath(segments, true, props)
    },

    Star: function (...args: any[]) {
      const { center, points, radius1, radius2, ...props } = getNamedArguments(
        args,
        ['center', 'points', 'radius1', 'radius2']
      )
      const centerPoint = Point.from(center)
      const count = points * 2
      const step = 360 / count
      const vector = new Point(0, -1)
      const segments = []
      for (let i = 0; i < count; i++) {
        segments.push(
          new Segment(
            centerPoint.add(
              vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)
            )
          )
        )
      }
      return createPath(segments, true, props)
    }
  })
}

declare module './Path.ts' {
  namespace Path {
    /**
     * {@grouptitle Shaped Paths}
     *
     * Creates a linear path item.
     */
    export const Line: {
      /**
       * Creates a linear path item from two points describing a line.
       *
       * @param from the line's starting point
       * @param to the line's ending point
       * @return the newly created path
       *
       * @example {@paperscript}
       * var from = new Point(20, 20);
       * var to = new Point(80, 80);
       * var path = new Path.Line(from, to);
       * path.strokeColor = 'black';
       */
      new (from: PointLike, to: PointLike): Path
      /**
       * Creates a linear path item from the properties described by an object
       * literal.
       *
       * @param object an object containing properties describing the
       *     path's attributes
       * @return the newly created path
       *
       * @example {@paperscript}
       * var path = new Path.Line({
       *     from: [20, 20],
       *     to: [80, 80],
       *     strokeColor: 'black'
       * });
       */
      new (object: { from: PointLike; to: PointLike } & PathProps): Path
    }

    /**
     * Creates a circular path item.
     */
    export const Circle: {
      /**
       * Creates a circular path item.
       *
       * @param center the center point of the circle
       * @param radius the radius of the circle
       * @return the newly created path
       *
       * @example {@paperscript}
       * var path = new Path.Circle(new Point(80, 50), 30);
       * path.strokeColor = 'black';
       */
      new (center: PointLike, radius: number): Path
      /**
       * Creates a circular path item from the properties described by an
       * object literal.
       *
       * @param object an object containing properties describing the
       *     path's attributes
       * @return the newly created path
       *
       * @example {@paperscript}
       * var path = new Path.Circle({
       *     center: [80, 50],
       *     radius: 30,
       *     strokeColor: 'black'
       * });
       */
      new (object: { center: PointLike; radius: number } & PathProps): Path
    }

    /**
     * Creates a rectangular path item, with optionally rounded corners.
     */
    export const Rectangle: {
      /**
       * Creates a rectangular path item, with optionally rounded corners.
       *
       * @param rectangle the rectangle object describing the
       * geometry of the rectangular path to be created
       * @param radius the size of the rounded corners
       * @return the newly created path
       *
       * @example {@paperscript}
       * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
       * var path = new Path.Rectangle(rectangle);
       * path.strokeColor = 'black';
       *
       * @example {@paperscript} // The same, with rounder corners
       * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
       * var cornerSize = new Size(10, 10);
       * var path = new Path.Rectangle(rectangle, cornerSize);
       * path.strokeColor = 'black';
       */
      new (rectangle: RectangleLike, radius?: SizeLike | number): Path
      /**
       * Creates a rectangular path item from a point and a size object.
       *
       * @param point the rectangle's top-left corner.
       * @param size the rectangle's size.
       * @return the newly created path
       *
       * @example {@paperscript}
       * var point = new Point(20, 20);
       * var size = new Size(60, 60);
       * var path = new Path.Rectangle(point, size);
       * path.strokeColor = 'black';
       */
      new (point: PointLike, size: SizeLike): Path
      /**
       * Creates a rectangular path item from the passed points. These do not
       * necessarily need to be the top left and bottom right corners, the
       * constructor figures out how to fit a rectangle between them.
       *
       * @param from the first point defining the rectangle
       * @param to the second point defining the rectangle
       * @return the newly created path
       *
       * @example {@paperscript}
       * var from = new Point(20, 20);
       * var to = new Point(80, 80);
       * var path = new Path.Rectangle(from, to);
       * path.strokeColor = 'black';
       */
      new (from: PointLike, to: PointLike): Path
      /**
       * Creates a rectangular path item from the properties described by an
       * object literal.
       *
       * @param object an object containing properties describing the
       *     path's attributes
       * @return the newly created path
       *
       * @example {@paperscript}
       * var path = new Path.Rectangle({
       *     point: [20, 20],
       *     size: [60, 60],
       *     strokeColor: 'black'
       * });
       *
       * @example {@paperscript}
       * var path = new Path.Rectangle({
       *     from: [20, 20],
       *     to: [80, 80],
       *     strokeColor: 'black'
       * });
       *
       * @example {@paperscript}
       * var path = new Path.Rectangle({
       *     rectangle: {
       *         topLeft: [20, 20],
       *         bottomRight: [80, 80]
       *     },
       *     strokeColor: 'black'
       * });
       *
       * @example {@paperscript}
       * var path = new Path.Rectangle({
       *  topLeft: [20, 20],
       *     bottomRight: [80, 80],
       *     radius: 10,
       *     strokeColor: 'black'
       * });
       */
      new (object: PathProps): Path
    }

    /**
     * Creates an elliptical path item.
     */
    export const Ellipse: {
      /**
       * Creates an elliptical path item.
       *
       * @param rectangle the rectangle circumscribing the ellipse
       * @return the newly created path
       *
       * @example {@paperscript}
       * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
       * var path = new Path.Ellipse(rectangle);
       * path.fillColor = 'black';
       */
      new (rectangle: RectangleLike): Path
      /**
       * Creates an elliptical path item from the properties described by an
       * object literal.
       *
       * @param object an object containing properties describing the
       *     path's attributes
       * @return the newly created path
       *
       * @example {@paperscript}
       * var path = new Path.Ellipse({
       *     point: [20, 20],
       *     size: [180, 60],
       *     fillColor: 'black'
       * });
       *
       * @example {@paperscript} // Placing by center and radius
       * var shape = new Path.Ellipse({
       *     center: [110, 50],
       *     radius: [90, 30],
       *     fillColor: 'black'
       * });
       */
      new (object: PathProps): Path
    }

    /**
     * Creates a circular arc path item.
     */
    export const Arc: {
      /**
       * Creates a circular arc path item.
       *
       * @param from the starting point of the circular arc
       * @param through the point the arc passes through
       * @param to the end point of the arc
       * @return the newly created path
       *
       * @example {@paperscript}
       * var from = new Point(20, 20);
       * var through = new Point(60, 20);
       * var to = new Point(80, 80);
       * var path = new Path.Arc(from, through, to);
       * path.strokeColor = 'black';
       *
       */
      new (from: PointLike, through: PointLike, to: PointLike): Path
      /**
       * Creates an circular arc path item from the properties described by an
       * object literal.
       *
       * @param object an object containing properties describing the
       *     path's attributes
       * @return the newly created path
       *
       * @example {@paperscript}
       * var path = new Path.Arc({
       *     from: [20, 20],
       *     through: [60, 20],
       *     to: [80, 80],
       *     strokeColor: 'black'
       * });
       */
      new (
        object: {
          from: PointLike
          through: PointLike
          to: PointLike
        } & PathProps
      ): Path
    }

    /**
     * Creates a regular polygon shaped path item.
     */
    export const RegularPolygon: {
      /**
       * Creates a regular polygon shaped path item. As in Illustrator, it
       * stands on a flat bottom edge, and its segments run counterclockwise
       * from its top vertex, or with an even number of sides, from the right
       * end of its top edge.
       *
       * @param center the center point of the polygon
       * @param sides the number of sides of the polygon
       * @param radius the radius of the polygon
       * @return the newly created path
       *
       * @example {@paperscript}
       * var center = new Point(50, 50);
       * var sides = 3;
       * var radius = 40;
       * var triangle = new Path.RegularPolygon(center, sides, radius);
       * triangle.fillColor = 'black';
       */
      new (center: PointLike, sides: number, radius: number): Path
      /**
       * Creates a regular polygon shaped path item from the properties
       * described by an object literal.
       *
       * @param object an object containing properties describing the
       *     path's attributes
       * @return the newly created path
       *
       * @example {@paperscript}
       * var triangle = new Path.RegularPolygon({
       *     center: [50, 50],
       *     sides: 10,
       *     radius: 40,
       *     fillColor: 'black'
       * });
       */
      new (
        object: { center: PointLike; sides: number; radius: number } & PathProps
      ): Path
    }

    /**
     * Creates a star shaped path item.
     */
    export const Star: {
      /**
       * Creates a star shaped path item.
       *
       * The largest of `radius1` and `radius2` will be the outer radius of
       * the star. The smallest of radius1 and radius2 will be the inner
       * radius.
       *
       * @param center the center point of the star
       * @param points the number of points of the star
       * @param radius1
       * @param radius2
       * @return the newly created path
       *
       * @example {@paperscript}
       * var center = new Point(50, 50);
       * var points = 12;
       * var radius1 = 25;
       * var radius2 = 40;
       * var path = new Path.Star(center, points, radius1, radius2);
       * path.fillColor = 'black';
       */
      new (
        center: PointLike,
        points: number,
        radius1: number,
        radius2: number
      ): Path
      /**
       * Creates a star shaped path item from the properties described by an
       * object literal.
       *
       * @param object an object containing properties describing the
       *     path's attributes
       * @return the newly created path
       *
       * @example {@paperscript}
       * var path = new Path.Star({
       *     center: [50, 50],
       *     points: 12,
       *     radius1: 25,
       *     radius2: 40,
       *     fillColor: 'black'
       * });
       */
      new (
        object: {
          center: PointLike
          points: number
          radius1: number
          radius2: number
        } & PathProps
      ): Path
    }
  }
}

// Returns the arguments as an object by their names: the single plain object
// of the named form, or the positional arguments:
function getNamedArguments(args: any[], names: string[]): PathProps {
  return args.length === 1 && isPlainObject(args[0])
    ? args[0]
    : Object.fromEntries(names.map((name, index) => [name, args[index]]))
}

// Checks whether the value is a point rather than a rectangle:
function isPoint(value: any): boolean {
  return (
    value instanceof Point || (
      Array.isArray(value)
        ? value.length === 2
        : value.x !== undefined && value.width === undefined
    )
  )
}

// Takes the properties that describe the rectangle out of the object of a
// named form: `rectangle`, or the ones that Rectangle reads from an object,
// its own and `from` / `to`. Returns the rectangle and the remaining
// properties, which go to set():
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

function createEllipse(center: Point, radius: Size, props: PathProps): Path {
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
