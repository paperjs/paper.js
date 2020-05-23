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

QUnit.module('TextItem');

test('PointText', function() {
    var text = new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 14,
        point: [100, 100],
        content: 'Hello World!'
    });
    equals(text.fillColor, new Color(0, 0, 0), 'text.fillColor should be black by default');
    equals(text.point, new Point(100, 100), 'text.point');
    equals(text.bounds, new Rectangle(100, 87.4, 76.25, 16.8), 'text.bounds', { tolerance: 1.0 });
    equals(function() {
        return text.hitTest(text.bounds.center) != null;
    }, true);
});
