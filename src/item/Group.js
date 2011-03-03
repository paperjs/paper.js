var Group = Item.extend({
	beans: true,
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

	getBounds: function() {
		if (this.children.length) {
			var rect = this.children[0].bounds;
			var x1 = rect.x;
			var y1 = rect.y;
			var x2 = rect.x + rect.width;
			var y2 = rect.y + rect.height;
			for (var i = 1, l = this.children.length; i < l; i++) {
				var rect2 = this.children[i].bounds;
				x1 = Math.min(rect2.x, x1);
				y1 = Math.min(rect2.y, y1);
				x2 = Math.max(rect2.x + rect2.width, x1 + x2 - x1);
				y2 = Math.max(rect2.y + rect2.height, y1 + y2 - y1);
			}
		}
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
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
		return this._clipped;
	},

	setClipped: function(clipped) {
		this._clipped = clipped;
		var child = this.firstChild;
		if (child)
			child.setClipMask(clipped);
	},

	draw: function(ctx, param) {
		for (var i = 0, l = this.children.length; i < l; i++) {
			Item.draw(this.children[i], ctx, param);
			if (this.clipped && i == 0)
				ctx.clip();
		}
	}
});
