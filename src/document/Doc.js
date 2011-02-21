Doc = Base.extend({
	beans: true,

	initialize: function(canvas) {
		if (canvas) {
			this.canvas = canvas;
			this.ctx = this.canvas.getContext('2d');
			this.size = new Size(canvas.offsetWidth, canvas.offsetHeight);
		}
		Paper.documents.push(this);
		this.activate();
		this.layers = [];
		this.activeLayer = new Layer();
		this.currentStyle = null;
		this.symbols = [];
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle = new PathStyle(this, style);
	},

	activate: function() {
		Paper.activateDocument(this);
	},

	redraw: function() {
		if (this.canvas) {
			// TODO: clearing the canvas by setting
			// this.canvas.width = this.canvas.width might be faster..
			this.ctx.clearRect(0, 0, this.size.width + 1, this.size.height);
			for (var i = 0, l = this.layers.length; i < l; i++) {
				this.layers[i].draw(this.ctx);
			}
		}
	}
});
