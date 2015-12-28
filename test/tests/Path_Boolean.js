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

module('Path Boolean Operations');

test('path.unite(); #609', function() {
    // https://github.com/paperjs/paper.js/issues/609
    // path1 and path2 are half circles, applying unite should result in a circle

    var path1 = new Path();
    path1.moveTo(new Point(100, 100));
    path1.arcTo(new Point(100, 200));
    path1.closePath();

    var path2 = new Path();
    path2.moveTo(new Point(100, 200));
    path2.arcTo(new Point(100, 100));
    path2.closePath();

    var result = path1.unite(path2);
    result.fillColor = 'blue';

    var expected = new Path({
        pathData: 'M150,150c0,27.61424 -22.38576,50 -50,50c-27.61424,0 -50,-22.38576 -50,-50c0,-27.61424 22.38576,-50 50,-50c27.61424,0 50,22.38576 50,50z',
        fillColor: 'blue'
    });

    equals(result, expected, 'path1.unite(path2);', { rasterize: true });
});

test('ring.subtract(square); #610', function() {
    // https://github.com/paperjs/paper.js/issues/610
    var square = new Path.Rectangle({
        position: [140, 0],
        size: 300
    });

    // Make a ring using subtraction of two circles:
    var inner = new Path.Circle({
        center: [0, 0],
        radius: 100
    });

    var outer = new Path.Circle({
        center: [0, 0],
        radius: 132
    });

    var ring = outer.subtract(inner);
    var result = ring.subtract(square);
    result.fillColor = 'blue';

    var expected = new Path({
        pathData: 'M-132,0c0,-69.53737 53.7698,-126.51614 122,-131.62689l0,32.12064c-50.53323,5.01724 -90,47.65277 -90,99.50625c0,51.85348 39.46677,94.489 90,99.50625l0,32.12064c-68.2302,-5.11075 -122,-62.08951 -122,-131.62689z',
        fillColor: 'blue'
    });

    equals(result, expected, 'ring.subtract(square);', { rasterize: true });
});

test('circle.subtract(arc); #719', function() {
    // https://github.com/paperjs/paper.js/issues/719
    var radius = 50;
    var circle = new Path.Circle([0, 0], radius);
    circle.fillColor = 'blue';
    var arc = new Path.Arc([0, -radius], [radius, 0], [0, radius])
    arc.fillColor = 'blue';
    arc.closed = true;
    arc.pivot = arc.bounds.leftCenter;

    var result = circle.subtract(arc);
    // Rotate the arc by 180 to receive the expected shape to compare against
    arc.rotate(180);

    equals(result, arc, 'circle.subtract(arc);', { rasterize: true });
});

test('compoundPath.intersect(rect);', function() {
    var compoundPath = new CompoundPath();
    compoundPath.addChild(new Path.Rectangle(new Point(140, 10), [100, 300]));
    compoundPath.addChild(new Path.Rectangle(new Point(150, 80), [50, 80]));
    compoundPath.fillColor = 'blue';
    var rect = new Path.Rectangle(new Point(50, 50), [100, 150]);
    var result = compoundPath.intersect(rect);

    var expected = new Path({
        pathData: 'M140,50l10,0l0,150l-10,0z',
        fillColor: 'blue'
    });

    equals(result, expected, 'compoundPath.intersect(rect);', { rasterize: true });
});

test('multiple exclusions', function() {
    var shape0 = new Path.Rectangle({
        insert: false,
        point: [304, 226],
        size: [328, 328],
        fillColor: 'blue'
    });
    var shape1 = new Path({
        insert: false,
        segments: [
            [213.5, 239],
            [476.5, 279],
            [716, 233.5],
            [469, 74]
        ],
        closed: true
    });
    var res1 = shape0.exclude(shape1);
    var shape2 = new Path.Rectangle({
        insert: false,
        point: [174, 128],
        size: [309, 251]
    });
    var res2 = res1.exclude(shape2);
    // shape3
    var shape3 = new Path.Rectangle({
        insert: false,
        point: [318, 148],
        size: [302, 302]
    });
    // exclude res2 & shape3
    var result = res2.exclude(shape3);

    var expected = new CompoundPath({
        pathData: 'M304,554l0,-175l14,0l0,71l302,0l0,-198.262l12,-2.27975l0,304.54175z M318,379l165,0l0,-101.23486l137,-26.02714l0,-25.738l-137,0l0,-78l-128.58788,0l-36.41212,23.51468l0,54.48532l165,0l0,51.76514l-6.5,1.23486l-158.5,-24.10646z M174,379l0,-251l211.38182,0l-30.9697,20l-36.41212,0l0,23.51468l-104.5,67.48532l90.5,13.76426l0,-26.76426l14,0l0,28.89354l-14,-2.12928l0,126.23574z M385.38182,128l83.61818,-54l114.59561,74l-100.59561,0l0,-20z M583.59561,148l36.40439,23.5081l0,-23.5081z M620,171.5081l96,61.9919l-84,15.95825l0,-23.45825l-12,0z',
        fillColor: 'blue'
    });

    equals(result, expected, 'res2.exclude(shape3);', { rasterize: true });
})
