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

test('new Shape.Rectangle() with position set before size', function() {
    var shape1 = new Shape.Rectangle({
        position: [0, 0],
        size: new Size(100, 100)
    });
    equals(shape1.bounds.width, 100);
});

test('Shape.Rectangle radius works with negative size', function() {
    var shape = new Shape.Rectangle({
        center: [50, 50],
        size: 50,
        fillColor: 'black'
    });

    shape.size = [-25, -25];

    equals(shape.radius.width, 0);
    equals(shape.radius.height, 0);

    shape.radius = [10, 50];
    shape.size = [50, -25];

    equals(shape.radius.width, 10);
    equals(shape.radius.height, 12.5);

    shape.size = [50, 75];

    equals(shape.radius.height, 12.5);
});
