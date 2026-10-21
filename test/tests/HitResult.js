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

QUnit.module('HitResult');

test('Hit-testing options', function() {
    var defaultOptions = {
        type: null,
        tolerance: paper.settings.hitTolerance,
        fill: true,
        stroke: true,
        segments: true,
        handles: false,
        ends: false,
        position: false,
        center: false,
        bounds: false,
        guides: false,
        selected: false
    };
    equals(HitResult.getOptions(), defaultOptions, 'Default options');
});

function testHitResult(hitResult, expeced, message) {
    equals(!!hitResult, !!expeced, message
            ? message
            : expeced
                ? 'A HitResult should be returned.'
                : 'No HitResult should be returned.');
    if (hitResult && expeced) {
        if (expeced.type) {
            equals(hitResult.type, expeced.type,
                    'hitResult.type == \'' + expeced.type + '\'');
        }
        if (expeced.item) {
            equals(hitResult.item == expeced.item, true,
                    'hitResult.item == ' + expeced.item);
        }
        if (expeced.name) {
            equals(hitResult.name, expeced.name,
                    'hitResult.name == \'' + expeced.name + '\'');
        }
        if (expeced.point) {
            equals(hitResult.point.toString(), expeced.point.toString(),
                    'hitResult.point == \'' + expeced.point + '\'');
        }
        if (expeced.segment) {
            equals(hitResult.segment == expeced.segment, true,
                    'hitResult.segment == ' + expeced.segment);
        }
    }
}

test('hitting a filled shape', function() {
    var path = new Path.Circle([50, 50], 50);

    var hitResult = path.hitTest([75, 75]);
    testHitResult(path.hitTest([75, 75]), null,
            'Since the path is not filled, the hit-test should return null.');

    path.fillColor = 'red';
    testHitResult(path.hitTest([75, 75]), {
        type: 'fill',
        item: path
    });
});

test('the item on top should be returned', function() {
    var path = new Path.Circle([50, 50], 50);
    path.fillColor = 'red';

    // The cloned path is lying above the path:
    var copy = path.clone();

    testHitResult(paper.project.hitTest([75, 75]), {
        type: 'fill',
        item: copy
    });
 });

test('hitting a stroked path', function() {
    var path = new Path([0, 0], [50, 0]);

    // We are hit-testing with an offset of 5pt on a path with a stroke width
    // of 10:

    testHitResult(paper.project.hitTest([25, 5]), null,
            'Since the path is not stroked yet, the hit-test should return null.');

    path.strokeColor = 'black';
    path.strokeWidth = 10;

    testHitResult(path.hitTest([25, 5]), {
        type: 'stroke',
        item: path
    });
});

test('hitting a selected path', function() {
    var path = new Path.Circle([50, 50], 50);
    path.fillColor = 'red';

    testHitResult(paper.project.hitTest([75, 75], { selected: true }), null,
            'Since the path is not stroked yet, the hit-test should return null.');

    path.selected = true;

    testHitResult(paper.project.hitTest([75, 75]), {
        type: 'fill',
        item: path
    });
});

test('hitting path segments', function() {
    var path = new Path([0, 0], [10, 10], [20, 0]);

    testHitResult(paper.project.hitTest([10, 10]), {
        type: 'segment',
        item: path
    });
});

test('hitting the center and position of a path', function() {
    var path = new Path([0, 0], [100, 100], [200, 0]);
    path.closed = true;
    var center = path.bounds.center,
        position = path.position,
        positionResult = {
            type: 'position', item: path, point: position
        },
        centerResult = {
            type: 'center', item: path, point: center
        };

    testHitResult(paper.project.hitTest(position, {
        center: true
    }), centerResult);

    var offset = new Point(1, 1);
    testHitResult(paper.project.hitTest(position.add(offset), {
        tolerance: offset.length,
        center: true
    }), centerResult, 'position with tolerance');

    testHitResult(paper.project.hitTest(position, {
        position: true
    }), positionResult);

    testHitResult(paper.project.hitTest(center, {
        position: true
    }), positionResult);

    path.pivot = [100, 100];

    testHitResult(paper.project.hitTest(center, {
        position: true
    }), null, 'with pivot, the position should not be in the center');

    testHitResult(paper.project.hitTest(path.position, {
        position: true
    }), {
        type: 'position', item: path, point: path.position
    });
});

test('hitting path handles (1)', function() {
    var path = new Path.Circle(new Point(), 10);
    path.firstSegment.handleIn = [-50, 0];
    path.firstSegment.handleOut = [50, 0];
    var firstPoint = path.firstSegment.point;

    testHitResult(paper.project.hitTest(firstPoint.add(50, 0), {
        handles: true
    }), {
        type: 'handle-out',
        item: path
    });

    testHitResult(paper.project.hitTest(firstPoint.add(-50, 0), {
        handles: true
    }), {
        type: 'handle-in',
        item: path
    });
});

