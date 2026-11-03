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
 * @name Shape
 *
 * @class
 *
 * @extends Item
 */
const Shape = Item.extend(
  /** @lends Shape# */ {
    _class: 'Shape',
    _applyMatrix: false,
    _canApplyMatrix: false,
    _canScaleStroke: true,
    _serializeFields: {
      type: null,
      size: null,
      radius: null
    },
    // Prioritize `type` over `radius`, which depends on it:
    _prioritize: ['type'],

    initialize: function Shape(props, point) {
      this._initialize(props, point)
    },

    _equals: function (item) {
      return (
        this._type === item._type &&
        this._size.equals(item._size) &&
        // Radius can be a number or size:
        Base.equals(this._radius, item._radius)
      )
    },

    copyContent: function (source) {
      this.setType(source._type)
      this.setSize(source._size)
      this.setRadius(source._radius)
    },

    /**
     * The type of shape of the item as a string.
     *
     * @bean
     * @type String
     * @values 'rectangle', 'circle', 'ellipse'
     */
    getType: function () {
      return this._type
    },

    setType: function (type) {
      this._type = type
    },

    /**
     * @bean
     * @type String
     * @deprecated use {@link #type} instead.
     */
    getShape: '#getType',
    setShape: '#setType',

    /**
     * The size of the shape.
     *
     * @bean
     * @type Size
     */
    getSize: function () {
      const size = this._size
      return new LinkedSize(size.width, size.height, this, 'setSize')
    },

    setSize: function (/* size */) {
      const size = Size.read(arguments)
      if (!this._size) {
        // First time, e.g. when reading from JSON...
        this._size = size.clone()
      } else if (!this._size.equals(size)) {
        const type = this._type
        let width = size.width
        let height = size.height
        if (type === 'rectangle') {
          // Shrink radius accordingly
          this._radius.set(Size.min(this._radius, size.divide(2).abs()))
        } else if (type === 'circle') {
          // Use average of width and height as new size, then calculate
          // radius as a number from that:
          width = height = (width + height) / 2
          this._radius = width / 2
        } else if (type === 'ellipse') {
          // The radius is a size.
          this._radius._set(width / 2, height / 2)
        }
        this._size._set(width, height)
        this._changed(/*#=*/ Change.GEOMETRY)
      }
    },

    /**
     * The radius of the shape, as a number if it is a circle, or a size object
     * for ellipses and rounded rectangles.
     *
     * @bean
     * @type Number|Size
     */
    getRadius: function () {
      const rad = this._radius
      return this._type === 'circle'
        ? rad
        : new LinkedSize(rad.width, rad.height, this, 'setRadius')
    },

    setRadius: function (radius) {
      let size

      const type = this._type
      if (type === 'circle') {
        if (radius === this._radius) return
        size = radius * 2
        this._radius = radius
        if (this._size) {
          this._size._set(size, size)
        } else {
          // First time, e.g. when no size was set before:
          this._size = new Size(size, size)
        }
      } else {
        radius = Size.read(arguments)
        if (!this._radius) {
          // First time, e.g. when reading from JSON...
          this._radius = radius.clone()
        } else {
          if (this._radius.equals(radius)) return
          this._radius.set(radius)
          if (type === 'rectangle') {
            // Grow size accordingly
            size = Size.max(this._size, radius.multiply(2))
            this._size.set(size)
          } else if (type === 'ellipse') {
            this._size._set(radius.width * 2, radius.height * 2)
          }
        }
      }
      this._changed(/*#=*/ Change.GEOMETRY)
    },

    isEmpty: function () {
      // A shape can never be "empty" in the sense that it always holds a
      // definition. This is required for Group#bounds to work correctly when
      // containing a Shape.
      return false
    },

    /**
     * Creates a new path item with same geometry as this shape item, and
     * inherits all settings from it, similar to {@link Item#clone()}.
     *
     * @param {Boolean} [insert=true] specifies whether the new path should be
     *     inserted into the scene graph. When set to `true`, it is inserted
     *     above the shape item
     * @return {Path} the newly created path item with the same geometry as
     *     this shape item
     * @see Path#toShape(insert)
     */
    toPath: function (insert) {
      const path = this._asPathItem()
      // Respect the setting of paper.settings.applyMatrix for new paths:
      if (paper.settings.applyMatrix) path.setApplyMatrix(true)
      if (Base.pick(insert, paper.settings.insertItems)) path.insertAbove(this)
      return path
    },

    toShape: '#clone',

    _asPathItem: function () {
      // TODO: Move to Path.createTYPE creators instead of fake constructors.
      const path = new Path[Base.capitalize(this._type)]({
        center: new Point(),
        size: this._size,
        radius: this._radius,
        insert: false
      })
      // The created path inherits #applyMatrix from this Shape, hence it
      // will always be false, as required by Item#_asPathItem().
      path.copyAttributes(this)
      return path
    },

    _draw: function (ctx, param, viewMatrix, strokeMatrix) {
      const style = this._style
      const hasFill = style.hasFill()
      const hasStroke = style.hasStroke()
      const dontPaint = param.dontFinish || param.clip
      const untransformed = !strokeMatrix
      if (hasFill || hasStroke || dontPaint) {
        const type = this._type
        const radius = this._radius
        const isCircle = type === 'circle'
        if (!param.dontStart) ctx.beginPath()
        if (untransformed && isCircle) {
          ctx.arc(0, 0, radius, 0, Math.PI * 2, true)
        } else {
          const rx = isCircle ? radius : radius.width
          const ry = isCircle ? radius : radius.height
          const size = this._size
          const width = size.width
          const height = size.height
          if (untransformed && type === 'rectangle' && rx === 0 && ry === 0) {
            // Rectangles with no rounding
            ctx.rect(-width / 2, -height / 2, width, height)
          } else {
            // Round rectangles, ellipses, transformed circles
            const x = width / 2
            const y = height / 2
            // Use 1 - KAPPA to calculate position of control points
            // from the corners inwards.
            const kappa = 1 - /*#=*/ Numerical.KAPPA
            const cx = rx * kappa
            const cy = ry * kappa
            // Build the coordinates list, so it can optionally be
            // transformed by the strokeMatrix.
            const c = [
              -x,
              -y + ry,
              -x,
              -y + cy,
              -x + cx,
              -y,
              -x + rx,
              -y,
              x - rx,
              -y,
              x - cx,
              -y,
              x,
              -y + cy,
              x,
              -y + ry,
              x,
              y - ry,
              x,
              y - cy,
              x - cx,
              y,
              x - rx,
              y,
              -x + rx,
              y,
              -x + cx,
              y,
              -x,
              y - cy,
              -x,
              y - ry
            ]
            if (strokeMatrix) strokeMatrix.transform(c, c, 32)
            ctx.moveTo(c[0], c[1])
            ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7])
            if (x !== rx) ctx.lineTo(c[8], c[9])
            ctx.bezierCurveTo(c[10], c[11], c[12], c[13], c[14], c[15])
            if (y !== ry) ctx.lineTo(c[16], c[17])
            ctx.bezierCurveTo(c[18], c[19], c[20], c[21], c[22], c[23])
            if (x !== rx) ctx.lineTo(c[24], c[25])
            ctx.bezierCurveTo(c[26], c[27], c[28], c[29], c[30], c[31])
          }
        }
        ctx.closePath()
      }
      if (!dontPaint) this._paint(ctx, param, viewMatrix, strokeMatrix)
    },

    _canComposite: function () {
      // A path with only a fill or a stroke can be directly blended, but if
      // it has both, it needs to be drawn into a separate canvas first.
      return !(this.hasFill() && this.hasStroke())
    },

    _getBounds: function (matrix, options) {
      const size = this._size
      let rect = new Rectangle(size).setCenter(0, 0)
      const style = this._style
      const strokeRadius = (
        options.stroke &&
        style.hasStroke() &&
        style.getStrokeWidth() / 2
      )
      // If we're getting the strokeBounds, include the stroke width before
      // or after transforming the rect, based on strokeScaling.
      if (matrix) {
        if (this._type === 'rectangle') {
          rect = matrix._transformBounds(rect)
        } else {
          // Use the exact bounds of the transformed ellipse, the unit
          // circle transformed by the matrix scaled to its radii:
          const extents = Matrix._getCircleExtents(
            1,
            matrix.clone().scale(size.width / 2, size.height / 2)
          )
          rect = new Rectangle(new Size(extents).multiply(2))
            .setCenter(matrix._tx, matrix._ty)
        }
      }
      return strokeRadius
        ? rect.expand(
            new Size(
              Matrix._getCircleExtents(
                strokeRadius,
                this._getStrokeMatrix(matrix, options)
              )
            ).multiply(2)
          )
        : rect
    }
  },
  new (function () {
    // Scope for _contains() and _hitTestSelf() code.
    // Returns the center of the quarter corner ellipse for rounded rectangle,
    // if the point lies within its bounding box.
    function getCornerCenter(that, point) {
      const radius = that._radius
      if (!radius.isZero()) {
        const halfSize = that._size.divide(2)
        for (let q = 1; q <= 4; q++) {
          // Calculate the bounding boxes of the four quarter ellipses
          // that define the rounded rectangle, and hit-test these.
          // Setup `dir` to be in quadrant `q` (See Point#isInQuadrant()):
          const dir = new Point(q > 1 && q < 4 ? -1 : 1, q > 2 ? -1 : 1)
          const corner = dir.multiply(halfSize)
          const center = corner.subtract(dir.multiply(radius))
          const rect = new Rectangle(corner, center)
          if (rect.contains(point)) return { point: center, quadrant: q }
        }
      }
    }

    return /** @lends Shape# */ {
      _contains: function _contains(point) {
        if (this._type === 'rectangle') {
          const center = getCornerCenter(this, point)
          return center
            ? // If there's a quarter ellipse center, use the same
              // check as for ellipses below.
              point.subtract(center.point).divide(this._radius).getLength() <= 1
            : _contains.base.call(this, point)
        } else {
          return point.divide(this.size).getLength() <= 0.5
        }
      },

      _hitTestSelf: function (point, options, viewMatrix, strokeMatrix) {
        // Hit-test the shape as its path, see #toPath(), which measures
        // strokes and tolerance where they're drawn (#2334), but without
        // its segments, handles and curves, which shapes don't have:
        const hit = this._asPathItem()._hitTestSelf(
          point,
          Base.set({}, options, {
            segments: false,
            handles: false,
            ends: false,
            curves: false,
            all: false
          }),
          viewMatrix,
          strokeMatrix
        )
        return hit && new HitResult(hit.type, this)
      }
    }
  })(),
  {
    // Mess with indentation in order to get more line-space below:
    statics: new (function () {
      function createShape(type, point, size, radius, args) {
        // Use `Base.create()` to avoid calling `initialize()` until after the
        // internal fields are set here, then call `_initialize()` directly:
        const item = Base.create(Shape.prototype)
        item._type = type
        item._size = size
        item._radius = radius
        item._initialize(Base.getNamed(args), point)
        return item
      }

      return /** @lends Shape */ {
        /**
         * Creates a circular shape item.
         *
         * @name Shape.Circle
         * @param {Point} center the center point of the circle
         * @param {Number} radius the radius of the circle
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var shape = new Shape.Circle(new Point(80, 50), 30);
         * shape.strokeColor = 'black';
         */
        /**
         * Creates a circular shape item from the properties described by an
         * object literal.
         *
         * @name Shape.Circle
         * @param {Object} object an object containing properties describing the
         *     shape's attributes
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var shape = new Shape.Circle({
         *     center: [80, 50],
         *     radius: 30,
         *     strokeColor: 'black'
         * });
         */
        Circle: function (/* center, radius */) {
          const args = arguments
          const center = Point.readNamed(args, 'center')
          const radius = Base.readNamed(args, 'radius')
          return createShape(
            'circle',
            center,
            new Size(radius * 2),
            radius,
            args
          )
        },

        /**
         * Creates a rectangular shape item, with optionally rounded corners.
         *
         * @name Shape.Rectangle
         * @param {Rectangle} rectangle the rectangle object describing the
         * geometry of the rectangular shape to be created
         * @param {Size} [radius=null] the size of the rounded corners
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
         * var shape = new Shape.Rectangle(rectangle);
         * shape.strokeColor = 'black';
         *
         * @example {@paperscript} // The same, with rounder corners
         * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
         * var cornerSize = new Size(10, 10);
         * var shape = new Shape.Rectangle(rectangle, cornerSize);
         * shape.strokeColor = 'black';
         */
        /**
         * Creates a rectangular shape item from a point and a size object.
         *
         * @name Shape.Rectangle
         * @param {Point} point the rectangle's top-left corner.
         * @param {Size} size the rectangle's size.
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var point = new Point(20, 20);
         * var size = new Size(60, 60);
         * var shape = new Shape.Rectangle(point, size);
         * shape.strokeColor = 'black';
         */
        /**
         * Creates a rectangular shape item from the passed points. These do not
         * necessarily need to be the top left and bottom right corners, the
         * constructor figures out how to fit a rectangle between them.
         *
         * @name Shape.Rectangle
         * @param {Point} from the first point defining the rectangle
         * @param {Point} to the second point defining the rectangle
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var from = new Point(20, 20);
         * var to = new Point(80, 80);
         * var shape = new Shape.Rectangle(from, to);
         * shape.strokeColor = 'black';
         */
        /**
         * Creates a rectangular shape item from the properties described by an
         * object literal.
         *
         * @name Shape.Rectangle
         * @param {Object} object an object containing properties describing the
         *     shape's attributes
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var shape = new Shape.Rectangle({
         *     point: [20, 20],
         *     size: [60, 60],
         *     strokeColor: 'black'
         * });
         *
         * @example {@paperscript}
         * var shape = new Shape.Rectangle({
         *     from: [20, 20],
         *     to: [80, 80],
         *     strokeColor: 'black'
         * });
         *
         * @example {@paperscript}
         * var shape = new Shape.Rectangle({
         *     rectangle: {
         *         topLeft: [20, 20],
         *         bottomRight: [80, 80]
         *     },
         *     strokeColor: 'black'
         * });
         *
         * @example {@paperscript}
         * var shape = new Shape.Rectangle({
         *     topLeft: [20, 20],
         *     bottomRight: [80, 80],
         *     radius: 10,
         *     strokeColor: 'black'
         * });
         */
        Rectangle: function (/* rectangle */) {
          const args = arguments
          const rect = Rectangle.readNamed(args, 'rectangle')
          const radius = Size.min(
            Size.readNamed(args, 'radius'),
            rect.getSize(true).divide(2)
          )
          return createShape(
            'rectangle',
            rect.getCenter(true),
            rect.getSize(true),
            radius,
            args
          )
        },

        /**
         * Creates an elliptical shape item.
         *
         * @name Shape.Ellipse
         * @param {Rectangle} rectangle the rectangle circumscribing the ellipse
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
         * var shape = new Shape.Ellipse(rectangle);
         * shape.fillColor = 'black';
         */
        /**
         * Creates an elliptical shape item from the properties described by an
         * object literal.
         *
         * @name Shape.Ellipse
         * @param {Object} object an object containing properties describing the
         *     shape's attributes
         * @return {Shape} the newly created shape
         *
         * @example {@paperscript}
         * var shape = new Shape.Ellipse({
         *     point: [20, 20],
         *     size: [180, 60],
         *     fillColor: 'black'
         * });
         *
         * @example {@paperscript} // Placing by center and radius
         * var shape = new Shape.Ellipse({
         *     center: [110, 50],
         *     radius: [90, 30],
         *     fillColor: 'black'
         * });
         */
        Ellipse: function (/* rectangle */) {
          const args = arguments
          const ellipse = Shape._readEllipse(args)
          const radius = ellipse.radius
          return createShape(
            'ellipse',
            ellipse.center,
            radius.multiply(2),
            radius,
            args
          )
        },

        // Private method to read ellipse center and radius from arguments list,
        // shared with Path.Ellipse constructor.
        _readEllipse: function (args) {
          let center
          let radius
          if (Base.hasNamed(args, 'radius')) {
            center = Point.readNamed(args, 'center')
            radius = Size.readNamed(args, 'radius')
          } else {
            const rect = Rectangle.readNamed(args, 'rectangle')
            center = rect.getCenter(true)
            radius = rect.getSize(true).divide(2)
          }
          return { center: center, radius: radius }
        }
      }
    })()
  }
)
