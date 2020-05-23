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

QUnit.module('Compound Path');

test('moveTo() / lineTo()', function() {
    var path = new CompoundPath();

    var lists = [
        [new Point(279, 151), new Point(149, 151), new Point(149, 281), new Point(279, 281)],
        [new Point(319, 321), new Point(109, 321), new Point(109, 111), new Point(319, 111)]
    ];

    for (var i = 0; i < lists.length; i++) {
        var list = lists[i];
        for (var j = 0; j < list.length; j++) {
            path[!j ? 'moveTo' : 'lineTo'](list[j]);
        }
    }

    path.fillColor = 'black';

    equals(function() {
        return path.children.length;
    }, 2);
});

test('CompoundPath#reorient()', function() {
    var path1 = new Path.Rectangle([300, 300], [100, 100]);
    var path2 = new Path.Rectangle([50, 50], [200, 200]);
    var path3 = new Path.Rectangle([0, 0], [500, 500]);

    equals(function() {
        return path1.clockwise;
    }, true);
    equals(function() {
        return path2.clockwise;
    }, true);
    equals(function() {
        return path3.clockwise;
    }, true);

    var compound = new CompoundPath({
        children: [path1, path2, path3],
    }).reorient();

    equals(function() {
        return compound.lastChild == path3;
    }, true);
    equals(function() {
        return compound.firstChild == path1;
    }, true);
    equals(function() {
        return path1.clockwise;
    }, false);
    equals(function() {
        return path2.clockwise;
    }, false);
    equals(function() {
        return path3.clockwise;
    }, true);
});