test('hitting path handles (2)', function() {
    var path = new Path(new Segment({
        point: [0, 0],
        handleIn: [-50, -50],
        handleOut: [50, 50]
    }));

    testHitResult(paper.project.hitTest([50, 50], {
        handles: true
    }), {
        type: 'handle-out',
        item: path
    });

    testHitResult(paper.project.hitTest([-50, -50], {
        handles: true
    }), {
        type: 'handle-in',
        item: path
    });
});

test('hit-testing stroke on segment point of a path', function() {
    var path = new Path([0, 0], [50, 50], [100, 0]);
    path.strokeColor = 'black';
    path.closed = true;

    var error = null;
    try {
        var hitResult = paper.project.hitTest(path.firstSegment.point, {
            stroke: true
        });
    } catch (e) {
        error = e;
    }
    var description = 'This hit-test should not throw an error';
    if (error)
        description += ': ' + error;
    equals(error == null, true, description);
});

test('hit-testing a point that is extremely close to a curve', function() {
    var path = new Path.Rectangle([0, 0], [100, 100]);
    // A point whose x value is extremely close to 0:
    var point = new Point(2.842 / Math.pow(10, 14), 0);
    var error;
    try {
        var hitResult = path.hitTest(point, {
            stroke: true
        });
    } catch(e) {
        error = e;
    }
    var description = 'This hit-test should not throw an error';
    if (error)
        description += ': ' + error;
    equals(error == null, true, description);
});

test('hitting path ends', function() {
    var path = new Path([0, 0], [50, 50], [100, 0]);
    path.closed = true;

    equals(function() {
        return !paper.project.hitTest(path.firstSegment.point, {
            ends: true
        });
    }, true, 'No HitResult should be returned, because the path is closed.');

    path.closed = false;

    testHitResult(paper.project.hitTest(path.lastSegment.point, {
        ends: true
    }), {
        type: 'segment',
        item: path,
        segment: path.lastSegment
    });

    equals(function() {
        return !paper.project.hitTest(path.segments[1].point, {
            ends: true
        });
    }, true, 'No HitResult should be returned, since the second segment is not an end');
});

test('When a path is closed, the end of a path cannot be hit.', function() {
    var path = new Path([0, 0], [50, 50], [100, 0]);
    path.closed = true;

    var hitResult = paper.project.hitTest([0, 0], {
        ends: true
    });
    equals(function() {
        return !hitResult;
    }, true, 'When a path is closed, the end of a path cannot be hit.');
});

test('hitting path bounding box', function() {
    var path = new Path.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
    });

    testHitResult(paper.project.hitTest(path.bounds.topLeft, {
        bounds: true
    }), {
        type: 'bounds',
        item: path,
        name: 'top-left',
        point: path.bounds.topLeft
    });
});

test('hitting raster bounding box', function() {
    var path = new Path.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
    });
    var raster = path.rasterize(72);
    path.remove();

    testHitResult(paper.project.hitTest(raster.bounds.topLeft, {
        bounds: true
    }), {
        type: 'bounds',
        item: raster,
        name: 'top-left',
        point: path.bounds.topLeft
    });
});

test('hitting guides', function() {
    var path = new Path.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
    });
    var copy = path.clone();

    var result = paper.project.hitTest(path.position);

    equals(result && result.item, copy,
            'The copy should be returned, because it is on top.');

    path.guide = true;

    var result = paper.project.hitTest(path.position, {
        guides: true,
        fill: true
    });

    equals(result && result.item, path,
            'The path should be returned, because it is a guide.');
});

test('hitting raster items', function() {
    // Create a path, rasterize it and then remove the path:
    var path = new Path.Rectangle(new Point(), new Size(320, 240));
    path.fillColor = 'red';
    var raster = path.rasterize(72);

    var hitResult = paper.project.hitTest(new Point(160, 120));

    equals(function() {
        return hitResult && hitResult.item == raster;
    }, true, 'Hit raster item before moving');

    // Move the raster:
    raster.translate(100, 100);

    var hitResult = paper.project.hitTest(new Point(160, 120));

    equals(function() {
        return hitResult && hitResult.item == raster;
    }, true, 'Hit raster item after moving');
});

test('hitting path with a text item in the project', function() {
    var path = new Path.Rectangle(new Point(50, 50), new Point(100, 100));
    path.fillColor = 'blue';

    var hitResult = paper.project.hitTest(new Point(75, 75));

    equals(function() {
        return hitResult && hitResult.item == path;
    }, true, 'Hit path item before adding text item');

    var text1 = new PointText(30, 30);
    text1.content = "Text 1";

    var hitResult = paper.project.hitTest(new Point(75, 75));

    equals(function() {
        return !!hitResult;
    }, true, 'A hitresult should be returned.');

    equals(function() {
        return !!hitResult && hitResult.item == path;
    }, true, 'We should have hit the path');

});

