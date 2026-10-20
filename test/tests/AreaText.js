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

QUnit.module('AreaText');

var words = 'Text in an area breaks into lines that fit the area\'s width '
        + 'where they sit, and what doesn\'t fit flows on.';

function createAreaText(area, content) {
    var text = new AreaText(area);
    text.content = content;
    text.fontFamily = testFontFamily;
    text.fontSize = 12;
    return text;
}

function getMetrics(text) {
    return text.view.getFontMetrics('normal 12px ' + testFontFamily);
}

function lineContents(text) {
    return text.lines.map(function(line) {
        return line.content.trim();
    });
}

test('Lines break between words to fit the area', function() {
    var text = createAreaText(new Rectangle(0, 0, 100, 400), words),
        lines = text.lines;
    equals(lines.length > 3, true, 'several lines');
    equals(lines.every(function(line) {
        return line.bounds.left >= 0 && line.bounds.right <= 100.01;
    }), true, 'each within the area\'s width');
    equals(lineContents(text).join(' '), words, 'all of it, word by word');
    equals(text.bounds, new Rectangle(0, 0, 100, 400), 'the area\'s bounds');
    equals(text.lines[0].baseline.point.y, getMetrics(text).ascent,
            'the first baseline, the font\'s ascent below the top');
    equals(text.lines[1].baseline.point.y - text.lines[0].baseline.point.y,
            14.4, 'each line its line height below the one before');
});

test('Overflow and the visible range', function() {
    var text = createAreaText(new Rectangle(0, 0, 100, 30), words);
    equals(text.lines.length, 2, 'what fits');
    equals(text.visibleRange.end < words.length, true, 'the rest overflows');
    equals(text.visibleRange.content.trim(), lineContents(text).join(' '));
});

test('Justified lines fill the area\'s width', function() {
    var text = createAreaText(new Rectangle(0, 0, 100, 400), words);
    text.justification = 'justify';
    var lines = text.lines,
        last = lines[lines.length - 1];
    equals(lines.slice(0, -1).every(function(line) {
        return Math.abs(line.bounds.width - 100) < 0.01;
    }), true, 'all but the last');
    equals(last.bounds.left, 0, 'the last, by justifyLast', {
        tolerance: 0.01 });
    equals(last.bounds.width < 100, true);
});

test('Columns, rows, gutter and inset', function() {
    var text = createAreaText(new Rectangle(0, 0, 210, 30), words);
    text.columns = 2;
    text.gutter = 10;
    var lefts = text.lines.map(function(line) {
        return Math.round(line.bounds.left);
    });
    equals(lefts.join(), '0,0,110,110', 'two lines in each column');
    text.inset = 5;
    equals(text.lines[0].bounds.left, 5, 'inset', { tolerance: 0.01 });
});

test('Any shape: lines fit where they sit', function() {
    var text = createAreaText(new Path.Circle({ center: [100, 100],
            radius: 100, insert: false }), words + ' ' + words);
    var lines = text.lines,
        middle = lines[Math.floor(lines.length / 2)],
        first = lines[0];
    equals(first.bounds.width < middle.bounds.width, true,
            'narrower near the top of a circle');
    equals(first.bounds.left > 0, true, 'and further in');
});

test('Paragraphs, space between them, vertical alignment', function() {
    var text = createAreaText(new Rectangle(0, 0, 200, 200),
            'One\nTwo\n\nFour');
    equals(lineContents(text).join('|'), 'One|Two||Four', 'one per line');
    var y = text.lines[1].baseline.point.y;
    text.paragraphs[1].spaceBefore = 10;
    equals(text.lines[1].baseline.point.y, y + 10, 'space before');
    text.verticalAlign = 'bottom';
    equals(text.lines[3].baseline.point.y + getMetrics(text).descent, 200,
            'the last descent at the bottom', { tolerance: 0.01 });
});

test('Linked area texts flow into each other', function() {
    var first = createAreaText(new Rectangle(0, 0, 100, 30), words),
        second = createAreaText(new Rectangle(0, 50, 100, 400), '');
    first.link(second);
    equals(second.visibleRange.start, first.visibleRange.end,
            'the second shows where the first ends');
    equals(lineContents(first).concat(lineContents(second)).join(' '),
            words, 'all of it, between them');
    first.textPath.bounds.height = 60;
    equals(lineContents(first).length > 2, true,
            'a taller first area shows more');
});

test('The area changing lays the text out again, and logs the text',
        function() {
    var text = createAreaText(new Rectangle(0, 0, 100, 400), words),
        lines = text.lines.length;
    project.trackChanges = true;
    project.takeChanges();
    text.textPath.bounds.width = 300;
    equals(text.lines.length < lines, true, 'fewer, longer lines');
    equals(project.takeChanges().map(function(change) {
        return change.item === text;
    }).join(), 'true', 'logged as the text');
    project.trackChanges = false;
});

