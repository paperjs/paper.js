Raster = Item.extend({
	beans: true,

	// TODO: implement url / type, width, height
	// TODO: have PlacedSymbol & Raster inherit from a shared class?
	initialize: function(image) {
		this.base();
		if (image) {
			this.image = image;
			var width = image.width;
			var height = image.height;
			this.size = new Size(width, height);
			this._bounds = new Rectangle(-width / 2, -height / 2, width, height);
			this.matrix = new Matrix();
		}
	},
	
	// TODO: getSize / setSize
	
	/**
	 * The width of the raster in pixels.
	 */
	getWidth: function() {
		return this.size.width;
	},
	
	/**
	 * The height of the raster in pixels.
	 */
	getHeight: function() {
		return this.size.height;
	},
	
	// TODO: getPpi
	// TODO: getSubImage
	// TODO: getImage
	// TODO: drawImage
	
	// TODO: support getAverageColor paramaters: point, rect, path
	// TODO: Idea for getAverageColor(path): set globalCompositeOperation = 'xor',
	// then fillRect with black, then draw the path, then draw the image, then
	// resize and count values.
	getAverageColor: function() {
		var size = 32;
		var tempCanvas = CanvasProvider.getCanvas(size, size);
		var ctx = tempCanvas.getContext('2d');
		ctx.drawImage(this.image, 0, 0, size, size);
		var pixels = ctx.getImageData(0.5, 0.5, size, size).data;
		var channels = [0, 0, 0];
		
		for (var i = 0; i < size; i++) {
			var offset = i * size;
			var alpha = pixels[offset + 3] / 255;
			channels[0] += pixels[offset] * alpha;
			channels[1] += pixels[offset + 1] * alpha;
			channels[2] += pixels[offset + 2] * alpha;
		}
		
		for (var i = 0; i < 3; i++)
			channels[i] /= size * 255;
		
		CanvasProvider.returnCanvas(tempCanvas);
		return Color.read(channels);
	},
	
	// TODO: getPixel(point)
	// TODO: test this
	getPixel: function(x, y) {
		var pixels = this.context.getImageData(x + 0.5, y + 0.5, 1, 1).data;
		var channels = [];
		for(var i = 0; i < 4; i++)
			channels.push(pixels[i] / 255);
		return Color.read(channels);
	},
	
	// TODO: setPixel(point, color)
	// setPixel: function(x, y, color) {
	// 	
	// }
	
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
			this._canvas = CanvasProvider.getCanvas(this.size.width, this.size.height);
			this.ctx = this._canvas.getContext('2d');
			this.ctx.drawImage(this.image, 0, 0);
		}
		return this._canvas;
	},
	
	setCanvas: function(canvas) {
		CanvasProvider.returnCanvas(this._canvas);
		this._ctx = null;
		this._canvas = canvas;
	},
	
	transformContent: function(matrix, flags) {
		var bounds = this.bounds;
		var coords = [bounds.x, bounds.y,
			bounds.x + bounds.width, bounds.y + bounds.height];
		matrix.transform(coords, 0, coords, 0, 2);
		this.matrix.preConcatenate(matrix);
		bounds.x = coords[0];
		bounds.y = coords[1];
		bounds.width = coords[2] - coords[0];
		bounds.height = coords[3] - coords[1];
	},
	
	getBounds: function() {
		return this._bounds;
	},
	
	draw: function(ctx) {
		ctx.save();
		this.matrix.applyToContext(ctx);
		ctx.drawImage(this._canvas || this.image,
				-this.size.width / 2, -this.size.height / 2);
		ctx.restore();
	}
});