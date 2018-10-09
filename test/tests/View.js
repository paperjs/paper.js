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

QUnit.module('View');

test('View#setZoom does not break execution', function() {
    view.setZoom(0);
    view.getBounds();
    view.setZoom(Infinity);
    view.getBounds();
    view.setZoom(-Infinity);
    view.getBounds();
    expect(0);
});
