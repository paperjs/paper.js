Doc = Base.extend({
	initialize: function(canvas) {
		this.canvas = canvas;
		this.ctx = this.canvas.getContext('2d');
		this.size = new Size(canvas.offsetWidth, canvas.offsetHeight);
		this.children = [];
	},
	redraw: function() {
		this.ctx.clearRect(0, 0, this.size.width, this.size.height);
		for(var i = 0, l = this.children.length; i < l; i++) {
			this.children[i].draw(this.ctx);
		}
	}
});