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

/**
 * @name Raster
 *
 * @class The Raster item represents an image in a Paper.js project.
 *
 * @extends PlacedItem
 */
var Raster = this.Raster = PlacedItem.extend(/** @lends Raster# */{
	_type: 'raster',
	_serializeFields: {
		source: null
	},
	// Raster doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsGetter: 'getBounds',

	// TODO: Implement type, width, height.
	// TODO: Have PlacedSymbol & Raster inherit from a shared class?
	// DOCS: Document Raster constructor.
	/**
	 * Creates a new raster item and places it in the active layer.
	 *
	 * @param {HTMLImageElement|Canvas|string} [object]
	 */
	initialize: function(arg0, arg1) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or an image (arg0)
		// and a point where it should be placed (arg1).
		this.base(arg1 !== undefined && Point.read(arguments, 1));
		// If we can handle setting properties through object literal, we're all
		// set. Otherwise we need to check the type of arg0:
		if (!this._setProperties(arg0)) {
			if (arg0.getContext) {
				this.setCanvas(arg0);
			} else if (typeof arg0 === 'string') {
				// Both data-urls and normal urls are supported here!
				this.setSource(arg0);
			} else {
				this.setImage(arg0);
			}
		}
	},

	clone: function() {
		var element = this._image;
		if (!element) {
			// If the Raster contains a Canvas object, we need to create
			// a new one and draw this raster's canvas on it.
			element = CanvasProvider.getCanvas(this._size);
			element.getContext('2d').drawImage(this._canvas, 0, 0);
		}
		var copy = new Raster(element);
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
		var size = Size.read(arguments);
		if (!this._size.equals(size)) {
			// Get reference to image before changing canvas
			var element = this.getElement();
			// Setting canvas internally sets _size
			this.setCanvas(CanvasProvider.getCanvas(size));
			// Draw element back onto new canvas
			this.getContext(true).drawImage(element, 0, 0,
					size.width, size.height);
		}
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

	isEmpty: function() {
		return this._size.width == 0 && this._size.height == 0;
	},

	/**
	 * Pixels per inch of the raster at its current size.
	 *
	 * @type Size
	 * @bean
	 */
	getPpi: function() {
		var matrix = this._matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return Size.create(
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
	getContext: function(/* modify */) {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		// Support a hidden parameter that indicates if the context will be used
		// to modify the Raster object. We can notify such changes ahead since
		// they are only used afterwards for redrawing.
		if (arguments[0]) {
			// Also set _image to null since the Raster stops representing it.
			// NOTE: This should theoretically be in our own _changed() handler
			// for ChangeFlag.PIXELS, but since it's only happening in one place
			// this is fine:
			this._image = null;
			this._changed(/*#=*/ Change.PIXELS);
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getCanvas: function() {
		if (!this._canvas) {
			var canvas = CanvasProvider.getCanvas(this._size);
			// Since drawimage images into canvases might fail based on security
			// policies, wrap the call in try-catch and only set _canvas if we
			// succeeded.
			try {
				if (this._image)
					this.getContext(true).drawImage(this._image, 0, 0);
				this._canvas = canvas;
			} catch (e) {
				CanvasProvider.returnCanvas(canvas);
			}
		}
		return this._canvas;
	},

	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._canvas = canvas;
		this._size = Size.create(canvas.width, canvas.height);
		this._image = null;
		this._context = null;
		this._changed(/*#=*/ Change.GEOMETRY | /*#=*/ Change.PIXELS);
	},

	/**
	 * The HTMLImageElement of the raster, if one is associated.
	 *
	 * @type HTMLImageElement|Canvas
	 * @bean
	 */
	getImage: function() {
		return this._image;
	},

	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._image = image;
/*#*/ if (options.browser) {
		this._size = Size.create(image.naturalWidth, image.naturalHeight);
/*#*/ } else if (options.server) {
		this._size = Size.create(image.width, image.height);
/*#*/ } // options.server
		this._canvas = null;
		this._context = null;
		this._changed(/*#=*/ Change.GEOMETRY);
	},

	getSource: function() {
		return this._image && this._image.src || this.toDataURL();
	},

	// DOCS: Document Raster#setSource
	// NOTE: Both data-urls and normal urls are supported in setSource!
	setSource: function(src) {
/*#*/ if (options.browser) {
		var that = this,
			// src can be an URL or a DOM ID to load the image from
			image = document.getElementById(src) || new Image();
		function loaded() {
			that.fire('load');
			if (that._project.view)
				that._project.view.draw(true);
		}
		// Trigger the onLoad event on the image once it's loaded
		DomEvent.add(image, {
			load: function() {
				that.setImage(image);
				loaded();
			}
		});
		if (image.width && image.height) {
			// Fire load event delayed, so behavior is the same as when it's 
			// actually loaded and we give the code time to install event
			setTimeout(loaded, 0);
		} else if (!image.src) {
			image.src = src;
		}
/*#*/ } else if (options.server) {
		// If we're running on the server and it's a string,
		// load it from disk:
		// TODO: load images async, calling setImage once loaded as above
		var image = new Image();
		image.src = fs.readFileSync(src);
/*#*/ } // options.server
		this.setImage(image);
	},

	// DOCS: document Raster#getElement
	getElement: function() {
		return this._canvas || this._image;
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

	toDataURL: function() {
		// See if the linked image is base64 encoded already, if so reuse it,
		// otherwise try using canvas.toDataUrl()
		var src = this._image && this._image.src;
		if (/^data:/.test(src)) 
			return src;
		var canvas = this.getCanvas();
		return canvas ? canvas.toDataURL() : null;
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
	 * @return {RgbColor} the average color contained in the area covered by the
	 * specified path, rectangle or point.
	 */
	getAverageColor: function(object) {
		var bounds, path;
		if (!object) {
			bounds = this.getBounds();
		} else if (object instanceof PathItem) {
			// TODO: What if the path is smaller than 1 px?
			// TODO: How about rounding of bounds.size?
			path = object;
			bounds = object.getBounds();
		} else if (object.width) {
			bounds = new Rectangle(object);
		} else if (object.x) {
			// Create a rectangle of 1px size around the specified coordinates
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
		this._matrix.applyToContext(ctx);
		ctx.drawImage(this.getElement(),
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
	 * @return {RgbColor} the color of the pixel
	 */
	/**
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @return {RgbColor} the color of the pixel
	 */
	getPixel: function(point) {
		point = Point.read(arguments);
		var pixels = this.getContext().getImageData(point.x, point.y, 1, 1).data,
			channels = new Array(4);
		for (var i = 0; i < 4; i++)
			channels[i] = pixels[i] / 255;
		return RgbColor.read(channels);
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
		var _point = Point.read(arguments),
			_color = Color.read(arguments);
		var ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			alpha = color.getAlpha();
		imageData.data[0] = _color.getRed() * 255;
		imageData.data[1] = _color.getGreen() * 255;
		imageData.data[2] = _color.getBlue() * 255;
		imageData.data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, _point.x, _point.y);
	},

	// DOCS: document Raster#createImageData
	/**
	 * {@grouptitle Image Data}
	 * @param {Size} size
	 * @return {ImageData}
	 */
	createImageData: function(size) {
		size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	// TODO: Rename to #get/setImageData, as it will conflict with Item#getData
	// DOCS: document Raster#getData
	/**
	 * @param {Rectangle} rect
	 * @return {ImageData}
	 */
	getImageData: function(rect) {
		rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this.getSize());
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	// DOCS: document Raster#setImageData
	/**
	 * @param {ImageData} data
	 * @param {Point} point
	 * @return {ImageData}
	 */
	setImageData: function(data, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTest: function(point, options) {
		if (point.isInside(this._getBounds())) {
			var that = this;
			return new HitResult('pixel', that, {
				offset: point.add(that._size.divide(2)).round(),
				// Inject as Bootstrap accessor, so #toString renders well too
				color: {
					get: function() {
						return that.getPixel(this.offset);
					}
				}
			});
		}
	},

	draw: function(ctx, param) {
		var element = this.getElement();
		if (element)
			ctx.drawImage(element,
					-this._size.width / 2, -this._size.height / 2);
	},

	drawSelected: function(ctx, matrix) {
		Item.drawSelectedBounds(new Rectangle(this._size).setCenter(0, 0), ctx,
				matrix);
	}
});
