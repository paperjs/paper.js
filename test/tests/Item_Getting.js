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

module('Getting and Matching Items');

test('Item#getItems()', function() {
    var group = new Group([new Path({ selected: true }), new Raster()]);
    equals(function() {
        return group.getItems({
            type: 'path'
        }).length;
    }, 1);

    equals(function() {
        return group.getItems({
            selected: true
        }).length;
    }, 1);
});

test('Item#matches()', function() {
    var path = new Path();
    equals(function() {
        return path.matches({
            visible: false
        });
    }, false);

    equals(function() {
        return path.matches({
            visible: true
        });
    }, true);
});

test('Project#getItems()', function() {
    var layer = new Layer();

    var matches = paper.project.getItems({
        type: 'layer'
    });
    equals(function() {
        return matches.length == 1 && matches[0] == layer;
    }, true);

    var matches = paper.project.getItems({
        class: Item
    });
    equals(function() {
        return matches.length == 1 && matches[0] == layer;
    }, true);

    var path = new Path();
    var matches = paper.project.getItems({
        type: 'path'
    });
    equals(function() {
        return matches.length == 1 && matches[0] == path;
    }, true);

    var matches = paper.project.getItems({
        constructor: Path
    });
    equals(function() {
        return matches.length == 1 && matches[0] === path;
    }, true);

    var group = new Group();
    var matches = paper.project.getItems({
        type: 'group'
    });
    equals(function() {
        return matches.length == 1 && matches[0] === group
    }, true);

    var raster = new Raster();
    var matches = paper.project.getItems({
        type: 'raster'
    });
    equals(function() {
        return matches.length == 1 && matches[0] === raster
    }, true);

    equals(function() {
        return paper.project.getItems({
            selected: true
        }).length;
    }, 0);

    raster.selected = true;
    equals(function() {
        return paper.project.getItems({
            selected: true
        }).length;
    }, 2);

    raster.selected = true;
    equals(function() {
        return paper.project.getItems({
            selected: true,
            type: 'raster'
        }).length;
    }, 1);
});

test('Project#getItems() with compare function', function() {
    var firstPath = new Path();
    var path = new Path({
        opacity: 0.5
    });

    var items = paper.project.getItems({
        opacity: function(value) {
            return value < 1
        }
    });
    equals(function() {
        return items.length == 1 && items[0] == path;
    }, true);
});

test('Project#getItems() with specific property value', function() {
    var path = new Path();
    var decoyPath = new Path({
        opacity: 0.5
    });

    var items = paper.project.getItems({
        opacity: 1,
        type: 'path'
    });
    equals(function() {
        return items.length == 1 && items[0] == path;
    }, true);
});

test('Project#getItems() with color', function() {
    var path = new Path({
        fillColor: 'red'
    });

    var decoyPath = new Path({
        fillColor: 'black'
    });

    var items = paper.project.getItems({
        fillColor: 'red',
        type: 'path'
    });
    equals(function() {
        return items.length == 1 && items[0] == path;
    }, true);
});

test('Project#getItems() with regex function', function() {
    var decoyPath = new Path({
        name: 'stop'
    });

    var decoyPath2 = new Path({
        name: 'pause'
    });

    var path = new Path({
        name: 'starting'
    });

    var items = paper.project.getItems({
        name: /^start/g
    });
    equals(function() {
        return items.length == 1 && items[0] == path;
    }, true);

    equals(function() {
        var items = paper.project.getItems({
            name: /^st/g
        });
        return items.length == 2;
    }, true);
});
