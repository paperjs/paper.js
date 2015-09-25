/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Raster');

test('Create a raster without a source and check its size', function() {
    var raster = new Raster();
    equals(raster.size.toString(), new Size(0, 0).toString(), true);
});

test('Create a raster without a source and set its size', function() {
    var raster = new Raster();
    raster.size = [640, 480];
    equals(raster.size.toString(), new Size(640, 480).toString(), true);
});

asyncTest('Create a raster from a url', function(callback) {
    var raster = new Raster('assets/paper-js.gif');
    raster.onLoad = function() {
        equals(raster.size.toString(), new Size(146, 146).toString(), true);
        callback();
    };
});

asyncTest('Create a raster from a data url', function(callback) {
    var raster = new Raster('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII=');
    raster.onLoad = function() {
        equals(raster.size.toString(), new Size(2, 2).toString(), true);
        callback();
    };
});

asyncTest('Create a raster from a dom image', function(callback) {
    var img = document.createElement('img');
    img.src = 'assets/paper-js.gif';
    document.body.appendChild(img);
    DomEvent.add(img, {
        load: function() {
            var raster = new Raster(img);
            equals(raster.size.toString(), new Size(146, 146).toString(), true);
            document.body.removeChild(img);
            callback();
        }
    });
});

test('Create a raster from a canvas', function(callback) {
    var canvas = CanvasProvider.getCanvas(30, 20);
    var raster = new Raster(canvas);
    equals(raster.size.toString(), new Size(30, 20).toString(), true);
    CanvasProvider.release(canvas);
});

asyncTest('Create a raster from a dom id', function(callback) {
    var img = document.createElement('img');
    img.src = 'assets/paper-js.gif';
    img.id = 'testimage';
    document.body.appendChild(img);
    DomEvent.add(img, {
        load: function() {
            var raster = new Raster('testimage');
            equals(raster.size.toString(), new Size(146, 146).toString(), true);
            document.body.removeChild(img);
            callback();
        }
    });
});

asyncTest('Raster#getPixel / setPixel', function(callback) {
    var raster = new Raster('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII=');
    raster.onLoad = function() {
        equals(raster.getPixel(0, 0), new Color(1, 0, 0, 1));
        equals(raster.getPixel(1, 0), new Color(0, 1, 0, 1));
        equals(raster.getPixel(0, 1), new Color(0, 0, 1, 1));
        equals(raster.getPixel(1, 1), new Color(1, 1, 1, 1));

        // Alpha
        var color = new Color(1, 1, 0, 0.50196);
        raster.setPixel([0, 0], color);
        equals(raster.getPixel([0, 0]), color, 'alpha');
        callback();
    };
});

asyncTest('Raster#getSubCanvas', function(callback) {
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
            return Base.equals(Array.prototype.slice.call(ctx.getImageData(0, 0, 1, 2).data), expected);
        }, true);
        callback();
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
            { tolerance: 10e-4 });
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
            { tolerance: 10e-4 });
});
