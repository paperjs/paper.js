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

QUnit.module('PathText');

function createPathText(from, to, content) {
    return new PathText({
        textPath: new Path.Line(from, to),
        content: content,
        fontFamily: testFontFamily,
        fontSize: 12
    });
}

function letterWidth(text, content) {
    return text.view.getTextWidth('normal 12px ' + testFontFamily, [content],
            '0em');
}

test('The text path guides the text', function() {
    var text = createPathText([0, 0], [200, 0], 'Hello');
    equals(text.textPath instanceof Path, true, 'textPath');
    equals(text.children, null, 'which isn\'t one of its children');
    equals(text.firstChild, null, 'nor its first child');
    equals(project.getItems({ class: Path }).indexOf(text.textPath), -1,
            'nor found among the project\'s items');
    equals(text.bounds.left, 0, 'the text starts at the path\'s start',
            { tolerance: 0.01 });
    equals(text.bounds.width, letterWidth(text, 'Hello'), 'and runs along it',
            { tolerance: 0.01 });
});

test('Letters turn to the path\'s direction', function() {
    var text = createPathText([0, 0], [0, 200], 'Down');
    // Along a vertical path, the letters stand on their sides, so the text is
    // as tall as it is wide along the path:
    equals(text.bounds.height, letterWidth(text, 'Down'), 'along the path',
            { tolerance: 0.01 });
    equals(text.bounds.width, 14.4, 'across it, one line height',
            { tolerance: 0.01 });
});

test('A text path with a transformation of its own', function() {
    var path = new Path.Line([0, 0], [200, 0]);
    path.applyMatrix = false;
    path.rotate(90, [50, 0]);
    var text = new PathText({
        textPath: path,
        content: 'Down',
        fontFamily: testFontFamily,
        fontSize: 12
    });
    equals(text.bounds.height, letterWidth(text, 'Down'),
            'the letters follow the transformed path', { tolerance: 0.01 });
    equals(text.bounds.width, 14.4, 'across it, one line height',
            { tolerance: 0.01 });
});

test('Offsets, overflow and the visible range', function() {
    var text = createPathText([0, 0], [200, 0], 'Hello world'),
        width = letterWidth(text, 'Hello ');
    text.endOffset = width + 1;
    equals(text.visibleRange.content, 'Hello ', 'what fits');
    text.startOffset = 50;
    text.endOffset = null;
    equals(text.bounds.left, 50, 'from the start offset', { tolerance: 0.01 });
    equals(text.visibleRange.content, 'Hello world', 'all of it again');
});

test('Changing the path lays the text out again', function() {
    var text = createPathText([0, 0], [20, 0], 'Hello world');
    var shown = text.visibleRange.content.length;
    text.textPath.lastSegment.point = [300, 0];
    equals(text.visibleRange.content, 'Hello world', 'the longer path fits it');
    equals(shown < 11, true, 'which the short one didn\'t');
});

test('Compound paths: one path after the other', function() {
    var width = letterWidth(new PointText(), 'AB'),
        text = new PathText({
            textPath: new CompoundPath({ children: [
                new Path.Line([0, 0], [width + 1, 0]),
                new Path.Line([0, 50], [200, 50])
            ] }),
            content: 'ABCD',
            fontFamily: testFontFamily,
            fontSize: 12
        });
    equals(text.visibleRange.content, 'ABCD', 'all of it fits');
    equals(text.bounds.bottom > 50, true, 'some of it on the second path');
});

test('Linked text items flow into each other', function() {
    var first = createPathText([0, 0], [40, 0], 'One two three four'),
        second = createPathText([0, 50], [400, 50], 'five');
    equals(first.link(second), true, 'link()');
    equals(first.isLinked() && second.isLinked(), true, 'isLinked()');
    equals(first.story, second.story, 'one story');
    equals(first.content, 'One two three fourfive', 'joined');
    equals(first.nextTextItem, second, 'nextTextItem');
    equals(second.previousTextItem, first, 'previousTextItem');
    var visible = first.visibleRange;
    equals(visible.start, 0);
    equals(second.visibleRange.start, visible.end,
            'the second shows where the first ends');
    equals(second.visibleRange.end, first.content.length,
            'the rest');
    first.range(0, 3).fillColor = 'red';
    equals(second.story.range(0, 3).fillColor, new Color('red'),
            'styles are the story\'s');
    equals(first.link(second), false, 'already linked');
    var bounds = second.bounds;
    first.textPath.lastSegment.point = [80, 0];
    equals(second.visibleRange.start > visible.end, true,
            'a longer first path shows more');
    equals(second.bounds.width < bounds.width, true,
            'and leaves the second less, in its bounds too');
});

test('Unlinking', function() {
    var a = createPathText([0, 0], [400, 0], 'One'),
        b = createPathText([0, 50], [400, 50], 'Two'),
        c = createPathText([0, 100], [400, 100], 'Three');
    a.link(b);
    b.link(c);
    equals(a.story.textItems.length, 3);
    equals(b.unlink(), true, 'unlink()');
    equals(b.content, '', 'the item leaves with nothing');
    equals(a.content, 'OneTwoThree', 'the story keeps all of it');
    equals(a.nextTextItem, c, 'and flows on through the others');
    a.link(b);
    equals(a.story.textItems.map(function(item) {
        return item === a ? 'a' : item === b ? 'b' : 'c';
    }).join(), 'a,b,c', 'linked again after a');
    equals(b.unlink('after'), true, 'unlink(\'after\')');
    equals(c.isLinked(), false, 'the story breaks after b');
    equals(a.story.textItems.length, 2);
    equals(a.unlink('before'), false, 'nothing before the first');
});

test('JSON keeps the text path and offsets', function() {
    var text = createPathText([0, 0], [200, 0], 'Hello');
    text.startOffset = 20;
    var imported = new PathText({}).importJSON(text.exportJSON());
    equals(imported.textPath.length, 200, 'the text path');
    equals(imported.startOffset, 20, 'startOffset');
    equals(imported.content, 'Hello');
});

test('Changes of the text path are logged as the text\'s', function() {
    var text = createPathText([0, 0], [200, 0], 'On a path');
    project.trackChanges = true;
    project.takeChanges();
    text.textPath.lastSegment.point = [300, 0];
    equals(project.takeChanges().map(function(change) {
        return change.item === text ? 'text' : change.item.className;
    }).join(), 'text', 'as the text\'s');
    project.trackChanges = false;
});
