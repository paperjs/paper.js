var Document = Base.extend({
	beans: true,

	initialize: function(canvas) {
		if (canvas && canvas instanceof HTMLCanvasElement) {
			this.canvas = canvas;
			this.size = new Size(canvas.offsetWidth, canvas.offsetHeight);
		} else {
			this.size = Size.read(arguments) || new Size(1024, 768);
			this.canvas = document.createElement('canvas');
			this.canvas.width = this.size.width;
			this.canvas.height = this.size.height;
		}
		this.bounds = new Rectangle(new Point(0, 0), this.size);
		this.ctx = this.canvas.getContext('2d');
		paper.documents.push(this);
		this.activate();
		this.layers = [];
		this.activeLayer = new Layer();
		this.currentStyle = null;
		this.symbols = [];
		this.views = [new DocumentView(this)];
		this.activeView = this.views[0];
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle = new PathStyle(this, style);
	},

	activate: function() {
		var index = paper.documents.indexOf(this);
		if (index != -1) {
			paper.document = this;
			return true;
		}
		return false;
	},

	draw: function() {
		if (this.canvas) {
			// Initial tests conclude that clearing the canvas using clearRect
			// is always faster than setting canvas.width = canvas.width
			// http://jsperf.com/clearrect-vs-setting-width/7
			this.ctx.clearRect(0, 0, this.size.width + 1, this.size.height + 1);
			this.ctx.save();

			for (var i = 0, l = this.layers.length; i < l; i++) {
				Item.draw(this.layers[i], this.ctx, { offset: new Point(0, 0)});
			}
			this.ctx.restore();
		}
	},

	redraw: function() {
		this.draw();
	}
});
