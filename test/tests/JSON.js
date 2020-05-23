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

QUnit.module('JSON');

function testExportImportJSON(project) {
    // Use higher precision than in comparissons, for bounds
    var json = project.exportJSON({ precision: 8 });
    var project2 = new Project();
    project2.importJSON(json);
    equals(project, project2, null, { dontShareProject: true });
}

test('Circles', function() {
    var topLeft = new Point(200, 200);
    var size = new Size(150, 100);
    var rectangle = new Rectangle(topLeft, size);
    var path = new Path.Ellipse(rectangle);
    path.fillColor = 'black';

    var topLeft = new Point(5, 400);
    var size = new Size(100, 50);
    var rectangle = new Rectangle(topLeft, size);
    var path = new Path.Ellipse(rectangle);
    path.fillColor = 'yellow';

    var path = new Path.Circle(new Point(50, 50), 25);
    path.fillColor = 'red';

    testExportImportJSON(paper.project);
});

test('CompoundPath', function() {
    paper.project.currentStyle.fillColor = 'black';
    var path1 = new Path.Rectangle([200, 200], [100, 100]);
    var path2 = new Path.Rectangle([50, 50], [200, 200]);
    var path3 = new Path.Rectangle([0, 0], [400, 400]);
    new CompoundPath(path1, path2, path3);

    testExportImportJSON(paper.project);
});

test('Empty Path', function() {
    new Path();
    testExportImportJSON(paper.project);
});

test('Gradients', function() {
    var path = new Path.Circle([100, 100], 40);
    var gradient = new Gradient(['yellow', 'red', 'black'], true);
    var from = path.position;
    var to = path.bounds.rightCenter;
    var gradientColor = new Color(gradient, from, to);
    path.fillColor = gradientColor;
    path.strokeColor = 'black';
    testExportImportJSON(paper.project);
});

test('Group transform', function() {
    var circle1 = new Path.Circle([100, 100], 50);
    circle1.fillColor = 'red';
    var circle2 = new Path.Circle([200, 100], 50);
    circle2.fillColor = 'blue';
    var group = new Group(circle1, circle2);
    group.translate([100, 100]);
    group.scale(0.5);
    group.rotate(10);
    testExportImportJSON(paper.project);
});

test('Rectangle testing', function() {
    var point1 = new Point(10, 10);
    var size1 = new Size(50, 50);
    var rectangle1 = new Rectangle(point1, size1);
    var path1 = new Path.Rectangle(rectangle1);
    path1.strokeColor = 'black';
    path1.fillColor = 'red';
    path1.name = 'square1';
    path1.strokeCap = 'square';
    path1.opacity = 0.1;
    path1.dashArray = [5, 2];
    path1.dashOffset = 0;

    var point2 = new Point(75, 75);
    var point22 = new Point(100, 100);
    var path2 = new Path.Rectangle(point2, point22);
    path2.strokeColor = 'red';
    path2.strokeWidth = 4;
    path2.fillColor = 'blue';
    path2.name = 'square2';
    path2.strokeCap = 'butt';

    var point3 = new Point(150, 150);
    var size3 = new Size(50, 50);
    var rectangle3 = new Rectangle(point3, size3);
    var path3 = new Path.Rectangle(rectangle3);
    path3.strokeColor = 'blue';

    var point4 = new Point(200, 200);
    var size4 = new Size(100, 100);
    var rectangle4 = new Rectangle(point4, size4);
    var cornerSize4 = new Size(30, 30);
    var path4 = new Path.Rectangle(rectangle4, cornerSize4);
    path4.strokeColor= 'yellow';
    path4.fillColor='purple';
    testExportImportJSON(paper.project);
});

test('Symbols', function() {
    var ellipse = new Path.Ellipse({
        from: [0, 0],
        to: [200, 100],
        fillColor: 'red'
    });
    var definition = new SymbolDefinition(ellipse);
    var p1 = definition.place([100, 100]);
    p1.rotate(45);
    var p2 = definition.place([300, 200]);
    p2.rotate(-30);

    testExportImportJSON(paper.project);
});

