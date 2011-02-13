Group = Item.extend({
	initialize: function(items) {
		this.base();
		this.children = [];
		if (items) {
			for (var i = 0, l = items.length; i < l; i++) {
				this.appendTop(items[i]);
			}
		}
		this.clipped = false;
	},
	
	draw: function(ctx) {
		for (var i = 0, l = this.children.length; i < l; i++) {
			this.children[i].draw(ctx);
		}
	},
	
	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to true, the first child in the group is automatically
	 * defined as the clipping mask.
	 *
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * group.appendChild(path);
	 * group.clipped = true;
	 * </code>
	 * @return {@true if the group item is to be clipped}
	 */
	isClipped: function() {
		return this.clipped;
	},
	
	setClipped: function(clipped) {
		this.clipped = clipped;
		var child = this.firstChild;
		if (child)
			child.setClipMask(clipped);
	}
});