test('hit-testing of items that come after a transformed group.', function() {
    paper.project.currentStyle.fillColor = 'black';
    var point1 = new Point(100, 100);
    var point2 = new Point(140, 100);
    var delta = new Point(250, 0);

    var path1 = new Path.Circle(point1, 20);
    path1.name = 'path1';
    var path2 = new Path.Circle(point2, 20);
    path2.name = 'path2';

    var group = new Group(path2);
    group.name = 'group';

    var hitResult = paper.project.hitTest(point1);
    equals(function() {
        return hitResult && hitResult.item;
    }, path1, 'Hit testing project for point1 should give us path1.');

    hitResult = paper.project.hitTest(point2);
    equals(function() {
        return hitResult && hitResult.item;
    }, path2, 'Hit testing project for point2 should give us path2.');

    hitResult = paper.project.hitTest(point2);
    equals(function() {
        return hitResult && hitResult.item;
    }, path2, 'Hit testing project for point2 should give us path2.');

    group.translate(delta);

    hitResult = paper.project.hitTest(point1);
    equals(function() {
        return hitResult && hitResult.item;
    }, path1, 'After translating group, hit-testing project for point1 should give us path1.');

    hitResult = paper.project.hitTest(point2.add(delta));
    equals(function() {
        return hitResult && hitResult.item;
    }, path2, 'After translating group, hit-testing project for point2 + delta should give us path2.');

    hitResult = path1.hitTest(point1);
    equals(function() {
        return hitResult && hitResult.item;
    }, path1, 'After translating group, hit-testing path1 for point1 should give us path1.');

    group.moveBelow(path1);

    hitResult = paper.project.hitTest(point1);
    equals(function() {
        return hitResult && hitResult.item;
    }, path1, 'After moving group before path1, hit-testing project for point1 should give us path1.');

    hitResult = paper.project.hitTest(point2.add(delta));
    equals(function() {
        return hitResult && hitResult.item;
    }, path2, 'After moving group before path1, hit-testing project for point2 + delta should give us path2.');

    hitResult = path1.hitTest(point1);
    equals(function() {
        return hitResult && hitResult.item;
    }, path1, 'After moving group before path1, hit-testing path1 for point1 should give us path1.');
});

test('hit-testing of placed symbols.', function() {
    var point = new Point(100, 100);

    var path = new Path.Circle([0, 0], 20);
    path.fillColor = 'black';
    var definition = new SymbolDefinition(path);
    var placedItem = definition.place(point);
    var hitResult = placedItem.hitTest(point);
    equals(function() {
        return hitResult && hitResult.item == placedItem;
    }, true, 'hitResult.item should be placedItem');

});

test('hit-testing the corner of a rectangle with miter stroke.', function() {
    var rect = new Path.Rectangle({
        rectangle: [100, 100, 300, 200],
        fillColor: '#f00',
        strokeColor: 'blue',
        strokeJoin: 'miter',
        strokeWidth: 20
    });
    equals(function() {
        return rect.hitTest(rect.strokeBounds.topRight) != null;
    }, true);
});

test('hit-testing invisible items.', function() {
    var point = new Point(0, 0);
    var circle1 = new Path.Circle({
        center: point.subtract([25, 0]),
        radius: 50,
        fillColor: 'red'
    });
    var circle2 = new Path.Circle({
        center: point.add([25, 0]),
        radius: 50,
        fillColor: 'blue'
    });

    equals(function() {
        return paper.project.hitTest(point).item === circle2;
    }, true);

    circle2.visible = false;

    equals(function() {
        return paper.project.hitTest(point).item === circle1;
    }, true);
});

test('hit-testing guides.', function() {
    var point = new Point(0, 0);
    var circle1 = new Path.Circle({
        center: point.subtract([25, 0]),
        radius: 50,
        fillColor: 'red'
    });
    var circle2 = new Path.Circle({
        center: point.add([25, 0]),
        radius: 50,
        fillColor: 'blue'
    });

    var strokePoint = circle2.bounds.leftCenter;

    equals(function() {
        return paper.project.hitTest(strokePoint).item === circle2;
    }, true);

    circle2.guide = true;

    equals(function() {
        return paper.project.hitTest(strokePoint).item === circle1;
    }, true);

    equals(function() {
        var result = paper.project.hitTest(strokePoint, {
            guides: true,
            fill: true
        });
        return result && result.item === circle2;
    }, true);
});

