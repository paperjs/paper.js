/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

QUnit.module('Rectangle');

test('new Rectangle(Point, Size);', function() {
    var rect = new Rectangle(new Point(10, 20), new Size(30, 40));
    equals(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle({ point, size });', function() {
    var rect = new Rectangle({ point: [10, 20], size: [30, 40] });
    equals(rect, { x: 10, y: 20, width: 30, height: 40 });
    var rect = new Rectangle({ point: new Point(10, 20), size: new Size(30, 40)});
    equals(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle(Array, Array);', function() {
    var rect = new Rectangle([10, 20], [30, 40]);
    equals(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle(Point, Point);', function() {
    var rect = new Rectangle(new Point(10, 20), new Point(30, 40));
    equals(rect, { x: 10, y: 20, width: 20, height: 20 });
});

test('new Rectangle({ from, to });', function() {
    var rect = new Rectangle({from: [10, 20], to: [30, 40]});
    equals(rect, { x: 10, y: 20, width: 20, height: 20 });
});

test('new Rectangle(x, y, width, height);', function() {
    var rect = new Rectangle(10, 20, 30, 40);
    equals(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle({ x, y, width, height });', function() {
    var rect = new Rectangle({x: 10, y: 20, width: 30, height: 40});
    equals(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle(object)', function() {
    equals(function() {
        return new Rectangle({
            center: [50, 100],
            size: [100, 200]
        });
    }, { x: 0, y: 0, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            topLeft: [100, 50],
            size: [100, 200]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            size: [100, 200],
            topLeft: [100, 50]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            topRight: [200, 50],
            size: [100, 200]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            size: [100, 200],
            topRight: [200, 50]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            bottomRight: [200, 250],
            size: [100, 200]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            size: [100, 200],
            bottomRight: [200, 250]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            bottomLeft: [100, 250],
            size: [100, 200]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            size: [100, 200],
            bottomLeft: [100, 250]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            topRight: [200, 50],
            bottomLeft: [100, 250]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            topLeft: [100, 50],
            bottomRight: [200, 250]
        });
    }, { x: 100, y: 50, width: 100, height: 200 });

    equals(function() {
        return new Rectangle({
            top: 50,
            right: 200,
            bottom: 250,
            left: 100
        });
    }, { x: 100, y: 50, width: 100, height: 200 });
});

test('rect.size', function() {
    var rect = new Rectangle(10, 10, 20, 30);
    equals(function() {
        return rect.size.equals([20, 30]);
    }, true);
    rect.size = new Size(30, 40);
    equals(rect, { x: 10, y: 10, width: 30, height: 40 });
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
    var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
    var rect2 = { x: 195, y: 301, width: 19, height: 19 };
    equals(function() {
        return rect1.intersects(rect2);
    }, false);
    rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
    rect2 = { x: 170.5, y: 280.5, width: 19, height: 19 };
    equals(function() {
        return rect1.intersects(rect2);
    }, true);
});

test('rect1.contains(rect2)', function() {
    var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
    var rect2 = { x: 195, y: 301, width: 19, height: 19 };
    equals(function() {
        return rect1.contains(rect2);
    }, false);
    rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
    rect2 = new Rectangle({ x: 170.5, y: 280.5, width: 19, height: 19 });
    equals(function() {
        return rect1.contains(rect2);
    }, false);

    rect1 = new Rectangle({ x: 299, y: 161, width: 137, height: 129 });
    rect2 = new Rectangle({ x: 340, y: 197, width: 61, height: 61 });
    equals(function() {
        return rect1.contains(rect2);
    }, true);
    equals(function() {
        return rect2.contains(rect1);
    }, false);
});

test('rect.contains(point)', function() {
    var rect = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
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
    var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
    var rect2 = { x: 170.5, y: 280.5, width: 19, height: 19 };
    var intersected = rect1.intersect(rect2);
    equals(function() {
        return intersected.equals({ x: 170.5, y: 280.5, width: 9.5, height: 9.5 });
    }, true);
});

test('rect1.unite(rect2)', function() {
    var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
    var rect2 = { x: 170.5, y: 280.5, width: 19, height: 19 };
    var united = rect1.unite(rect2);
    equals(function() {
        return united.equals({ x: 160, y: 270, width: 29.5, height: 29.5 });
    }, true);
});

test('rect.include(point)', function() {
    var rect1 = new Rectangle({ x: 95, y: 151, width: 20, height: 20 });
    var included = rect1.include([50, 50]);
    equals(function() {
        return included.equals({ x: 50, y: 50, width: 65, height: 121 });
    }, true);
});

test('rect.toString()', function() {
    var string = new Rectangle(10, 20, 30, 40).toString();
    equals(string, '{ x: 10, y: 20, width: 30, height: 40 }');
});
