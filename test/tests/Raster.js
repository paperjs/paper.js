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