test('hit-testing fills with tolerance', function() {
    var path = new Path.Rectangle({
        from: [50, 50],
        to: [200, 200],
        fillColor: 'red'
    });

    var tolerance = 10;
    var point = path.bounds.bottomRight.add(tolerance / Math.SQRT2);

    equals(function() {
        var result = paper.project.hitTest(point, {
            tolerance: tolerance,
            fill: true
        });
        return result && result.item === path;
    }, true);

    var point = new Point(20, 20);
    var size = new Size(40, 40);
    var hitPoint = new Point(10, 10);
    var options = {
        fill: true,
        tolerance: 20
    };

    var shapeRect = new Shape.Rectangle(point, size);
    shapeRect.fillColor = 'black';

    var pathRect = new Path.Rectangle(point, size);
    pathRect.fillColor = 'black';

    equals(function() {
        var hit = shapeRect.hitTest(hitPoint, options);
        return hit && hit.type === 'fill';
    }, true);

    equals(function() {
        var hit = pathRect.hitTest(hitPoint, options);
        return hit && hit.type === 'fill';
    }, true);
});

test('hit-testing point texts with tolerance (#632)', function() {
    var text = new PointText({
        point: [50, 50],
        content: 'Hello',
        fontSize: 20,
        fillColor: 'black'
    });

    // Hit the bounds of the text, and within the tolerance of 10 around them:
    function testHit(offset, origin, expected, message) {
        var point = text.bounds[origin].add(offset),
            hit = text.hitTest(point, { fill: true, tolerance: 10 });
        equals(function() {
            return !!hit && hit.type === 'fill' && hit.item === text;
        }, expected, message);
    }

    function testHits(name) {
        testHit([0, 0], 'center', true, name + ': center');
        testHit([9, 0], 'rightCenter', true, name + ': 9 right of bounds');
        testHit([11, 0], 'rightCenter', false, name + ': 11 right of bounds');
        testHit([0, -9], 'topCenter', true, name + ': 9 above bounds');
        testHit([0, -11], 'topCenter', false, name + ': 11 above bounds');
        // At the corners, the distance counts, not the expanded rectangle:
        testHit([6, 6], 'bottomRight', true,
                name + ': 6 * sqrt(2) diagonally from corner');
        testHit([8, 8], 'bottomRight', false,
                name + ': 8 * sqrt(2) diagonally from corner');
    }

    testHits('text');
    // The tolerance is in project coordinates, also when the text is scaled:
    text.scale(2);
    testHits('scaled text');
});

test('hit-testing compound-paths', function() {
    var center = new Point(100, 100);
    var path1 = new Path.Circle({
        center: center,
        radius: 100
    });
    var path2 = new Path.Circle({
        center: center,
        radius: 50
    });
    var compoundPath = new CompoundPath({
        children: [path1, path2],
        fillColor: 'blue',
        fillRule: 'evenodd'
    });
    // When hit-testing a side, we should get a result on the torus
    equals(function() {
        var result = paper.project.hitTest(center.add([75, 0]), {
            fill: true
        });
        return result && result.item === compoundPath;
    }, true);
    // When hit-testing the center, we should not get a result on the torus
    equals(function() {
        var result = paper.project.hitTest(center, {
            fill: true
        });
        return result === null;
    }, true);
    // When asking specifically for paths, she should get the top-most path in
    // the center (the one that cuts out the hole)
    equals(function() {
        var result = paper.project.hitTest(center, {
            class: Path,
            fill: true
        });
        return result && result.item === path2;
    }, true);
});

test('hit-testing clipped items', function() {
    var rect = new Path.Rectangle({
        point: [50, 150],
        size: [100, 50],
        fillColor: 'red'
    });
    var circle = new Path.Circle({
        center: [100, 200],
        radius: 20,
        fillColor: 'green'
    });
    var group = new Group({
        children: [rect, circle]
    });
    group.clipped = true;

    var point1 = new Point(100, 190);
    var point2 = new Point(100, 210);

    equals(function() {
        var result = paper.project.hitTest(point1);
        return result && result.item === circle;
    }, true);

    equals(function() {
        var result = paper.project.hitTest(point2);
        return result === null;
    }, true);
});

test('hit-testing with a match function', function() {
    var point = new Point(100, 100),
        red = new Color('red'),
        green = new Color('green'),
        blue = new Color('blue');
    var c1 = new Path.Circle({
        center: point,
        radius: 50,
        fillColor: red
    });
    var c2 = new Path.Circle({
        center: point,
        radius: 50,
        fillColor: green
    });
    var c3 = new Path.Circle({
        center: point,
        radius: 50,
        fillColor: blue
    });

    equals(function() {
        var result = paper.project.hitTest(point, {
            fill: true,
            match: function(res) {
                return res.item.fillColor == red;
            }
        });
        return result && result.item === c1;
    }, true);
    equals(function() {
        var result = paper.project.hitTest(point, {
            fill: true,
            match: function(res) {
                return res.item.fillColor == green;
            }
        });
        return result && result.item === c2;
    }, true);
    equals(function() {
        var result = paper.project.hitTest(point, {
            fill: true,
            match: function(res) {
                return res.item.fillColor == blue;
            }
        });
        return result && result.item === c3;
    }, true);
});

