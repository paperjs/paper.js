Layer = Item.extend({
	initialize: function() {
		this.base();
		this.children = [];
	},
	
	draw: function(ctx) {
		for(var i = 0, l = this.children.length; i < l; i++) {
			this.children[i].draw(ctx);
		}
	}
});