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

QUnit.module('View');

test('view.zoom of mirrored view (#1411)', function() {
    // The view is 100x100, so it mirrors and zooms around (50, 50).
    view.scale(1, -1);
    equals(view.zoom, 1, 'view.zoom');
    view.zoom = 2;
    equals(view.zoom, 2, 'view.zoom');
    equals(view.scaling, new Point(2, -2), 'view.scaling');
    // (x, y) -> (2 * x - 50, 100 - (2 * y - 50))
    equals(view.matrix, new Matrix(2, 0, 0, -2, -50, 150), 'view.matrix');
});

test('view.fitBounds() with empty rectangles', function() {
    ['contain', 'cover'].forEach(function(fit) {
        // The view is 100x100. An empty rectangle can't scale the view, so it
        // only centers on it, keeping its zoom:
        view.matrix = new Matrix();
        view.zoom = 2;
        view.fitBounds(new Rectangle(30, 40, 0, 0), fit);
        equals(view.zoom, 2, 'empty: view.zoom, ' + fit);
        equals(view.center, new Point(30, 40), 'empty: view.center, ' + fit);
        // A horizontal line can only scale the view by its width of 400:
        view.matrix = new Matrix();
        view.fitBounds(new Rectangle(0, 0, 400, 0), fit);
        equals(view.scaling, new Point(0.25, 0.25),
                'line: view.scaling, ' + fit);
        equals(view.center, new Point(200, 0), 'line: view.center, ' + fit);
    });
    view.matrix = new Matrix();
});

test('view.zoom with values that aren\'t positive numbers (#1433)', function() {
    view.zoom = 2;
    [0, -1, NaN, Infinity].forEach(function(zoom) {
        view.zoom = zoom;
        equals(view.zoom, 2, 'view.zoom = ' + zoom);
    });
    // The view is 100x100, so at zoom 2 it shows 50x50 around its center:
    equals(view.bounds, new Rectangle(25, 25, 50, 50), 'view.bounds');
});

test('view.update(force) (#1913)', function() {
    var path = new Path.Rectangle({
        from: [0, 0],
        to: [100, 100],
        fillColor: 'red'
    });
    var ctx = view.element.getContext('2d');

    function getPixel() {
        var pixelRatio = view.pixelRatio;
        return Base.slice(ctx.getImageData(50 * pixelRatio, 50 * pixelRatio,
                1, 1).data);
    }

    equals(view.update(), true, 'view.update() after changes');
    equals(getPixel(), [255, 0, 0, 255], 'pixel after view.update()');
    // Clear the canvas behind the view's back, as e.g. a web font that loads
    // after drawing changes the result without changing the project:
    ctx.clearRect(0, 0, view.element.width, view.element.height);
    equals(view.update(), false, 'view.update() without changes');
    equals(getPixel(), [0, 0, 0, 0], 'pixel after view.update()');
    equals(view.update(true), true, 'view.update(true) without changes');
    equals(getPixel(), [255, 0, 0, 255], 'pixel after view.update(true)');
    equals(view.update(), false, 'view.update() after view.update(true)');
    path.remove();
});