test('hit-testing for all items', function() {
    var c1 = new Path.Circle({
        center: [100, 100],
        radius: 40,
        fillColor: 'red'
    });
    var c2 = new Path.Circle({
        center: [120, 120],
        radius: 40,
        fillColor: 'green'
    });
    var c3 = new Path.Circle({
        center: [140, 140],
        radius: 40,
        fillColor: 'blue'
    });

    equals(function() {
        var result = paper.project.hitTestAll([60, 60]);
        return result.length === 0;
    }, true);

    equals(function() {
        var result = paper.project.hitTestAll([80, 80]);
        return result.length === 1 && result[0].item === c1;
    }, true);

    equals(function() {
        var result = paper.project.hitTestAll([100, 100]);
        return result.length === 2 && result[0].item === c2
                && result[1].item === c1;
    }, true);

    equals(function() {
        var result = paper.project.hitTestAll([120, 120]);
        return result.length === 3 && result[0].item === c3
                && result[1].item === c2
                && result[2].item === c1;
    }, true);

    equals(function() {
        var result = paper.project.hitTestAll([140, 140]);
        return result.length === 2 && result[0].item === c3
                && result[1].item === c2;
    }, true);

    equals(function() {
        var result = paper.project.hitTestAll([160, 160]);
        return result.length === 1 && result[0].item === c3;
    }, true);

    equals(function() {
        var result = paper.project.hitTestAll([180, 180]);
        return result.length === 0;
    }, true);
});

test('hit-testing shapes with strokes and rounded corners (#1207)', function() {
    var rect = new Shape.Rectangle({
      size: [300, 180],
      strokeWidth: 30,
      strokeColor: 'black',
      fillColor: 'blue',
      radius: 90
    });

    var path = rect.toPath();
    path.visible = false;

    // Test a few shape stroke hit-test edge cases that are right between the
    // rounded corners and the straight parts.

    testHitResult(project.hitTest([90, -10]), {
        type: 'stroke'
    });
    testHitResult(project.hitTest([90, 190]), {
        type: 'stroke'
    });
    testHitResult(project.hitTest([-10, 90]), {
        type: 'stroke'
    });

    // Test at regular intervals along the stroke, and step away from the center
    // in both directions to hit-test

    for (var pos = 0; pos < path.length; pos += 10) {
        var loc = path.getLocationAt(pos),
            step = loc.normal.multiply(5);
        testHitResult(project.hitTest(loc.point.add(step)), {
            type: 'stroke'
        });
        testHitResult(project.hitTest(loc.point.subtract(step)), {
            type: 'stroke'
        });
    }
});

test('hit-testing scaled items with different settings of view.zoom and item.strokeScaling (#1195)', function() {
    function testItem(ctor, zoom, strokeScaling) {
        var item = new ctor.Rectangle({
            point: [100, 100],
            size: [100, 100],
            fillColor: 'red',
            strokeColor: 'black',
            strokeWidth: 10,
            strokeScaling: strokeScaling,
            applyMatrix: true
        });
        item.scale(2);
        view.zoom = zoom;

        var tolerance = 10,
            options = { tolerance: tolerance, fill: true, stroke: true },
            bounds = item.strokeBounds,
            point = bounds.leftCenter,
            name = ctor.name + '.Rectangle, strokeScaling = ' + strokeScaling
                    + ', zoom = ' + zoom;

        testHitResult(project.hitTest(point.subtract(tolerance + 1, 0), options),
                null,
                name + ' outside of stroke'
        );
        testHitResult(project.hitTest(point.subtract(tolerance, 0), options),
                { type: 'stroke' },
                name + ' on stroke within tolerance'
        );
        testHitResult(project.hitTest(point, options),
                { type: 'stroke' },
                name + ' on stroke'
        );
        item.remove();
    }

    testItem(Shape, 1, false);
    testItem(Shape, 1, true);
    testItem(Shape, 2, false);
    testItem(Shape, 2, true);

    testItem(Path, 1, false);
    testItem(Path, 1, true);
    testItem(Path, 2, false);
    testItem(Path, 2, true);
});

