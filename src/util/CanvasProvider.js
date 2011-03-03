// TODO: it might be better to make a ContextProvider class, since you
// can always find the canvas through context.canvas. This saves code and 
// speed by not having to do canvas.getContext('2d')
// TODO: Run through the canvas array to find a canvas with the requested
// width / height, so we don't need to resize it?
var CanvasProvider = {
	canvases: [],
	getCanvas: function(size) {
		if (this.canvases.length) {
			var canvas = this.canvases.pop();
			// If they are not the same size, we don't need to clear them
			// using clearRect and visa versa.
			if ((canvas.width != size.width)
					|| (canvas.height != size.height)) {
				canvas.width = size.width;
				canvas.height = size.height;
			} else {
				var context = canvas.getContext('2d');
				// +1 is needed on some browsers to really clear the borders
				context.clearRect(0, 0, size.width + 1, size.height + 1);
			}
			return canvas;
		} else {
			var canvas = document.createElement('canvas');
			canvas.width = size.width;
			canvas.height = size.height;
			return canvas;
		}
	},

	returnCanvas: function(canvas) {
		this.canvases.push(canvas);
	}
};
