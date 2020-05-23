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

QUnit.module('Path');

test('Path#length', function() {
    var path = new Path([
        new Segment([121, 334], [-19, 38], [30.7666015625, -61.53369140625]),
        new Segment([248, 320], [-42, -74], [42, 74])
    ]);

    equals(function() {
        return path.length;
    }, 172.10112809179614);

    equals(function() {
        return path.curves[0].getTimeAt(path.length / 4);
    }, 0.2255849553116685);
});

test('Path#area', function() {
    var rect = new Path.Rectangle({
        point: [0, 0],
        size: [10, 10]
    });

    equals(function() {
        return rect.area;
    }, 100);

    var circle = new Path.Circle({
        center: [0, 0],
        radius: 10
    });

    equals(function() {
        return circle.area;
    }, Math.PI * 100, null, { tolerance: 0.1 });
});

test('Path#equals(path)', function() {
    var path1 = new Path({
        segments: [
            [1, 1],
            [2, 2],
            [3, 3],
        ]
    });

    var path2 = new Path({
        segments: [
            [1, 1],
            [2, 2],
            [3, 3],
        ]
    });

    equals(function() {
        return path1.equals(path2);
    }, true);

    path2.strokeWidth = path1.strokeWidth;

    equals(function() {
        return path1.equals(path2);
    }, true);

    path1.strokeWidth = path2.strokeWidth;

    equals(function() {
        return path1.equals(path2);
    }, true);

    path1.strokeWidth = path2.strokeWidth = 10;

    equals(function() {
        return path1.equals(path2);
    }, true);
});

test('Path#join(path)', function() {
    var path1 = new Path();
    path1.add(0, 0);
    path1.add(10, 0);

    var path2 = new Path();
    path2.add(10, 0);
    path2.add(20, 10);

    path1.join(path2);
    equals(path1.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } }');
    equals(function() { return paper.project.activeLayer.children.length; }, 1);

    var path1 = new Path();
    path1.add(0, 0);
    path1.add(10, 0);

    var path2 = new Path();
    path2.add(20, 10);
    path2.add(10, 0);
    path1.join(path2);
    equals(path1.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } }');

    var path1 = new Path();
    path1.add(0, 0);
    path1.add(10, 0);

    var path2 = new Path();
    path2.add(30, 10);
    path2.add(40, 0);
    path1.join(path2);
    equals(path1.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 30, y: 10 } },{ point: { x: 40, y: 0 } }');

    var path1 = new Path();
    path1.add(0, 0);
    path1.add(10, 0);
    path1.add(20, 10);

    var path2 = new Path();
    path2.add(0, 0);
    path2.add(10, 5);
    path2.add(20, 10);

    path1.join(path2);

    equals(path1.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } },{ point: { x: 10, y: 5 } }');
    equals(function() { return path1.closed; }, true);
});

test('Path#join(path, tolerance)', function() {
    var path1 = new Path();
    path1.add(0, 0);
    path1.add(10, 0);

    var path2 = new Path();
    path2.add(path1.lastSegment.point.add(1e-14));
    path2.add(20, 10);

    equals(function() {
        return path1.clone().join(path2.clone(), 0).segments.length;
    }, 4);
    equals(function() {
        return path1.clone().join(path2.clone(), 1e-12).segments.length;
    }, 3);
});

test('Path#remove()', function() {
    var path = new Path();
    path.add(0, 0);
    path.add(10, 0);
    path.add(20, 0);
    path.add(30, 0);

    path.removeSegment(0);
    equals(function() {
        return path.segments.length;
    }, 3);

    path.removeSegment(0);
    equals(function() {
        return path.segments.length;
    }, 2);

    path.removeSegments(0, 1);
    equals(function() {
        return path.segments.length;
    }, 1);

    path.remove();

    equals(function() {
        return paper.project.activeLayer.children.length;
    }, 0);
});

test('Path#removeSegments()', function() {
    var path = new Path();
    path.add(0, 0);
    path.add(10, 0);
    path.add(20, 0);
    path.add(30, 0);

    path.removeSegments();
    equals(function() {
        return path.segments.length;
    }, 0);
});

