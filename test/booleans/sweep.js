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

// The perturbation sweep of the boolean operations, see `gulp test:booleans`.
// For each boolean operation in the tests and in issues.json, it moves the
// second operand by tiny amounts, and counts how many of these results keep the
// fill of the unmoved one. It also counts the points of the unmoved result
// that are filled wrongly, by the operation applied to the operands' own
// contains(). Points near any outline are left out, as the answer there
// depends on tolerances.
//
// Usage: node sweep.js <paper build> <first case> [exclusion], or
// <paper build> count. The points left out lie within 1e-4 times the diagonal
// of the operands' bounds of an outline, or within the given multiple of the
// operation's epsilon.
// Prints a line of JSON when it starts each case and one with its result,
// from the first case on, so that the caller can restart after a case that
// doesn't return.

var fs = require('fs'),
    path = require('path'),
    vm = require('vm');

var paper = require(path.resolve(process.argv[2])),
    exclusion = +process.argv[4];
paper.setup(new paper.Size(1000, 1000));
paper.install(global);

var operations = {
        unite: function(a, b) { return a || b; },
        intersect: function(a, b) { return a && b; },
        subtract: function(a, b) { return a && !b; },
        exclude: function(a, b) { return a !== b; }
    },
    deltas = [1e-12, -1e-12, 1e-9, -1e-9, 1e-7, -1e-7, 1e-6, -1e-6, 1e-5,
        -1e-5];

// Collects the operands of the boolean operations that a test file performs,
// by running it with stubs for the test functions:
function collect(file) {
    var cases = [],
        counts = {},
        label,
        depth = 0,
        prototype = PathItem.prototype,
        originals = {};
    Object.keys(operations).forEach(function(operation) {
        var original = originals[operation] = prototype[operation];
        prototype[operation] = function(path, options) {
            // Only the outermost call, as operations call each other:
            if (!depth && path && path !== this) {
                cases.push({
                    label: label,
                    op: operation,
                    options: options
                            ? JSON.parse(JSON.stringify(options)) : undefined,
                    a: this.exportJSON({ asString: false, precision: 16 }),
                    b: path.exportJSON({ asString: false, precision: 16 })
                });
            }
            depth++;
            try {
                return original.apply(this, arguments);
            } finally {
                depth--;
            }
        };
    });
    global.QUnit = { module: function() {} };
    global.equals = global.ok = function() {};
    global.compareBoolean = function(actual) {
        if (typeof actual === 'function')
            actual();
    };
    global.test = function(name, callback) {
        counts[name] = (counts[name] || 0) + 1;
        label = name + (counts[name] > 1 ? ' (' + counts[name] + ')' : '');
        new Project(new Size(1000, 1000));
        try {
            callback();
        } catch (e) {
            // The test's own assertions don't matter here.
        }
    };
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
    Base.set(prototype, originals);
    return cases;
}

function isClosed(item) {
    return (item.children || [item]).every(function(path) {
        return path.closed || !path.segments.length;
    });
}

function isNear(item, point, tolerance) {
    var location = !item.isEmpty() && item.getNearestLocation(point);
    return !!location && location.point.getDistance(point) < tolerance;
}

