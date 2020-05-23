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

QUnit.module('Rectangle');

test('new Rectangle(Point, Size);', function() {
    var rect = new Rectangle(new Point(10, 20), new Size(30, 40));
    equals(rect, new Rectangle(10, 20, 30, 40));
});

test('new Rectangle({ point, size });', function() {
    var rect = new Rectangle({ point: [10, 20], size: [30, 40] });
    equals(rect, new Rectangle(10, 20, 30, 40));
    var rect = new Rectangle({ point: new Point(10, 20), size: new Size(30, 40)});
    equals(rect, new Rectangle(10, 20, 30, 40));
});

test('new Rectangle(Array, Array);', function() {
    var rect = new Rectangle([10, 20], [30, 40]);
    equals(rect, new Rectangle(10, 20, 30, 40));
});

test('new Rectangle(Point, Point);', function() {
    var rect = new Rectangle(new Point(10, 20), new Point(30, 40));
    equals(rect, new Rectangle(10, 20, 20, 20));
});

test('new Rectangle({ from, to });', function() {
    var rect = new Rectangle({from: [10, 20], to: [30, 40]});
    equals(rect, new Rectangle(10, 20, 20, 20));
});

test('new Rectangle(x, y, width, height);', function() {
    var rect = new Rectangle(10, 20, 30, 40);
    equals(rect, new Rectangle(10, 20, 30, 40));
});

test('new Rectangle({ x, y, width, height });', function() {
    var rect = new Rectangle({x: 10, y: 20, width: 30, height: 40});
    equals(rect, new Rectangle(10, 20, 30, 40));
});

test('new Rectangle(object)', function() {
    var expected = new Rectangle(100, 50, 100, 200);

    equals(function() {
        return new Rectangle({
            top: expected.top,
            right: expected.right,
            bottom: expected.bottom,
            left: expected.left
        });
    }, expected);

    function testProperties(key1, key2) {
        var obj = {};
        obj[key1] = expected[key1];
        obj[key2] = expected[key2];
        var rect = new Rectangle(obj);
        equals(rect, expected, 'new Rectangle({ ' + key1 + ', ' + key2 + ' });');
    }

    var tests = [
        ['center', 'size'],
        ['topLeft', 'size'],
        ['topRight', 'size'],
        ['bottomRight', 'size'],
        ['bottomLeft', 'size'],
        ['leftCenter', 'size'],
        ['topCenter', 'size'],
        ['rightCenter', 'size'],
        ['bottomCenter', 'size'],
        ['topLeft', 'bottomRight'],
        ['topRight', 'bottomLeft'],
        ['topLeft', 'bottomCenter'],
        ['topLeft', 'rightCenter'],
        ['topRight', 'bottomCenter'],
        ['topRight', 'leftCenter'],
        ['bottomLeft', 'topCenter'],
        ['bottomLeft', 'rightCenter'],
        ['bottomRight', 'topCenter'],
        ['bottomRight', 'leftCenter']
    ];

    tests.forEach(function(test) {
        testProperties(test[0], test[1]);
        testProperties(test[1], test[0]);
    });
});

test('rect.left / rect.top VS rect.right / rect.bottom', function() {
    var rect = new Rectangle({
        point: [0,0],
        size: [100, 100],
    });
    rect.left -= 10;
    rect.top -= 10;
    equals(rect.right, 90);
    equals(rect.bottom, 90);

    var rect = new Rectangle([0, 0], [100, 100]);
    rect.left -= 10;
    rect.top -= 10;
    equals(rect.right, 90);
    equals(rect.bottom, 90);

    var rect = new Rectangle({
        topLeft: [0,0],
        bottomRight: [100, 100],
    });
    rect.left -= 10;
    rect.top -= 10;
    equals(rect.right, 100);
    equals(rect.bottom, 100);
});

test('rect.size', function() {
    var rect = new Rectangle(10, 10, 20, 30);
    equals(function() {
        return rect.size.equals([20, 30]);
    }, true);
    rect.size = [30, 40];
    equals(rect, new Rectangle(10, 10, 30, 40));
});

test('rect.center', function() {
    var rect = new Rectangle(10, 10, 20, 30);
    equals(function() {
        return rect.size;
    }, new Size(20, 30));
    equals(function() {
        return rect.center;
    }, new Point(20, 25));
    rect.center = [100, 100];
    equals(function() {
        return rect.center;
    }, new Point(100, 100));
    equals(function() {
        return rect.size;
    }, new Size(20, 30));
    rect.center = [200, 200];
    equals(function() {
        return rect.center;
    }, new Point(200, 200));
    equals(function() {
        return rect.size;
    }, new Size(20, 30));
});

test('rect.topLeft', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.topLeft;
    equals(point, { x: 10, y: 10 });
    rect.topLeft = [10, 15];
    var point = rect.topLeft;
    equals(point, { x: 10, y: 15 });
});

