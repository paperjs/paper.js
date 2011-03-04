var Layer = this.Layer = Group.extend({
	beans: true,

	initialize: function() {
		this.children = [];
		this.document = paper.document;
		this.document.layers.push(this);
		this.activate();
	},

	getIndex: function() {
		return this.parent ? this.base() : this.document.layers.indexOf(this);
	},

	/**
	* Removes the layer from its document's layers list
	* or its parent's children list.
	*/
	removeFromParent: function() {
		if (!this.parent) {
			return !!this.document.layers.splice(this.getIndex(), 1).length;
		} else {
			return this.base();
		}
	},

	moveAbove: function(item) {
		// if the item is a layer and contained within Document#layers
		if (item instanceof Layer && !item.parent) {
			this.removeFromParent();
			item.document.layers.splice(item.getIndex() + 1, 0, this);
			this.document = item.document;
			return true;
		} else {
			return this.base(item);
		}
	},

	moveBelow: function(item) {
		// if the item is a layer and contained within Document#layers
		if (item instanceof Layer && !item.parent) {
			this.removeFromParent();
			item.document.layers.splice(item.getIndex() - 1, 0, this);
			this.document = item.document;
			return true;
		} else {
			return this.base(item);
		}
	},

	getNextSibling: function() {
		return this.parent ? this.base()
				: this.document.layers[this.getIndex() + 1] || null;
	},

	getPreviousSibling: function() {
		return this.parent ? this.base()
				: this.document.layers[this.getIndex() - 1] || null;
	},

	activate: function() {
		this.document.activeLayer = this;
	}
});