test('Is the path deselected after setting a new list of segments?', function() {
    var path = new Path([0, 0]);
    path.selected = true;
    equals(function() {
        return path.selected;
    }, true);
    equals(function() {
        return paper.project.selectedItems.length;
    }, 1);

    path.segments = [[0, 10]];
    equals(function() {
        return path.selected;
    }, true);
    equals(function() {
        return paper.project.selectedItems.length;
    }, 1);
});

test('Setting Path#fullySelected=true on an empty path should only set path#selected=true', function() {
    var path = new Path();
    path.fullySelected = true;
    equals(function() {
        return path.fullySelected;
    }, false);
    equals(function() {
        return path.selected;
    }, true);
});

test('After removing all segments of a fully selected path, it should still be selected.', function() {
    var path = new Path([10, 20], [30, 40]);
    path.fullySelected = true;
    equals(function() {
        return path.fullySelected;
    }, true);
    path.removeSegments();
    equals(function() {
        return path.fullySelected;
    }, false);
    equals(function() {
        return path.selected;
    }, true);
});

test('After removing all segments of a selected path, it should still be selected.', function() {
    var path = new Path([10, 20], [30, 40]);
    path.selected = true;
    path.removeSegments();
    equals(function() {
        return path.selected;
    }, true);
});

test('After simplifying a path using #simplify(), the path should stay fullySelected', function() {
    var path = new Path();
    for (var i = 0; i < 30; i++) {
        path.add(i * 10, 10);
    }
    path.fullySelected = true;
    equals(function() {
        return path.selected;
    }, true);

    path.simplify();

    equals(function() {
        return path.selected;
    }, true);

    equals(function() {
        return path.fullySelected;
    }, true);
});

test('After cloning a selected item, it should be added to the Project#selectedItems array', function() {
    var path = new Path.Circle(new Size(80, 50), 35);
    path.selected = true;
    var copy = path.clone();

    equals(function() {
        return paper.project.selectedItems.length;
    }, 2);
});

test('After simplifying a path using #simplify(), the path should stay selected', function() {
    var path = new Path();
    for (var i = 0; i < 30; i++) {
        path.add(i * 10, (i % 2 ? 20 : 40));
    }
    path.selected = true;
    path.simplify();
    equals(function() {
        return path.selected;
    }, true);
});

test('After smoothing a path using #smooth(), the path should stay fullySelected', function() {
    var path = new Path();
    for (var i = 0; i < 30; i++) {
        path.add(i * 10, (i % 2 ? 20 : 40));
    }
    path.fullySelected = true;
    path.smooth();
    equals(function() {
        return path.fullySelected;
    }, true);
});

test('After smoothing a path using #smooth(), the path should stay selected', function() {
    var path = new Path();
    for (var i = 0; i < 30; i++) {
        path.add(i * 10, (i % 2 ? 20 : 40));
    }
    path.selected = true;
    path.smooth();
    equals(function() {
        return path.selected;
    }, true);
});

test('After selecting a segment, Path#selected should return true', function() {
    var path = new Path();
    path.add([10, 10]);
    path.firstSegment.selected = true;
    equals(function() {
        return path.selected;
    }, true);
});

test('Path#reverse()', function() {
    var path = new Path.Circle([100, 100], 30);
    path.reverse();
    equals(path.segments.toString(), '{ point: { x: 100, y: 130 }, handleIn: { x: -16.56854, y: 0 }, handleOut: { x: 16.56854, y: 0 } },{ point: { x: 130, y: 100 }, handleIn: { x: 0, y: 16.56854 }, handleOut: { x: 0, y: -16.56854 } },{ point: { x: 100, y: 70 }, handleIn: { x: 16.56854, y: 0 }, handleOut: { x: -16.56854, y: 0 } },{ point: { x: 70, y: 100 }, handleIn: { x: 0, y: -16.56854 }, handleOut: { x: 0, y: 16.56854 } }');
});

test('Path#reverse() should adjust segment indices', function() {
    var path = new Path([[0, 0], [10, 10], [20, 20]]);
    path.reverse();
    equals(path.segments[0].index, 0);
    equals(path.segments[1].index, 1);
    equals(path.segments[2].index, 2);
});

test('Path#fullySelected', function() {
    var path = new Path.Circle([100, 100], 10);
    path.fullySelected = true;
    path.segments[1].selected = false;
    equals(function() {
        return path.fullySelected;
    }, false);
});