test('rect.topRight', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.topRight;
    equals(point, { x: 30, y: 10 });
    var rect = new Rectangle(10, 10, 20, 20);
    rect.topRight = [10, 15];
    var point = rect.topRight;
    equals(point, { x: 10, y: 15 });
});

test('rect.bottomLeft', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.bottomLeft;
    equals(point, { x: 10, y: 30 });
    var rect = new Rectangle(10, 10, 20, 20);
    rect.bottomLeft = [10, 15];
    var point = rect.bottomLeft;
    equals(point, { x: 10, y: 15 });
});

test('rect.bottomRight', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.bottomRight;
    equals(point, { x: 30, y: 30 });
    var rect = new Rectangle(10, 10, 20, 20);
    rect.bottomRight = [10, 15];
    var point = rect.bottomRight;
    equals(point, { x: 10, y: 15 });
});

test('rect.bottomCenter', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.bottomCenter;
    equals(point, { x: 20, y: 30 });
    var rect = new Rectangle(10, 10, 20, 20);
    rect.bottomCenter = [10, 15];
    var point = rect.bottomCenter;
    equals(point, { x: 10, y: 15 });
});

test('rect.topCenter', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.topCenter;
    equals(point, { x: 20, y: 10 });
    var rect = new Rectangle(10, 10, 20, 20);
    rect.topCenter = [10, 15];
    var point = rect.topCenter;
    equals(point, { x: 10, y: 15 });
});

test('rect.leftCenter', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.leftCenter;
    equals(point, { x: 10, y: 20 });
    var rect = new Rectangle(10, 10, 20, 20);
    rect.leftCenter = [10, 15];
    var point = rect.leftCenter;
    equals(point, { x: 10, y: 15 });
});

test('rect.rightCenter', function() {
    var rect = new Rectangle(10, 10, 20, 20);
    var point = rect.rightCenter;
    equals(point, { x: 30, y: 20 });
    var rect = new Rectangle(10, 10, 20, 20);
    rect.rightCenter = [10, 15];
    var point = rect.rightCenter;
    equals(point, { x: 10, y: 15 });
});

test('rect1.intersects(rect2)', function() {
    var rect1 = new Rectangle(160, 270, 20, 20);
    var rect2 = new Rectangle(195, 301, 19, 19);
    equals(function() {
        return rect1.intersects(rect2);
    }, false);
    rect1 = new Rectangle(160, 270, 20, 20);
    rect2 = new Rectangle(170.5, 280.5, 19, 19);
    equals(function() {
        return rect1.intersects(rect2);
    }, true);
});

test('rect1.contains(rect2)', function() {
    var rect1 = new Rectangle(160, 270, 20, 20);
    var rect2 = new Rectangle(195, 301, 19, 19);
    equals(function() {
        return rect1.contains(rect2);
    }, false);
    rect1 = new Rectangle(160, 270, 20, 20);
    rect2 = new Rectangle(170.5, 280.5, 19, 19);
    equals(function() {
        return rect1.contains(rect2);
    }, false);

    rect1 = new Rectangle(299, 161, 137, 129);
    rect2 = new Rectangle(340, 197, 61, 61);
    equals(function() {
        return rect1.contains(rect2);
    }, true);
    equals(function() {
        return rect2.contains(rect1);
    }, false);
});

test('rect.contains(point)', function() {
    var rect = new Rectangle(160, 270, 20, 20);
    var point = new Point(166, 280);
    equals(function() {
        return rect.contains(point);
    }, true);
    var point = new Point(30, 30);
    equals(function() {
        return rect.contains(point);
    }, false);
});

test('rect1.intersect(rect2)', function() {
    var rect1 = new Rectangle(160, 270, 20, 20);
    var rect2 = new Rectangle(170.5, 280.5, 19, 19);
    var intersected = rect1.intersect(rect2);
    equals(function() {
        return intersected.equals(new Rectangle(170.5, 280.5, 9.5, 9.5));
    }, true);
});

test('rect1.unite(rect2)', function() {
    var rect1 = new Rectangle(160, 270, 20, 20);
    var rect2 = new Rectangle(170.5, 280.5, 19, 19);
    var united = rect1.unite(rect2);
    equals(function() {
        return united.equals(new Rectangle(160, 270, 29.5, 29.5));
    }, true);
});

test('rect.include(point)', function() {
    var rect1 = new Rectangle(95, 151, 20, 20);
    var included = rect1.include([50, 50]);
    equals(function() {
        return included.equals(new Rectangle(50, 50, 65, 121));
    }, true);
});

test('rect.toString()', function() {
    var string = new Rectangle(10, 20, 30, 40).toString();
    equals(string, '{ x: 10, y: 20, width: 30, height: 40 }');
});
