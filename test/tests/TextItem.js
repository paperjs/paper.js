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

test('PointText#tracking', function() {
    var text = new PointText({
        point: [10, 20],
        content: 'Hello'
    });
    equals(text.tracking, 0, 'text.tracking by default');
    text.tracking = 100;
    equals(text.tracking, 100, 'text.tracking');
    var imported = project.importJSON(text.exportJSON());
    equals(imported.tracking, 100, 'imported.tracking from JSON');
});

// node-canvas doesn't support letterSpacing:
if (!isNodeContext) {
    test('PointText#bounds with tracking', function() {
        var text = new PointText({
            fontFamily: 'Arial, Helvetica',
            fontSize: 14,
            point: [50, 100],
            content: 'Hello World!'
        });
        var bounds = text.bounds;
        // Tracking is in thousandths of an em, and canvas adds the spacing
        // after each of the 12 characters, including the last one:
        text.tracking = 500;
        equals(text.bounds, new Rectangle(bounds.x, bounds.y,
                bounds.width + 12 * 7, bounds.height), 'text.bounds');
        text.tracking = 1000;
        equals(text.bounds, new Rectangle(bounds.x, bounds.y,
                bounds.width + 12 * 14, bounds.height), 'text.bounds, 1 em');
        text.justification = 'right';
        equals(text.bounds, new Rectangle(bounds.x - bounds.width - 12 * 14,
                bounds.y, bounds.width + 12 * 14, bounds.height),
                'text.bounds right-justified');
        // No tracking ignores spacing left on the view's context:
        view.context.letterSpacing = '5px';
        text.tracking = 0;
        text.justification = 'left';
        equals(text.bounds, bounds, 'text.bounds without tracking');
        view.context.letterSpacing = '0px';
    });

    test('PointText with tracking', function() {
        // Draw the same text with the same spacing directly on a canvas, and
        // compare it with what the view draws: A tracking of 250 at a font
        // size of 20 is 5 pixels.
        var text = new PointText({
            fontFamily: 'Arial, Helvetica',
            fontSize: 20,
            tracking: 250,
            point: [10, 60],
            content: 'Hello'
        });
        var pixelRatio = view.pixelRatio,
            size = view.viewSize.multiply(pixelRatio),
            canvas = CanvasProvider.getCanvas(size),
            ctx = canvas.getContext('2d');
        ctx.scale(pixelRatio, pixelRatio);
        ctx.font = '20px Arial, Helvetica';
        ctx.letterSpacing = '5px';
        ctx.fillText('Hello', 10, 60);
        view.update(true);
        var actual = view.context.getImageData(0, 0, size.width, size.height),
            expected = ctx.getImageData(0, 0, size.width, size.height),
            differences = 0,
            inked = 0;
        for (var i = 3, l = expected.data.length; i < l; i += 4) {
            if (actual.data[i] !== expected.data[i])
                differences++;
            if (expected.data[i])
                inked++;
        }
        equals(inked > 0, true, 'drawn pixels');
        equals(differences, 0, 'differing pixels');
        text.remove();
    });
}
