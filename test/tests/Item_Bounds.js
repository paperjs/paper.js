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

module('Item Bounds');

test('item.bounds caching', function() {
    var circle = new Path.Circle(new Point(100, 100), 50);
    var rectangle = new Path.Rectangle(new Point(75, 75), new Point(175, 175));
    var group = new Group([circle, rectangle]);
    equals(group.bounds, new Rectangle(50, 50, 125, 125), 'group.bounds');
    rectangle.remove();
    equals(function() {
        return group.children.length;
    }, 1);
    equals(group.bounds, new Rectangle(50, 50, 100, 100), 'group.bounds without rectangle');
    group.addChild(rectangle);
    equals(function() {
        return group.children.length;
    }, 2);
    equals(group.bounds, new Rectangle(50, 50, 125, 125), 'group.bounds with rectangle');
    circle.remove();
    equals(function() {
        return group.children.length;
    }, 1);
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds without circle');
    group.addChild(circle);
    equals(function() {
        return group.children.length;
    }, 2);
    equals(group.bounds, new Rectangle(50, 50, 125, 125), 'group.bounds with circle');
});

test('group.bounds when group contains empty group', function() {
    var group = new Group();
    var rectangle = new Path.Rectangle(new Point(75, 75), new Point(175, 175));
    group.addChild(rectangle);
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds without empty group');
    group.addChild(new Group());
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds with empty group');
});

test('group.bounds and position after children were modified', function() {
    var group = new Group();
    var rectangle = new Path.Rectangle(new Point(100, 100), new Point(200, 200));
    group.addChild(rectangle);
    equals(group.bounds, new Rectangle(100, 100, 100, 100), 'group.bounds before change');
    equals(group.position, new Point(150, 150), 'group.position before change');
    rectangle.firstSegment.point = [0, 0];
    equals(group.bounds, new Rectangle(0, 0, 200, 200), 'group.bounds after change');
    equals(group.position, new Point(100, 100), 'group.position after change');
});

test('group.bounds when containing empty path first', function() {
    var group = new Group();
    var path = new Path();
    group.addChild(path);
    equals(group.bounds, new Rectangle(0, 0, 0, 0), 'group.bounds with empty path');
    path.moveTo([75, 75]);
    path.lineTo([175, 175]);
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds after adding segments to path');
});

test('path.bounds when contained in a transformed group', function() {
    var path = new Path([10, 10], [60, 60]);
    var group = new Group([path]);
    equals(path.bounds, new Rectangle(10, 10, 50, 50), 'path.bounds before group translation');
    group.translate(100, 100);
    equals(path.bounds, new Rectangle(110, 110, 50, 50), 'path.bounds after group translation');
});

test('text.bounds', function() {
    var text = new PointText(new Point(50, 100));
    text.fillColor = 'black';
    text.content = 'This is a test';
    equals(text.bounds, new Rectangle(50, 89.2, 67, 14.4), 'text.bounds', { tolerance: 0.5 });
});
