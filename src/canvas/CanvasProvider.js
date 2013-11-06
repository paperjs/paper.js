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

// TODO: Run through the canvas array to find a canvas with the requested
// width / height, so we don't need to resize it?
var CanvasProvider = {
	canvases: [],

	getCanvas: function(width, height, ratio) {
		var canvas,
			init = true;
		if (typeof width === 'object') {
			ratio = height;
			height = width.height;
			width = width.width;
		}
		if (!ratio) {
			ratio = 1;
		} else if (ratio !== 1) {
			width *= ratio;
			height *= ratio;
		}
		if (this.canvases.length) {
			canvas = this.canvases.pop();
		} else {
/*#*/ if (options.environment == 'browser') {
			canvas = document.createElement('canvas');
/*#*/ } else { // options.environment != 'browser'
			canvas = new Canvas(width, height);
			init = false; // It's already initialized through constructor.
/*#*/ } // options.environment != 'browser'
		}
		var ctx = canvas.getContext('2d');
		// If they are not the same size, we don't need to clear them
		// using clearRect and visa versa.
		if (canvas.width === width && canvas.height === height) {
			// +1 is needed on some browsers to really clear the borders
			if (init)
				ctx.clearRect(0, 0, width + 1, height + 1);
		} else {
			canvas.width = width;
			canvas.height = height;
		}
		// We save on retrieval and restore on release.
		ctx.save();
		if (ratio !== 1)
			ctx.scale(ratio, ratio);
		return canvas;
	},

	getContext: function(width, height) {
		return this.getCanvas(width, height).getContext('2d');
	},

	 // release can receive either a canvas or a context.
	release: function(obj) {
		var canvas = obj.canvas ? obj.canvas : obj;
		// We restore contexts on release(), see getCanvas()
		canvas.getContext('2d').restore();
		this.canvases.push(canvas);
	}
};
