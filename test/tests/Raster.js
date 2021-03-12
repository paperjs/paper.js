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

QUnit.module('Raster');

test('Create a raster without a source and check its size', function() {
    var raster = new Raster();
    equals(raster.size, new Size(0, 0), true);
});

test('Create a raster without a source and set its size', function() {
    var raster = new Raster();
    raster.size = [640, 480];
    equals(raster.size, new Size(640, 480), true);
});

test('Create a raster from a URL', function(assert) {
    var done = assert.async();
    var raster = new Raster('assets/paper-js.gif');
    raster.onLoad = function() {
        equals(raster.size, new Size(146, 146), true);
        done();
    };
    raster.onError = function(event) {
        pushFailure('Loading from a valid local URL should not give an error.');
        done();
    };
});

test('Create a raster from a data URL', function(assert) {
    var done = assert.async();
    var raster = new Raster('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII=');
    raster.onLoad = function() {
        equals(raster.size, new Size(2, 2), true);
        done();
    };
    raster.onError = function(event) {
        pushFailure('Loading from a valid data URL should not give an error.');
        done();
    };
});

test('Create a raster from a dom image', function(assert) {
    var done = assert.async();
    var img = document.createElement('img');
    img.src = 'assets/paper-js.gif';
    document.body.appendChild(img);
    DomEvent.add(img, {
        load: function() {
            var raster = new Raster(img);
            equals(raster.size, new Size(146, 146), true);
            document.body.removeChild(img);
            done();
        },
        error: function() {
            pushFailure('Loading from a valid data URL should not give an error.');
            done();
        }
    });
});

test('Create a raster from a canvas', function() {
    var canvas = paper.createCanvas(30, 20);
    var raster = new Raster(canvas);
    equals(raster.size, new Size(30, 20), true);
});

test('Create a raster from a dom id', function(assert) {
    var done = assert.async();
    var img = document.createElement('img');
    img.src = 'assets/paper-js.gif';
    img.id = 'testimage';
    document.body.appendChild(img);
    DomEvent.add(img, {
        load: function() {
            var raster = new Raster('testimage');
            equals(raster.size, new Size(146, 146), true);
            document.body.removeChild(img);
            done();
        },
        error: function() {
            pushFailure('Loading from a valid data URL should not give an error.');
            done();
        }
    });
});

test('Raster#getPixel / setPixel', function(assert) {
    var done = assert.async();
    var raster = new Raster('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII=');
    raster.onLoad = function() {
        equals(raster.getPixel(0, 0), new Color(1, 0, 0, 1));
        equals(raster.getPixel(1, 0), new Color(0, 1, 0, 1));
        equals(raster.getPixel(0, 1), new Color(0, 0, 1, 1));
        equals(raster.getPixel(1, 1), new Color(1, 1, 1, 1));

        // Alpha
        var color = new Color(1, 1, 0, 0.50196);
        raster.setPixel([0, 0], color);
        equals(raster.getPixel([0, 0]), color, 'alpha', { tolerance: 1e-2 });
        done();
    };
});

test('Raster#getSubCanvas', function(assert) {
    var done = assert.async();
    var raster = new Raster('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII=');
    raster.onLoad = function() {
        var canvas = raster.getSubCanvas(new Rectangle({
            point: [1, 0],
            size: [1, 2]
        }));
        equals(function() {
            return canvas.width;
        }, 1);
        equals(function() {
            return canvas.height;
        }, 2);
        var ctx = canvas.getContext('2d');
        var expected = [
            // green pixel:
            0, 255, 0, 255,
            // white pixel:
            255, 255, 255, 255
        ];
        equals(function() {
            return Base.equals(Base.slice(ctx.getImageData(0, 0, 1, 2).data),
                    expected);
        }, true);
        done();
    };
});

test('Raster#getAverageColor(path)', function() {
    var rect = new Path.Rectangle({
        point: [0, 0],
        size: [100, 100],
        fillColor: new Color(0, 1, 0)
    });
    var circle = new Path.Circle({
        center: [50, 50],
        radius: 25,
        fillColor: new Color(1, 0, 0)
    });
    var raster = paper.project.activeLayer.rasterize(72);
    circle.scale(0.8);
    equals(raster.getAverageColor(circle), circle.fillColor, null,
            { tolerance: 1e-3 });
});

test('Raster#getAverageColor(path) with compound path', function() {
    new Path.Rectangle({
        point: [0, 0],
        size: [100, 100],
        fillColor: new Color(0, 1, 0)
    });
    var path = new Path.Circle({
        center: [50, 50],
        radius: 25
    });
    var path2 = new Path.Circle({
        center: [50, 50],
        radius: 10
    });
    var compoundPath = new CompoundPath(path, path2);
    compoundPath.fillColor = new Color(1, 0, 0);
    var raster = paper.project.activeLayer.rasterize(72);
    path.scale(0.8);
    path2.scale(1.2);
    equals(raster.getAverageColor(compoundPath), new Color(1, 0, 0), null,
            { tolerance: 1e-3 });
});

test('Raster#smoothing defaults to \'low\'', function() {
    var raster = new Raster();
    equals(raster.smoothing, 'low');
});

test('Raster#smoothing', function() {
    var raster = new Raster({ smoothing: 'off' });
    equals(raster.smoothing, 'off');

    raster.smoothing = 'medium';
    equals(raster.smoothing, 'medium');

    raster.smoothing = false;
    equals(raster.smoothing, 'off');

    raster.smoothing = true;
    equals(raster.smoothing, 'low');
});

test('Raster#smoothing setting does not impact canvas context', function(assert) {
    var done = assert.async();
    var raster = new Raster('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII=');
    var view = raster.view;
    var context = view._context;
    raster.onLoad = function() {
        var originalValue = context.imageSmoothingEnabled;
        raster.smoothing = false;
        view.update();
        equals(context.imageSmoothingEnabled, originalValue);
        done();
    };
});

test('new Raster(size[, position])', function() {
    // Size only.
    var raster = new Raster(new Size(100, 100));
    equals(raster.position, new Point(0, 0));
    equals(raster.bounds, new Rectangle(-50, -50, 100, 100));

    var raster = new Raster({size:new Size(100, 100)});
    equals(raster.position, new Point(0, 0));
    equals(raster.bounds, new Rectangle(-50, -50, 100, 100));

    var raster = new Raster({width:100, height:100});
    equals(raster.position, new Point(0, 0));
    equals(raster.bounds, new Rectangle(-50, -50, 100, 100));

    // Size and position.
    var raster = new Raster(new Size(100, 100), new Point(100, 100));
    equals(raster.position, new Point(100, 100));
    equals(raster.bounds, new Rectangle(50, 50, 100, 100));

    var raster = new Raster({size:new Size(100, 100), position:new Point(100, 100)});
    equals(raster.position, new Point(100, 100));
    equals(raster.bounds, new Rectangle(50, 50, 100, 100));

    var raster = new Raster({width:100, height:100, position:new Point(100, 100)});
    equals(raster.position, new Point(100, 100));
    equals(raster.bounds, new Rectangle(50, 50, 100, 100));
});
