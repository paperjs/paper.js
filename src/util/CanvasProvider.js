CanvasProvider = {
	canvases: [],
	getCanvas: function() {
		var size = Size.read(arguments);
		var canvas = this.canvases.length
			? this.canvases.pop()
			: document.createElement('canvas');
		canvas.width = size.width;
		canvas.height = size.height;
		return canvas;
	},

	returnCanvas: function(canvas) {
		// reset canvas:
		canvas.width = canvas.width;
		this.canvases.push(canvas);
	}
};
