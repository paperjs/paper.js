/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
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
	var raster = new Raster('resources/paper-js.gif');
	raster.onLoad = function() {
		equals(raster.size.toString(), new Size(146, 146).toString(), true);
		callback();
	};
});

asyncTest('Create a raster from a dom image', function(callback) {
	var img = document.createElement('img');
	img.src = 'resources/paper-js.gif';
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
	img.src = 'resources/paper-js.gif';
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