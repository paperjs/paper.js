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

QUnit.module('Getting and Matching Items');

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
        class: Layer
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
        class: Path
    });
    equals(function() {
        return matches.length == 1 && matches[0] == path;
    }, true);

    var group = new Group();
    var matches = paper.project.getItems({
        className: 'Group'
    });
    equals(function() {
        return matches.length == 1 && matches[0] === group;
    }, true);

    var matches = paper.project.getItems({
        type: 'group'
    });
    equals(function() {
        return matches.length == 1 && matches[0] === group;
    }, true);

    var raster = new Raster();
    var matches = paper.project.getItems({
        class: Raster
    });
    equals(function() {
        return matches.length == 1 && matches[0] === raster;
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
            class: Raster
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
            return value < 1;
        }
    });
    equals(function() {
        return items.length == 1 && items[0] == path;
    }, true);
});

test('Project#getItems() with a match function', function() {
    var path = new Path(),
        group = new Group([new Path.Circle([50, 50], 10)]),
        circle = group.firstChild;

    function isPath(item) {
        return item instanceof Path;
    }

    // Functions match recursively, as the match option does:
    var items = paper.project.getItems(isPath);
    equals(function() {
        return items.length == 2 && items[0] == path && items[1] == circle;
    }, true);
    equals(function() {
        return paper.project.getItems({ match: isPath }).length;
    }, 2);
    items = paper.project.activeLayer.getItems(isPath);
    equals(function() {
        return items.length == 2 && items[0] == path && items[1] == circle;
    }, true);
    equals(function() {
        return paper.project.getItem(isPath) == path;
    }, true);
    // Without options, all items match: the layer, path, group and circle.
    equals(function() {
        return paper.project.getItems().length;
    }, 4);
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
    var layer = paper.project.activeLayer;
    var stopPath = new Path({
        name: 'stop'
    });

    var pausePath = new Path({
        name: 'pause'
    });

    var startPath = new Path({
        name: 'starting'
    });

    var items = paper.project.getItems({
        name: /^start/g
    });

    // console.log(paper.project.activeLayer);
    equals(function() {
        return items.length == 1 && items[0] == startPath;
    }, true);

    equals(function() {
        var items = paper.project.getItems({
            name: /^st/g
        });
        return items.length == 2;
    }, true);
});

test('Project#getItems() empty: true', function() {
    var layer = new Layer();
    var empty1 = new Path();
    var empty2 = new Path();

    equals(function() {
        return layer.children.length;
    }, 2);

    equals(function() {
        return paper.project.getItems({
            empty: true
        }).length;
    }, 2);
});

test('Project#getItems() overlapping', function() {
    var path = new Path.Circle({
        radius: 100,
        center: [200, 200],
        fillColor: 'red'
    });

    equals(function() {
        var matches = project.getItems({
            class: Path,
            overlapping: [0, 0, 400, 400]
        });
        return matches.length == 1 && matches[0] == path;
    }, true);

    equals(function() {
        var matches = project.getItems({
            class: Path,
            overlapping: [200, 0, 400, 400]
        });
        return matches.length == 1 && matches[0] == path;
    }, true);

    equals(function() {
        var matches = project.getItems({
            class: Path,
            overlapping: [400, 0, 400, 400]
        });
        return matches.length == 0;
    }, true);
});

test('Project#getItems() inside', function() {
    var path = new Path.Circle({
        radius: 100,
        center: [200, 200],
        fillColor: 'red'
    });

    equals(function() {
        var matches = project.getItems({
            class: Path,
            inside: [0, 0, 400, 400]
        });
        return matches.length == 1 && matches[0] == path;
    }, true);

    equals(function() {
        var matches = project.getItems({
            class: Path,
            inside: [200, 0, 400, 400]
        });
        return matches.length == 0;
    }, true);
});