test('view.fitBounds(rectangle[, fit]) (#1688)', function() {
    // The view is 100x100. Start each fit from a view that is zoomed and
    // scrolled away, as fitting doesn't depend on the previous state.
    function fit(rectangle, mode) {
        view.zoom = 3;
        view.center = [500, 500];
        view.fitBounds(rectangle, mode);
    }

    // A rectangle wider than the view, centered at 200, 100: To contain it, the
    // view needs to show all 400 of its width, to cover it its 200 of height.
    var wide = new Rectangle(0, 0, 400, 200);
    fit(wide);
    equals(view.zoom, 0.25, 'wide: view.zoom');
    equals(view.center, new Point(200, 100), 'wide: view.center');
    equals(view.bounds, new Rectangle(0, -100, 400, 400), 'wide: view.bounds');
    fit(wide, 'cover');
    equals(view.zoom, 0.5, 'wide, cover: view.zoom');
    equals(view.bounds, new Rectangle(100, 0, 200, 200),
            'wide, cover: view.bounds');
    // Containing it in a stretched view undoes the stretching of its axes:
    view.scale(2, 1);
    view.fitBounds(wide);
    equals(view.scaling, new Point(0.25, 0.25), 'stretched: view.scaling');
    equals(view.bounds, new Rectangle(0, -100, 400, 400),
            'stretched: view.bounds');

    // A rectangle taller than the view, centered at 35, 120: To contain it,
    // the view needs to show all 200 of its height, to cover it its 50 of
    // width.
    var tall = new Rectangle(10, 20, 50, 200);
    fit(tall);
    equals(view.zoom, 0.5, 'tall: view.zoom');
    equals(view.bounds, new Rectangle(-65, 20, 200, 200), 'tall: view.bounds');
    fit(tall, 'cover');
    equals(view.zoom, 2, 'tall, cover: view.zoom');
    equals(view.bounds, new Rectangle(10, 95, 50, 50),
            'tall, cover: view.bounds');
    view.zoom = 1;
    view.fitBounds(10, 20, 50, 200);
    equals(view.bounds, new Rectangle(-65, 20, 200, 200),
            'tall, passed as numbers: view.bounds');
    view.fitBounds(10, 20, 50, 200, 'cover');
    equals(view.bounds, new Rectangle(10, 95, 50, 50),
            'tall, cover, passed as numbers: view.bounds');

    // A mirrored view stays mirrored:
    view.matrix = new Matrix(1, 0, 0, -1, 0, 100);
    view.fitBounds(wide);
    equals(view.scaling, new Point(0.25, -0.25), 'mirrored: view.scaling');
    equals(view.bounds, new Rectangle(0, -100, 400, 400),
            'mirrored: view.bounds');

    // In a view rotated by 45°, the wide rectangle spans (400 + 200) / √2 in
    // both directions of the view, so the view's sides need to show that
    // much, and its bounds are √2 times as large: 600 in both directions.
    view.matrix = new Matrix();
    view.rotation = 45;
    view.fitBounds(wide);
    equals(view.rotation, 45, 'rotated: view.rotation');
    equals(view.zoom, 100 / (600 / Math.SQRT2), 'rotated: view.zoom');
    equals(view.bounds, new Rectangle(-100, -200, 600, 600),
            'rotated: view.bounds');
    view.matrix = new Matrix();
});

test('view.project (#1634)', function() {
    var current = paper,
        scope = new PaperScope().setup(new Size(10, 10)),
        project = scope.project,
        view = scope.view;
    current.activate();
    equals(function() {
        return view.project === project && project.view === view;
    }, true);
    // The view of the default scope displays its own project:
    equals(function() {
        return current.view.project === current.project
                && current.project !== project;
    }, true);
    scope.remove();
});

if (!isNodeContext) {
    test('view.viewSize of canvases with padding and border (#1160, #2033)', function() {
        // The padding of 10 and the border of 5 add 30 to the content box,
        // which is the size of the view:
        function createCanvas(boxSizing, resize) {
            var canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 100;
            canvas.style.padding = '10px';
            canvas.style.border = '5px solid black';
            canvas.style.boxSizing = boxSizing;
            if (resize) {
                canvas.setAttribute('resize', '');
                canvas.style.width = '300px';
                canvas.style.height = '150px';
            }
            document.body.appendChild(canvas);
            return canvas;
        }

        function getBorderBoxSize(canvas) {
            var rect = canvas.getBoundingClientRect();
            return new Size(rect.width, rect.height);
        }

        function resizeWindow() {
            var event = document.createEvent('Event');
            event.initEvent('resize', false, false);
            window.dispatchEvent(event);
        }

        // Without the resize attribute, the view keeps the size of the canvas
        // when setting up projects for it again and again:
        ['content-box', 'border-box'].forEach(function(boxSizing) {
            var canvas = createCanvas(boxSizing);
            for (var i = 0; i < 3; i++) {
                var project = new Project(canvas);
                equals(project.view.viewSize, new Size(200, 100),
                        boxSizing + ': view.viewSize, setup ' + i);
                equals(getBorderBoxSize(canvas), new Size(230, 130),
                        boxSizing + ': border box, setup ' + i);
                project.remove();
            }
            document.body.removeChild(canvas);
        });

        // With the resize attribute, the view takes the size of the content box
        // set through CSS, also after resizing:
        [
            ['content-box', new Size(300, 150)],
            ['border-box', new Size(270, 120)]
        ].forEach(function(entry) {
            var boxSizing = entry[0],
                canvas = createCanvas(boxSizing, true),
                project = new Project(canvas);
            for (var i = 0; i < 3; i++) {
                equals(project.view.viewSize, entry[1],
                        boxSizing + ': view.viewSize with resize, ' + i);
                resizeWindow();
            }
            project.remove();
            document.body.removeChild(canvas);
        });
    });
}
