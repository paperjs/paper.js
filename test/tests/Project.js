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

test('Item#scope, Project#scope, View#project, View#scope (#1634)', function() {
    var current = paper,
        scope = new PaperScope().setup(new Size(10, 10)),
        item = new Path(),
        project = scope.project,
        view = scope.view;
    current.activate();
    equals(function() {
        return item.project === project && item.view === view;
    }, true);
    equals(function() {
        return item.scope === scope;
    }, true);
    equals(function() {
        return project.scope === scope;
    }, true);
    equals(function() {
        return view.project === project;
    }, true);
    equals(function() {
        return view.scope === scope;
    }, true);
    // The default scope is a different one:
    equals(function() {
        return new Path().scope === current && current !== scope;
    }, true);
    scope.remove();
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
