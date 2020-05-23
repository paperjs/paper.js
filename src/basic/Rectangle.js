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
 * @name Rectangle
 *
 * @class A Rectangle specifies an area that is enclosed by it's top-left
 * point (x, y), its width, and its height. It should not be confused with a
 * rectangular path, it is not an item.
 */
var Rectangle = Base.extend(/** @lends Rectangle# */{
    _class: 'Rectangle',
    // Tell Base.read that the Rectangle constructor supports reading with index
    _readIndex: true,
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See  #getPoint() below.
    beans: true,

    /**
     * Creates a Rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Point} point the top-left point of the rectangle
     * @param {Size} size the size of the rectangle
     */
    /**
     * Creates a Rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Object} object an object containing properties to be set on the
     * rectangle
     *
     * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
     * var rectangle = new Rectangle({
     *     point: [20, 20],
     *     size: [60, 60]
     * });
     *
     * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
     * var rectangle = new Rectangle({
     *     from: [20, 20],
     *     to: [80, 80]
     * });
     */
    /**
     * Creates a rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Number} x the left coordinate
     * @param {Number} y the top coordinate
     * @param {Number} width
     * @param {Number} height
     */
    /**
     * Creates a rectangle object from the passed points. These do not
     * necessarily need to be the top left and bottom right corners, the
     * constructor figures out how to fit a rectangle between them.
     *
     * @name Rectangle#initialize
     * @param {Point} from the first point defining the rectangle
     * @param {Point} to the second point defining the rectangle
     */
    /**
     * Creates a new rectangle object from the passed rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Rectangle} rectangle
     */
    initialize: function Rectangle(arg0, arg1, arg2, arg3) {
        var args = arguments,
            type = typeof arg0,
            read;
        if (type === 'number') {
            // new Rectangle(x, y, width, height)
            this._set(arg0, arg1, arg2, arg3);
            read = 4;
        } else if (type === 'undefined' || arg0 === null) {
            // new Rectangle(), new Rectangle(null)
            this._set(0, 0, 0, 0);
            read = arg0 === null ? 1 : 0;
        } else if (args.length === 1) {
            // This can either be an array, or an object literal.
            if (Array.isArray(arg0)) {
                this._set.apply(this, arg0);
                read = 1;
            } else if (arg0.x !== undefined || arg0.width !== undefined) {
                // Another rectangle or a simple object literal
                // describing one. Use duck typing, and 0 as defaults.
                this._set(arg0.x || 0, arg0.y || 0,
                        arg0.width || 0, arg0.height || 0);
                read = 1;
            } else if (arg0.from === undefined && arg0.to === undefined) {
                // Use `Base.readSupported()` to read and consume whatever
                // property the rectangle can receive, but handle `from` / `to`
                // separately below.
                this._set(0, 0, 0, 0);
                if (Base.readSupported(args, this)) {
                    read = 1;
                }
            }
        }
        if (read === undefined) {
            // Read a point argument and look at the next value to see whether
            // it's a size or a point, then read accordingly.
            // We're supporting both reading from a normal arguments list and
            // covering the Rectangle({ from: , to: }) constructor, through
            // Point.readNamed().
            var frm = Point.readNamed(args, 'from'),
                next = Base.peek(args),
                x = frm.x,
                y = frm.y,
                width,
                height;
            if (next && next.x !== undefined || Base.hasNamed(args, 'to')) {
                // new Rectangle(from, to)
                // Read above why we can use readNamed() to cover both cases.
                var to = Point.readNamed(args, 'to');
                width = to.x - x;
                height = to.y - y;
                // Check if horizontal or vertical order needs to be reversed.
                if (width < 0) {
                    x = to.x;
                    width = -width;
                }
                if (height < 0) {
                    y = to.y;
                    height = -height;
                }
            } else {
                // new Rectangle(point, size)
                var size = Size.read(args);
                width = size.width;
                height = size.height;
            }
            this._set(x, y, width, height);
            read = args.__index;
        }
        // arguments.__filtered wouldn't survive the function call even if a
        // previous arguments list was passed through Function#apply().
        // Return it on the object instead, see Base.read()
        var filtered = args.__filtered;
        if (filtered)
            this.__filtered = filtered;
        if (this.__read)
            this.__read = read;
        return this;
    },

    /**
     * Sets the rectangle to the passed values. Note that any sequence of
     * parameters that is supported by the various {@link Rectangle()}
     * constructors also work for calls of `set()`.
     *
     * @function
     * @param {...*} values
     * @return {Rectangle}
     */
    set: '#initialize',

    // See Point#_set() for an explanation of #_set():
    _set: function(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        return this;
    },

    /**
     * The x position of the rectangle.
     *
     * @name Rectangle#x
     * @type Number
     */

    /**
     * The y position of the rectangle.
     *
     * @name Rectangle#y
     * @type Number
     */

    /**
     * The width of the rectangle.
     *
     * @name Rectangle#width
     * @type Number
     */

    /**
     * The height of the rectangle.
     *
     * @name Rectangle#height
     * @type Number
     */

    /**
     * Returns a copy of the rectangle.
     * @return {Rectangle}
     */
    clone: function() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    },

    /**
     * Checks whether the coordinates and size of the rectangle are equal to
     * that of the supplied rectangle.
     *
     * @param {Rectangle} rect
     * @return {Boolean} {@true if the rectangles are equal}
     */
    equals: function(rect) {
        var rt = Base.isPlainValue(rect)
                ? Rectangle.read(arguments)
                : rect;
        return rt === this
                || rt && this.x === rt.x && this.y === rt.y
                    && this.width === rt.width && this.height === rt.height
                || false;
    },

    /**
     * @return {String} a string representation of this rectangle
     */
    toString: function() {
        var f = Formatter.instance;
        return '{ x: ' + f.number(this.x)
                + ', y: ' + f.number(this.y)
                + ', width: ' + f.number(this.width)
                + ', height: ' + f.number(this.height)
                + ' }';
    },

    _serialize: function(options) {
        var f = options.formatter;
        // See Point#_serialize()
        return [f.number(this.x),
                f.number(this.y),
                f.number(this.width),
                f.number(this.height)];
    },

    /**
     * The top-left point of the rectangle
     *
     * @bean
     * @type Point
     */
    getPoint: function(_dontLink) {
        var ctor = _dontLink ? Point : LinkedPoint;
        return new ctor(this.x, this.y, this, 'setPoint');
    },

    setPoint: function(/* point */) {
        var point = Point.read(arguments);
        this.x = point.x;
        this.y = point.y;
    },


    /**
     * The size of the rectangle
     *
     * @bean
     * @type Size
     */
    getSize: function(_dontLink) {
        var ctor = _dontLink ? Size : LinkedSize;
        return new ctor(this.width, this.height, this, 'setSize');
    },

    // properties to keep track of fix-width / height: They are on by default,
    // and switched off once properties are used that change the outside of the
    // rectangle, so combinations of: left / top / right / bottom.
    _fw: 1,
    _fh: 1,

    setSize: function(/* size */) {
        var size = Size.read(arguments),
            sx = this._sx,
            sy = this._sy,
            w = size.width,
            h = size.height;
        // Keep track of how dimensions were specified through this._s*
        // attributes.
        // _sx / _sy can either be 0 (left), 0.5 (center) or 1 (right), and is
        // used as direct factors to calculate the x / y adjustments from the
        // size differences.
        // _fw / _fh can either be 0 (off) or 1 (on), and is used to protect
        // width / height values against changes.
        if (sx) {
            this.x += (this.width - w) * sx;
        }
        if (sy) {
            this.y += (this.height - h) * sy;
        }
        this.width = w;
        this.height = h;
        this._fw = this._fh = 1;
    },

    /**
     * {@grouptitle Side Positions}
     *
     * The position of the left hand side of the rectangle. Note that this
     * doesn't move the whole rectangle; the right hand side stays where it was.
     *
     * @bean
     * @type Number
     */
    getLeft: function() {
        return this.x;
    },

    setLeft: function(left) {
        if (!this._fw) {
            var amount = left - this.x;
            this.width -= this._sx === 0.5 ? amount * 2 : amount;
        }
        this.x = left;
        this._sx = this._fw = 0;
    },

    /**
     * The top coordinate of the rectangle. Note that this doesn't move the
     * whole rectangle: the bottom won't move.
     *
     * @bean
     * @type Number
     */
    getTop: function() {
        return this.y;
    },

    setTop: function(top) {
        if (!this._fh) {
            var amount = top - this.y;
            this.height -= this._sy === 0.5 ? amount * 2 : amount;
        }
        this.y = top;
        this._sy = this._fh = 0;
    },

    /**
     * The position of the right hand side of the rectangle. Note that this
     * doesn't move the whole rectangle; the left hand side stays where it was.
     *
     * @bean
     * @type Number
     */
    getRight: function() {
        return this.x + this.width;
    },

    setRight: function(right) {
        if (!this._fw) {
            var amount = right - this.x;
            this.width = this._sx === 0.5 ? amount * 2 : amount;
        }
        this.x = right - this.width;
        this._sx = 1;
        this._fw = 0;
    },

    /**
     * The bottom coordinate of the rectangle. Note that this doesn't move the
     * whole rectangle: the top won't move.
     *
     * @bean
     * @type Number
     */
    getBottom: function() {
        return this.y + this.height;
    },

    setBottom: function(bottom) {
        if (!this._fh) {
            var amount = bottom - this.y;
            this.height = this._sy === 0.5 ? amount * 2 : amount;
        }
        this.y = bottom - this.height;
        this._sy = 1;
        this._fh = 0;
    },

    /**
     * The center-x coordinate of the rectangle.
     *
     * @bean
     * @type Number
     * @ignore
     */
    getCenterX: function() {
        return this.x + this.width / 2;
    },

    setCenterX: function(x) {
        // If we're asked to fix the width or if _sx is already in center mode,
        // just keep moving the center.
        if (this._fw || this._sx === 0.5) {
            this.x = x - this.width / 2;
        } else {
            if (this._sx) {
                this.x += (x - this.x) * 2 * this._sx;
            }
            this.width = (x - this.x) * 2;
        }
        this._sx = 0.5;
        this._fw = 0;
    },

    /**
     * The center-y coordinate of the rectangle.
     *
     * @bean
     * @type Number
     * @ignore
     */
    getCenterY: function() {
        return this.y + this.height / 2;
    },

    setCenterY: function(y) {
        // If we're asked to fix the height or if _sy is already in center mode,
        // just keep moving the center.
        if (this._fh || this._sy === 0.5) {
            this.y = y - this.height / 2;
        } else {
            if (this._sy) {
                this.y += (y - this.y) * 2 * this._sy;
            }
            this.height = (y - this.y) * 2;
        }
        this._sy = 0.5;
        this._fh = 0;
    },

    /**
     * {@grouptitle Corner and Center Point Positions}
     *
     * The center point of the rectangle.
     *
     * @bean
     * @type Point
     */
    getCenter: function(_dontLink) {
        var ctor = _dontLink ? Point : LinkedPoint;
        return new ctor(this.getCenterX(), this.getCenterY(), this, 'setCenter');
    },

    setCenter: function(/* point */) {
        var point = Point.read(arguments);
        this.setCenterX(point.x);
        this.setCenterY(point.y);
        // A special setter where we allow chaining, because it comes in handy
        // in a couple of places in core.
        return this;
    },

    /**
     * The top-left point of the rectangle.
     *
     * @name Rectangle#topLeft
     * @type Point
     */

    /**
     * The top-right point of the rectangle.
     *
     * @name Rectangle#topRight
     * @type Point
     */

    /**
     * The bottom-left point of the rectangle.
     *
     * @name Rectangle#bottomLeft
     * @type Point
     */

    /**
     * The bottom-right point of the rectangle.
     *
     * @name Rectangle#bottomRight
     * @type Point
     */

    /**
     * The left-center point of the rectangle.
     *
     * @name Rectangle#leftCenter
     * @type Point
     */

    /**
     * The top-center point of the rectangle.
     *
     * @name Rectangle#topCenter
     * @type Point
     */

    /**
     * The right-center point of the rectangle.
     *
     * @name Rectangle#rightCenter
     * @type Point
     */

    /**
     * The bottom-center point of the rectangle.
     *
     * @name Rectangle#bottomCenter
     * @type Point
     */

    /**
     * The area of the rectangle.
     *
     * @bean
     * @type Number
     */
    getArea: function() {
        return this.width * this.height;
    },

    /**
     * @return {Boolean} {@true if the rectangle is empty}
     */
    isEmpty: function() {
        return this.width === 0 || this.height === 0;
    },

    /**
     * {@grouptitle Geometric Tests}
     *
     * Tests if the specified point is inside the boundary of the rectangle.
     *
     * @name Rectangle#contains
     * @function
     * @param {Point} point the specified point
     * @return {Boolean} {@true if the point is inside the rectangle's boundary}
     *
     * @example {@paperscript}
     * // Checking whether the mouse position falls within the bounding
     * // rectangle of an item:
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 30.
     * var circle = new Path.Circle(new Point(80, 50), 30);
     * circle.fillColor = 'red';
     *
     * function onMouseMove(event) {
     *     // Check whether the mouse position intersects with the
     *     // bounding box of the item:
     *     if (circle.bounds.contains(event.point)) {
     *         // If it intersects, fill it with green:
     *         circle.fillColor = 'green';
     *     } else {
     *         // If it doesn't intersect, fill it with red:
     *         circle.fillColor = 'red';
     *     }
     * }
     */
    /**
     * Tests if the interior of the rectangle entirely contains the specified
     * rectangle.
     *
     * @name Rectangle#contains
     * @function
     * @param {Rectangle} rect the specified rectangle
     * @return {Boolean} {@true if the rectangle entirely contains the specified
     * rectangle}
     *
     * @example {@paperscript}
     * // Checking whether the bounding box of one item is contained within
     * // that of another item:
     *
     * // All newly created paths will inherit these styles:
     * project.currentStyle = {
     *     fillColor: 'green',
     *     strokeColor: 'black'
     * };
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 45.
     * var largeCircle = new Path.Circle(new Point(80, 50), 45);
     *
     * // Create a smaller circle shaped path in the same position
     * // with a radius of 30.
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * function onMouseMove(event) {
     *     // Move the circle to the position of the mouse:
     *     circle.position = event.point;
     *
     *     // Check whether the bounding box of the smaller circle
     *     // is contained within the bounding box of the larger item:
     *     if (largeCircle.bounds.contains(circle.bounds)) {
     *         // If it does, fill it with green:
     *         circle.fillColor = 'green';
     *         largeCircle.fillColor = 'green';
     *     } else {
     *         // If doesn't, fill it with red:
     *         circle.fillColor = 'red';
     *         largeCircle.fillColor = 'red';
     *     }
     * }
     */
    contains: function(arg) {
        // Detect rectangles either by checking for 'width' on the passed object
        // or by looking at the amount of elements in the arguments list,
        // or the passed array:
        return arg && arg.width !== undefined
                || (Array.isArray(arg) ? arg : arguments).length === 4
                ? this._containsRectangle(Rectangle.read(arguments))
                : this._containsPoint(Point.read(arguments));
    },

    _containsPoint: function(point) {
        var x = point.x,
            y = point.y;
        return x >= this.x && y >= this.y
                && x <= this.x + this.width
                && y <= this.y + this.height;
    },

    _containsRectangle: function(rect) {
        var x = rect.x,
            y = rect.y;
        return x >= this.x && y >= this.y
                && x + rect.width <= this.x + this.width
                && y + rect.height <= this.y + this.height;
    },

    /**
     * Tests if the interior of this rectangle intersects the interior of
     * another rectangle. Rectangles just touching each other are considered as
     * non-intersecting, except if a `epsilon` value is specified by which this
     * rectangle's dimensions are increased before comparing.
     *
     * @param {Rectangle} rect the specified rectangle
     * @param {Number} [epsilon=0] the epsilon against which to compare the
     *     rectangle's dimensions
     * @return {Boolean} {@true if the rectangle and the specified rectangle
     *     intersect each other}
     *
     * @example {@paperscript}
     * // Checking whether the bounding box of one item intersects with
     * // that of another item:
     *
     * // All newly created paths will inherit these styles:
     * project.currentStyle = {
     *     fillColor: 'green',
     *     strokeColor: 'black'
     * };
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 45.
     * var largeCircle = new Path.Circle(new Point(80, 50), 45);
     *
     * // Create a smaller circle shaped path in the same position
     * // with a radius of 30.
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * function onMouseMove(event) {
     *     // Move the circle to the position of the mouse:
     *     circle.position = event.point;
     *
     *     // Check whether the bounding box of the two circle
     *     // shaped paths intersect:
     *     if (largeCircle.bounds.intersects(circle.bounds)) {
     *         // If it does, fill it with green:
     *         circle.fillColor = 'green';
     *         largeCircle.fillColor = 'green';
     *     } else {
     *         // If doesn't, fill it with red:
     *         circle.fillColor = 'red';
     *         largeCircle.fillColor = 'red';
     *     }
     * }
     */
    intersects: function(/* rect, epsilon */) {
        var rect = Rectangle.read(arguments),
            epsilon = Base.read(arguments) || 0;
        return rect.x + rect.width > this.x - epsilon
                && rect.y + rect.height > this.y - epsilon
                && rect.x < this.x + this.width + epsilon
                && rect.y < this.y + this.height + epsilon;
    },

    /**
     * {@grouptitle Boolean Operations}
     *
     * Returns a new rectangle representing the intersection of this rectangle
     * with the specified rectangle.
     *
     * @param {Rectangle} rect the rectangle to be intersected with this
     * rectangle
     * @return {Rectangle} the largest rectangle contained in both the specified
     * rectangle and in this rectangle
     *
     * @example {@paperscript}
     * // Intersecting two rectangles and visualizing the result using rectangle
     * // shaped paths:
     *
     * // Create two rectangles that overlap each other
     * var size = new Size(50, 50);
     * var rectangle1 = new Rectangle(new Point(25, 15), size);
     * var rectangle2 = new Rectangle(new Point(50, 40), size);
     *
     * // The rectangle that represents the intersection of the
     * // two rectangles:
     * var intersected = rectangle1.intersect(rectangle2);
     *
     * // To visualize the intersecting of the rectangles, we will
     * // create rectangle shaped paths using the Path.Rectangle
     * // constructor.
     *
     * // Have all newly created paths inherit a black stroke:
     * project.currentStyle.strokeColor = 'black';
     *
     * // Create two rectangle shaped paths using the abstract rectangles
     * // we created before:
     * new Path.Rectangle(rectangle1);
     * new Path.Rectangle(rectangle2);
     *
     * // Create a path that represents the intersected rectangle,
     * // and fill it with red:
     * var intersectionPath = new Path.Rectangle(intersected);
     * intersectionPath.fillColor = 'red';
     */
    intersect: function(/* rect */) {
        var rect = Rectangle.read(arguments),
            x1 = Math.max(this.x, rect.x),
            y1 = Math.max(this.y, rect.y),
            x2 = Math.min(this.x + this.width, rect.x + rect.width),
            y2 = Math.min(this.y + this.height, rect.y + rect.height);
        return new Rectangle(x1, y1, x2 - x1, y2 - y1);
    },

    /**
     * Returns a new rectangle representing the union of this rectangle with the
     * specified rectangle.
     *
     * @param {Rectangle} rect the rectangle to be combined with this rectangle
     * @return {Rectangle} the smallest rectangle containing both the specified
     * rectangle and this rectangle
     */
    unite: function(/* rect */) {
        var rect = Rectangle.read(arguments),
            x1 = Math.min(this.x, rect.x),
            y1 = Math.min(this.y, rect.y),
            x2 = Math.max(this.x + this.width, rect.x + rect.width),
            y2 = Math.max(this.y + this.height, rect.y + rect.height);
        return new Rectangle(x1, y1, x2 - x1, y2 - y1);
    },

    /**
     * Adds a point to this rectangle. The resulting rectangle is the smallest
     * rectangle that contains both the original rectangle and the specified
     * point.
     *
     * After adding a point, a call to {@link #contains(point)} with the added
     * point as an argument does not necessarily return `true`. The {@link
     * Rectangle#contains(point)} method does not return `true` for points on
     * the right or bottom edges of a rectangle. Therefore, if the added point
     * falls on the left or bottom edge of the enlarged rectangle, {@link
     * Rectangle#contains(point)} returns `false` for that point.
     *
     * @param {Point} point
     * @return {Rectangle} the smallest rectangle that contains both the
     * original rectangle and the specified point
     */
    include: function(/* point */) {
        var point = Point.read(arguments);
        var x1 = Math.min(this.x, point.x),
            y1 = Math.min(this.y, point.y),
            x2 = Math.max(this.x + this.width, point.x),
            y2 = Math.max(this.y + this.height, point.y);
        return new Rectangle(x1, y1, x2 - x1, y2 - y1);
    },

    /**
     * Returns a new rectangle expanded by the specified amount in horizontal
     * and vertical directions.
     *
     * @name Rectangle#expand
     * @function
     * @param {Number|Size|Point} amount the amount to expand the rectangle in
     * both directions
     * @return {Rectangle} the expanded rectangle
     */
    /**
     * Returns a new rectangle expanded by the specified amounts in horizontal
     * and vertical directions.
     *
     * @name Rectangle#expand
     * @function
     * @param {Number} hor the amount to expand the rectangle in horizontal
     * direction
     * @param {Number} ver the amount to expand the rectangle in vertical
     * direction
     * @return {Rectangle} the expanded rectangle
     */
    expand: function(/* amount */) {
        var amount = Size.read(arguments),
            hor = amount.width,
            ver = amount.height;
        return new Rectangle(this.x - hor / 2, this.y - ver / 2,
                this.width + hor, this.height + ver);
    },

    /**
     * Returns a new rectangle scaled by the specified amount from its center.
     *
     * @name Rectangle#scale
     * @function
     * @param {Number} amount
     * @return {Rectangle} the scaled rectangle
     */
    /**
     * Returns a new rectangle scaled in horizontal direction by the specified
     * `hor` amount and in vertical direction by the specified `ver` amount
     * from its center.
     *
     * @name Rectangle#scale
     * @function
     * @param {Number} hor
     * @param {Number} ver
     * @return {Rectangle} the scaled rectangle
     */
    scale: function(hor, ver) {
        return this.expand(this.width * hor - this.width,
                this.height * (ver === undefined ? hor : ver) - this.height);
    }
}, Base.each([
        ['Top', 'Left'], ['Top', 'Right'],
        ['Bottom', 'Left'], ['Bottom', 'Right'],
        ['Left', 'Center'], ['Top', 'Center'],
        ['Right', 'Center'], ['Bottom', 'Center']
    ],
    function(parts, index) {
        var part = parts.join(''),
            // find out if the first of the pair is an x or y property,
            // by checking the first character for [R]ight or [L]eft;
            xFirst = /^[RL]/.test(part);
        // Rename Center to CenterX or CenterY:
        if (index >= 4)
            parts[1] += xFirst ? 'Y' : 'X';
        var x = parts[xFirst ? 0 : 1],
            y = parts[xFirst ? 1 : 0],
            getX = 'get' + x,
            getY = 'get' + y,
            setX = 'set' + x,
            setY = 'set' + y,
            get = 'get' + part,
            set = 'set' + part;
        this[get] = function(_dontLink) {
            var ctor = _dontLink ? Point : LinkedPoint;
            return new ctor(this[getX](), this[getY](), this, set);
        };
        this[set] = function(/* point */) {
            var point = Point.read(arguments);
            this[setX](point.x);
            this[setY](point.y);
        };
    }, {
        // Enforce creation of beans, as bean getters have hidden parameters
        // See _dontLink argument above.
        beans: true
    }
));

