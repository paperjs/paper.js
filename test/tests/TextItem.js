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
    compareColors(text.fillColor, new Color(0, 0, 0), 'text.fillColor should be black by default');
    comparePoints(text.point, { x: 100, y: 100 }, 'text.point');
    comparePoints(text.bounds.point, { x: 100, y: 87.4 }, 'text.bounds.point');
    compareSize(text.bounds.size, { width: 77, height: 16.8 }, 'text.bounds.size', 1.0);
    equals(function() {
        return text.hitTest(text.bounds.center) != null;
    }, true);
});
