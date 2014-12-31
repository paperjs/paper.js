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

module('TextItem');

test('PointText', function() {
    var text = new PointText({
        fontFamily: 'Arial',
        fontSize: 14,
        point: [100, 100],
        content: 'Hello World!'
    });
    equals(text.fillColor, new Color(0, 0, 0), 'text.fillColor should be black by default');
    equals(text.point, new Point(100, 100), 'text.point');
    equals(text.bounds.point, new Point(100, 87.4), 'text.bounds.point');
    equals(text.bounds.size, new Size(77, 16.8), 'text.bounds.size', { tolerance: 1.0 });
    equals(function() {
        return text.hitTest(text.bounds.center) != null;
    }, true);
});
