Layer = Item.extend({
	beans: true,

	initialize: function() {
		this.children = [];
		this.document = this.parent = Paper.document;
		this.document.layers.push(this);
		this.activate();
	},

	getIndex: function() {
		return !this.parent ? this.document.layers.indexOf(this) : this.base();
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