test('Rows fill one after the other, each with its columns', function() {
    var text = createAreaText(new Rectangle(0, 0, 210, 70),
            words + ' ' + words);
    text.columns = 2;
    text.rows = 2;
    text.gutter = 10;
    var regions = text.lines.map(function(line) {
        return (line.bounds.top < 30 ? 'top' : 'bottom') + ':'
                + Math.round(line.bounds.left);
    });
    equals(regions.join(), 'top:0,top:0,top:110,top:110,'
            + 'bottom:0,bottom:0,bottom:110,bottom:110', 'in reading order');
});

test('Holes: lines fill both sides of them', function() {
    var area = new CompoundPath({
            children: [
                new Path.Rectangle(new Rectangle(0, 0, 200, 200)),
                new Path.Rectangle(new Rectangle(60, 0, 80, 200))
            ],
            insert: false
        }),
        text = createAreaText(area, words),
        lines = text.lines;
    equals(lines.every(function(line) {
        return line.bounds.right <= 60.01 || line.bounds.left >= 139.99;
    }), true, 'none in the hole');
    equals(lines[1].bounds.left >= 139.99, true, 'the second, right of it');
    equals(lines[1].baseline.point.y, lines[0].baseline.point.y,
            'on the same baseline');
    equals(lineContents(text).join(' '), words, 'all of it, in order');
});

test('Justification and indents', function() {
    var text = createAreaText(new Rectangle(0, 0, 200, 200), 'One\nTwo');
    text.justification = 'right';
    equals(text.lines[0].bounds.right, 200, 'right', { tolerance: 0.01 });
    text.justification = 'center';
    equals(text.lines[0].bounds.center.x, 100, 'center',
            { tolerance: 0.01 });
    text.justification = 'start';
    text.startIndent = 10;
    text.paragraphs[0].firstLineIndent = 5;
    equals(text.lines[0].bounds.left, 15, 'start and first line indents',
            { tolerance: 0.01 });
    equals(text.lines[1].bounds.left, 10, 'the start indent alone',
            { tolerance: 0.01 });
    text.direction = 'rtl';
    equals(text.lines[1].bounds.right, 190, 'start is right in RTL',
            { tolerance: 0.01 });
    text.justification = 'end';
    text.endIndent = 20;
    equals(text.lines[1].bounds.left, 20, 'end is left in RTL',
            { tolerance: 0.01 });
});

test('Vertical alignment in the middle', function() {
    var text = createAreaText(new Rectangle(0, 0, 200, 200), 'One\nTwo');
    text.verticalAlign = 'center';
    var lines = text.lines,
        top = lines[0].bounds.top,
        bottom = lines[1].bounds.bottom;
    equals(top, 200 - bottom, 'as much space above as below',
            { tolerance: 0.01 });
});

test('A word wider than the line takes the line of its own', function() {
    var text = createAreaText(new Rectangle(0, 0, 40, 200),
            'a extraordinarily b');
    equals(lineContents(text).join('|'), 'a|extraordinarily|b');
});

test('The object form, clone() and JSON', function() {
    var text = new AreaText({
            textPath: new Path.Rectangle({
                rectangle: [0, 0, 100, 400],
                insert: false
            }),
            content: words,
            columns: 2,
            gutter: 4,
            fontSize: 12
        });
    equals(text.textPath.bounds, new Rectangle(0, 0, 100, 400), 'textPath');
    equals(text.columns, 2, 'columns');
    var lines = lineContents(text).join('|'),
        clone = text.clone(),
        imported = new AreaText({}).importJSON(text.exportJSON());
    equals(lineContents(clone).join('|'), lines, 'the clone lays out alike');
    equals(imported.gutter, 4, 'gutter, from JSON');
    equals(lineContents(imported).join('|'), lines, 'and so does JSON');
    clone.textPath.bounds.width = 300;
    equals(lineContents(text).join('|'), lines,
            'the clone has a text path of its own');
});

test('The next linked area follows the text changing', function() {
    var first = createAreaText(new Rectangle(0, 0, 100, 30), words),
        second = createAreaText(new Rectangle(0, 50, 100, 400), '');
    first.link(second);
    var start = second.visibleRange.start;
    first.content = 'Short. ' + words;
    equals(second.visibleRange.start !== start, true,
            'the second starts where the first now ends');
    equals(second.visibleRange.start, first.visibleRange.end);
});

test('Hit testing', function() {
    var text = createAreaText(new Rectangle(0, 0, 100, 400), words);
    text.fillColor = 'black';
    var line = text.lines[0].bounds;
    equals(text.hitTest(line.center) != null, true, 'on a line');
    equals(text.hitTest(new Point(50, 390)) == null, true,
            'not below the lines, where the area is empty');
});

test('lineWrap: \'balance\' evens out the lines', function() {
    // An area for two and a half lines, which leaves the last one short:
    var width = view.getTextWidth('normal 12px ' + testFontFamily, [words],
            '0em') / 2.5,
        text = createAreaText(new Rectangle(0, 0, width, 400), words),
        widths = function() {
            return text.lines.map(function(line) {
                return line.bounds.width;
            });
        },
        count = text.lines.length,
        normal = widths();
    text.lineWrap = 'balance';
    var balanced = widths(),
        spread = function(widths) {
            return Math.max.apply(Math, widths) - Math.min.apply(Math, widths);
        };
    equals(balanced.length, count, 'as many lines');
    equals(spread(balanced) < spread(normal), true, 'more even');
    equals(Math.max.apply(Math, balanced) < width, true, 'narrower');
    equals(lineContents(text).join(' '), words, 'all of it');
});

