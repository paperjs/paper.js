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

Path.inject({ statics: new function() {

    var kappa = /*#=*/Numerical.KAPPA,
        ellipseSegments = [
            new Segment([-1, 0], [0, kappa ], [0, -kappa]),
            new Segment([0, -1], [-kappa, 0], [kappa, 0 ]),
            new Segment([1, 0], [0, -kappa], [0, kappa ]),
            new Segment([0, 1], [kappa, 0 ], [-kappa, 0])
        ];

    function createPath(segments, closed, args) {
        var props = Base.getNamed(args),
            path = new Path(props && (
                props.insert == true ? Item.INSERT
                : props.insert == false ? Item.NO_INSERT
                : null
            ));
        path._add(segments);
        // No need to use setter for _closed since _add() called _changed().
        path._closed = closed;
        // Set named arguments at the end, since some depend on geometry to be
        // defined (e.g. #clockwise)
        return path.set(props, Item.INSERT);
    }

    function createEllipse(center, radius, args) {
        var segments = new Array(4);
        for (var i = 0; i < 4; i++) {
            var segment = ellipseSegments[i];
            segments[i] = new Segment(
                segment._point.multiply(radius).add(center),
                segment._handleIn.multiply(radius),
                segment._handleOut.multiply(radius)
            );
        }
        return createPath(segments, true, args);
    }


    return /** @lends Path */{
        /**
         * {@grouptitle Shaped Paths}
         *
         * Creates a linear path item from two points describing a line.
         *
         * @name Path.Line
         * @param {Point} from the line's starting point
         * @param {Point} to the line's ending point
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var from = new Point(20, 20);
         * var to = new Point(80, 80);
         * var path = new Path.Line(from, to);
         * path.strokeColor = 'black';
         */
        /**
         * Creates a linear path item from the properties described by an object
         * literal.
         *
         * @name Path.Line
         * @param {Object} object an object containing properties describing the
         *     path's attributes
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var path = new Path.Line({
         *     from: [20, 20],
         *     to: [80, 80],
         *     strokeColor: 'black'
         * });
         */
        Line: function(/* from, to */) {
            var args = arguments;
            return createPath([
                new Segment(Point.readNamed(args, 'from')),
                new Segment(Point.readNamed(args, 'to'))
            ], false, args);
        },

        /**
         * Creates a circular path item.
         *
         * @name Path.Circle
         * @param {Point} center the center point of the circle
         * @param {Number} radius the radius of the circle
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var path = new Path.Circle(new Point(80, 50), 30);
         * path.strokeColor = 'black';
         */
        /**
         * Creates a circular path item from the properties described by an
         * object literal.
         *
         * @name Path.Circle
         * @param {Object} object an object containing properties describing the
         *     path's attributes
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var path = new Path.Circle({
         *     center: [80, 50],
         *     radius: 30,
         *     strokeColor: 'black'
         * });
         */
        Circle: function(/* center, radius */) {
            var args = arguments,
                center = Point.readNamed(args, 'center'),
                radius = Base.readNamed(args, 'radius');
            return createEllipse(center, new Size(radius), args);
        },

        /**
         * Creates a rectangular path item, with optionally rounded corners.
         *
         * @name Path.Rectangle
         * @param {Rectangle} rectangle the rectangle object describing the
         * geometry of the rectangular path to be created
         * @param {Size} [radius=null] the size of the rounded corners
         * @return {Path} the newly created path
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
        /**
         * Creates a rectangular path item from a point and a size object.
         *
         * @name Path.Rectangle
         * @param {Point} point the rectangle's top-left corner.
         * @param {Size} size the rectangle's size.
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var point = new Point(20, 20);
         * var size = new Size(60, 60);
         * var path = new Path.Rectangle(point, size);
         * path.strokeColor = 'black';
         */
        /**
         * Creates a rectangular path item from the passed points. These do not
         * necessarily need to be the top left and bottom right corners, the
         * constructor figures out how to fit a rectangle between them.
         *
         * @name Path.Rectangle
         * @param {Point} from the first point defining the rectangle
         * @param {Point} to the second point defining the rectangle
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var from = new Point(20, 20);
         * var to = new Point(80, 80);
         * var path = new Path.Rectangle(from, to);
         * path.strokeColor = 'black';
         */
        /**
         * Creates a rectangular path item from the properties described by an
         * object literal.
         *
         * @name Path.Rectangle
         * @param {Object} object an object containing properties describing the
         *     path's attributes
         * @return {Path} the newly created path
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
        Rectangle: function(/* rectangle */) {
            var args = arguments,
                rect = Rectangle.readNamed(args, 'rectangle'),
                radius = Size.readNamed(args, 'radius', 0,
                        { readNull: true }),
                bl = rect.getBottomLeft(true),
                tl = rect.getTopLeft(true),
                tr = rect.getTopRight(true),
                br = rect.getBottomRight(true),
                segments;
            if (!radius || radius.isZero()) {
                segments = [
                    new Segment(bl),
                    new Segment(tl),
                    new Segment(tr),
                    new Segment(br)
                ];
            } else {
                radius = Size.min(radius, rect.getSize(true).divide(2));
                var rx = radius.width,
                    ry = radius.height,
                    hx = rx * kappa,
                    hy = ry * kappa;
                segments = [
                    new Segment(bl.add(rx, 0), null, [-hx, 0]),
                    new Segment(bl.subtract(0, ry), [0, hy]),
                    new Segment(tl.add(0, ry), null, [0, -hy]),
                    new Segment(tl.add(rx, 0), [-hx, 0], null),
                    new Segment(tr.subtract(rx, 0), null, [hx, 0]),
                    new Segment(tr.add(0, ry), [0, -hy], null),
                    new Segment(br.subtract(0, ry), null, [0, hy]),
                    new Segment(br.subtract(rx, 0), [hx, 0])
                ];
            }
            return createPath(segments, true, args);
        },

        /**
         * @deprecated use {@link #Path.Rectangle(rectangle, size)} instead.
         */
        RoundRectangle: '#Rectangle',

        /**
         * Creates an elliptical path item.
         *
         * @name Path.Ellipse
         * @param {Rectangle} rectangle the rectangle circumscribing the ellipse
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
         * var path = new Path.Ellipse(rectangle);
         * path.fillColor = 'black';
         */
        /**
         * Creates an elliptical path item from the properties described by an
         * object literal.
         *
         * @name Path.Ellipse
         * @param {Object} object an object containing properties describing the
         *     path's attributes
         * @return {Path} the newly created path
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
        Ellipse: function(/* rectangle */) {
            var args = arguments,
                ellipse = Shape._readEllipse(args);
            return createEllipse(ellipse.center, ellipse.radius, args);
        },

        /**
         * @deprecated use {@link #Path.Ellipse(rectangle)} instead.
         */
        Oval: '#Ellipse',

        /**
         * Creates a circular arc path item.
         *
         * @name Path.Arc
         * @param {Point} from the starting point of the circular arc
         * @param {Point} through the point the arc passes through
         * @param {Point} to the end point of the arc
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var from = new Point(20, 20);
         * var through = new Point(60, 20);
         * var to = new Point(80, 80);
         * var path = new Path.Arc(from, through, to);
         * path.strokeColor = 'black';
         *
         */
        /**
         * Creates an circular arc path item from the properties described by an
         * object literal.
         *
         * @name Path.Arc
         * @param {Object} object an object containing properties describing the
         *     path's attributes
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var path = new Path.Arc({
         *     from: [20, 20],
         *     through: [60, 20],
         *     to: [80, 80],
         *     strokeColor: 'black'
         * });
         */
        Arc: function(/* from, through, to */) {
            var args = arguments,
                from = Point.readNamed(args, 'from'),
                through = Point.readNamed(args, 'through'),
                to = Point.readNamed(args, 'to'),
                props = Base.getNamed(args),
                // See createPath() for an explanation of the following sequence
                path = new Path(props && props.insert == false
                        && Item.NO_INSERT);
            path.moveTo(from);
            path.arcTo(through, to);
            return path.set(props);
        },

        /**
         * Creates a regular polygon shaped path item.
         *
         * @name Path.RegularPolygon
         * @param {Point} center the center point of the polygon
         * @param {Number} sides the number of sides of the polygon
         * @param {Number} radius the radius of the polygon
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var center = new Point(50, 50);
         * var sides = 3;
         * var radius = 40;
         * var triangle = new Path.RegularPolygon(center, sides, radius);
         * triangle.fillColor = 'black';
         */
        /**
         * Creates a regular polygon shaped path item from the properties
         * described by an object literal.
         *
         * @name Path.RegularPolygon
         * @param {Object} object an object containing properties describing the
         *     path's attributes
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var triangle = new Path.RegularPolygon({
         *     center: [50, 50],
         *     sides: 10,
         *     radius: 40,
         *     fillColor: 'black'
         * });
         */
        RegularPolygon: function(/* center, sides, radius */) {
            var args = arguments,
                center = Point.readNamed(args, 'center'),
                sides = Base.readNamed(args, 'sides'),
                radius = Base.readNamed(args, 'radius'),
                step = 360 / sides,
                three = sides % 3 === 0,
                vector = new Point(0, three ? -radius : radius),
                offset = three ? -1 : 0.5,
                segments = new Array(sides);
            for (var i = 0; i < sides; i++)
                segments[i] = new Segment(center.add(
                    vector.rotate((i + offset) * step)));
            return createPath(segments, true, args);
        },

        /**
         * Creates a star shaped path item.
         *
         * The largest of `radius1` and `radius2` will be the outer radius of
         * the star. The smallest of radius1 and radius2 will be the inner
         * radius.
         *
         * @name Path.Star
         * @param {Point} center the center point of the star
         * @param {Number} points the number of points of the star
         * @param {Number} radius1
         * @param {Number} radius2
         * @return {Path} the newly created path
         *
         * @example {@paperscript}
         * var center = new Point(50, 50);
         * var points = 12;
         * var radius1 = 25;
         * var radius2 = 40;
         * var path = new Path.Star(center, points, radius1, radius2);
         * path.fillColor = 'black';
         */
        /**
         * Creates a star shaped path item from the properties described by an
         * object literal.
         *
         * @name Path.Star
         * @param {Object} object an object containing properties describing the
         *     path's attributes
         * @return {Path} the newly created path
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
        Star: function(/* center, points, radius1, radius2 */) {
            var args = arguments,
                center = Point.readNamed(args, 'center'),
                points = Base.readNamed(args, 'points') * 2,
                radius1 = Base.readNamed(args, 'radius1'),
                radius2 = Base.readNamed(args, 'radius2'),
                step = 360 / points,
                vector = new Point(0, -1),
                segments = new Array(points);
            for (var i = 0; i < points; i++)
                segments[i] = new Segment(center.add(vector.rotate(step * i)
                        .multiply(i % 2 ? radius2 : radius1)));
            return createPath(segments, true, args);
        }
    };
}});
