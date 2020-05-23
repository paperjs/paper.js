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

QUnit.module('SvgExport');

test('Export SVG line', function() {
    var attrs = {
        x1: 5,
        x2: 45,
        y1: 5,
        y2: 45
    };
    var path = new Path.Line([attrs.x1, attrs.y1], [attrs.x2, attrs.y2]);
    equals(path.exportSVG({ matchShapes: true }), createSVG('line', attrs));
});

test('Export SVG rect', function() {
    var attrs = {
        x: 25,
        y: 25,
        width: 100,
        height: 100
    };
    var path = new Path.Rectangle(attrs);
    equals(path.exportSVG({ matchShapes: true }), createSVG('rect', attrs));
});

test('Export SVG round rect', function() {
    var attrs = {
        x: 25,
        y: 25,
        rx: 50,
        ry: 50,
        width: 100,
        height: 100
    };
    var path = new Path.Rectangle(new Rectangle(attrs),
            new Size(attrs.rx, attrs.ry));
    equals(path.exportSVG({ matchShapes: true }), createSVG('rect', attrs));
});

test('Export SVG ellipse', function() {
    var attrs = {
        cx: 300,
        cy: 80,
        rx: 100,
        ry: 50
    };
    var path = new Path.Ellipse({
        center: new Point(attrs.cx, attrs.cy),
        radius: new Point(attrs.rx, attrs.ry)
    });
    equals(path.exportSVG({ matchShapes: true }), createSVG('ellipse', attrs));
});

test('Export SVG circle', function() {
    var attrs = {
        cx: 100,
        cy: 80,
        r: 50
    };
    var path = new Path.Circle({
        center: new Point(attrs.cx, attrs.cy),
        radius: attrs.r
    });
    equals(path.exportSVG({ matchShapes: true }), createSVG('circle', attrs));
});

function createPolyPath(str) {
    var points = str.split(' ').map(function(point) {
        return point.split(',').map(parseFloat);
    });
    var path = new Path();
    path.moveTo(points[0]);
    for (var i = 1; i < points.length; i++)
        path.lineTo(points[i]);
    return path;
}

test('Export SVG polygon', function() {
    var points = '100,10 40,180 190,60 10,60 160,180';
    var path = createPolyPath(points);
    path.closePath();
    equals(path.exportSVG({ matchShapes: true }), createSVG('polygon', {
        points: points
    }));
});

test('Export SVG polyline', function() {
    var points = '5,5 45,45 5,45 45,5';
    var path = createPolyPath(points);
    equals(path.exportSVG({ matchShapes: true }), createSVG('polyline', {
        points: points
    }));
});

test('Export SVG path defaults to precision 5', function() {
    var path = new Path('M0.123456789,1.9l0.8,1.1');
    equals(path.exportSVG({}).getAttribute('d'), 'M0.12346,1.9l0.8,1.1');
});

test('Export SVG path at precision 0', function() {
    var path = new Path('M0.123456789,1.9l0.8,1.1');
    equals(path.exportSVG({ precision: 0 }).getAttribute('d'), 'M0,2l1,1');
});

test('Export SVG viewbox attribute with top left at origin', function() {
    var path = new Path.Rectangle(new Point(10, 10), new Size(80));
    var rectangle = new Rectangle(new Point(0, 0), new Size(100));
    equals(project.exportSVG({ bounds: rectangle }).getAttribute('viewBox'), '0,0,100,100');
});

if (!isNodeContext) {
    // JSDom does not have SVG rendering, so we can't test there.
    test('Export transformed shapes', function(assert) {
        var rect = new Shape.Rectangle({
            point: [200, 100],
            size: [200, 300],
            fillColor: 'red'
        });
        rect.rotate(40);

        var circle = new Shape.Circle({
            center: [200, 300],
            radius: 100,
            fillColor: 'green'
        });
        circle.scale(0.5, 1);
        circle.rotate(40);

        var ellipse = new Shape.Ellipse({
            point: [300, 300],
            size: [100, 200],
            fillColor: 'blue'
        });
        ellipse.rotate(-40);

        var rect = new Shape.Rectangle({
            point: [250, 20],
            size: [200, 300],
            radius: [40, 20],
            fillColor: 'yellow'
        });
        rect.rotate(-20);
        var svg = project.exportSVG({ bounds: 'content', asString: true });
        compareSVG(assert.async(), svg, project.activeLayer);
    });

    test('Export not invertible item.matrix', function(assert) {
        var rect = new Shape.Rectangle({
            point: [100, 100],
            size: [100, 100],
            fillColor: 'red',
            matrix: [1, 1, 1, 1, 1, 1]
        });
        var svg = project.exportSVG({ bounds: 'content', asString: true });
        compareSVG(assert.async(), svg, project.activeLayer);
    });

    test('Export gradients', function(assert) {
        var bounds = new Rectangle(new Size(300, 600));
        var stops = [new Color(1, 1, 0, 0), 'red', 'black'];

        var radius = bounds.width * 0.4,
            from = new Point(bounds.center.x),
            to = from.add(radius, 0);

        var circle = new Path.Circle({
            center: from,
            radius: radius,
            fillColor: {
                stops: stops,
                radial: true,
                origin: from,
                destination: to
            },
            strokeColor: 'black'
        });

        var from = bounds.leftCenter,
            to = bounds.bottomRight;

        var rect = new Path.Rectangle({
            from: from,
            to: to,
            fillColor: {
                stops: stops,
                radial: false,
                origin: from,
                destination: to
            },
            strokeColor: 'black'
        });

        rect.rotate(45).scale(0.7);

        var svg = project.exportSVG({ bounds: 'content', asString: true });
        compareSVG(assert.async(), svg, project.activeLayer, null, {
            tolerance: 1e-2
        });
    });

    test('Export SVG with clipping defs', function(assert) {
        var group = new Group({
            children: [
                new Path.Circle({
                    center: [150, 150],
                    radius: 50
                }),
                new Path.Rectangle({
                    point: [100, 100],
                    size: [100, 100],
                    fillColor: 'green'
                })
            ],
            clipped: true
        });
        var svg = project.exportSVG({ bounds: 'content', asString: true });
        compareSVG(assert.async(), svg, project.activeLayer, null, {
            tolerance: 1e-2
        });
    });

    test('Export symbol with stroke', function(assert) {
        var item = new Path.Circle({
            center: [0, 0],
            radius: 50,
            strokeColor: 'blue',
            strokeWidth: 10
        });

        var symbol = new Symbol(item);
        symbol.place([50, 50]);

        var svg = project.exportSVG({ bounds: 'content', asString: true });
        compareSVG(assert.async(), svg, project.activeLayer);
    });
}
