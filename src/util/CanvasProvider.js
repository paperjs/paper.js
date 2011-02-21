CanvasProvider = {
	canvases: [],
	getCanvas: function(width, height) {
		var canvas = this.canvases.length
			? this.canvases.pop()
			: document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		return canvas;
	},

	returnCanvas: function(canvas) {
		this.canvases.push(canvas);
	}
};
