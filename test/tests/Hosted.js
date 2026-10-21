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

QUnit.module('Hosted');

// The host document is played by another project, served through the host
// interface by item id. The host logs its calls, so tests can check what
// loading touched.
function createHost(document) {
    var host = {
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
            host.calls.push(['getChildren', key]);
            return host.getColumns(key == null
                    ? document.layers
                    : host.getNode(key).children);
        },

        getItem: function(key) {
            host.calls.push(['getItem', key]);
            var json = host.getNode(key).exportJSON({ asString: false });
            // Selection comes through the flags, and the children of
            // containers through getChildren():
            delete json[1].selected;
            if (json[0] !== 'CompoundPath')
                delete json[1].children;
            return json;
        },

        getAncestorKeys: function(key) {
            host.calls.push(['getAncestorKeys', key]);
            var keys = [],
                node = host.getNode(key);
            while (node = node.parent || null)
                keys.unshift(node.id);
            return keys;
        },

        // Returns the calls made since the last call, and clears the log.
        takeCalls: function() {
            var calls = host.calls;
            host.calls = [];
            return calls;
        }
    };
    return host;
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

function createHostedProject() {
    var host = createHost(createDocument());
    var project = new Project();
    project.host = host;
    return { project: project, host: host };
}

test('Setting the host loads only the layers', function() {
    var res = createHostedProject();
    equals(res.project.layers.length, 2);
    equals(res.project.layers[0].name, 'art');
    equals(res.project.activeLayer === res.project.layers[0], true);
    equals(res.project.layers[0].key, res.host.document.layers[0].id);
    equals(res.host.takeCalls(), [['getChildren', null]]);
});

test('Containers load their children on first access', function() {
    var res = createHostedProject();
    res.host.takeCalls();
    var layer = res.project.layers[0];
    equals(layer.children.length, 2);
    equals(layer.children['circle'].className, 'Path');
    equals(res.host.takeCalls(), [['getChildren', layer.key]]);
    // A second access doesn't load them again:
    equals(layer.children.length, 2);
    equals(res.host.takeCalls(), []);
});

test('Items load their content on first access', function() {
    var res = createHostedProject();
    var original = res.host.document.getItem({ name: 'circle' });
    var circle = res.project.layers[0].children['circle'];
    res.host.takeCalls();
    equals(circle.segments.length, 4);
    equals(res.host.takeCalls(), [['getItem', circle.key]]);
    equals(circle.fillColor, original.fillColor);
    equals(circle.segments, original.segments);
    equals(res.host.takeCalls(), []);
});

test('A loaded project matches the host document', function() {
    var res = createHostedProject();
    equals(res.project.exportJSON(), res.host.document.exportJSON());
});

test('Bounds come from the host without loading', function() {
    var res = createHostedProject();
    var document = res.host.document;
    var layer = res.project.layers[0];
    var group = layer.children['group'];
    var path = group.children[0];
    res.host.takeCalls();
    equals(path.bounds, document.getItem({ id: path.key }).bounds);
    equals(path.strokeBounds, document.getItem({ id: path.key }).strokeBounds);
    equals(group.bounds, document.getItem({ name: 'group' }).bounds);
    equals(layer.bounds, document.layers[0].bounds);
    equals(res.host.takeCalls(), []);
});

test('Hit tests load only the items that are hit', function() {
    var res = createHostedProject();
    var layer = res.project.layers[0];
    var group = layer.children['group'];
    var circle = layer.children['circle'];
    res.host.takeCalls();
    var result = res.project.hitTest([50, 50]);
    equals(result && result.item === circle, true);
    // The group is rejected by its bounds, without loading its children:
    equals(res.host.takeCalls(), [['getItem', circle.key]]);
    equals(group.hasOwnProperty('_children'), false);
});

test('getItemByKey() loads only the ancestors\' children', function() {
    var res = createHostedProject();
    var original = res.host.document.getItem({ class: CompoundPath });
    res.host.takeCalls();
    var item = res.project.getItemByKey(original.id);
    equals(item.className, 'CompoundPath');
    equals(item.parent.name, 'group');
    var layerKey = res.project.layers[0].key;
    equals(res.host.takeCalls(), [
        ['getAncestorKeys', original.id],
        ['getChildren', layerKey],
        ['getChildren', item.parent.key]
    ]);
});

test('Selected shells are registered in the selection', function() {
    var res = createHostedProject();
    var item = res.project.getItemByKey(
            res.host.document.getItem({ class: CompoundPath }).id);
    res.host.takeCalls();
    equals(res.project.selectedItems.length, 1);
    equals(res.project.selectedItems[0] === item, true);
    equals(res.host.takeCalls(), []);
});

