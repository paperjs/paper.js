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

    var path3 = path1.unite(path2);
    equals(path3.pathData, 'M100,100c27.61424,0 50,22.38576 50,50c0,27.61424 -22.38576,50 -50,50z M100,200c-27.61424,0 -50,-22.38576 -50,-50c0,-27.61424 22.38576,-50 50,-50z', 'path3.pathData');
});