test('Simplifying a path with three segments of the same position should not throw an error', function() {
    var path = new Path([20, 20], [20, 20], [20, 20]);
    path.simplify();
    equals(function() {
        return path.segments.length;
    }, 1);
});

test('Path#interpolate(from, to, factor)', function() {
    var path = new Path(),
        path0 = new Path.Circle({
            center: [0, 0],
            radius: 10
        }),
        path1 = new Path.Ellipse({
            center: [10, 20],
            radius: [20, 10]
        }),
        halfway = new Path.Ellipse({
            center: [5, 10],
            radius: [15, 10]
        });

    path.interpolate(path0, path1, 0);
    equals(path, path0);

    path.interpolate(path0, path1, 1);
    equals(path, path1);

    path.interpolate(path0, path1, 0.5);
    equals(path, halfway);
});

////////////////////////////////////////////////////////////////////////////////
// Path Curves

test('Path#curves synchronisation', function() {
    var path = new Path();

    path.add(new Point(100, 100));
    equals(path.segments.toString(), "{ point: { x: 100, y: 100 } }", "path.segments: path.add(new Point(100, 100));");
    equals(path.curves.toString(), "", "path.curves: path.add(new Point(100, 100));");
    path.insert(0, new Point(0, 100));
    equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }", "path.segments: path.insert(0, new Point(0, 100));");
    equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } }", "path.curves: path.insert(0, new Point(0, 100));");
    path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});
    equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } },{ point: { x: 100, y: 100 } }", "path.segments: path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});");
    equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } }", "path.curves: path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});");
    path.closed = true;
    equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } },{ point: { x: 100, y: 100 } }", "path.segments: path.closed = true;");
    equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }", "path.curves: path.closed = true;");
    path.removeSegments(2, 3);
    equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } }", "path.segments: path.removeSegments(2, 3);");
    equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 0, y: 100 } }", "path.curves: path.removeSegments(2, 3);");
    path.add(new Point(100, 100));
    path.removeSegments(1, 2);
    equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }", "path.segments: path.add(new Point(100, 100));\npath.removeSegments(1, 2);");
    equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }", "path.curves: path.add(new Point(100, 100));\npath.removeSegments(1, 2);");

    // Transform the path, and the curves length should be invalidated (first, force-cache the first segment's length by accessing it
    var length = path.curves[0].length;
    ok(path.curves[0]._length, 'Curve length does not appear to be cached');
    path.scale(2, [0, 0]);
    equals(path.curves[0].length, 200, 'Curve length should be updated when path is transformed');

    var points = [];
    for (var i = 0; i < 40; i++)
        points.push(Point.random());
    var path = new Path(points);
    equals(path.segments.length, 40, 'segments.length');
    equals(path.curves.length, 39, 'curves.length');
    path.removeSegments();
    equals(path.segments.length, 0, 'segments.length');
    equals(path.curves.length, 0, 'curves.length');
});

test('Path#curves on closed paths', function() {
    var path = new Path.Circle(new Point(100, 100) , 100);
    equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle1: { x: 0, y: -55.22847 }, handle2: { x: -55.22847, y: 0 }, point2: { x: 100, y: 0 } },{ point1: { x: 100, y: 0 }, handle1: { x: 55.22847, y: 0 }, handle2: { x: 0, y: -55.22847 }, point2: { x: 200, y: 100 } },{ point1: { x: 200, y: 100 }, handle1: { x: 0, y: 55.22847 }, handle2: { x: 55.22847, y: 0 }, point2: { x: 100, y: 200 } },{ point1: { x: 100, y: 200 }, handle1: { x: -55.22847, y: 0 }, handle2: { x: 0, y: 55.22847 }, point2: { x: 0, y: 100 } }");
    path.removeSegments(0, 1);
    equals(path.curves.toString(), "{ point1: { x: 100, y: 0 }, handle1: { x: 55.22847, y: 0 }, handle2: { x: 0, y: -55.22847 }, point2: { x: 200, y: 100 } },{ point1: { x: 200, y: 100 }, handle1: { x: 0, y: 55.22847 }, handle2: { x: 55.22847, y: 0 }, point2: { x: 100, y: 200 } },{ point1: { x: 100, y: 200 }, handle1: { x: -55.22847, y: 0 }, handle2: { x: -55.22847, y: 0 }, point2: { x: 100, y: 0 } }");
});

