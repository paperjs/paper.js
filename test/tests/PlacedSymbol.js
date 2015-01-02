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

module('Symbol & Placed Symbol');

test('placedSymbol bounds', function() {
    var path = new Path.Circle([50, 50], 50);
    path.strokeColor = 'black';
    path.strokeWidth = 1;
    path.strokeCap = 'round';
    path.strokeJoin = 'round';
    equals(path.strokeBounds,
        new Rectangle(-0.5, -0.5, 101, 101),
        'Path initial bounds');
    var symbol = new Symbol(path);
    var placedSymbol = new PlacedSymbol(symbol);

    equals(placedSymbol.bounds,
        new Rectangle(-50.5, -50.5, 101, 101),
        'PlacedSymbol initial bounds');

    placedSymbol.scale(1, 0.5);
    equals(placedSymbol.bounds,
        new Rectangle(-50.5, -25.25, 101, 50.5),
        'Bounds after scale');

    placedSymbol.rotate(40);
    equals(placedSymbol.bounds,
        new Rectangle(-41.96283, -37.79252, 83.92567, 75.58503),
        'Bounds after rotation');
});

test('bounds of group of symbol instances', function() {
    var path = new Path.Circle(new Point(), 10);
    var symbol = new Symbol(path);
    var instances = [];
    for (var i = 0; i < 10; i++) {
        var instance = symbol.place(new Point(i * 20, 20));
        instances.push(instance);
    }
    var group = new Group(instances);
    equals(group.bounds,
        new Rectangle(-10, 10, 200, 20),
        'Group bounds');
});

test('bounds of a symbol that contains a group of items', function() {
    var path = new Path.Circle(new Point(), 10);
    var path2 = path.clone();
    path2.position.x += 20;
    equals(path.bounds,
        new Rectangle(-10, -10, 20, 20),
        'path bounds');
    equals(path2.bounds,
        new Rectangle(10, -10, 20, 20),
        'path2 bounds');
    var group = new Group(path, path2);
    equals(group.bounds,
        new Rectangle(-10, -10, 40, 20),
        'Group bounds');
    var symbol = new Symbol(group);
    var instance = symbol.place(new Point(50, 50));
    equals(instance.bounds,
        new Rectangle(30, 40, 40, 20),
        'Instance bounds');
});

test('Changing the definition of a symbol should change the bounds of all instances of it.', function() {
    var path = new Path.Circle(new Point(), 10);
    var path2 = new Path.Circle(new Point(), 20);
    var symbol = new Symbol(path);
    var instance = symbol.place(new Point(0, 0));
    equals(instance.bounds,
        new Rectangle(-10, -10, 20, 20),
        'Initial bounds');
    symbol.definition = path2;
    equals(instance.bounds,
        new Rectangle(-20, -20, 40, 40),
        'Bounds after changing symbol definition');
    symbol.definition.scale(0.5, 0.5);
    equals(instance.bounds,
        new Rectangle(-10, -10, 20, 20),
        'Bounds after modifying symbol definition');
});

test('Symbol definition selection', function() {
    var path = new Path.Circle([50, 50], 50);
    path.selected = true;
    var symbol = new Symbol(path);
    equals(function() {
        return symbol.definition.selected == false;
    }, true);
    equals(function() {
        return paper.project.selectedItems.length == 0;
    }, true);
});

test('Symbol#place()', function() {
    var path = new Path.Circle([50, 50], 50);
    var symbol = new Symbol(path);
    var placedSymbol = symbol.place();
    equals(function() {
        return placedSymbol.parent == paper.project.activeLayer;
    }, true);

    equals(function() {
        return placedSymbol.symbol == symbol;
    }, true);

    equals(function() {
        return placedSymbol.position.toString();
    }, '{ x: 0, y: 0 }');
});

test('Symbol#place(position)', function() {
    var path = new Path.Circle([50, 50], 50);
    var symbol = new Symbol(path);
    var placedSymbol = symbol.place(new Point(100, 100));
    equals(function() {
        return placedSymbol.position.toString();
    }, '{ x: 100, y: 100 }');
});
