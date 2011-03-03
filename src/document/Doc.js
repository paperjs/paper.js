Doc = Base.extend({
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
		Paper.documents.push(this);
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
		Paper.activateDocument(this);
	},

	redraw: function() {
		this._draw();
	}
});
