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

QUnit.module('Group');

test('new Group()', function() {
    var group = new Group();
    equals(function() {
        return paper.project.activeLayer.children[0] == group;
    }, true);
});

test('new Group([])', function() {
    var group = new Group([]);
    equals(function() {
        return paper.project.activeLayer.children[0] == group;
    }, true);
    equals(function() {
        return group.children.length;
    }, 0);
});

test('new Group([item])', function() {
    var path = new Path();
    var group = new Group([path]);
    equals(function() {
        return paper.project.activeLayer.children.length;
    }, 1);
    equals(function() {
        return group.children[0] == path;
    }, true);
});

test('new Group({children:[item]})', function() {
    var path = new Path();
    var group = new Group({
        children: [path]
    });
    equals(function() {
        return paper.project.activeLayer.children.length;
    }, 1);
    equals(function() {
        return group.children[0] == path;
    }, true);
});

test('Group bounds', function() {
    paper.project.currentStyle = {
        strokeWidth: 5,
        strokeColor: 'black'
    };

    var path = new Path.Circle([150, 150], 60);
    var secondPath = new Path.Circle([175, 175], 85);
    var group = new Group([path, secondPath]);
    equals(group.bounds, new Rectangle(90, 90, 170, 170), 'group.bounds');
    equals(group.strokeBounds, new Rectangle(87.5, 87.5, 175, 175), 'group.strokeBounds');

    group.rotate(20);
    equals(group.bounds, new Rectangle(89.97687, 82.94085, 170.04627, 177.08228), 'rotated group.bounds');
    equals(group.strokeBounds, new Rectangle(87.47687, 80.44085, 175.04627, 182.08228), 'rotated group.strokeBounds');
    group.rotate(20, new Point(50, 50));
    equals(group.bounds, new Rectangle(39.70708, 114.9919, 170.00396, 180.22418), 'rotated group.bounds');
    equals(group.strokeBounds, new Rectangle(37.20708, 112.4919, 175.00396, 185.22418), 'rotated group.strokeBounds');
});

test('group.addChildren(otherGroup.children)', function() {
    var group = new Group();
    group.addChild(new Path());
    group.addChild(new Path());
    equals(function() {
        return group.children.length;
    }, 2);

    var secondGroup = new Group();
    secondGroup.addChildren(group.children);
    equals(function() {
        return secondGroup.children.length;
    }, 2);
    equals(function() {
        return group.children.length;
    }, 0);
});

test('group.insertChildren(0, otherGroup.children)', function() {
    var group = new Group();
    group.addChild(new Path());
    group.addChild(new Path());
    equals(function() {
        return group.children.length;
    }, 2);

    var secondGroup = new Group();
    secondGroup.insertChildren(0, group.children);
    equals(function() {
        return secondGroup.children.length;
    }, 2);
    equals(function() {
        return group.children.length;
    }, 0);
});