test('hit-testing stroke caps with tolerance (#1460)', function() {
    // A horizontal stroke from 100 to 200, 20 wide, tested with tolerance 5:
    function testCap(cap, hits, misses) {
        var path = new Path({
            segments: [[100, 100], [200, 100]],
            strokeColor: 'black',
            strokeWidth: 20,
            strokeCap: cap
        });
        function hitTest(point) {
            return path.hitTest(point, { stroke: true, tolerance: 5 });
        }
        hits.forEach(function(point) {
            var hitResult = hitTest(point);
            equals(hitResult && hitResult.type, 'stroke',
                    cap + ' cap: ' + point + ' should hit the stroke');
        });
        misses.forEach(function(point) {
            equals(hitTest(point), null,
                    cap + ' cap: ' + point + ' should miss the stroke');
        });
        path.remove();
    }

    // The butt cap ends flat at x = 100 and x = 200, between y = 90 and 110:
    testCap('butt', [
        [100, 100], [100, 105], [95, 105], [205, 95],
        // 5 away from the corner at [100, 110]:
        [97, 114],
        // The middle of the stroke, 5 away from its side:
        [150, 115]
    ], [
        [94, 105], [206, 95],
        // sqrt(34) away from the corner at [100, 110]:
        [97, 115],
        [150, 116]
    ]);
    // The square cap extends the stroke to x = 90:
    testCap('square', [[85, 100], [87, 114]], [[84, 100], [87, 115]]);
    // The round cap reaches 10 around the end point:
    testCap('round', [[85, 100], [97, 114]], [[84, 100], [97, 115]]);

    // The example from the issue, with the default stroke width and cap:
    var path = new Path({
        segments: [[30, 30], [300, 300]],
        strokeColor: 'black'
    });
    var hitResult = path.hitTest([300, 300], { stroke: true, tolerance: 50 });
    equals(hitResult && hitResult.location.segment === path.lastSegment,
            true);
});

test('hit-testing items scaled to 0', function() {
    var item = new Shape.Rectangle({
        point: [0, 0],
        size: [100, 100],
        fillColor: 'red',
        selected: true
    });

    item.scale(0);

    testHitResult(project.hitTest(item.position), null,
            'should not throw an exception.');
});

// TODO: project.hitTest(point, {type: AnItemType});

test('Hit-testing groups (#2069)', function() {
    function getItems(hits) {
        return hits.map(function(hit) {
            return hit.item;
        });
    }

    var red = new Path.Rectangle({
            point: [0, 0], size: [50, 50], fillColor: 'red'
        }),
        blue = new Path.Rectangle({
            point: [100, 0], size: [50, 50], strokeColor: 'blue'
        }),
        inner = new Group([red, blue]),
        outer = new Group([inner]);
    // Groups are hit wherever one of their children is hit, whatever their
    // styles, and layers aren't:
    equals(getItems(project.hitTestAll([25, 25])), [red, inner, outer],
            'hitTestAll() on the filled child');
    equals(getItems(project.hitTestAll([100, 25])), [blue, inner, outer],
            'hitTestAll() on the stroked child');
    equals(getItems(project.hitTestAll([75, 25])), [],
            'hitTestAll() between the children');
    // The group's hit takes the type of the child's hit:
    var options = { fill: true, stroke: true, class: Group },
        hit = project.hitTest([100, 25], options);
    equals(function() {
        return hit.item === inner && hit.type;
    }, 'stroke');
    equals(function() {
        return project.hitTest([75, 25], options);
    }, null);
    equals(function() {
        return project.hitTest([25, 25], {
            fill: true,
            match: function(hit) {
                return hit.item === outer;
            }
        }).item === outer;
    }, true);
    // Without filters, the children are still hit first:
    equals(function() {
        return project.hitTest([25, 25]).item === red;
    }, true);
    // Groups with children that share a fill were hit before too:
    blue.fillColor = 'red';
    equals(getItems(project.hitTestAll([125, 25])), [blue, inner, outer],
            'hitTestAll() with shared fills');
});

test('Item#hitTest() on items in transformed groups (#1803)', function() {
    var path = new Path.Rectangle({
            point: [0, 0], size: [50, 50], fillColor: 'red'
        }),
        inner = new Group({ children: [path], applyMatrix: false }),
        outer = new Group({ children: [inner], applyMatrix: false });
    inner.matrix = new Matrix(1, 0, 0, 1, 10, 0);
    outer.matrix = new Matrix(2, 0, 0, 2, 100, 100);
    // The path's local point 25, 25 is at 35, 25 in inner and at
    // 2 * 35 + 100, 2 * 25 + 100 = 170, 150 in global coordinates:
    equals(function() {
        return path.hitTest([170, 150]).item === path;
    }, true);
    equals(function() {
        return inner.hitTest([170, 150]).item === path;
    }, true);
    equals(function() {
        return project.hitTest([170, 150]).item === path;
    }, true);
    equals(function() {
        return path.hitTest([25, 25]);
    }, null);
    // The hit point is in global coordinates too: the segment at 0, 0 is at
    // 2 * 10 + 100, 100 = 120, 100.
    var hit = path.hitTest([121, 101], { segments: true, tolerance: 5 });
    equals(function() {
        return hit.type;
    }, 'segment');
    equals(hit.point, new Point(120, 100));
});

