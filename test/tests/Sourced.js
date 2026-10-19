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

QUnit.module('Sourced');

// The host document is played by another project, served through the source
// interface by item id. The source logs its calls, so tests can check what
// loading touched.
function createSource(document) {
    var source = {
        document: document,
        calls: [],

        getNode: function(key) {
            return document.getItem({ id: key });
        },

        getColumns: function(items) {
            var typeNames = [],
                columns = {
                    keys: new Float64Array(items.length),
                    types: new Uint8Array(items.length),
                    typeNames: typeNames,
                    flags: new Uint16Array(items.length),
                    boxes: new Float64Array(items.length * 12),
                    names: {},
                    matrices: {}
                };
            items.forEach(function(item, i) {
                var type = item.className,
                    index = typeNames.indexOf(type);
                if (index === -1)
                    index = typeNames.push(type) - 1;
                columns.keys[i] = item.id;
                columns.types[i] = index;
                // A container's own selection, not its children's:
                var selected = item.selected && !(item instanceof Group);
                columns.flags[i] = (selected ? 1 : 0)
                        | (item.visible ? 2 : 0) | (item.locked ? 4 : 0)
                        | (item.strokeScaling !== false ? 8 : 0)
                        | (item.clipMask ? 64 : 0) | (item.guide ? 128 : 0)
                        | (item.isEmpty(true) ? 256 : 0);
                [
                    {},
                    { stroke: true },
                    { stroke: true, handle: true }
                ].forEach(function(options, j) {
                    var rect = item.getBounds(Base.set({ internal: true },
                            options));
                    columns.boxes.set([rect.x, rect.y, rect.width,
                            rect.height], i * 12 + j * 4);
                });
                if (item.name)
                    columns.names[i] = item.name;
                if (!item.matrix.isIdentity())
                    columns.matrices[i] = item.matrix.values;
            });
            return columns;
        },

        getChildren: function(key) {
            source.calls.push(['getChildren', key]);
            return source.getColumns(key == null
                    ? document.layers
                    : source.getNode(key).children);
        },

        getItem: function(key) {
            source.calls.push(['getItem', key]);
            var json = source.getNode(key).exportJSON({ asString: false });
            // Selection comes through the flags, and the children of
            // containers through getChildren():
            delete json[1].selected;
            if (json[0] !== 'CompoundPath')
                delete json[1].children;
            return json;
        },

        getAncestorKeys: function(key) {
            source.calls.push(['getAncestorKeys', key]);
            var keys = [],
                node = source.getNode(key);
            while (node = node.parent || null)
                keys.unshift(node.id);
            return keys;
        },

        // Returns the calls made since the last call, and clears the log.
        takeCalls: function() {
            var calls = source.calls;
            source.calls = [];
            return calls;
        }
    };
    return source;
}

function createDocument() {
    var document = new Project();
    var layer = new Layer({ name: 'art' });
    new Path.Circle({
        center: [50, 50],
        radius: 20,
        fillColor: 'red',
        name: 'circle'
    });
    var group = new Group({ name: 'group' });
    group.addChild(new Path.Rectangle({
        point: [200, 200],
        size: [40, 20],
        strokeColor: 'blue',
        strokeWidth: 4
    }));
    group.addChild(new CompoundPath({
        children: [
            new Path.Rectangle([300, 300], [50, 50]),
            new Path.Rectangle([310, 310], [30, 30])
        ],
        fillColor: 'green',
        selected: true
    }));
    new Layer({ name: 'empty' });
    layer.activate();
    return document;
}

function createSourcedProject() {
    var source = createSource(createDocument());
    var project = new Project();
    project.source = source;
    return { project: project, source: source };
}

test('Setting the source loads only the layers', function() {
    var res = createSourcedProject();
    equals(res.project.layers.length, 2);
    equals(res.project.layers[0].name, 'art');
    equals(res.project.activeLayer === res.project.layers[0], true);
    equals(res.project.layers[0].key, res.source.document.layers[0].id);
    equals(res.source.takeCalls(), [['getChildren', null]]);
});

test('Containers load their children on first access', function() {
    var res = createSourcedProject();
    res.source.takeCalls();
    var layer = res.project.layers[0];
    equals(layer.children.length, 2);
    equals(layer.children['circle'].className, 'Path');
    equals(res.source.takeCalls(), [['getChildren', layer.key]]);
    // A second access doesn't load them again:
    equals(layer.children.length, 2);
    equals(res.source.takeCalls(), []);
});

test('Items load their content on first access', function() {
    var res = createSourcedProject();
    var original = res.source.document.getItem({ name: 'circle' });
    var circle = res.project.layers[0].children['circle'];
    res.source.takeCalls();
    equals(circle.segments.length, 4);
    equals(res.source.takeCalls(), [['getItem', circle.key]]);
    equals(circle.fillColor, original.fillColor);
    equals(circle.segments, original.segments);
    equals(res.source.takeCalls(), []);
});

test('A loaded project matches the source document', function() {
    var res = createSourcedProject();
    equals(res.project.exportJSON(), res.source.document.exportJSON());
});

test('Bounds come from the source without loading', function() {
    var res = createSourcedProject();
    var document = res.source.document;
    var layer = res.project.layers[0];
    var group = layer.children['group'];
    var path = group.children[0];
    res.source.takeCalls();
    equals(path.bounds, document.getItem({ id: path.key }).bounds);
    equals(path.strokeBounds, document.getItem({ id: path.key }).strokeBounds);
    equals(group.bounds, document.getItem({ name: 'group' }).bounds);
    equals(layer.bounds, document.layers[0].bounds);
    equals(res.source.takeCalls(), []);
});

