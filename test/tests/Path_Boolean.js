/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
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
    equals(result.pathData, 'M150,150c0,27.61424 -22.38576,50 -50,50c-27.61424,0 -50,-22.38576 -50,-50c0,-27.61424 22.38576,-50 50,-50c27.61424,0 50,22.38576 50,50z', 'result.pathData');
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

    equals(result.pathData, 'M-10,131.62689c-68.2302,-5.11075 -122,-62.08951 -122,-131.62689c0,-69.53737 53.7698,-126.51614 122,-131.62689l0,32.12064c-50.53323,5.01724 -90,47.65277 -90,99.50625c0,51.85348 39.46677,94.489 90,99.50625z');
});
