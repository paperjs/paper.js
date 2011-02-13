Layer = Item.extend({
	initialize: function() {
		this.children = [];
		this.document = this.parent = Paper.document;
		this.document.layers.push(this);
		this.activate();
	},
	
	activate: function() {
		this.document.activeLayer = this;
	},
	
	draw: function(ctx) {
		for (var i = 0, l = this.children.length; i < l; i++) {
			this.children[i].draw(ctx);
		}
	}
});
