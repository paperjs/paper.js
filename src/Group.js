GroupItem = Item.extend({
	initialize: function() {
		this.children = [];
		this.clipped = false;
	},
	
	draw: function() {
		for(var i = 0, l = this.children.length; i < l; i++) {
			this.children[i].draw();
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
		if(child)
			child.setClipMask(clipped);
	}
});