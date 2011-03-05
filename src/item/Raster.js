var Raster = this.Raster = Item.extend({
	beans: true,

	// TODO: implement url / type, width, height
	// TODO: have PlacedSymbol & Raster inherit from a shared class?
	initialize: function(object) {
		this.base();
		if (object.getContext) {
			this.setCanvas(object);
		} else {
			this.setImage(object);
		}
		this.matrix = new Matrix();
	},

	/**
	* The size of the raster in pixels.
	*/
	getSize: function() {
		return this._size;
	},

	setSize: function() {
		var size = Size.read(arguments);
		var image = this.getImage();
		// Set canvas internally sets _size
		this.setCanvas(CanvasProvider.getCanvas(size));
		this.drawImage(image, 0, 0);
	},

	/**
	 * The width of the raster in pixels.
	 */
	getWidth: function() {
		return this._size.width;
	},

	/**
	 * The height of the raster in pixels.
	 */
	getHeight: function() {
		return this._size.height;
	},

	/**
	 * Pixels per inch of the raster at it's current size.
	 */
	getPpi: function() {
		var matrix = this.matrix;
		var orig = new Point(0, 0).transform(matrix);
		var u = new Point(1, 0).transform(matrix).subtract(orig);
		var v = new Point(0, 1).transform(matrix).subtract(orig);
		return new Size(
			72 / u.length,
			72 / v.length
		);
	},

	getCanvas: function() {
		if (!this._canvas) {
			this._canvas = CanvasProvider.getCanvas(this._size);
			if (this._image)
				this.getContext().drawImage(this._image, 0, 0);
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
		this._bounds = null;
	},

	getContext: function() {
		if (!this._context) {
			this._context = this.getCanvas().getContext('2d');
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getImage: function() {
		return this._image || this.getCanvas();
	},

	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._image = image;
		// TODO: cross browser compatible?
		this._size = new Size(image.naturalWidth, image.naturalHeight);
		this._canvas = null;
		this._context = null;
		this._bounds = null;
	},

	getSubImage: function(/* rectangle */) {
		var rectangle = Rectangle.read(arguments);
		var canvas = CanvasProvider.getCanvas(rectangle.getSize());
		var context = canvas.getContext('2d');
		context.drawImage(this.getCanvas(), rectangle.x, rectangle.y,
			canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
		return canvas;
	},

	drawImage: function(image, point) {
		var point = Point.read(arguments, 1);
		this.getContext().drawImage(image, point.x, point.y);
	},

	/**
	 * {@grouptitle Pixels}
	 * 
	 * Gets the color of a pixel in the raster.
	 * @param x
	 * @param y
	 */
	getPixel: function() {
		var point = Point.read(arguments);
		var ctx = this.getContext();
		var pixels = ctx.getImageData(point.x + 0.5, point.y + 0.5, 1, 1).data;
		var channels = [];
		for (var i = 0; i < 4; i++)
			channels.push(pixels[i] / 255);
		return Color.read(channels);
	},

	// TODO: setPixel(point, color)
	setPixel: function(x, y, color) {
		color = Color.read(arguments, 2);
		var ctx = this.getContext(),
			imageData = ctx.getImageData(x, y, 1, 1),
			alpha = color.getAlpha();
		imageData.data[0] = color.getRed() * 255;
		imageData.data[1] = color.getGreen() * 255;
		imageData.data[2] = color.getBlue() * 255;
		imageData.data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, x, y);
	},

	_transform: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this.matrix.preConcatenate(matrix);
		this._bounds = null;
	},

	getBounds: function() {
		if (!this._bounds) {
			this._bounds = this.matrix.transformBounds(this._size);
		}
		return this._bounds;
	},

	draw: function(ctx, param) {
		ctx.save();
		this.matrix.applyToContext(ctx);
		ctx.drawImage(this._canvas || this._image,
				-this._size.width / 2, -this._size.height / 2);
		ctx.restore();
	}
}, new function() {
	function getAverageColor(pixels) {
		var channels = [0, 0, 0];
		var total = 0;
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
	}

	return {
		/**
		 * {@grouptitle Average Color}
		 * Calculates the average color of the image within the given path,
		 * rectangle or point. This can be used for creating raster image
		 * effects.
		 * 
		 * @param object
		 * @return the average color contained in the area covered by the
		 * specified path, rectangle or point.
		 */
		getAverageColor: function(object) {
			var image;
			if (object) {
				var bounds, path;
				if (object instanceof Path) {
					// TODO: what if the path is smaller than 1 px?
					// TODO: how about rounding of bounds.size?
					// TODO: test with compound paths.
					path = object;
					bounds = object.getBounds();
				} else if (object.width) {
					bounds = new Rectangle(object);
				} else if (object.x) {
					bounds = new Rectangle(object.x - 0.5, object.y - 0.5,
							1, 1);
				}

				var canvas = CanvasProvider.getCanvas(bounds.getSize());
				var ctx = canvas.getContext('2d');
				var delta = bounds.getTopLeft().multiply(-1);
				ctx.translate(delta.x, delta.y);
				if (path) {
					var style = object.getStyle();
					path.draw(ctx);
					ctx.clip();
					path.setStyle(style);
				}
				var matrix = this.matrix.clone();
				var transMatrix = Matrix.getTranslateInstance(delta);
				matrix.preConcatenate(transMatrix);
				matrix.applyToContext(ctx);
				ctx.drawImage(this._canvas || this._image,
						-this._size.width / 2, -this._size.height / 2);
				image = canvas;
			} else {
				image = this.image;
			}
			var size = new Size(32);
			var sampleCanvas = CanvasProvider.getCanvas(size);
			var ctx = sampleCanvas.getContext('2d');
			ctx.drawImage(image, 0, 0, size.width, size.height);
			var pixels = ctx.getImageData(0.5, 0.5,
					size.width, size.height).data;
			var color = getAverageColor(pixels);
			CanvasProvider.returnCanvas(sampleCanvas);
			if (image instanceof HTMLCanvasElement)
				CanvasProvider.returnCanvas(image);
			return color;
		}
	}
});
