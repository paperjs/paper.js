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

if (isNodeContext) {
    test('Create an SVG canvas', function() {
        var canvas = paper.createCanvas(30, 20, 'svg');
        equals(function() {
            return canvas.type;
        }, 'svg');
        equals(function() {
            return /viewBox="0 0 30 20"/.test(canvas.toBuffer().toString());
        }, true);
    });
}

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

test('new Raster(source, position)', function() {
    var raster = new Raster(new Size(30, 20), new Point(5, 6));
    equals(raster.position, new Point(5, 6));
    var raster = new Raster('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', [30, 40]);
    equals(raster.position, new Point(30, 40));
});

test('Raster#clipMask (#1845)', function() {
    // Rasters clip with their rectangle without drawing their image, also after
    // other paths were drawn before them:
    function createClipped(clipItem) {
        clipItem.clipMask = true;
        return new Group([
            new Path.Circle({
                center: [100, 100],
                radius: 50,
                fillColor: 'blue'
            }),
            new Group([clipItem, new Path.Rectangle({
                point: [0, 0],
                size: [200, 200],
                fillColor: 'red'
            })])
        ]);
    }

    function createRaster() {
        var raster = new Raster({ size: [50, 50], position: [50, 50] }),
            ctx = raster.getContext(true);
        ctx.fillStyle = 'green';
        ctx.fillRect(0, 0, 50, 50);
        return raster;
    }

    function createRectangle() {
        return new Path.Rectangle([25, 25], [50, 50]);
    }

    function createCircle() {
        return new Path.Circle({ center: [150, 150], radius: 20 });
    }

    comparePixels(createClipped(createRaster()),
            createClipped(createRectangle()));
    // Also together with other items in a group used as clip mask:
    comparePixels(createClipped(new Group([createRaster(), createCircle()])),
            createClipped(new Group([createRectangle(), createCircle()])));
});

test('Raster#exportJSON() and #importJSON() keep the size (#1598)', function(assert) {
    var done = assert.async();
    var raster = new Raster({ size: [20, 10] });
    var json = raster.exportJSON();
    raster.remove();
    // The size comes before the source, so older versions apply it first:
    equals(/"size":\[20,10\],"source":/.test(json), true, 'exported');
    var imported = project.activeLayer.importJSON(json);
    equals(imported.size, new Size(20, 10), 'before the image has loaded');
    equals(imported.bounds.width, 20, 'bounds before the image has loaded');
    imported.onLoad = function() {
        equals(imported.size, new Size(20, 10), 'after the image has loaded');
        done();
    };
});

test('Raster#importJSON() without a size, as in older saves (#1598)', function(assert) {
    var done = assert.async();
    var source = new Raster({ size: [20, 10], insert: false }).source;
    var imported = project.activeLayer.importJSON(
            JSON.stringify(['Raster', { source: source }]));
    imported.onLoad = function() {
        equals(imported.size, new Size(20, 10), 'after the image has loaded');
        done();
    };
});