test('Loading and invalidating are not logged as changes', function() {
    var res = createHostedProject();
    var project = res.project;
    project.trackChanges = true;
    var circle = project.layers[0].children['circle'];
    circle.segments;
    res.host.document.getItem({ name: 'circle' }).position.x += 10;
    project.invalidate(res.host.getColumns([
        res.host.document.getItem({ name: 'circle' })
    ]));
    equals(project.takeChanges().length, 0);
    circle.position.x += 10;
    var changes = project.takeChanges();
    equals(changes.length, 1);
    equals(changes[0].item === circle, true);
});

test('invalidate() reloads changed content into the same item', function() {
    var res = createHostedProject();
    var original = res.host.document.getItem({ name: 'circle' });
    var circle = res.project.layers[0].children['circle'];
    equals(circle.position, new Point(50, 50));
    original.position = [100, 100];
    var columns = res.host.getColumns([original]);
    columns.flags[0] |= 16;
    res.project.invalidate(columns);
    equals(res.project.layers[0].children['circle'] === circle, true);
    equals(circle.bounds, original.bounds);
    equals(circle.segments, original.segments);
});

test('invalidate() reloads changed children, keeping their items', function() {
    var res = createHostedProject();
    var document = res.host.document;
    var layer = res.project.layers[0];
    var circle = layer.children['circle'];
    document.layers[0].insertChild(0, new Path.Star({
        center: [150, 50],
        points: 5,
        radius1: 10,
        radius2: 20,
        name: 'star'
    }));
    var columns = res.host.getColumns([document.layers[0]]);
    columns.flags[0] |= 32;
    res.project.invalidate(columns);
    equals(layer.children.length, 3);
    equals(layer.children[0].name, 'star');
    equals(layer.children[1] === circle, true);
    equals(circle.index, 1);
    equals(layer.bounds, document.layers[0].bounds);
});

test('invalidate() keeps the remaining children inserted', function() {
    var res = createHostedProject();
    var project = res.project;
    var document = res.host.document;
    var layer = project.layers[0];
    var circle = layer.children['circle'];
    project.trackChanges = true;
    document.getItem({ name: 'group' }).remove();
    var columns = res.host.getColumns([document.layers[0]]);
    columns.flags[0] |= 32;
    project.invalidate(columns);
    // A script that holds on to the circle changes it, without accessing the
    // layer's children first:
    circle.position.x += 10;
    equals(circle.isInserted(), true);
    var changes = project.takeChanges();
    equals(changes.length, 1);
    equals(changes[0].item === circle, true);
    equals(layer.children.length, 1);
});

test('invalidate() reloads items that a script created and keyed', function() {
    var res = createHostedProject();
    var project = res.project;
    var layer = project.layers[0];
    // A script creates a circle, which the host writes back and keys:
    var circle = new Path.Circle({
        center: [20, 20],
        radius: 5,
        fillColor: 'blue',
        parent: layer
    });
    var node = circle.clone({ insert: false });
    res.host.document.layers[0].addChild(node);
    circle.key = node.id;
    // The user moves it in the host, which invalidates its content:
    node.position.x += 10;
    project.trackChanges = true;
    var columns = res.host.getColumns([node]);
    columns.flags[0] |= 16;
    project.invalidate(columns);
    equals(project.getItemByKey(node.id) === circle, true);
    equals(circle.position, node.position);
    equals(circle.segments, node.segments);
    equals(project.takeChanges().length, 0);
});

test('A failing host leaves the item a shell, to retry', function() {
    var res = createHostedProject();
    var circle = res.project.layers[0].children['circle'];
    var getItem = res.host.getItem;
    res.host.getItem = function() {
        throw new Error('Unavailable');
    };
    var message;
    try {
        circle.segments;
    } catch (e) {
        message = e.message;
    }
    equals(message, 'Unavailable');
    res.host.getItem = getItem;
    equals(circle.segments.length, 4);
});

test('Item#key registers new items once', function() {
    var res = createHostedProject();
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
            this._changed(ChangeFlag.CONTENT | ChangeFlag.GEOMETRY
                    | ChangeFlag.APPEARANCE);
        }
    });
    var blend = new Blend({ steps: 5, insert: false });
    equals(blend.steps, 5);
    equals(blend.exportJSON(), '["TestBlend",{"applyMatrix":false,"steps":5}]');
    blend.addChild(new Path.Circle({ center: [0, 0], radius: 10 }));
    equals(blend.children.length, 1);
    // Without a host record, a HostItem has empty bounds, whatever its
    // children are:
    equals(blend.bounds, new Rectangle());
});