/**
 * @name LinkedRectangle
 *
 * @class An internal version of Rectangle that notifies its owner of each
 * change through setting itself again on the setter that corresponds to the
 * getter that produced this LinkedRectangle.
 *
 * @private
 */
var LinkedRectangle = Rectangle.extend({
    // Have LinkedRectangle appear as a normal Rectangle in debugging
    initialize: function Rectangle(x, y, width, height, owner, setter) {
        this._set(x, y, width, height, true);
        this._owner = owner;
        this._setter = setter;
    },

    // See Point#_set() for an explanation of #_set():
    _set: function(x, y, width, height, _dontNotify) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        if (!_dontNotify)
            this._owner[this._setter](this);
        return this;
    }
},
new function() {
    var proto = Rectangle.prototype;

    return Base.each(['x', 'y', 'width', 'height'], function(key) {
        var part = Base.capitalize(key),
            internal = '_' + key;
        this['get' + part] = function() {
            return this[internal];
        };

        this['set' + part] = function(value) {
            this[internal] = value;
            // Check if this setter is called from another one which sets
            // _dontNotify, as it will notify itself
            if (!this._dontNotify)
                this._owner[this._setter](this);
        };
    }, Base.each(['Point', 'Size', 'Center',
            'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
            'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
            'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
        function(key) {
            var name = 'set' + key;
            this[name] = function(/* value */) {
                // Make sure the above setters of x, y, width, height do not
                // each notify the owner, as we're going to take care of this
                // afterwards here, only once per change.
                this._dontNotify = true;
                proto[name].apply(this, arguments);
                this._dontNotify = false;
                this._owner[this._setter](this);
            };
        }, /** @lends Rectangle# */{
            /**
             * {@grouptitle Item Bounds}
             *
             * Specifies whether an item's bounds are to appear as selected.
             *
             * Paper.js draws the bounds of items with selected bounds on top of
             * your project. This is very useful when debugging.
             *
             * @bean
             * @type Boolean
             * @default false
             *
             * @example {@paperscript}
             * var path = new Path.Circle({
             *     center: [80, 50],
             *     radius: 40,
             *     selected: true
             * });
             *
             * path.bounds.selected = true;
             */
            isSelected: function() {
                return !!(this._owner._selection & /*#=*/ItemSelection.BOUNDS);
            },

            setSelected: function(selected) {
                var owner = this._owner;
                if (owner._changeSelection) {
                    owner._changeSelection(/*#=*/ItemSelection.BOUNDS, selected);
                }
            }
        })
    );
});