// Checks the planarity of the operation's graph: crossing each edge from its
// right to its left must change the windings by the edge's own changes. For a
// graph that isn't planar, returns the first pair of edges that intersect away
// from their vertices, or a vertex that lies on an edge, as a repro:
function checkGraph(a, b) {
    var graph = PathItem._createGraph(a, b),
        halfEdges = graph.halfEdges,
        edges = graph.edges,
        vertices = graph.vertices,
        epsilon = graph.epsilon,
        planar = true;
    for (var i = 0; i < halfEdges.length && planar; i += 2) {
        var left = halfEdges[i].face.windings,
            right = halfEdges[i + 1].face.windings,
            change = halfEdges[i].edge.windings;
        planar = left[0] - right[0] === change[0]
                && left[1] - right[1] === change[1];
    }
    if (planar)
        return null;
    function getPoint(index) {
        return new Point(vertices[index].x, vertices[index].y);
    }
    var curves = edges.map(function(edge) {
        var v = edge.values;
        return new Curve(new Point(v[0], v[1]), new Point(v[2] - v[0], v[3] - v[1]),
                new Point(v[4] - v[6], v[5] - v[7]), new Point(v[6], v[7]));
    });
    for (var i = 0; i < edges.length; i++) {
        for (var j = i + 1; j < edges.length; j++) {
            var ends = [edges[i].from, edges[i].to, edges[j].from, edges[j].to],
                crossing = curves[i].getIntersections(curves[j]).filter(
                    function(location) {
                        return !ends.some(function(index) {
                            return location.point.isClose(getPoint(index),
                                    epsilon);
                        });
                    })[0];
            if (crossing) {
                return { crossing: crossing.point.toString(),
                        edges: [edges[i].values, edges[j].values] };
            }
        }
    }
    for (var i = 0; i < vertices.length; i++) {
        var point = getPoint(i);
        for (var j = 0; j < edges.length; j++) {
            var edge = edges[j];
            if (edge.from !== i && edge.to !== i
                    && curves[j].getNearestPoint(point).isClose(point, epsilon))
                return { vertex: point.toString(), edge: edge.values };
        }
    }
    return { unknown: true };
}

function sweep(entry) {
    var a = Item.importJSON(entry.a),
        b = Item.importJSON(entry.b),
        options = Base.set({}, entry.options, { insert: false }),
        result = { label: entry.label, op: entry.op };
    a.remove();
    b.remove();
    if (options.trace === false || options.stroke) {
        result.skipped = 'trace: false or stroke';
        return result;
    }
    var result0 = a[entry.op](b, options);
    if (!isClosed(result0)) {
        result.skipped = 'open result';
        return result;
    }
    // Sample points with a fixed seed, away from all outlines:
    var bounds = a.bounds.unite(b.bounds),
        tolerance = exclusion
            ? exclusion * PathItem._createGraph(a, b).epsilon
            : 1e-4 * bounds.topLeft.getDistance(bounds.bottomRight),
        seed = 4711,
        points = [];
    for (var i = 0; i < 300; i++) {
        seed = (seed * 16807) % 2147483647;
        var x = seed / 2147483647;
        seed = (seed * 16807) % 2147483647;
        var point = new Point(bounds.x + x * bounds.width,
                bounds.y + seed / 2147483647 * bounds.height);
        if (!isNear(a, point, tolerance) && !isNear(b, point, tolerance)
                && !isNear(result0, point, tolerance)) {
            points.push({
                point: point,
                expected: operations[entry.op](a.contains(point),
                        b.contains(point)),
                filled: result0.contains(point)
            });
        }
    }
    result.points = points.length;
    result.wrong = points.filter(function(sample) {
        return sample.filled !== sample.expected;
    }).length;
    result.stable = 0;
    result.total = deltas.length * 2;
    result.nonPlanar = 0;
    function check(b) {
        var repro = checkGraph(a, b);
        if (repro) {
            result.nonPlanar++;
            result.repro = result.repro || repro;
        }
    }
    check(b);
    deltas.forEach(function(delta) {
        [[delta, 0], [0, delta]].forEach(function(vector) {
            var moved = b.clone({ insert: false });
            moved.translate(vector);
            check(moved);
            var moved0 = a[entry.op](moved, options);
            if (points.every(function(sample) {
                return moved0.contains(sample.point) === sample.filled;
            })) {
                result.stable++;
            }
        });
    });
    return result;
}

var cases = collect(path.join(__dirname, '..', 'tests', 'Path_Boolean.js'))
        .concat(require('./issues.json'));
if (process.argv[3] === 'count') {
    console.log(cases.length);
} else {
    for (var i = +process.argv[3] || 0, l = cases.length; i < l; i++) {
        // Announce each case, so a caller knows which one didn't return:
        console.log(JSON.stringify({ index: i, label: cases[i].label,
                op: cases[i].op, start: true }));
        var result;
        try {
            result = sweep(cases[i]);
        } catch (e) {
            result = { label: cases[i].label, op: cases[i].op,
                    error: e.message };
        }
        result.index = i;
        console.log(JSON.stringify(result));
    }
}
