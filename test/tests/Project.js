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

QUnit.module('Project');

test('activate()', function() {
    var project = new Project();
    var secondDoc = new Project();
    project.activate();
    var path = new Path();
    equals(function() {
        return project.activeLayer.children[0] == path;
    }, true);
    equals(function() {
        return secondDoc.activeLayer.children.length == 0;
    }, true);
});

test('clear()', function() {
    var project = new Project();
    new Layer();
    new Layer();
    new Layer();
    equals(project.layers.length, 3);
    project.clear();
    equals(project.layers.length, 0);
});

test('Removed selected items are released from the selection (#1856)', function() {
    var project = new Project();
    var path = new Path.Circle({ center: [50, 50], radius: 20 });
    var child = new Path.Rectangle({ point: [0, 0], size: [10, 10] });
    var group = new Group([child]);
    var layer = new Layer([new Path.Line([0, 0], [10, 10])]);
    path.selected = true;
    child.segments[0].selected = true;
    layer.firstChild.fullySelected = true;
    equals(project.selectedItems.length, 3);
    path.remove();
    group.remove();
    layer.remove();
    equals(project.selectedItems.length, 0);
    // There is no public API that exposes the removed items, so check the
    // internal selection registry that keeps them from being collected:
    equals(Object.keys(project._selectionItems).length, 0);
    equals(project._selectionCount, 0);
});

test('Reinserted selected items are added to the selection again', function() {
    var project = new Project();
    var path = new Path.Circle({ center: [50, 50], radius: 20 });
    var child = new Path.Rectangle({ point: [0, 0], size: [10, 10] });
    var group = new Group([child]);
    path.selected = true;
    child.selected = true;
    path.remove();
    group.remove();
    project.activeLayer.addChildren([path, group]);
    equals(function() {
        return project.selectedItems.length === 2
                && project.selectedItems.indexOf(path) !== -1
                && project.selectedItems.indexOf(child) !== -1;
    }, true);
    equals(project._selectionCount, 2);
});

test('Selected items are only added to the selection once inserted', function() {
    var project = new Project();
    var path = new Path.Circle({
        center: [50, 50],
        radius: 20,
        selected: true,
        insert: false
    });
    var group = new Group({ insert: false });
    group.addChild(path);
    equals(path.selected, true);
    equals(Object.keys(project._selectionItems).length, 0);
    project.activeLayer.addChild(group);
    equals(function() {
        return project.selectedItems.length === 1
                && project.selectedItems[0] === path;
    }, true);
    equals(project._selectionCount, 1);
});

test('trackChanges / takeChanges()', function() {
    var project = new Project();
    var path = new Path.Circle([50, 50], 20);
    var removed = new Path.Rectangle([0, 0], [10, 10]);
    equals(project.takeChanges(), null);
    project.trackChanges = true;
    path.fillColor = 'red';
    path.position.x += 10;
    removed.remove();
    var inserted = new Path();
    var changes = project.takeChanges();
    function getFlags(item) {
        for (var i = 0; i < changes.length; i++) {
            if (changes[i].item === item)
                return changes[i].flags;
        }
        return 0;
    }
    equals(changes.length, 4); // Including the layer's children.
    equals(!!(getFlags(path) & ChangeFlag.STYLE), true);
    equals(!!(getFlags(path) & ChangeFlag.GEOMETRY), true);
    equals(!!(getFlags(removed) & ChangeFlag.INSERTION), true);
    equals(!!(getFlags(inserted) & ChangeFlag.INSERTION), true);
    equals(!!(getFlags(project.activeLayer) & ChangeFlag.CHILDREN), true);
    equals(project.takeChanges().length, 0);
    project.trackChanges = false;
    path.rotate(10);
    equals(project.takeChanges(), null);
});

test('trackChanges logs removed layers', function() {
    var project = new Project();
    var layer = new Layer();
    project.trackChanges = true;
    layer.remove();
    var changes = project.takeChanges();
    equals(changes.length, 1);
    equals(changes[0].item, layer);
    equals(!!(changes[0].flags & ChangeFlag.INSERTION), true);
});

test('trackChanges ignores items that are not inserted', function() {
    var project = new Project();
    var path1 = new Path.Rectangle([0, 0], [20, 20]);
    var path2 = new Path.Rectangle([10, 10], [20, 20]);
    var detached = new Path({ insert: false });
    project.trackChanges = true;
    detached.add([10, 10]);
    equals(project.takeChanges().length, 0);
    // Only the result is logged, not the temporary paths:
    var result = path1.unite(path2);
    var changes = project.takeChanges();
    equals(changes.length, 2);
    equals(changes[0].item === result || changes[1].item === result, true);
});

test('project.scope, view.scope, item.scope and tool.scope (#1634)', function() {
    var path = new Path(),
        tool = new Tool();
    equals(function() {
        return project.scope === paper && view.scope === paper
                && path.scope === paper && tool.scope === paper;
    }, true);
    tool.remove();
});

test('project.bounds', function() {
    var project = paper.project;
    view.matrix = new Matrix();
    equals(project.bounds, view.bounds, 'the view\'s bounds');
    // Setting them fits the view, which is 100x100, to the rectangle:
    project.bounds = new Rectangle(0, 0, 200, 100);
    equals(view.bounds, new Rectangle(0, -50, 200, 200), 'view.bounds');
    equals(project.bounds, view.bounds, 'set');
    view.matrix = new Matrix();
});
