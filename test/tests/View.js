/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2019, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

QUnit.module('View');

// In the following tests, we assume that view size is a square of 100x100.
// See `test()` in `helpers.js` about how test projects are instanciated.

test('View#fitBounds() does not change target bounds', function() {
    var item = new Path.Rectangle({
        center: [0, 0],
        size: new Size(400, 200)
    });
    var itemBoundsBefore = item.bounds;
    view.fitBounds(item.bounds);
    var itemBoundsAfter = item.bounds;
    equals(itemBoundsAfter, itemBoundsBefore);
});

test('View#fitBounds() set view center', function() {
    var item = new Path.Rectangle({
        center: [0, 0],
        size: new Size(400, 200)
    });
    view.fitBounds(item.bounds);
    equals(view.center, item.bounds.center);
});

test('View#fitBounds() with fill=false', function() {
    var item = new Path.Rectangle({
        center: [0, 0],
        size: new Size(400, 200)
    });
    view.fitBounds(item.bounds, false);
    equals(view.bounds.width, item.bounds.width);
    equals(view.bounds.height, item.bounds.width);
});

test('View#fitBounds() default fill is false', function() {
    var item = new Path.Rectangle({
        center: [0, 0],
        size: new Size(400, 200)
    });
    view.fitBounds(item.bounds);
    equals(view.bounds.width, item.bounds.width);
    equals(view.bounds.height, item.bounds.width);
});

test('View#fitBounds() with fill=true', function() {
    var item = new Path.Rectangle({
        center: [0, 0],
        size: new Size(400, 200)
    });
    view.fitBounds(item.bounds, true);
    equals(view.bounds.width, item.bounds.height);
    equals(view.bounds.height, item.bounds.height);
});