test('Hit tests load only the items that are hit', function() {
    var res = createSourcedProject();
    var layer = res.project.layers[0];
    var group = layer.children['group'];
    var circle = layer.children['circle'];
    res.source.takeCalls();
    var result = res.project.hitTest([50, 50]);
    equals(result && result.item === circle, true);
    // The group is rejected by its bounds, without loading its children:
    equals(res.source.takeCalls(), [['getItem', circle.key]]);
    equals(group.hasOwnProperty('_children'), false);
});

test('getItemByKey() loads only the ancestors\' children', function() {
    var res = createSourcedProject();
    var original = res.source.document.getItem({ class: CompoundPath });
    res.source.takeCalls();
    var item = res.project.getItemByKey(original.id);
    equals(item.className, 'CompoundPath');
    equals(item.parent.name, 'group');
    var layerKey = res.project.layers[0].key;
    equals(res.source.takeCalls(), [
        ['getAncestorKeys', original.id],
        ['getChildren', layerKey],
        ['getChildren', item.parent.key]
    ]);
});

test('Selected shells are registered in the selection', function() {
    var res = createSourcedProject();
    var item = res.project.getItemByKey(
            res.source.document.getItem({ class: CompoundPath }).id);
    res.source.takeCalls();
    equals(res.project.selectedItems.length, 1);
    equals(res.project.selectedItems[0] === item, true);
    equals(res.source.takeCalls(), []);
});

test('Loading and invalidating are not logged as changes', function() {
    var res = createSourcedProject();
    var project = res.project;
    project.trackChanges = true;
    var circle = project.layers[0].children['circle'];
    circle.segments;
    res.source.document.getItem({ name: 'circle' }).position.x += 10;
    project.invalidate(res.source.getColumns([
        res.source.document.getItem({ name: 'circle' })
    ]));
    equals(project.takeChanges().length, 0);
    circle.position.x += 10;
    var changes = project.takeChanges();
    equals(changes.length, 1);
    equals(changes[0].item === circle, true);
});

test('invalidate() reloads changed content into the same item', function() {
    var res = createSourcedProject();
    var original = res.source.document.getItem({ name: 'circle' });
    var circle = res.project.layers[0].children['circle'];
    equals(circle.position, new Point(50, 50));
    original.position = [100, 100];
    var columns = res.source.getColumns([original]);
    columns.flags[0] |= 16;
    res.project.invalidate(columns);
    equals(res.project.layers[0].children['circle'] === circle, true);
    equals(circle.bounds, original.bounds);
    equals(circle.segments, original.segments);
});

test('invalidate() reloads changed children, keeping their items', function() {
    var res = createSourcedProject();
    var document = res.source.document;
    var layer = res.project.layers[0];
    var circle = layer.children['circle'];
    document.layers[0].insertChild(0, new Path.Star({
        center: [150, 50],
        points: 5,
        radius1: 10,
        radius2: 20,
        name: 'star'
    }));
    var columns = res.source.getColumns([document.layers[0]]);
    columns.flags[0] |= 32;
    res.project.invalidate(columns);
    equals(layer.children.length, 3);
    equals(layer.children[0].name, 'star');
    equals(layer.children[1] === circle, true);
    equals(circle.index, 1);
    equals(layer.bounds, document.layers[0].bounds);
});

test('A failing source leaves the item a shell, to retry', function() {
    var res = createSourcedProject();
    var circle = res.project.layers[0].children['circle'];
    var getItem = res.source.getItem;
    res.source.getItem = function() {
        throw new Error('Unavailable');
    };
    var message;
    try {
        circle.segments;
    } catch (e) {
        message = e.message;
    }
    equals(message, 'Unavailable');
    res.source.getItem = getItem;
    equals(circle.segments.length, 4);
});

test('Item#key registers new items once', function() {
    var res = createSourcedProject();
    var path = new Path.Line({
        from: [0, 0],
        to: [10, 10],
        parent: res.project.layers[0]
    });
    equals(path.key, null);
    path.key = 1000;
    equals(res.project.getItemByKey(1000) === path, true);
    var message;
    try {
        path.key = 1001;
    } catch (e) {
        message = e.message;
    }
    equals(message, 'Unable to change the key of an item.');
});

test('HostItem', function() {
    var Blend = HostItem.extend({
        _class: 'TestBlend',
        _serializeFields: { steps: 0 },
        _hasChildren: true,

        initialize: function TestBlend() {
            HostItem.apply(this, arguments);
        },

        getSteps: function() {
            return this._values.steps || 0;
        },

        setSteps: function(steps) {
            this._values.steps = steps;
            this._changed(/*#=*/Change.CONTENT);
        }
    });
    var blend = new Blend({ steps: 5, insert: false });
    equals(blend.steps, 5);
    equals(blend.exportJSON(), '["TestBlend",{"applyMatrix":false,"steps":5}]');
    blend.addChild(new Path.Circle({ center: [0, 0], radius: 10 }));
    equals(blend.children.length, 1);
    // Without a source record, a HostItem has empty bounds, whatever its
    // children are:
    equals(blend.bounds, new Rectangle());
});