test('hit-testing with tolerance on items in transformed groups (#1278)', function() {
    // The tolerance is in project coordinates, regardless of the
    // transformations of the item, its parents and the view.
    var options = { segments: true, tolerance: 10 };

    function testTolerance(item, point, name) {
        // The tolerance circle around point, through the closest misses:
        var hits = [[9, 0], [-9, 0], [0, 9], [0, -9], [7, 7]],
            misses = [[11, 0], [-11, 0], [0, 11], [0, -11], [7.2, 7.2]];
        function test(owner, offset, expected) {
            var hit = owner.hitTest(point.add(offset), options);
            equals(function() {
                return !!hit && hit.item === item && hit.type === 'segment';
            }, expected, name + ', ' + (owner === project ? 'project' : 'item')
                    + '.hitTest() at offset ' + offset);
        }
        for (var i = 0; i < hits.length; i++) {
            test(project, hits[i], true);
            test(item, hits[i], true);
            test(project, misses[i], false);
            test(item, misses[i], false);
        }
    }

    function createPath(point) {
        return new Path({ segments: [point, [0, 0]], strokeColor: 'black' });
    }

    function createGroup(matrix, child) {
        var group = new Group({ children: [child], applyMatrix: false });
        group.matrix = matrix;
        return group;
    }

    var path = createPath([100, 100]);
    testTolerance(path, new Point(100, 100), 'untransformed');
    path.remove();

    // 2 * 50, 2 * 50 = 100, 100:
    path = createPath([50, 50]);
    var group = createGroup(new Matrix(2, 0, 0, 2, 0, 0), path);
    testTolerance(path, new Point(100, 100), 'scaled');
    // Zooming the view doesn't change the tolerance:
    view.zoom = 2;
    testTolerance(path, new Point(100, 100), 'scaled, zoomed view');
    view.zoom = 1;
    group.remove();

    // The local 50, 0 is scaled to 100, 0 and rotated by 30°:
    path = createPath([50, 0]);
    group = createGroup(new Matrix().rotate(30).scale(2), path);
    var angle = 30 * Math.PI / 180;
    testTolerance(path, new Point(100 * Math.cos(angle),
            100 * Math.sin(angle)), 'rotated and scaled');
    group.remove();

    // x' = -y + 200, y' = 3 * x, so the local 40, 100 is at 100, 120, and the
    // tolerance turns into an ellipse in local coordinates:
    path = createPath([40, 100]);
    group = createGroup(new Matrix(0, 3, -1, 0, 200, 0), path);
    testTolerance(path, new Point(100, 120), 'rotated and scaled unevenly');
    group.remove();

    // 1.5 * 2 * 40, 1.5 * 2 * 30 = 120, 90:
    path = createPath([40, 30]);
    group = createGroup(new Matrix(1.5, 0, 0, 1.5, 0, 0),
            createGroup(new Matrix(2, 0, 0, 2, 0, 0), path));
    testTolerance(path, new Point(120, 90), 'nested groups');
    group.remove();

    // Symbol items transform their definition the same way, 2 * 50 = 100:
    var item = new SymbolItem(new SymbolDefinition(createPath([50, 50]), true));
    item.matrix = new Matrix(2, 0, 0, 2, 0, 0);
    testTolerance(item, new Point(100, 100), 'scaled symbol item');
});

test('hitTestAll() points of items in transformed groups', function() {
    var path = new Path.Rectangle({
        point: [0, 0],
        size: [10, 10],
        fillColor: 'red'
    });
    var group = new Group({ children: [path], applyMatrix: false });
    group.translate(100, 100);
    var options = { segments: true, tolerance: 2 };
    var hit = project.hitTest([100, 100], options);
    var hits = project.hitTestAll([100, 100], options);
    equals(hit.point, new Point(100, 100), 'hitTest()');
    // The path's segment, then the group, which is hit through its child:
    equals(hits.length, 2);
    equals(hits[0].item === path, true);
    equals(hits[0].point, new Point(100, 100), 'hitTestAll(): path');
    equals(hits[1].item === group, true);
    equals(hits[1].point, new Point(100, 100), 'hitTestAll(): group');
});

test('hitTestAll() reports all segments of a path in range (#1294)', function() {
    var path = new Path.RegularPolygon({
        center: [100, 100],
        sides: 16,
        radius: 40,
        fillColor: 'grey'
    });
    // The neighbouring segments are 2 * 40 * sin(PI / 16), about 15.6 away,
    // the next ones about 30.6:
    var point = path.firstSegment.point,
        options = { segments: true, fill: true, tolerance: 20 };
    var hits = project.hitTestAll(point, options);
    var segments = hits.filter(function(hit) {
        return hit.type === 'segment';
    });
    equals(segments.length, 3);
    equals(segments.every(function(hit, i) {
        return hit.item === path && (!i || hit.point.getDistance(point)
                >= segments[i - 1].point.getDistance(point));
    }), true, 'closest first');
    equals(segments[0].point, point);
    // The fill hit follows the segments:
    equals(hits.length, 4);
    equals(hits[3].type, 'fill');
    // hitTest() still returns the first hit only:
    var hit = project.hitTest(point, options);
    equals(hit.type, 'segment');
    equals(hit.point, point);
});