test('PointText testing', function() {
    var text = new PointText(new Point(50, 100));
    text.fillColor = 'black';
    text.content = 'This is a test';

    var text = new PointText(new Point(100, 150));
    text.fillColor = 'red';
    text.strokeWidth = '4';
    text.content = 'This is also a test';

    text.rotate(45);
    text.shear(0.85, 0.15);
    text.scale(0.85, 2);
    testExportImportJSON(paper.project);
});

test('transform test 1', function() {
    var circlePath = new Path.Circle(new Point(280, 100), 25);
    circlePath.strokeColor = 'black';
    circlePath.fillColor = 'white';

    var clones = 30;
    var angle = 360 / clones;

    for (var i = 0; i < clones; i++) {
        var clonedPath = circlePath.clone();
        clonedPath.rotate(angle * i, circlePath.bounds.topLeft);
    }
    testExportImportJSON(paper.project);
});

test('transform test 2', function() {
    var path = new Path.Rectangle(new Point(50, 50), new Size(100, 50));
    path.style = {
        fillColor: 'white',
        strokeColor: 'black'
    };
    var copy = path.clone();
    copy.strokeColor = 'red';
    copy.rotate(-45);
    copy.scale(0.5);
    testExportImportJSON(paper.project);
});

test('Item#name', function() {
    var path = new Path({
        name: 'dave'
    });
    testExportImportJSON(paper.project);
});

test('Item#data', function() {
    var path = new Path();
    path.data = {
        string: '----',
        number: 1234,
        array: ['a ray', 'some rays'],
        bool: true,
        nil: null,
        point: new Point(12, 34),
        size: new Size(12, 34),
        rectangle: new Rectangle([12, 34], [56, 78]),
        deep: {
            deeper: {
                deepest: true
            }
        }
    };
    testExportImportJSON(paper.project);
});

test('Color', function() {
    var path = new Path({
        fillColor: new Color(1, 1, 0, 0.5)
    });
    testExportImportJSON(paper.project);
});

test('Color#importJSON()', function() {
    var topLeft = [100, 100];
    var bottomRight = [200, 200];

    var path = new Path.Rectangle({
        topLeft: topLeft,
        bottomRight: bottomRight,
        // Fill the path with a gradient of three color stops
        // that runs between the two points we defined earlier:
        fillColor: {
            gradient: {
                stops: [
                    ['yellow', 0],
                    ['red', 0.5],
                    ['blue', 1]
                ]
            },
            origin: topLeft,
            destination: bottomRight
        }
    });

    var json = path.fillColor.exportJSON(),
        id = path.fillColor.gradient._id,
        color = new Color(),
        str = '[["dictionary",{"#' + id + '":["Gradient",[[[1,1,0],0],[[1,0,0],0.5],[[0,0,1],1]],false]}],["Color","gradient",["#' + id + '"],[100,100],[200,200]]]';

    equals(json, str);

    equals(function() {
        return color.importJSON(json) === color;
    }, true);

    equals(function() {
        return color.equals(path.fillColor);
    }, true);
});

test('Path#importJSON()', function() {
    var path = new Path();
    var layer = project.activeLayer;
    equals(function() { return path.parent === layer; }, true);
    path.importJSON('["Path",{"segments":[[[50,100],[0,27.61424],[0,-27.61424]],[[100,50],[-27.61424,0],[27.61424,0]],[[150,100],[0,-27.61424],[0,27.61424]],[[100,150],[27.61424,0],[-27.61424,0]]],"closed":true,"fillColor":[1,0,0]}]');
    equals(function() { return path.bounds; }, { x: 50, y: 50, width: 100, height: 100 });
    equals(function() { return path.fillColor; }, { red: 1, green: 0, blue: 0 });
    equals(function() { return layer.firstChild === path; }, true);
    equals(function() { return path.parent === layer; }, true);
});

test('Item#importJSON() does not override Item#insert()', function() {
    var path = new Path();
    equals(typeof path.insert, 'function');
    path.importJSON(path.exportJSON());
    equals(typeof path.insert, 'function');
});