test('lineWrap: \'pretty\' balances the last lines, if the last is short',
        function() {
    // Find a width that leaves a short word alone on the last line:
    var content = words + ' Alas.',
        text = createAreaText(new Rectangle(0, 0, 100, 400), content),
        normal;
    for (var width = 100; width < 300; width++) {
        text.textPath.bounds.width = width;
        normal = lineContents(text);
        if (normal[normal.length - 1] === 'Alas.')
            break;
    }
    var count = normal.length;
    equals(normal[count - 1], 'Alas.', 'a short last line');
    text.lineWrap = 'pretty';
    var pretty = lineContents(text);
    equals(pretty.length, count, 'as many lines');
    equals(pretty[count - 1] !== 'Alas.', true, 'a longer last line');
    equals(pretty.slice(0, count - 4).join(), normal.slice(0, count - 4)
            .join(), 'the lines before the last four as they were');
    equals(pretty.join(' '), content, 'all of it');
});

test('fitHeight() fits the area to its text', function() {
    var text = createAreaText(new Rectangle(0, 0, 100, 30), words);
    equals(text.visibleRange.end < words.length, true, 'it overflows');
    text.fitHeight();
    var lines = text.lines,
        last = lines[lines.length - 1];
    equals(text.visibleRange.end, words.length, 'all of it fits');
    equals(text.textPath.bounds.bottom,
            last.baseline.point.y + getMetrics(text).descent,
            'no taller than to the last descent', { tolerance: 0.02 });
    equals(text.textPath.bounds.top, 0, 'from its top');
    var flat = createAreaText(new Rectangle(0, 10, 100, 0), words);
    equals(flat.fitHeight(), flat, 'returns the text');
    equals(flat.textPath.bounds.width, 100, 'without a height: as wide');
    equals(flat.visibleRange.end, words.length, 'and all of it fits');
    var columns = createAreaText(new Rectangle(0, 0, 210, 30), words);
    columns.columns = 2;
    columns.gutter = 10;
    columns.fitHeight();
    var lefts = columns.lines.map(function(line) {
            return line.bounds.left > 100;
        }),
        second = lefts.indexOf(true);
    equals(Math.abs(lefts.length - 2 * second) <= 1, true,
            'columns of the same length, but for one line');
});

test('Soft hyphens break lines, with a hyphen where they do', function() {
    // An area as wide as the first line with its hyphen, in any font:
    var font = 'normal 12px ' + testFontFamily,
        width = view.getTextWidth(font, ['and hy-'], '0em'),
        text = createAreaText(new Rectangle(0, 0, width + 0.5, 200),
            'and hy\u00adphen\u00adation'),
        lines = text.lines;
    equals(lines[0].content, 'and hy\u00ad', 'at the soft hyphen that fits');
    equals(lines.slice(1).map(function(line) {
        return line.content;
    }).join(''), 'phen\u00adation', 'and on after it');
    equals(lines[0].bounds.width, width, 'with a hyphen\'s width',
            { tolerance: 0.5 });
    text.justification = 'justify';
    equals(text.lines[0].bounds.right, width + 0.5,
            'justified, the hyphen at the end', { tolerance: 0.01 });
});

test('Space before a paragraph is kept once, also where it moves down',
        function() {
    var area = new CompoundPath({
            children: [
                new Path.Rectangle(new Rectangle(0, 0, 100, 300)),
                new Path.Rectangle(new Rectangle(0, 20, 100, 40))
            ],
            insert: false
        }),
        text = createAreaText(area, 'One\nTwo'),
        ascent = getMetrics(text).ascent;
    text.paragraphs[1].spaceBefore = 10;
    var lines = text.lines,
        first = lines[0].baseline.point.y,
        second = lines[1].baseline.point.y,
        steps = (second - first - 14.4 - 10) / 14.4;
    equals(Math.abs(steps - Math.round(steps)) < 0.001, true,
            'the space once, then by line heights');
    equals(second - ascent >= 60 && second - 14.4 - ascent < 60, true,
            'at the first height below the gap');
});

test('Vertical alignment lays out again, to fit the shape', function() {
    var circle = new Path.Circle({ center: [100, 100], radius: 100,
            insert: false }),
        text = createAreaText(circle, words),
        top = text.lines[0].baseline.point.y;
    text.verticalAlign = 'center';
    var lines = text.lines,
        metrics = getMetrics(text);
    equals(lines[0].baseline.point.y > top, true, 'lower down');
    equals(lines.every(function(line) {
        // The band of the line's letters, from their ascent to their descent:
        var y = line.baseline.point.y,
            band = new Rectangle(new Point(line.bounds.left, y - metrics.ascent),
                new Point(line.bounds.right, y + metrics.descent));
        return [band.topLeft, band.topRight, band.bottomLeft, band.bottomRight]
                .every(function(point) {
                    return point.getDistance(circle.position) <= 100.05;
                });
    }), true, 'every line within the circle');
});
