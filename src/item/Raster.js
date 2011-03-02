Raster = Item.extend({
	beans: true,

	// TODO: implement url / type, width, height
	// TODO: have PlacedSymbol & Raster inherit from a shared class?
	initialize: function(object) {
		var width, height;
		this.base();
		if (object.getContext) {
			this.canvas = object;
			width = this.canvas.width;
			height = this.canvas.height;
		} else {
			this._image = object;
			// TODO: cross browser compatible?
			width = object.naturalWidth;
			height = object.naturalHeight;
		}
		this._size = new Size(width, height);
		this._bounds = new Rectangle(-width / 2, -height / 2, width, height);
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
		var canvas = CanvasProvider.getCanvas(size);
		var context = canvas.getContext('2d');
		context.drawImage(this._canvas ? this._canvas : this._image,
			0, 0, size.width, size.height);
		// If we already had a canvas, return it to be reused.
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._size = size;
		this._context = null;
		this._canvas = canvas;
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
	
	getSubImage: function(/* rectangle */) {
		var rectangle = Rectangle.read(arguments);
		var canvas = CanvasProvider.getCanvas(rectangle.size);
		var context = canvas.getContext('2d');
		context.drawImage(this.canvas, rectangle.x, rectangle.y,
			canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
		return canvas;
	},
	
	getImage: function() {
		return this._image || this.canvas;
	},
	
	// TODO: setImage

	// TODO: drawImage(image, point)
	drawImage: function(image, x, y) {
		var point = center = Point.read(arguments, 1);
		this.context.drawImage(image, x, y);
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
		var ctx = this.context;
		var pixels = ctx.getImageData(point.x + 0.5, point.y + 0.5, 1, 1).data;
		var channels = [];
		for (var i = 0; i < 4; i++)
			channels.push(pixels[i] / 255);
		return Color.read(channels);
	},
	
	// TODO: setPixel(point, color)
	setPixel: function(x, y, color) {
		color = Color.read(arguments, 2);
		var ctx = this.context;
		var imageData = ctx.getImageData(x, y, 1, 1);
		imageData.data[0] = color.red * 255;
		imageData.data[1] = color.green * 255;
		imageData.data[2] = color.blue * 255;
		imageData.data[3] = color.alpha != -1 ? color.alpha * 255 : 255;
		ctx.putImageData(imageData, x, y);
	},
	
	getContext: function() {
		if (!this._context)
			this._context = this.canvas.getContext('2d');
		return this._context;
	},
	
	setContext: function(context) {
		this._context = context;
	},
	
	getCanvas: function() {
		if (!this._canvas) {
			this._canvas = CanvasProvider.getCanvas(this.size);
			this.ctx = this._canvas.getContext('2d');
			this.ctx.drawImage(this._image, 0, 0);
		}
		return this._canvas;
	},
	
	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		// TODO: should the width / height of the bounds be reset too?
		this._size = new Size(canvas.width, canvas.height);
		this._image = null;
		this._ctx = null;
		this._canvas = canvas;
	},
	
	transformContent: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this.matrix.preConcatenate(matrix);
		// Now rotate the corner points of the image rectangle do find the 
		// extremas that define our raster's bounds, and update them straight 
		// away
		var width = this._size.width;
		var height = this._size.height;
		var x = -width / 2;
		var y = -height / 2;
		var coords = [
				x, y,
				x + width, y,
				x + width, y + height,
				x, y + height
		];
		this.matrix.transform(coords, 0, coords, 0, 4);
		// Loop through all x and y coordinates and update min and max values.
		// Start with the first coordinate pair for both (coords.slice(0, 2)).
		var min = coords.slice(0, 2), max = min.slice(0);
		for (var i = 2; i < 8; i++) {
			var c = coords[i], j = i % 2;
			if (c < min[j])
				min[j] = c;
			else if (c > max[j])
				max[j] = c;
		}
		this._bounds.set(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},
	
	getBounds: function() {
		return this._bounds;
	},
	
	draw: function(ctx, param) {
		if (this.blendMode != 'normal' && !param.ignoreBlendMode) {
			BlendMode.process(ctx, this, param);
		} else {
			ctx.save();
			// TODO: Documment what ignoreBlendMode is really doing, and why
			// this is necessary?
			if(param.ignoreBlendMode !== true)
				this.matrix.applyToContext(ctx);
			ctx.drawImage(this._canvas || this._image,
					-this.size.width / 2, -this.size.height / 2);
			ctx.restore();
			param.ignoreBlendMode = false;
		}
	}
}, new function() {
	function getAverageColor(pixels) {
		var channels = [0, 0, 0];
		var total = 0;
		for (var i = 0, l = pixels.length; i < l; i += 4) {
			var alpha = pixels[i + 3] / 255;
			total += alpha;
			channels[0] += pixels[i] * alpha;
			channels[1] += pixels[i + 1] * alpha;
			channels[2] += pixels[i + 2] * alpha;
		}
		for (var i = 0; i < 3; i++)
			channels[i] /= total * 255;
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
					bounds = object.bounds;
				} else if (object.width) {
					bounds = new Rectangle(object);
				} else if (object.x) {
					bounds = new Rectangle(object.x - 0.5, object.y - 0.5,
							1, 1);
				}
				
				var canvas = CanvasProvider.getCanvas(bounds.size);
				var ctx = canvas.getContext('2d');
				var delta = bounds.topLeft.multiply(-1);
				ctx.translate(delta.x, delta.y);
				if (path) {
					var style = object.style;
					path.draw(ctx);
					ctx.clip();
					path.style = style;
				}
				var matrix = this.matrix.clone();
				var transMatrix = Matrix.getTranslateInstance(delta);
				matrix.preConcatenate(transMatrix);
				matrix.applyToContext(ctx);
				ctx.drawImage(this._canvas || this._image,
						-this.size.width / 2, -this.size.height / 2);
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