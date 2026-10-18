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

QUnit.module('View');

test('view.zoom of mirrored view (#1411)', function() {
    // The view is 100x100, so it mirrors and zooms around (50, 50).
    view.scale(1, -1);
    equals(view.zoom, 1, 'view.zoom');
    view.zoom = 2;
    equals(view.zoom, 2, 'view.zoom');
    equals(view.scaling, new Point(2, -2), 'view.scaling');
    // (x, y) -> (2 * x - 50, 100 - (2 * y - 50))
    equals(view.matrix, new Matrix(2, 0, 0, -2, -50, 150), 'view.matrix');
});

test('view.zoom with values that aren\'t positive numbers (#1433)', function() {
    view.zoom = 2;
    [0, -1, NaN, Infinity].forEach(function(zoom) {
        view.zoom = zoom;
        equals(view.zoom, 2, 'view.zoom = ' + zoom);
    });
    // The view is 100x100, so at zoom 2 it shows 50x50 around its center:
    equals(view.bounds, new Rectangle(25, 25, 50, 50), 'view.bounds');
});
