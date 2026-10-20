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

QUnit.module('PathFlattener');

test('Points at offsets on straight curves', function() {
    // A line without handles, whose curve-time eases in and out, and one
    // with collinear handles of uneven lengths:
    var paths = [
        new Path.Line([0, 0], [100, 0]),
        new Path({
            segments: [[[0, 0], null, [10, 10]], [[100, 100], [-60, -60]]]
        })
    ];
    paths.forEach(function(path, i) {
        var flattener = new PathFlattener(path),
            offsets = [0, 10, 33, 50, 75, path.length];
        offsets.forEach(function(offset) {
            equals(flattener.getPointAt(offset), path.getPointAt(offset),
                    'path ' + i + ', offset ' + offset);
        });
    });
});

test('Points at offsets across straight and curved parts', function() {
    var path = new Path({
            segments: [[0, 0], [100, 0], [[200, 100], [0, -60]]]
        }),
        flattener = new PathFlattener(path);
    equals(flattener.getPointAt(40), path.getPointAt(40), 'on the line');
    equals(flattener.getTangentAt(40), path.getTangentAt(40), 'its tangent');
    equals(flattener.getPointAt(150).getDistance(path.getPointAt(150)) < 1,
            true, 'on the curve, within the flatness');
});