// A host document with text, whose host lays it out as Paper.js does in the
// document itself, as plain lines and pieces:
function createHostedText() {
    var document = new Project(),
        point = new PointText({
            point: [20, 40],
            content: 'Hello world',
            fontFamily: testFontFamily,
            name: 'point'
        }),
        path = new PathText({
            textPath: new Path.Line([0, 100], [200, 100]),
            content: 'Along a path',
            fontFamily: testFontFamily,
            startOffset: 10,
            name: 'path'
        }),
        area = new AreaText({
            textPath: new Path.Rectangle([0, 200], [100, 100]),
            content: 'Text in an area breaks into lines that fit it.',
            fontFamily: testFontFamily,
            columns: 2,
            gutter: 4,
            name: 'area'
        });
    point.range(6, 11).fontSize = 20;
    var host = createHost(document);
    host.layOut = function(json, start, key) {
        host.calls.push(['layOut', key]);
        equals(typeof json, 'string', 'the text as a JSON string');
        var current = paper.project;
        document.activate();
        json = JSON.parse(json);
        var text = new Base.exports[json[0]]({ insert: false })
                .importJSON(json),
            lines = text._layOut();
        current.activate();
        return {
            end: text._visibleEnd,
            lines: lines.map(function(line) {
                return Base.set({}, line, {
                    pieces: line.pieces.map(function(piece) {
                        var plain = Base.set({}, piece);
                        delete plain.style;
                        delete plain.font;
                        delete plain.scale;
                        delete plain.content;
                        return plain;
                    })
                });
            })
        };
    };
    var project = new Project();
    project.host = host;
    return { project: project, host: host, document: document };
}

function getLines(text) {
    return text.lines.map(function(line) {
        return [line.content, line.baseline.point.y, line.bounds.left];
    });
}

test('Text loads its story, path and settings on first access', function() {
    var res = createHostedText(),
        children = res.project.layers[0].children,
        original = res.document.layers[0].children;
    res.host.takeCalls();
    var point = children['point'];
    equals(point.hasOwnProperty('_story'), false, 'a shell');
    equals(point.content, 'Hello world', 'its content');
    equals(res.host.takeCalls(), [['getItem', point.key]], 'loaded once');
    equals(point.runs.map(function(run) {
        return run.fontSize;
    }), [12, 20], 'its runs');
    equals(children['path'].textPath.segments,
            original['path'].textPath.segments, 'a path text\'s path');
    equals(children['path'].startOffset, 10, 'and its settings');
    equals(children['area'].columns, 2, 'an area text\'s settings');
});

test('The host lays out hosted text', function() {
    var res = createHostedText(),
        children = res.project.layers[0].children,
        original = res.document.layers[0].children;
    ['point', 'path', 'area'].forEach(function(name) {
        var text = children[name];
        text.content;
        res.host.takeCalls();
        equals(getLines(text), getLines(original[name]), name + ': its lines');
        equals(res.host.takeCalls(), [['layOut', text.key]],
                name + ': from the host');
        equals(text.visibleRange.end, original[name].visibleRange.end,
                name + ': its visible range');
        equals(text.bounds, original[name].bounds, name + ': its bounds');
    });
    // Lines are in the text's coordinates, hit tests in the project's:
    var point = children['point'],
        center = point.localToGlobal(point.lines[0].bounds.center),
        hit = point.hitTest(center, { fill: true });
    equals(hit && hit.item === point, true, 'hit on its letters');
    equals(point.exportSVG().textContent, 'Hello world', 'exported to SVG');
});

test('Hosted text is laid out as the script holds it', function() {
    var res = createHostedText(),
        area = res.project.layers[0].children['area'],
        original = res.document.layers[0].children['area'];
    area.content = 'Changed by the script';
    equals(area.lines.map(function(line) {
        return line.content.trim();
    }).join(' '), 'Changed by the script', 'before the host has it');
    equals(original.content.indexOf('Changed'), -1,
            'the host document as it was');
});

test('Without layOut(), Paper.js lays out hosted text', function() {
    var res = createHostedText(),
        area = res.project.layers[0].children['area'],
        original = res.document.layers[0].children['area'];
    res.host.layOut = null;
    equals(getLines(area), getLines(original));
});

test('invalidate() reloads the story of hosted text', function() {
    var res = createHostedText(),
        point = res.project.layers[0].children['point'],
        original = res.document.layers[0].children['point'];
    equals(point.content, 'Hello world');
    original.content = 'Changed in the host';
    var columns = res.host.getColumns([original]);
    columns.flags[0] |= 16;
    res.project.invalidate(columns);
    equals(point.content, 'Changed in the host', 'its content');
    equals(getLines(point), getLines(original), 'its lines');
});

test('Hosted text draws its host\'s layout', function() {
    var res = createHostedText(),
        point = res.project.layers[0].children['point'],
        raster = point.rasterize({ insert: false });
    equals(raster.width > 0, true, 'without errors');
});
