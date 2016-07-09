/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

QUnit.module('Shape');

test('shape.toPath().toShape()', function() {
    var shapes = {
        circle: new Shape.Circle({
            center: [100, 100],
            radius: 50,
            fillColor: 'red'
        }),

        ellipse: new Shape.Ellipse({
            center: [100, 200],
            radius: [50, 25],
            fillColor: 'blue',
            strokeColor: 'black',
            strokeWidth: 4,
            rotation: 20
        }),

        rect: new Shape.Rectangle({
            center: [100, 300],
            size: [100, 50],
            fillColor: 'green',
            strokeColor: 'black',
            strokeWidth: 4,
            rotation: -20
        }),

        roundRect: new Shape.Rectangle({
            center: [100, 400],
            size: [50, 100],
            radius: [15, 20],
            fillColor: 'orange',
            strokeColor: 'black',
            strokeWidth: 4,
            rotation: 20
        })
    };

    Base.each(shapes, function(shape, name) {
        equals(shape.toPath().toShape(), shape, name + '.toPath().toShape()');
    });
});
