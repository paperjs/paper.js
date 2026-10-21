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

// Generates near-coincident cases for the boolean sweep, with a fixed seed:
// polygons that share vertices, tangent circles, shapes and their copies moved
// by tiny amounts, and curves with loops and cusps. Returns them in the form
// of the cases in issues.json.

module.exports = function(paper, count, seed) {
    var Path = paper.Path,
        Point = paper.Point,
        Segment = paper.Segment,
        Size = paper.Size,
        offsets = [0, 1e-9, -1e-9, 1e-7, -1e-7, 1e-6, -1e-6, 1e-5, -1e-5],
        operations = ['unite', 'intersect', 'subtract', 'exclude'];

    function random() {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    }

    function range(min, max) {
        return min + (max - min) * random();
    }

    function pick(list) {
        return list[Math.floor(random() * list.length)];
    }

    var generators = {
        // Polygons that share some of their vertices, the others moved by tiny
        // amounts or freely:
        'shared vertices': function() {
            var count = 3 + Math.floor(random() * 5),
                points = [];
            for (var i = 0; i < count; i++) {
                var angle = 2 * Math.PI * i / count + range(-0.3, 0.3),
                    radius = range(50, 150);
                points.push(new Point(200 + radius * Math.cos(angle),
                        200 + radius * Math.sin(angle)));
            }
            var others = points.map(function(point) {
                return random() < 0.5
                        ? point.add(pick(offsets), pick(offsets))
                        : point.add(range(-60, 60), range(-60, 60));
            });
            return [
                new Path({ segments: points, closed: true }),
                new Path({ segments: others, closed: true })
            ];
        },

        // Circles that touch from inside or outside, within tiny distances:
        'tangent arcs': function() {
            var radius1 = range(40, 120),
                radius2 = range(20, 120),
                inside = random() < 0.5 && radius2 < radius1,
                angle = range(0, 2 * Math.PI),
                distance = (inside ? radius1 - radius2 : radius1 + radius2)
                    + pick(offsets),
                center = new Point(200, 200);
            return [
                new Path.Circle(center, radius1),
                new Path.Circle(center.add(new Point(Math.cos(angle),
                        Math.sin(angle)).multiply(distance)), radius2)
            ];
        },

        // A curved shape, and a copy of it moved by a tiny amount:
        'moved copy': function() {
            var count = 3 + Math.floor(random() * 4),
                segments = [];
            for (var i = 0; i < count; i++) {
                var angle = 2 * Math.PI * i / count,
                    radius = range(60, 150);
                segments.push(new Segment(
                        new Point(200 + radius * Math.cos(angle),
                            200 + radius * Math.sin(angle)),
                        new Point(range(-40, 40), range(-40, 40)),
                        new Point(range(-40, 40), range(-40, 40))));
            }
            var path1 = new Path({ segments: segments, closed: true }),
                path2 = path1.clone();
            path2.translate(pick(offsets.slice(1)), pick(offsets));
            if (random() < 0.5)
                path2.rotate(pick([1e-9, 1e-7, 1e-5]), path1.bounds.center);
            return [path1, path2];
        },

        // Curves with loops or cusps, against a rectangle or another one:
        'loops and cusps': function() {
            function create() {
                var point1 = new Point(range(100, 300), range(100, 300)),
                    point2 = point1.add(range(-80, 80), range(-80, 80)),
                    isLoop = random() < 0.5,
                    vector = point2.subtract(point1),
                    // Handles that cross each other give a loop, and ones of
                    // equal length that meet give a cusp:
                    normal = new Point(-vector.y, vector.x).normalize(
                        isLoop ? range(150, 250) : range(80, 120)),
                    along = vector.multiply(isLoop ? 1.5 : 1);
                return new Path({
                    segments: [
                        new Segment(point1, null, normal.add(along)),
                        new Segment(point2, normal.subtract(along), null)
                    ],
                    closed: true
                });
            }
            var path = create();
            return [path, random() < 0.5
                    ? new Path.Rectangle(path.bounds.center.subtract(40, 30),
                        new Size(range(30, 120), range(30, 120)))
                    : create()];
        }
    };

    var names = Object.keys(generators),
        cases = [];
    for (var i = 0; i < count; i++) {
        var name = names[i % names.length],
            items = generators[name](),
            operation = pick(operations);
        items.forEach(function(item) {
            item.remove();
        });
        cases.push({
            label: 'Generated: ' + name,
            op: operation,
            a: items[0].exportJSON({ asString: false, precision: 16 }),
            b: items[1].exportJSON({ asString: false, precision: 16 })
        });
    }
    return cases;
};