test('Path#flatten(maxDistance)', function() {
    var path = new Path.Circle(new Size(80, 50), 35);

    // Convert its curves to points, with a flatness of 5:
    path.flatten(5);

    equals(function() {
        return path.segments.length;
    }, 8, 'Using a flatness of 10, we should end up with 8 segments.');

    equals(function() {
        return path.lastSegment.point.equals(path.firstSegment.point);
    }, false, 'The points of the last and first segments should not be the same.');

    equals(function() {
        return path.lastSegment.point.toString() != path.lastSegment.previous.point.toString();
    }, true, 'The points of the last and before last segments should not be so close, that calling toString on them returns the same string value.');
});

test('Path#single segment closed path flatten (#1338)', function() {
    var p = PathItem.create("m445.26701,223.69688c6.1738,8.7566 -7.05172,14.0468 0,0z");
    p.strokeColor = "red";
    p.flatten();
    expect(0);
});

test('Path#curves after removing a segment - 1', function() {
    var path = new paper.Path([0, 0], [1, 1], [2, 2]);
    var prevCurves = path.curves.slice();

    equals(function() {
        return path.curves.length;
    }, 2, 'After creating a path with three segments, we should have two curves. By accessing path.curves we also make sure the curves are created internally.');

    equals(function() {
        return path.segments[1].remove();
    }, true, 'Removing the paths second segment should be successful.');

    equals(function() {
        return path.curves.length;
    }, 1, 'After removing the middle segment, we should be left with one curve.');

    equals(function() {
        return path.curves[0] === prevCurves[0];
    }, true, 'The remaining curve should be the same as in the previous state of the curves array.');

    equals(function() {
        return path.curves[0].path === path;
    }, true, 'The remaining curve should stay linked to the path.');

    equals(function() {
        return prevCurves[1].path === null;
    }, true, 'The removed curve should not stay linked to the path.');
});

test('Path#curves after removing a segment - 2', function() {
    var path = new paper.Path([0, 0], [1, 1], [2, 2]);

    equals(function() {
        return path.curves.length;
    }, 2, 'After creating a path with three segments, we should have two curves. By accessing path.curves we also make sure the curves are created internally.');

    equals(function() {
        return path.lastSegment.remove();
    }, true, 'Removing the last segment should be successful.');

    equals(function() {
        return path.curves.length;
    }, 1, 'After removing the last segment, we should be left with one curve.');

    equals(function() {
        return path.lastSegment.remove();
    }, true, 'Removing last segment should be successful.');

    equals(function() {
        return path.curves.length;
    }, 0, 'After removing the last segment, we should be left with no curves.');

    equals(function() {
        return path.lastSegment.remove();
    }, true, 'Removing the final remaining segment should be successful.');

    equals(function() {
        return path.curves.length;
    }, 0, 'After removing all segments, we should be left with no curves.');

    path.addSegment([0, 0]);
    path.addSegment([1, 1]);

    equals(function() {
        return path.curves.length;
    }, 1, 'After adding two new segments, we should have one curve again.');

    path.addSegment([2, 2]);

    equals(function() {
        return path.curves.length;
    }, 2, 'After adding a new segment, we should have two curves again.');

    equals(function() {
        return path.curves[1].segment1 === path.curves[0].segment2;
    }, true, "The newly created curve's first segment needs to be the same as the previous curve's second segment.");

    path.addSegments([[3, 3], [4, 4]]);

    equals(function() {
        return path.curves.length;
    }, 4, 'After adding two new segments at the end, we should have four curves now.');
});

test('Splitting a straight path should produce segments without handles', function() {
    var path1 = new Path.Line([0, 0], [50, 50]);
    var path2 = path1.splitAt(path1.length / 2);
    equals(function() {
        return !path1.lastSegment.hasHandles() && !path2.firstSegment.hasHandles();
    }, true);
});

