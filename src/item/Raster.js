/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

/**
 * @name Raster
 * @class The Raster item represents an image in a Paper.js project.
 * @extends Item
 */
var Raster = this.Raster = Item.extend(/** @lends Raster# */{
	// TODO: Implement url / type, width, height.
	// TODO: Have PlacedSymbol & Raster inherit from a shared class?
	// DOCS: Document Raster constructor.
	/**
	 * Creates a new raster item and places it in the active layer.
	 *
	 * @param {HTMLImageElement|Canvas|string} [object]
	 */
	initialize: function(object) {
		this.base();
		if (object.getContext) {
			this.setCanvas(object);
		} else {
//#ifdef BROWSER
			// If it's a string, get the element with this id first.
			if (typeof object === 'string')
				object = document.getElementById(object);
//#endif // BROWSER
			this.setImage(object);
		}
		this.matrix = new Matrix();
	},

	clone: function() {
		var image = this._image;
		if (!image) {
			// If the Raster contains a Canvas object, we need to create
			// a new one and draw this raster's canvas on it.
			image = CanvasProvider.getCanvas(this._size);
			image.getContext('2d').drawImage(this._canvas, 0, 0);
		}
		var copy = new Raster(image);
		copy.matrix = this.matrix.clone();
		return this._clone(copy);
	},

	/**
	 * The size of the raster in pixels.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		return this._size;
	},

	setSize: function() {
		var size = Size.read(arguments),
			// Get reference to image before changing canvas
			image = this.getImage();
		// Setting canvas internally sets _size
		this.setCanvas(CanvasProvider.getCanvas(size));
		// Draw image back onto new canvas
		this.getContext(true).drawImage(image, 0, 0, size.width, size.height);
	},

	/**
	 * The width of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getWidth: function() {
		return this._size.width;
	},

	/**
	 * The height of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getHeight: function() {
		return this._size.height;
	},

	/**
	 * Pixels per inch of the raster at its current size.
	 *
	 * @type Size
	 * @bean
	 */
	getPpi: function() {
		var matrix = this.matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return new Size(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	/**
	 * The Canvas 2d drawing context of the raster.
	 *
	 * @type Context
	 * @bean
	 */
	getContext: function() {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		// Support a hidden parameter that indicates if the context will be used
		// to modify the Raster object. We can notify such changes ahead since
		// they are only used afterwards for redrawing.
		if (arguments[0])
			this._changed(Change.PIXELS);
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getCanvas: function() {
		if (!this._canvas) {
			this._canvas = CanvasProvider.getCanvas(this._size);
			if (this._image)
				this.getContext(true).drawImage(this._image, 0, 0);
		}
		return this._canvas;
	},

	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._canvas = canvas;
		this._size = new Size(canvas.width, canvas.height);
		this._image = null;
		this._context = null;
		this._changed(Change.GEOMETRY);
	},

	/**
	 * The HTMLImageElement or Canvas of the raster.
	 *
	 * @type HTMLImageElement|Canvas
	 * @bean
	 */
	getImage: function() {
		return this._image || this.getCanvas();
	},

	// TODO: Support string id of image element.
	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._image = image;
		// TODO: Cross browser compatible?
		this._size = new Size(image.naturalWidth, image.naturalHeight);
		this._canvas = null;
		this._context = null;
		this._changed(Change.GEOMETRY);
	},

	// DOCS: document Raster#getSubImage
	/**
	 * @param {Rectangle} rect the boundaries of the sub image in pixel
	 * coordinates
	 *
	 * @return {Canvas}
	 */
	getSubImage: function(rect) {
		rect = Rectangle.read(arguments);
		var canvas = CanvasProvider.getCanvas(rect.getSize());
		canvas.getContext('2d').drawImage(this.getCanvas(), rect.x, rect.y,
				canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
		return canvas;
	},

	/**
	 * Draws an image on the raster.
	 *
	 * @param {HTMLImageELement|Canvas} image
	 * @param {Point} point the offset of the image as a point in pixel
	 * coordinates
	 */
	drawImage: function(image, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).drawImage(image, point.x, point.y);
	},

	/**
	 * Calculates the average color of the image within the given path,
	 * rectangle or point. This can be used for creating raster image
	 * effects.
	 *
	 * @param {Path|Rectangle|Point} object
	 * @return {RGBColor} the average color contained in the area covered by the
	 * specified path, rectangle or point.
	 */
	getAverageColor: function(object) {
		if (!object)
			object = this.getBounds();
		var bounds, path;
		if (object instanceof PathItem) {
			// TODO: What if the path is smaller than 1 px?
			// TODO: How about rounding of bounds.size?
			path = object;
			bounds = object.getBounds();
		} else if (object.width) {
			bounds = new Rectangle(object);
		} else if (object.x) {
			bounds = Rectangle.create(object.x - 0.5, object.y - 0.5, 1, 1);
		}
		// Use a sample size of max 32 x 32 pixels, into which the path is
		// scaled as a clipping path, and then the actual image is drawn in and
		// sampled.
		var sampleSize = 32,
			width = Math.min(bounds.width, sampleSize),
			height = Math.min(bounds.height, sampleSize);
		// Reuse the same sample context for speed. Memory consumption is low
		// since it's only 32 x 32 pixels.
		var ctx = Raster._sampleContext;
		if (!ctx) {
			ctx = Raster._sampleContext = CanvasProvider.getCanvas(
					new Size(sampleSize)).getContext('2d');
		} else {
			// Clear the sample canvas:
			ctx.clearRect(0, 0, sampleSize, sampleSize);
		}
		ctx.save();
		// Scale the context so that the bounds ends up at the given sample size
		ctx.scale(width / bounds.width, height / bounds.height);
		ctx.translate(-bounds.x, -bounds.y);
		// If a path was passed, draw it as a clipping mask:
		if (path)
			path.draw(ctx, { clip: true });
		// Now draw the image clipped into it.
		this.matrix.applyToContext(ctx);
		ctx.drawImage(this._canvas || this._image,
				-this._size.width / 2, -this._size.height / 2);
		ctx.restore();
		// Get pixel data from the context and calculate the average color value
		// from it, taking alpha into account.
		var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
				Math.ceil(height)).data,
			channels = [0, 0, 0],
			total = 0;
		for (var i = 0, l = pixels.length; i < l; i += 4) {
			var alpha = pixels[i + 3];
			total += alpha;
			alpha /= 255;
			channels[0] += pixels[i] * alpha;
			channels[1] += pixels[i + 1] * alpha;
			channels[2] += pixels[i + 2] * alpha;
		}
		for (var i = 0; i < 3; i++)
			channels[i] /= total;
		return total ? Color.read(channels) : null;
	},

	/**
	 * {@grouptitle Pixels}
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @return {RGBColor} the color of the pixel
	 */
	/**
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @return {RGBColor} the color of the pixel
	 */
	getPixel: function(point) {
		point = Point.read(arguments);
		var pixels = this.getContext().getImageData(point.x, point.y, 1, 1).data,
			channels = new Array(4);
		for (var i = 0; i < 4; i++)
			channels[i] = pixels[i] / 255;
		return RGBColor.read(channels);
	},

	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	setPixel: function(point, color) {
		var hasPoint = arguments.length == 2;
		point = Point.read(arguments, 0, hasPoint ? 1 : 2);
		color = Color.read(arguments, hasPoint ? 1 : 2);
		var ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			alpha = color.getAlpha();
		imageData.data[0] = color.getRed() * 255;
		imageData.data[1] = color.getGreen() * 255;
		imageData.data[2] = color.getBlue() * 255;
		imageData.data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, point.x, point.y);
	},

	// DOCS: document Raster#createData
	/**
	 * {@grouptitle Image Data}
	 * @param {Size} size
	 * @return {ImageData}
	 */
	createData: function(size) {
		size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	// DOCS: document Raster#getData
	/**
	 * @param {Rectangle} rect
	 * @return {ImageData}
	 */
	getData: function(rect) {
		rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this.getSize());
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	// DOCS: document Raster#setData
	/**
	 * @param {ImageData} data
	 * @param {Point} point
	 * @return {ImageData}
	 */
	setData: function(data, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_transform: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this.matrix.preConcatenate(matrix);
	},

	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._createBounds(this.matrix._transformBounds(
					new Rectangle(this._size).setCenter(0, 0)));
		return this._bounds;
	},

	getStrokeBounds: function() {
		return this.getBounds();
	},

	draw: function(ctx, param) {
		if (param.selection) {
			var bounds = new Rectangle(this._size).setCenter(0, 0);
			Item.drawSelectedBounds(bounds, ctx, this.matrix);
		} else {
			ctx.save();
			this.matrix.applyToContext(ctx);
			ctx.drawImage(this._canvas || this._image,
					-this._size.width / 2, -this._size.height / 2);
			ctx.restore();
		}
	}
});
