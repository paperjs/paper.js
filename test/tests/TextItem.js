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

test('PointText#strokeBounds (#1322)', function() {
    var text = new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 40,
        point: [100, 100],
        content: 'WAVE'
    });
    equals(text.strokeBounds, text.bounds, 'text.strokeBounds without stroke');
    // The stroke adds half its width all around:
    text.strokeColor = 'black';
    text.strokeWidth = 10;
    equals(text.strokeBounds, text.bounds.expand(10), 'text.strokeBounds');
    // The stroke of text always scales with it:
    var bounds = text.internalBounds.expand(10);
    text.rotate(30);
    text.scale(2, 1);
    equals(text.strokeBounds, text.matrix._transformBounds(bounds),
            'text.strokeBounds after transforming');
});

test('PointText with stroke and opacity (#1322)', function() {
    // Draw the text with a semi-transparent stroke color directly, and with
    // opacity through a separate canvas, which needs to fit the stroke. Use a
    // single glyph, as the strokes of overlapping glyphs add up when drawn
    // directly:
    function createText(opacity, strokeColor) {
        var text = new PointText({
            fontFamily: 'Arial, Helvetica',
            fontSize: 40,
            point: [20, 60],
            content: 'W',
            fillColor: null,
            strokeColor: strokeColor,
            strokeWidth: 10,
            strokeJoin: 'round',
            opacity: opacity
        });
        // Rasterize on a background large enough for the stroke:
        return new Group(new Shape.Rectangle({
            rectangle: text.bounds.expand(200),
            fillColor: 'white'
        }), text);
    }
    comparePixels(createText(0.5, 'black'),
            createText(1, new Color(0, 0, 0, 0.5)));
});