test('Splitting a path with one curve in the middle result in two paths of the same length with one curve each', function() {
    var path1 = new Path.Line([0, 0], [100, 100]);
    var loc = path1.getLocationAt(path1.length / 2);
    var path2 = path1.splitAt(loc);
    equals(function() {
        return path1.curves.length;
    }, 1);
    equals(function() {
        return path2.curves.length;
    }, 1);
    equals(function() {
        return path1.length === path2.length;
    }, true);
});

////////////////////////////////////////////////////////////////////////////////
// Path Drawing Commands

test('Path#lineTo(point);', function() {
    var path = new Path();
    path.moveTo([50, 50]);
    path.lineTo([100, 100]);
    equals(path.segments.toString(), '{ point: { x: 50, y: 50 } },{ point: { x: 100, y: 100 } }');
});

test('Path#arcTo(from, through, to);', function() {
    var path = new Path();
    path.moveTo([0, 20]);
    path.arcTo([75, 75], [100, 0]);
    equals(path.segments.toString(), '{ point: { x: 0, y: 20 }, handleOut: { x: -2.62559, y: 23.01251 } },{ point: { x: 30.89325, y: 74.75812 }, handleIn: { x: -21.05455, y: -9.65273 }, handleOut: { x: 21.05455, y: 9.65273 } },{ point: { x: 92.54397, y: 62.42797 }, handleIn: { x: -15.72238, y: 17.00811 }, handleOut: { x: 15.72238, y: -17.00811 } },{ point: { x: 100, y: 0 }, handleIn: { x: 11.27458, y: 20.23247 } }');
});

test('Path#arcTo(from, through, to); where from, through and to all share the same y position and through lies in between from and to', function() {
    var path = new Path();
    path.strokeColor = 'black';

    path.add([40, 75]);
    path.arcTo([50, 75], [100, 75]);
    equals(path.lastSegment.point.toString(), '{ x: 100, y: 75 }', 'We expect the last segment point to be at the position where we wanted to draw the arc to.');
});

test('Path#arcTo(from, through, to); where from, through and to all share the same y position and through lies to the right of to', function() {
    var path = new Path();
    path.strokeColor = 'black';

    path.add([40, 75]);
    var error = null;
    try {
        path.arcTo([150, 75], [100, 75]);
    } catch (e) {
        error = e;
    }
    equals(error != null, true, 'We expect this arcTo() command to throw an error');
});

test('Path#arcTo(from, through, to); where from, through and to all share the same y position and through lies to the left of to', function() {
    var path = new Path();
    path.strokeColor = 'black';

    path.add([40, 75]);
    var error = null;
    try {
        path.arcTo([10, 75], [100, 75]);
    } catch (e) {
        error = e;
    }
    equals(error != null, true, 'We expect this arcTo() command to throw an error');
});

test('Path#getOffsetsWithTangent()', function() {
    var path = new Path.Circle(new Point(0, 0), 50);
    var length = path.length;
    equals(path.getOffsetsWithTangent(), [], 'should return empty array when called without argument');
    equals(path.getOffsetsWithTangent([1, 0]), [0.25 * length, 0.75 * length], 'should not return duplicates when tangent is at segment point');
    equals(path.getOffsetsWithTangent([1, 1]).length, 2, 'should return 2 values when called on a circle with a diagonal vector');
});

test('Path#add() with a lot of segments (#1493)', function() {
    var segments = [];
    for (var i = 0; i < 100000; i++) {
        segments.push(new Point(0, 0));
    }
    var path = new Path(segments);
    path.clone();
    expect(0);
});

test('Path#arcTo(through, to) is on through point side (#1477)', function() {
    var p1 = new Point(16, 21.5);
    var p2 = new Point(22.5, 15);
    var p3 = new Point(16.000000000000004, 8.5);
    var path = new Path();
    path.add(p1);
    path.arcTo(p2, p3);
    equals(true, path.segments[1].point.x > p1.x);
});

test('Path#arcTo(to, radius, rotation, clockwise, large) when from and to are equal (#1613)', function(){
    var point = new Point(10,10);
    var path = new Path();
    path.moveTo(point);
    path.arcTo(point, new Size(10), 0, true, true);
    expect(0);
});

test('Path#closed with blend mode', function() {
    new Path({
        strokeColor: 'black',
        blendMode: 'negation',
        closed: true
    });
    view.update();
    expect(0);
});
