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

QUnit.module('Item Cloning');

function cloneAndCompare(item) {
    var copy = item.clone();
    equals(function() {
        return item.parent == copy.parent;
    }, true);
    equals(function() {
        // Cloned items appear above the original.
        return item.nextSibling == copy;
    }, true);
    if (item.name) {
        equals(function() {
            return copy.parent.children[copy.name] == copy;
        }, true);
    }
    equals(copy, item, 'item.clone()', { cloned: true });
    // Remove the cloned item to restore the document:
    copy.remove();
}

test('Path#clone()', function() {
    var path = new Path([10, 20], [30, 40]);
    path.closed = true;
    path.name = 'test';
    path.style = {
        strokeCap: 'round',
        strokeJoin: 'round',
        dashOffset: 10,
        dashArray: [10, 2, 10],
        fillColor: new Color(0, 0, 1),
        strokeColor: new Color(0, 0, 1),
        miterLimit: 5
    };
    path.clockwise = false;
    path.opacity = 0.5;
    path.locked = true;
    path.visible = false;
    path.blendMode = 'multiply';
    path.clipMask = true;
    path.selected = true;
    cloneAndCompare(path);
});

test('Path#clone() with gradient Color', function() {
    var colors = ['red', 'green', 'black'];
    var gradient = new Gradient(colors, true);
    var color = new Color(gradient, [0, 0], [20, 20], [10, 10]);
    var path = new Path([10, 20], [30, 40]);
    path.fillColor = color;
    cloneAndCompare(path);
});

test('CompoundPath#clone()', function() {
    var path1 = new Path.Rectangle([200, 200], [100, 100]);
    var path2 = new Path.Rectangle([50, 50], [200, 200]);
    var compound = new CompoundPath(path1, path2);
    cloneAndCompare(compound);
});

test('Layer#clone()', function() {
    var path = new Path.Rectangle([200, 200], [100, 100]);
    cloneAndCompare(paper.project.activeLayer);
});

test('Layer#clone() - check activeLayer', function() {
    var project = paper.project,
        activeLayer = project.activeLayer,
        layer = activeLayer.clone();
    // The active layer should not change when cloning layers.
    equals(function() {
        return activeLayer == project.activeLayer;
    }, true);
});

test('Group#clone()', function() {
    var path = new Path.Circle([150, 150], 60);
    path.style = {
        strokeCap: 'round',
        strokeJoin: 'round',
        dashOffset: 10,
        dashArray: [10, 2, 10],
        fillColor: new Color(0, 0, 1),
        strokeColor: new Color(0, 0, 1),
        miterLimit: 5
    };
    var secondPath = new Path.Circle([175, 175], 85);
    var group = new Group([path, secondPath]);
    cloneAndCompare(group);
});

test('PointText#clone()', function() {
    var pointText = new PointText(new Point(50, 50));
    pointText.content = 'test';
    pointText.position = pointText.position.add(100);
    pointText.style = {
        fontFamily: 'serif',
        fontSize: 20
    };
    pointText.justification = 'center';
    cloneAndCompare(pointText);
});

test('SymbolItem#clone()', function() {
    var path = new Path.Circle([150, 150], 60);
    var definition = new SymbolDefinition(path);
    var item = new SymbolItem(definition);
    item.position = [100, 100];
    item.rotate(90);
    cloneAndCompare(item);
});

test('Symbol#clone()', function() {
    var path = new Path.Circle([150, 150], 60);
    path.style = {
        strokeCap: 'round',
        strokeJoin: 'round',
        dashOffset: 10,
        dashArray: [10, 2, 10],
        fillColor: new Color(0, 0, 1),
        strokeColor: new Color(0, 0, 1),
        miterLimit: 5
    };
    path.selected = true;
    var definition = new SymbolDefinition(path);
    var copy = definition.clone();
    equals(definition.item, copy.item, 'definition.item');
    equals(function() {
        return definition.project == copy.project;
    }, true);
});

test('Raster#clone()', function() {
    var path = new Path.Circle([150, 150], 60);
    path.style = {
        fillColor: new Color(0, 0, 1),
        strokeColor: new Color(0, 0, 1)
    };
    var raster = path.rasterize(72);
    raster.opacity = 0.5;
    raster.locked = true;
    raster.visible = false;
    raster.blendMode = 'multiply';
    raster.rotate(20).translate(100);
    cloneAndCompare(raster);
});

test('Group with clipmask', function() {
    var path = new Path.Circle([100, 100], 30),
        path2 = new Path.Circle([100, 100], 20),
        group = new Group([path, path2]);
    group.clipped = true;
    cloneAndCompare(group);
});

test('Item#clone() Hierarchy', function() {
    var path1 = new Path.Circle([150, 150], 60);
    var path2 = new Path.Circle([150, 150], 60);
    var clone = path1.clone();
    equals(function() {
        return path2.isAbove(path1);
    }, true);
    equals(function() {
        return clone.isAbove(path1);
    }, true);
    equals(function() {
        return clone.isBelow(path2);
    }, true);
});

test('Item#clone() and #applyMatrix (#1225)', function() {
    var group = new Group({
        applyMatrix: false,
        children: [
            new Shape.Rectangle({
                size: [100, 100],
                point: [100, 100],
                strokeColor: 'red',
            })
        ]
    });

    group.translate(300, 300);

    equals(function() {
        return group.clone().matrix.translation;
    }, new Point(300, 300));
});
