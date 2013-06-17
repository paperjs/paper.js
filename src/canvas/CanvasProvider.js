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

	getCanvas: function(width, height) {
		var size = height === undefined ? width : new Size(width, height),
			canvas,
			init = true;
		if (this.canvases.length) {
			canvas = this.canvases.pop();
		} else {
/*#*/ if (options.browser) {
			canvas = document.createElement('canvas');
/*#*/ } else { // !options.browser
			canvas = new Canvas(size.width, size.height);
			init = false; // It's already initialized through constructor.
/*#*/ } // !options.browser

		}
		var ctx = canvas.getContext('2d');
		// We save on retrieval and restore on release.
		ctx.save();
		// If they are not the same size, we don't need to clear them
		// using clearRect and visa versa.
		if (canvas.width === size.width && canvas.height === size.height) {
			// +1 is needed on some browsers to really clear the borders
			if (init)
				ctx.clearRect(0, 0, size.width + 1, size.height + 1);
		} else {
			canvas.width = size.width;
			canvas.height = size.height;
		}
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
