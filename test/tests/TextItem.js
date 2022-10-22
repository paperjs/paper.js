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


test('AreaText(rectangle)', function () {
    var point = new Point(50, 30);
    var size = new Size(100, 100);

    var text = new AreaText(new Rectangle(point, size));

    equals(function () {
        return Base.equals(new Rectangle(point, size), text.rectangle);
    }, true, 'Rectangle should equal to its initial value by default');


    text.rectangle = new Rectangle(new Point(50, 50), size);

    equals(function () {
        return Base.equals(new Rectangle(new Point(50, 50), size), text.rectangle);
    }, true, 'Rectangles should equal');

    text.setWidth(900);
    equals(function () {
        return text.rectangle.width;
    }, 900, 'Widths should equal');

    text.setHeight(200);
    equals(function () {
        return text.rectangle.height;
    }, 200, 'Heights should equal');
});

test('AreaText(editMode)', function () {
    var point = new Point(50, 30);
    var size = new Size(100, 100);
    var text = new AreaText(new Rectangle(point, size));

    // default case
    equals(text.editMode, false, 'text.editMode should be `false` by default');

    text.editMode = true;

    // check the element creation
    equals(text.editMode, true, 'text.editMode should be `true`');
    equals(function () {
        return !!document.body.querySelector('#' + text.htmlId);
    }, true, 'Html element for the editing exists');


    // check that the element changes after edit mode is back to false
    equals(function () {
        var editElement = document.body.querySelector('#' + text.htmlId);
        editElement.content = '';
        editElement.value = editElement.value + 'TEST TEXT';

        text.editMode = false;
        return text.content === 'TEST TEXT';
    }, true, 'Html element should change the content of the text area');


    text.editMode = false;

    // area-text can have multiple lines
    equals(function () {
        var canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        text.content = 'Hello! This is a multiline text. It should contain multiple lines.';
        text._wrap(canvas.getContext('2d'));
        return text._lines.length;
    }, 4, 'Should have multiple lines');


    // emit the double click and check that the editMode has been changed
    equals(function () {
        var dblclickEvt = document.createEvent("MouseEvents");
        dblclickEvt.initEvent("dblclick");
        text.view.context.canvas.dispatchEvent(dblclickEvt);
        return text.editMode;
    }, true, 'Should have editMode = true after double click');
});


// _boundsGenerators: ['auto-height', 'auto-width', 'fixed']
test('AreaText(boundsGenerators)', function () {
    var point = new Point(30, 30);
    var size = new Size(100, 100);
    var text = new AreaText(new Rectangle(point, size));
    var editElement = document.body.querySelector('#' + text.htmlId);

    // check width
    equals(function () {
        text.boundsGenerator = 'fixed';
        text.editMode = true;
        return +editElement.parentElement.style.width.replace('px', '');
    }, text.rectangle.width);

    // check height
    equals(function () {
        text.boundsGenerator = 'fixed';
        text.editMode = true;
        return +editElement.parentElement.style.height.replace('%', '');
    }, 100);
});
