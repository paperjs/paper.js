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

QUnit.module('Tween');

test('Tween#update() interpolates points and colors', function() {
    var path = new Path.Circle({
        center: [0, 0],
        radius: 10,
        fillColor: 'black'
    });
    var tween = path.tween(
        { position: [0, 0], fillColor: 'black' },
        { position: [100, 50], fillColor: 'white' },
        { duration: 1000, start: false }
    );
    tween.start().update(0.5);
    equals(path.position, new Point(50, 25));
    equals(function() {
        return path.fillColor.toCSS(true);
    }, '#808080');
});

test('Tween#update() with relative values', function() {
    var path = new Path.Circle({
        center: [50, 25],
        radius: 10,
        opacity: 0.5
    });
    var tween = path.tween(
        { position: '+= [10, 0]', opacity: '-= 0.25' },
        { duration: 1000, start: false }
    );
    tween.start().update(1);
    equals(path.position, new Point(60, 25));
    equals(path.opacity, 0.25);
});
