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

QUnit.module('Layer');

test('#previousSibling / #nextSibling', function() {
    var project = paper.project;
    var firstLayer = project.activeLayer;
    var secondLayer = new Layer();
    equals(function() {
        return secondLayer.previousSibling == firstLayer;
    }, true);
    equals(function() {
        return secondLayer.nextSibling == null;
    }, true);

    // Move another layer into secondLayer and check nextSibling /
    // previousSibling:
    var path = new Path();
    var thirdLayer = new Layer();
    secondLayer.insertChild(0, thirdLayer);
    equals(function() {
        return secondLayer.children.length;
    }, 2);
    equals(function() {
        return thirdLayer.nextSibling === path;
    }, true);
    secondLayer.addChild(thirdLayer);
    equals(function() {
        return thirdLayer.nextSibling;
    }, null);
    equals(function() {
        return thirdLayer.previousSibling === path;
    }, true);
    equals(function() {
        return project.layers.length;
    }, 2);

    firstLayer.addChild(secondLayer);
    equals(function() {
        return project.layers.length;
    }, 1);
});

test('#insertAbove() / #insertBelow()', function() {
    var project = paper.project;
    var firstLayer = project.activeLayer;
    firstLayer.name = 'first';
    var secondLayer = new Layer();
    secondLayer.name = 'second';
    var thirdLayer = new Layer();
    thirdLayer.name = 'third';

    thirdLayer.insertBelow(firstLayer);
    equals(function() {
        return thirdLayer.previousSibling == null;
    }, true);
    equals(function() {
        return thirdLayer.nextSibling == firstLayer;
    }, true);

    secondLayer.insertBelow(firstLayer);
    equals(function() {
        return secondLayer.previousSibling == thirdLayer;
    }, true);
    equals(function() {
        return secondLayer.nextSibling == firstLayer;
    }, true);

    var path = new Path();
    firstLayer.addChild(path);

    // move the layer above the path, inside the firstLayer.
    // 'Above' means visually appearing on top, thus with a larger index.
    secondLayer.insertAbove(path);
    equals(function() {
        return path.nextSibling == secondLayer;
    }, true);
    equals(function() {
        return secondLayer.parent == firstLayer;
    }, true);
    // There should now only be two layers left:
    equals(function() {
        return project.layers.length;
    }, 2);
});

test('#addChild() / #insertBelow() with nesting', function() {
    var project = paper.project;
    var firstLayer = project.activeLayer;
    var secondLayer = new Layer();
    // There should be two layers now in project.layers
    equals(function() {
        return project.layers.length;
    }, 2);
    firstLayer.addChild(secondLayer);
    equals(function() {
        return secondLayer.parent == firstLayer;
    }, true);
    // There should only be the firsLayer now in project.layers
    equals(function() {
        return project.layers.length;
    }, 1);
    equals(function() {
        return project.layers[0] == firstLayer;
    }, true);
    // Now move secondLayer bellow the first again, in which case it should
    // reappear in project.layers
    secondLayer.insertBelow(firstLayer);
    // There should be two layers now in project.layers again now
    equals(function() {
        return project.layers.length;
    }, 2);
    equals(function() {
        return project.layers[0] == secondLayer
            && project.layers[1] == firstLayer;
    }, true);
});

test('#remove() with named layers', function(){
    var name = 'my layer';
    var layer1 = new Layer({name: name });
    var layer2 = new Layer({name: name });
    var removeCount = 0;
    while (project.layers[name]) {
        project.layers[name].remove();
        if (++removeCount > 2)
            break;
    }
    equals(removeCount, 2,
            'project.layers[name].remove(); should be called twice');
});

test('#bounds with nested empty items', function() {
    var item = new Path.Rectangle(new Point(10,10), new Size(10));
    new Group(new Group());
    equals(item.bounds, project.activeLayer.bounds);
});