test('Transparent fills are hit, unlike no fill (#1157)', function() {
    var transparent = new Color(0, 0, 0, 0);
    var path = new Path.Rectangle({
        point: [0, 0],
        size: [20, 20],
        fillColor: transparent
    });
    var shape = new Shape.Circle({
        center: [60, 10],
        radius: 10,
        fillColor: transparent
    });
    var hit = project.hitTest([10, 10]);
    equals(hit && hit.item === path && hit.type, 'fill', 'path');
    hit = project.hitTest([60, 10]);
    equals(hit && hit.item === shape && hit.type, 'fill', 'shape');
    // As in SVG, only items without a fill aren't hit:
    path.fillColor = null;
    shape.fillColor = null;
    equals(project.hitTest([10, 10]), null, 'path without a fill');
    equals(project.hitTest([60, 10]), null, 'shape without a fill');
});

test('hit-testing strokes next to smooth segments with any join (#2342)', function() {
    function hitTest(item, point) {
        return item.hitTest(point, { stroke: true, fill: false });
    }
    // Smooth segments are joined round, whatever the join. The stroke of the
    // circle reaches from radius 45 to 55 around [100, 100]:
    ['miter', 'bevel', 'round'].forEach(function(join) {
        var circle = new Path.Circle({
            center: [100, 100],
            radius: 50,
            strokeColor: 'black',
            strokeWidth: 10,
            strokeJoin: join
        });
        [[153, 100], [146, 100], [100, 154]].forEach(function(point) {
            var hitResult = hitTest(circle, point);
            equals(hitResult && hitResult.type, 'stroke',
                    join + ' join: ' + point + ' should hit the stroke');
        });
        [[156, 100], [144, 100], [100, 156]].forEach(function(point) {
            equals(hitTest(circle, point), null,
                    join + ' join: ' + point + ' should miss the stroke');
        });
        circle.remove();
    });
    // The miter of the corner at [400, 100] reaches to [410, 90]:
    var rect = new Path.Rectangle({
        rectangle: [100, 100, 300, 200],
        strokeColor: 'black',
        strokeWidth: 20,
        strokeJoin: 'miter'
    });
    var hitResult = hitTest(rect, [409, 91]);
    equals(hitResult && hitResult.type, 'stroke',
            'the miter tip should hit the stroke');
    equals(hitTest(rect, [411, 89]), null,
            'beyond the miter tip should miss the stroke');
});

test('hit-testing non-scaling strokes under non-uniform matrices (#2334)', function() {
    // A non-scaling stroke is drawn around the transformed geometry, so a path
    // that keeps its matrix is hit where the same path with the matrix applied
    // to its geometry is:
    function compare(name, attributes, transform) {
        function create(applyMatrix) {
            var path = new Path(Base.set({
                strokeColor: 'black',
                strokeWidth: 10,
                strokeScaling: false,
                applyMatrix: applyMatrix
            }, attributes));
            transform(path);
            return path;
        }
        var kept = create(false),
            applied = create(true),
            bounds = applied.strokeBounds.expand(10),
            options = { stroke: true, fill: false },
            count = 0;
        for (var x = bounds.left; x <= bounds.right; x += 2) {
            for (var y = bounds.top; y <= bounds.bottom; y += 2) {
                var point = new Point(x, y);
                if (!kept.hitTest(point, options)
                        !== !applied.hitTest(point, options))
                    count++;
            }
        }
        equals(count, 0, name + ': points hit differently');
        kept.remove();
        applied.remove();
    }
    var star = new Path.Star({
            center: [50, 50],
            points: 5,
            radius1: 20,
            radius2: 40,
            insert: false
        }).segments,
        line = [[20, 80], [50, 20], [80, 70], [110, 30]];
    function scale(path) {
        path.scale(2.5, 0.6);
    }
    function shear(path) {
        path.shear(0.8, 0);
        path.scale(1, 1.7);
    }
    compare('round joins', { segments: star, closed: true }, scale);
    compare('miter joins, sheared',
            { segments: star, closed: true, strokeJoin: 'miter' }, shear);
    compare('square caps and bevel joins',
            { segments: line, strokeCap: 'square', strokeJoin: 'bevel' },
            scale);
});

test('hit-testing strokes where a line runs into a curve with a miter join', function() {
    // The rounded corners meet the straight sides in the same direction, with
    // a handle of zero length on the side of the line, so the join adds
    // nothing there. Points inside the stroke at these segments are hit:
    var rect = new Path.Rectangle({
        point: [0, 0],
        size: [300, 180],
        radius: 90,
        strokeColor: 'black',
        strokeWidth: 30,
        strokeJoin: 'miter'
    });
    rect.segments.forEach(function(segment) {
        var normal = segment.location.normal.multiply(5);
        [segment.point.add(normal), segment.point.subtract(normal)].forEach(
            function(point) {
                var hitResult = rect.hitTest(point,
                        { stroke: true, fill: false });
                equals(hitResult && hitResult.type, 'stroke',
                        'point ' + point + ' should hit the stroke');
            }
        );
    });
});
