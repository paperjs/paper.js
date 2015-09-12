/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PathItem
 *
 * @class The PathItem class is the base for any items that describe paths
 * and offer standardised methods for drawing and path manipulation, such as
 * {@link Path} and {@link CompoundPath}.
 *
 * @extends Item
 */
var PathItem = Item.extend(/** @lends PathItem# */{
    _class: 'PathItem',

    initialize: function PathItem() {
        // Do nothing.
    },

    /**
     * Returns all intersections between two {@link PathItem} items as an array
     * of {@link CurveLocation} objects. {@link CompoundPath} items are also
     * supported.
     *
     * @param {PathItem} path the other item to find the intersections with
     * @return {CurveLocation[]} the locations of all intersection between the
     * paths
     * @example {@paperscript} // Finding the intersections between two paths
     * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
     * path.strokeColor = 'black';
     *
     * var secondPath = path.clone();
     * var intersectionGroup = new Group();
     *
     * function onFrame(event) {
     *     secondPath.rotate(1);
     *
     *     var intersections = path.getIntersections(secondPath);
     *     intersectionGroup.removeChildren();
     *
     *     for (var i = 0; i < intersections.length; i++) {
     *         var intersectionPath = new Path.Circle({
     *             center: intersections[i].point,
     *             radius: 4,
     *             fillColor: 'red',
     *             parent: intersectionGroup
     *         });
     *     }
     * }
     */
    getIntersections: function(path, _matrix) {
        // NOTE: For self-intersection, path is null. This means you can also
        // just call path.getIntersections() without an argument to get self
        // intersections.
        // NOTE: The hidden argument _matrix is used internally to override the
        // passed path's transformation matrix.
        return Curve._filterIntersections(this._getIntersections(
                this !== path ? path : null, _matrix, []));
    },

    _getIntersections: function(path, matrix, locations, returnFirst) {
        var self = !path, // self-intersections?
            curves1 = this.getCurves(),
            curves2 = self ? curves1 : path.getCurves(),
            matrix1 = this._matrix.orNullIfIdentity(),
            matrix2 = self ? matrix1
                : (matrix || path._matrix).orNullIfIdentity(),
            length1 = curves1.length,
            length2 = path ? curves2.length : length1,
            values2 = [];
        // First check the bounds of the two paths. If they don't intersect,
        // we don't need to iterate through their curves.
        if (path && !this.getBounds(matrix1).touches(path.getBounds(matrix2)))
            return locations;
        // Cache values for curves2 as we re-iterate them for each in curves1.
        for (var i = 0; i < length2; i++)
            values2[i] = curves2[i].getValues(matrix2);
        for (var i = 0; i < length1; i++) {
            var curve1 = curves1[i],
                values1 = self ? values2[i] : curve1.getValues(matrix1);
            if (self) {
                // First check for self-intersections within the same curve
                var seg1 = curve1.getSegment1(),
                    seg2 = curve1.getSegment2(),
                    p1 = seg1._point,
                    p2 = seg2._point,
                    h1 = seg1._handleOut,
                    h2 = seg2._handleIn,
                    l1 = new Line(p1.subtract(h1), p1.add(h1)),
                    l2 = new Line(p2.subtract(h2), p1.add(h2));
                // Check if extended handles of endpoints of this curve
                // intersects each other. We cannot have a self intersection
                // within this curve if they don't intersect due to convex-hull
                // property.
                if (l1.intersect(l2, false)) {
                    // Self intersecting is found by dividing the curve in two
                    // and and then applying the normal curve intersection code.
                    var parts = Curve.subdivide(values1, 0.5);
                    Curve._getIntersections(parts[0], parts[1], curve1, curve1,
                        locations, {
                            // Only possible if there is only one closed curve:
                            startConnected: length1 === 1 && p1.equals(p2),
                            // After splitting, the end is always connected:
                            endConnected: true,
                            reparametrize: function(t1, t2) {
                                // Since the curve was split above, we need to
                                // adjust the parameters for both locations.
                                return [t1 / 2, (1 + t2) / 2];
                            }
                        }
                    );
                }
            }
            // Check for intersections with other curves. For self intersection,
            // we can start at i + 1 instead of 0
            for (var j = self ? i + 1 : 0; j < length2; j++) {
                // There might be already one location from the above
                // self-intersection check:
                if (returnFirst && locations.length)
                    break;
                var curve2 = curves2[j];
                // Avoid end point intersections on consecutive curves when
                // self intersecting.
                Curve._getIntersections(
                    values1, values2[j], curve1, curve2, locations,
                    self ? {
                        // Do not compare indices here to determine connection,
                        // since one array of curves can contain curves from
                        // separate sup-paths of a compound path.
                        startConnected: curve1.getPrevious() === curve2,
                        endConnected: curve1.getNext() === curve2
                    } : {}
                );
            }
        }
        return locations;
    },

    _asPathItem: function() {
        // See Item#_asPathItem()
        return this;
    },

    /**
     * The path's geometry, formatted as SVG style path data.
     *
     * @name PathItem#getPathData
     * @type String
     * @bean
     */

    setPathData: function(data) {
        // NOTE: #getPathData() is defined in CompoundPath / Path
        // This is a very compact SVG Path Data parser that works both for Path
        // and CompoundPath.

        // First split the path data into parts of command-coordinates pairs
        // Commands are any of these characters: mzlhvcsqta
        var parts = data.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/ig),
            coords,
            relative = false,
            previous,
            control,
            current = new Point(),
            start = new Point();

        function getCoord(index, coord) {
            var val = +coords[index];
            if (relative)
                val += current[coord];
            return val;
        }

        function getPoint(index) {
            return new Point(
                getCoord(index, 'x'),
                getCoord(index + 1, 'y')
            );
        }

        // First clear the previous content
        this.clear();

        for (var i = 0, l = parts && parts.length; i < l; i++) {
            var part = parts[i],
                command = part[0],
                lower = command.toLowerCase();
            // Match all coordinate values
            coords = part.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g);
            var length = coords && coords.length;
            relative = command === lower;
            if (previous === 'z' && !/[mz]/.test(lower))
                this.moveTo(current = start);
            switch (lower) {
            case 'm':
            case 'l':
                var move = lower === 'm';
                for (var j = 0; j < length; j += 2)
                    this[j === 0 && move ? 'moveTo' : 'lineTo'](
                            current = getPoint(j));
                control = current;
                if (move)
                    start = current;
                break;
            case 'h':
            case 'v':
                var coord = lower === 'h' ? 'x' : 'y';
                for (var j = 0; j < length; j++) {
                    current[coord] = getCoord(j, coord);
                    this.lineTo(current);
                }
                control = current;
                break;
            case 'c':
                for (var j = 0; j < length; j += 6) {
                    this.cubicCurveTo(
                            getPoint(j),
                            control = getPoint(j + 2),
                            current = getPoint(j + 4));
                }
                break;
            case 's':
                // Smooth cubicCurveTo
                for (var j = 0; j < length; j += 4) {
                    this.cubicCurveTo(
                            /[cs]/.test(previous)
                                    ? current.multiply(2).subtract(control)
                                    : current,
                            control = getPoint(j),
                            current = getPoint(j + 2));
                    previous = lower;
                }
                break;
            case 'q':
                for (var j = 0; j < length; j += 4) {
                    this.quadraticCurveTo(
                            control = getPoint(j),
                            current = getPoint(j + 2));
                }
                break;
            case 't':
                // Smooth quadraticCurveTo
                for (var j = 0; j < length; j += 2) {
                    this.quadraticCurveTo(
                            control = (/[qt]/.test(previous)
                                    ? current.multiply(2).subtract(control)
                                    : current),
                            current = getPoint(j));
                    previous = lower;
                }
                break;
            case 'a':
                for (var j = 0; j < length; j += 7) {
                    this.arcTo(current = getPoint(j + 5),
                            new Size(+coords[j], +coords[j + 1]),
                            +coords[j + 2], +coords[j + 4], +coords[j + 3]);
                }
                break;
            case 'z':
                this.closePath(true);
                break;
            }
            previous = lower;
        }
    },

    _canComposite: function() {
        // A path with only a fill  or a stroke can be directly blended, but if
        // it has both, it needs to be drawn into a separate canvas first.
        return !(this.hasFill() && this.hasStroke());
    },

    _contains: function(point) {
        // NOTE: point is reverse transformed by _matrix, so we don't need to
        // apply here.
/*#*/ if (__options.nativeContains || !__options.booleanOperations) {
        // To compare with native canvas approach:
        var ctx = CanvasProvider.getContext(1, 1);
        // Use dontFinish to tell _draw to only produce geometries for hit-test.
        this._draw(ctx, new Base({ dontFinish: true }));
        var res = ctx.isPointInPath(point.x, point.y, this.getWindingRule());
        CanvasProvider.release(ctx);
        return res;
/*#*/ } else { // !__options.nativeContains && __options.booleanOperations
        var winding = this._getWinding(point, false, true);
        return !!(this.getWindingRule() === 'evenodd' ? winding & 1 : winding);
/*#*/ } // !__options.nativeContains && __options.booleanOperations
    }

    /**
     * Smooth bezier curves without changing the amount of segments or their
     * points, by only smoothing and adjusting their handle points, for both
     * open ended and closed paths.
     *
     * @name PathItem#smooth
     * @function
     *
     * @example {@paperscript}
     * // Smoothing a closed shape:
     *
     * // Create a rectangular path with its top-left point at
     * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
     * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
     * path.strokeColor = 'black';
     *
     * // Select the path, so we can see its handles:
     * path.fullySelected = true;
     *
     * // Create a copy of the path and move it 100pt to the right:
     * var copy = path.clone();
     * copy.position.x += 100;
     *
     * // Smooth the segments of the copy:
     * copy.smooth();
     *
     * @example {@paperscript height=220}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * path.add(new Point(30, 50));
     *
     * var y = 5;
     * var x = 3;
     *
     * for (var i = 0; i < 28; i++) {
     *     y *= -1.1;
     *     x *= 1.1;
     *     path.lineBy(x, y);
     * }
     *
     * // Create a copy of the path and move it 100pt down:
     * var copy = path.clone();
     * copy.position.y += 120;
     *
     * // Set its stroke color to red:
     * copy.strokeColor = 'red';
     *
     * // Smooth the segments of the copy:
     * copy.smooth();
     */

    /**
     * {@grouptitle Postscript Style Drawing Commands}
     *
     * On a normal empty {@link Path}, the point is simply added as the path's
     * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
     * created as a child and the point is added as its first segment.
     *
     * @name PathItem#moveTo
     * @function
     * @param {Point} point
     */

    // DOCS: Document #lineTo()
    /**
     * @name PathItem#lineTo
     * @function
     * @param {Point} point
     */

    /**
     * Adds a cubic bezier curve to the path, defined by two handles and a to
     * point.
     *
     * @name PathItem#cubicCurveTo
     * @function
     * @param {Point} handle1
     * @param {Point} handle2
     * @param {Point} to
     */

    /**
     * Adds a quadratic bezier curve to the path, defined by a handle and a to
     * point.
     *
     * @name PathItem#quadraticCurveTo
     * @function
     * @param {Point} handle
     * @param {Point} to
     */

    // DOCS: Document PathItem#curveTo() 'paramater' param.
    /**
     * Draws a curve from the position of the last segment point in the path
     * that goes through the specified {@code through} point, to the specified
     * {@code to} point by adding one segment to the path.
     *
     * @name PathItem#curveTo
     * @function
     * @param {Point} through the point through which the curve should go
     * @param {Point} to the point where the curve should end
     * @param {Number} [parameter=0.5]
     *
     * @example {@paperscript height=300}
     * // Interactive example. Move your mouse around the view below:
     *
     * var myPath;
     * function onMouseMove(event) {
     *     // If we created a path before, remove it:
     *     if (myPath) {
     *         myPath.remove();
     *     }
     *
     *     // Create a new path and add a segment point to it
     *     // at {x: 150, y: 150):
     *     myPath = new Path();
     *     myPath.add(150, 150);
     *
     *     // Draw a curve through the position of the mouse to 'toPoint'
     *     var toPoint = new Point(350, 150);
     *     myPath.curveTo(event.point, toPoint);
     *
     *     // Select the path, so we can see its segments:
     *     myPath.selected = true;
     * }
     */

    /**
     * Draws an arc from the position of the last segment point in the path that
     * goes through the specified {@code through} point, to the specified
     * {@code to} point by adding one or more segments to the path.
     *
     * @name PathItem#arcTo
     * @function
     * @param {Point} through the point where the arc should pass through
     * @param {Point} to the point where the arc should end
     *
     * @example {@paperscript}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * var firstPoint = new Point(30, 75);
     * path.add(firstPoint);
     *
     * // The point through which we will create the arc:
     * var throughPoint = new Point(40, 40);
     *
     * // The point at which the arc will end:
     * var toPoint = new Point(130, 75);
     *
     * // Draw an arc through 'throughPoint' to 'toPoint'
     * path.arcTo(throughPoint, toPoint);
     *
     * // Add a red circle shaped path at the position of 'throughPoint':
     * var circle = new Path.Circle(throughPoint, 3);
     * circle.fillColor = 'red';
     *
     * @example {@paperscript height=300}
     * // Interactive example. Click and drag in the view below:
     *
     * var myPath;
     * function onMouseDrag(event) {
     *     // If we created a path before, remove it:
     *     if (myPath) {
     *         myPath.remove();
     *     }
     *
     *     // Create a new path and add a segment point to it
     *     // at {x: 150, y: 150):
     *     myPath = new Path();
     *     myPath.add(150, 150);
     *
     *     // Draw an arc through the position of the mouse to 'toPoint'
     *     var toPoint = new Point(350, 150);
     *     myPath.arcTo(event.point, toPoint);
     *
     *     // Select the path, so we can see its segments:
     *     myPath.selected = true;
     * }
     *
     * // When the mouse is released, deselect the path
     * // and fill it with black.
     * function onMouseUp(event) {
     *     myPath.selected = false;
     *     myPath.fillColor = 'black';
     * }
     */
    /**
     * Draws an arc from the position of the last segment point in the path to
     * the specified point by adding one or more segments to the path.
     *
     * @name PathItem#arcTo
     * @function
     * @param {Point} to the point where the arc should end
     * @param {Boolean} [clockwise=true] specifies whether the arc should be
     *        drawn in clockwise direction
     *
     * @example {@paperscript}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * path.add(new Point(30, 75));
     * path.arcTo(new Point(130, 75));
     *
     * var path2 = new Path();
     * path2.strokeColor = 'red';
     * path2.add(new Point(180, 25));
     *
     * // To draw an arc in anticlockwise direction,
     * // we pass `false` as the second argument to arcTo:
     * path2.arcTo(new Point(280, 25), false);
     *
     * @example {@paperscript height=300}
     * // Interactive example. Click and drag in the view below:
     * var myPath;
     *
     * // The mouse has to move at least 20 points before
     * // the next mouse drag event is fired:
     * tool.minDistance = 20;
     *
     * // When the user clicks, create a new path and add
     * // the current mouse position to it as its first segment:
     * function onMouseDown(event) {
     *     myPath = new Path();
     *     myPath.strokeColor = 'black';
     *     myPath.add(event.point);
     * }
     *
     * // On each mouse drag event, draw an arc to the current
     * // position of the mouse:
     * function onMouseDrag(event) {
     *     myPath.arcTo(event.point);
     * }
     */
    // DOCS: PathItem#arcTo(to, radius, rotation, clockwise, large)

    /**
     * Closes the path. When closed, Paper.js connects the first and
     * last segment of the path with an additional curve.
     *
     * @name PathItem#closePath
     * @function
     * @param {Boolean} join controls whether the method should attempt to merge
     * the first segment with the last if they lie in the same location
     * @see Path#closed
     */

    /**
     * {@grouptitle Relative Drawing Commands}
     *
     * If called on a {@link CompoundPath}, a new {@link Path} is created as a
     * child and a point is added as its first segment relative to the
     * position of the last segment of the current path.
     *
     * @name PathItem#moveBy
     * @function
     * @param {Point} to
     */

    /**
     * Adds a segment relative to the last segment point of the path.
     *
     * @name PathItem#lineBy
     * @function
     * @param {Point} to the vector which is added to the position of the last
     * segment of the path, to get to the position of the new segment
     *
     * @example {@paperscript}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * // Add a segment at {x: 50, y: 50}
     * path.add(25, 25);
     *
     * // Add a segment relative to the last segment of the path.
     * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
     * path.lineBy(50, 0);
     *
     * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
     * path.lineBy(0, 50);
     *
     * @example {@paperscript height=300}
     * // Drawing a spiral using lineBy:
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * // Add the first segment at {x: 50, y: 50}
     * path.add(view.center);
     *
     * // Loop 500 times:
     * for (var i = 0; i < 500; i++) {
     *     // Create a vector with an ever increasing length
     *     // and an angle in increments of 45 degrees
     *     var vector = new Point({
     *         angle: i * 45,
     *         length: i / 2
     *     });
     *     // Add the vector relatively to the last segment point:
     *     path.lineBy(vector);
     * }
     *
     * // Smooth the handles of the path:
     * path.smooth();
     *
     * // Uncomment the following line and click on 'run' to see
     * // the construction of the path:
     * // path.selected = true;
     */

    // DOCS: Document Path#curveBy()
    /**
     * @name PathItem#curveBy
     * @function
     * @param {Point} through
     * @param {Point} to
     * @param {Number} [parameter=0.5]
     */

    // DOCS: Document Path#cubicCurveBy()
    /**
     * @name PathItem#cubicCurveBy
     * @function
     * @param {Point} handle1
     * @param {Point} handle2
     * @param {Point} to
     */

    // DOCS: Document Path#quadraticCurveBy()
    /**
     * @name PathItem#quadraticCurveBy
     * @function
     * @param {Point} handle
     * @param {Point} to
     */

    // DOCS: Document Path#arcBy(through, to)
    /**
     * @name PathItem#arcBy
     * @function
     * @param {Point} through
     * @param {Point} to
     */

    // DOCS: Document Path#arcBy(to, clockwise)
    /**
     * @name PathItem#arcBy
     * @function
     * @param {Point} to
     * @param {Boolean} [clockwise=true]
     */
});