test('Project#getItems() overlapping and inside with Shape, Raster and PointText (#1300)', function() {
    // The reported case:
    var shape = new Shape.Rectangle({
        point: [20, 20],
        size: [10, 10],
        fillColor: 'pink'
    });
    equals(function() {
        var matches = project.getItems({
            class: Shape,
            overlapping: [0, 0, 21, 21]
        });
        return matches.length == 1 && matches[0] == shape;
    }, true);
    shape.remove();

    // Each item is tested along with a path of the same geometry, which needs
    // to give the same results. `edge` names a point on the item's outline in
    // its internal bounds, `isCornerFilled` whether the item fills their
    // corners.
    var entries = [
        {
            create: function() {
                return new Shape.Rectangle({ center: [0, 0], size: [100, 50] });
            },
            edge: 'topLeft',
            isCornerFilled: true
        },
        {
            create: function() {
                return new Shape.Circle({ center: [0, 0], radius: 50 });
            },
            createPath: function() {
                return new Path.Circle({ center: [0, 0], radius: 50 });
            },
            edge: 'leftCenter',
            isCornerFilled: false
        },
        {
            create: function() {
                return new Raster({ size: [100, 50] });
            },
            edge: 'topLeft',
            isCornerFilled: true
        },
        {
            create: function() {
                return new PointText({ content: 'Hello', fontSize: 40 });
            },
            edge: 'topLeft',
            isCornerFilled: true
        }
    ];

    var transforms = {
        'untransformed': function(item) {
        },
        'translated': function(item) {
            item.translate(200, 100);
        },
        'rotated': function(item) {
            item.rotate(45, [0, 0]);
            item.translate(200, 100);
        },
        'in transformed group': function(item) {
            item.translate(30, 20);
            var group = new Group({ applyMatrix: false, children: [item] });
            group.scale(2, [0, 0]);
            group.rotate(30, [0, 0]);
            group.translate(200, 100);
        }
    };

    function isFound(item, option, rect) {
        var options = {
            match: function(match) {
                return match === item;
            }
        };
        options[option] = rect;
        return project.getItems(options).length === 1;
    }

    entries.forEach(function(entry) {
        Base.each(transforms, function(transform, name) {
            var item = entry.create(),
                rect = item.internalBounds,
                path = entry.createPath
                    ? entry.createPath()
                    : new Path.Rectangle(rect),
                isRotated = name === 'rotated'
                    || name === 'in transformed group';
            transform(item);
            // Place the path the same way as the item:
            item.parent.addChild(path);
            path.transform(item.matrix);
            // The global bounding box of the item's internal bounds:
            var bounds = new Rectangle(item.localToGlobal(rect.topLeft),
                        item.localToGlobal(rect.bottomRight))
                    .include(item.localToGlobal(rect.topRight))
                    .include(item.localToGlobal(rect.bottomLeft)),
                edge = item.localToGlobal(rect[entry.edge]),
                // Each case: rect, overlapping, inside
                cases = {
                    // Partially overlapping across the outline:
                    'edge': [new Rectangle(edge.subtract(5), new Size(10, 10)),
                        true, false],
                    // Across the corner of the bounding box, not fully inside
                    // it, as that always counts as overlapping:
                    'corner': [new Rectangle(bounds.topLeft.subtract(3),
                        new Size(6, 6)),
                        entry.isCornerFilled && !isRotated, false],
                    'around': [bounds.expand(20), true, true],
                    'far': [new Rectangle(bounds.bottomRight.add(100),
                        new Size(10, 10)), false, false]
                };
            Base.each(cases, function(values, key) {
                [item, path].forEach(function(target) {
                    var message = (item.type || item.className)
                            + (target === path ? ' path ' : ' ')
                            + name + ', ' + key;
                    equals(isFound(target, 'overlapping', values[0]),
                            values[1], message + ', overlapping');
                    equals(isFound(target, 'inside', values[0]),
                            values[2], message + ', inside');
                });
            });
            project.activeLayer.removeChildren();
        });
    });
});
