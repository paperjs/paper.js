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

QUnit.module('Style');

test('Style defaults', function() {
    var path = new Path();
    equals(function() {
        return path.strokeWidth;
    }, 1);
    equals(function() {
        return path.strokeCap;
    }, 'butt');
    equals(function() {
        return path.strokeJoin;
    }, 'miter');
    equals(function() {
        return path.miterLimit;
    }, 10);
    equals(function() {
        return path.dashOffset;
    }, 0);
    equals(function() {
        return path.dashArray + '';
    }, [] + '');
});

test('Project#currentStyle', function() {
    paper.project.currentStyle.fillColor = 'black';
    var path = new Path();
    equals(path.fillColor, new Color('black'), 'path.fillColor');

    // When changing the current style of the project, the style of
    // paths created using project.currentStyle should not change.
    paper.project.currentStyle.fillColor = 'red';
    equals(path.fillColor, new Color('black'), 'path.fillColor');
});

test('setting Project#currentStyle to an object', function() {
    paper.project.currentStyle = {
        fillColor: 'red',
        strokeColor: 'green'
    };
    var path = new Path();
    equals(path.fillColor, new Color('red'), 'path.fillColor');
    equals(path.strokeColor, new Color('green'), 'path.strokeColor');
});

test('setting Path#style to an object', function() {
    var path = new Path();
    path.strokeWidth = 10;
    path.style = {
        fillColor: 'red',
        strokeColor: 'green'
    };
    equals(path.fillColor, new Color('red'), 'path.fillColor');
    equals(path.strokeColor, new Color('green'), 'path.strokeColor');
    equals(path.strokeWidth, 10,
            'path.strokeWidth, set outside object should not be cleared');
    equals(path.style.fillColor, new Color('red'), 'path.style.fillColor');
    equals(path.style.strokeColor, new Color('green'), 'path.style.strokeColor');
    equals(path.style.strokeWidth, 10,
            'path.style.strokeWidth, set outside object should not be cleared');
});

test('setting Group#style to an object', function() {
    var group = new Group();
    var path = new Path();
    group.addChild(path);
    group.strokeWidth = 10;
    group.style = {
        fillColor: 'red',
        strokeColor: 'green'
    };
    equals(path.fillColor, new Color('red'), 'path.fillColor');
    equals(path.strokeColor, new Color('green'), 'path.strokeColor');
    equals(path.strokeWidth, 10,
            'path.strokeWidth, set outside object should not be cleared');
    equals(path.style.fillColor, new Color('red'), 'path.style.fillColor');
    equals(path.style.strokeColor, new Color('green'), 'path.style.strokeColor');
    equals(path.style.strokeWidth, 10,
            'path.style.strokeWidth, set outside object should not be cleared');
});

test('getting Group#fillColor', function() {
    var group = new Group();
    var path = new Path();
    path.fillColor = 'red';
    group.addChild(path);

    equals(group.fillColor, new Color('red'), 'group.fillColor');

    var secondPath = new Path();
    secondPath.fillColor = 'black';
    group.addChild(secondPath);

    // the group now contains two paths with different fillColors and therefore
    // should return undefined:
    equals(function() {
        return group.fillColor;
    }, undefined);

    //If we remove the first path, it should now return 'black':
    group.children[0].remove();
    equals(group.fillColor, new Color('black'), 'group.fillColor');
});

test('getting Groupy#fillColor 2', function() {
    var star = new Path.Circle({
       center: [100, 100],
       radius: 40,
       fillColor: 'red'
    });

    var circle = new Path.Circle({
       center: [100, 100],
       radius: 25,
       strokeColor: 'black'
    });
    // Create a group of the two items and clip it:
    var group = new Group(circle, star);

    equals(function() {
        return group.fillColor;
    }, undefined);
});

test('setting Group#fillColor and #strokeColor', function() {
    var group = new Group();
    var path = new Path();
    path.fillColor = 'red';
    group.addChild(path);

    var secondPath = new Path();
    secondPath.fillColor = 'blue';
    secondPath.strokeColor = 'red';
    group.addChild(secondPath);

    // Change the fill color of the group:
    group.fillColor = 'black';

    // the paths contained in the group should now both have their fillColor
    // set to black:
    equals(path.fillColor, new Color('black'), 'path.fillColor');
    equals(secondPath.fillColor, new Color('black'), 'secondPath.fillColor');

    // The second path still has its strokeColor set to red:
    equals(secondPath.strokeColor, new Color('red'), 'secondPath.strokeColor');
});

test('setting Group#fillColor and #strokeColor 2', function() {
    var group = new Group();
    var path = new Path();
    path.strokeColor = 'red';
    path.fillColor = 'red';
    group.addChild(path);

    equals(group.fillColor, new Color('red'), 'group.fillColor');

    var secondPath = new Path();
    secondPath.fillColor = 'blue';
    secondPath.strokeColor = 'red';
    group.addChild(secondPath);

    equals(secondPath.fillColor, new Color('blue'), 'secondPath.fillColor');
    equals(secondPath.strokeColor, new Color('red'), 'secondPath.strokeColor');

    // By appending a path with a different fillcolor,
    // the group's fillColor should return undefined:
    equals(group.fillColor, undefined, 'group.fillColor');

    // But, both paths have a red strokeColor, so:
    equals(group.strokeColor, new Color('red'), 'group.strokeColor');

    // Change the fill color of the group's style:
    group.style.fillColor = 'black';

    // the paths contained in the group should now both have their fillColor
    // set to black:
    equals(path.fillColor, new Color('black'), 'path.fillColor');
    equals(secondPath.fillColor, new Color('black'), 'secondPath.fillColor');

    // The second path still has its strokeColor set to red:
    equals(secondPath.strokeColor, new Color('red'), 'secondPath.strokeColor');
});

test('Color change propagation (#1672)', function(assert) {
    // We use this trick to take a snapshot of the current canvas content
    // without any kind of side effect that `item.rasterize()` or other
    // techniques would have.
    function getDataURL() {
        view.update();
        return view.context.canvas.toDataURL();
    }

    var item = new Path.Circle({
        center: view.center,
        radius: 70,
        fillColor: 'red'
    });
    var imageDataBefore = getDataURL();

    // Change style property and check that change was detected.
    item.fillColor.hue += 100;
    var imageDataAfter = getDataURL();

    // We are limited to check that both snapshots are different.
    equals(
        imageDataBefore !== imageDataAfter, true,
        'Canvas content should change after a change of item.fillColor.'
    );
});
