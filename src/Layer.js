Layer = Item.extend({
	initialize: function() {
		this.base();
		this.children = [];
	},
	
	draw: function() {
		for(var i = 0, l = this.children.length; i < l; i++) {
			this.children[i].draw();
		}
	}
});