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
 * These tests are focused on user interactions.
 * They trigger events and check callbacks.
 * Warning: when running tests locally from `gulp test:browser` command, don't
 * move your mouse over the window because that could perturbate tests
 * execution.
 */
QUnit.module('Interactions');

//
// Mouse
//
test('Item#onMouseDown()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseDown = function(event) {
        equals(event.type, 'mousedown');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousedown', point);
});

test('Item#onMouseDown() with stroked item', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.strokeColor = 'red';
    var point = new Point(0, 0);
    item.onMouseDown = function(event) {
        equals(event.type, 'mousedown');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousedown', point);
});

test('Item#onMouseDown() is not triggered when item is not filled', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered when item is not visible', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.visible = false;
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered when item is locked', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.locked = true;
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered when another item is in front', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var item2 = item.clone();
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered if event target is document', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5), document);
    expect(0);
});

test('Item#onMouseMove()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseMove = function(event) {
        equals(event.type, 'mousemove');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousemove', point);
});

test('Item#onMouseMove() is not re-triggered if point is the same', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    var counter = 0;
    item.onMouseMove = function(event) {
        equals(true, true);
    };
    triggerMouseEvent('mousemove', point);
    triggerMouseEvent('mousemove', point);
    expect(1);
});

test('Item#onMouseUp()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseUp = function(event) {
        equals(event.type, 'mouseup');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(0, 0));
        done();
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
});

test('Item#onMouseUp() is only triggered after mouse down', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseUp = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mouseup', new Point(5, 5));
    expect(0);
});

test('Item#onClick()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onClick = function(event) {
        equals(event.type, 'click');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(0, 0));
        done();
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
});

test('Item#onClick() is not triggered if up point is not on item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(15, 15));
    expect(0);
});

test('Item#onClick() is not triggered if down point is not on item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(15, 15));
    triggerMouseEvent('mouseup', new Point(5, 5));
    expect(0);
});

test('Item#onDoubleClick()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onDoubleClick = function(event) {
        equals(event.type, 'doubleclick');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(0, 0));
        done();
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
});

test('Item#onDoubleClick() is not triggered if both clicks are not on same item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var item2 = item.clone().translate(5);
    item.onDoubleClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(5, 5));
    triggerMouseEvent('mousedown', new Point(6, 6));
    triggerMouseEvent('mouseup', new Point(6, 6));
    expect(0);
});

test('Item#onDoubleClick() is not triggered if time between both clicks is too long', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onDoubleClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
    setTimeout(function() {
        triggerMouseEvent('mousedown', point);
        triggerMouseEvent('mouseup', point);
        done();
    }, 301);
    expect(0);
});

test('Item#onMouseEnter()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseEnter = function(event) {
        equals(event.type, 'mouseenter');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousemove', point);
});

test('Item#onMouseEnter() is only re-triggered after mouse leave', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseEnter = function(event) {
        equals(true, true);
    };
    // enter
    triggerMouseEvent('mousemove', new Point(5, 5));
    triggerMouseEvent('mousemove', new Point(6, 6));
    triggerMouseEvent('mousemove', new Point(7, 7));
    // leave
    triggerMouseEvent('mousemove', new Point(11, 11));
    // re-enter
    triggerMouseEvent('mousemove', new Point(10, 10));
    expect(2);
});

test('Item#onMouseLeave()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point1 = new Point(5, 5);
    var point2 = new Point(15, 15);
    item.onMouseLeave = function(event) {
        equals(event.type, 'mouseleave');
        equals(event.point, point2);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousemove', point1);
    triggerMouseEvent('mousemove', point2);
});

test('Item#onMouseDrag()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point1 = new Point(5, 5);
    var point2 = new Point(15, 15);
    item.onMouseDrag = function(event) {
        equals(event.type, 'mousedrag');
        equals(event.point, point2);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(10, 10));
        done();
    };
    triggerMouseEvent('mousedown', point1);
    triggerMouseEvent('mousemove', point2);
});

test('Item#onMouseDrag() is not triggered after mouse up', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseDrag = function(event) {
        equals(true, true);
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mousemove', new Point(6, 6));
    triggerMouseEvent('mouseup', new Point(7, 7));
    triggerMouseEvent('mousemove', new Point(8, 8));
    expect(1);
});

test('Item#onMouseDrag() is not triggered if mouse down was on another item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var item2 = item.clone().translate(10);
    item2.onMouseDrag = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mousemove', new Point(11, 11));
    expect(0);
});
