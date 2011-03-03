var Layer = Group.extend({
	beans: true,

	initialize: function() {
		this.children = [];
		this.document = paper.document;
		this.document.layers.push(this);
		this.activate();
	},

	getIndex: function() {
		return !this.parent ? this.document.layers.indexOf(this) : this.base();
	},

	/**
	* Removes the layer from its document's layers list
	* or its parent's children list.
	*/
	removeFromParent: function() {
		if (!this.parent) {
			this.document.layers.splice(this.index, 1);
		} else {
			this.base();
		}
	},

	moveAbove: function(item) {
		// if the item is a layer and contained within Document#layers
		if (item instanceof Layer && !item.parent) {
			this.removeFromParent();
			item.document.layers.splice(item.index + 1, 0, this);
			this.document = item.document;
			return true;
		} else {
			this.base(item);
		}
	},

	moveBelow: function(item) {
		// if the item is a layer and contained within Document#layers
		if (item instanceof Layer && !item.parent) {
			this.removeFromParent();
			item.document.layers.splice(item.index - 1, 0, this);
			this.document = item.document;
			return true;
		} else {
			this.base(item);
		}
	},

	getNextSibling: function() {
		if (!this.parent) {
			var index = this.index + 1;
			if (index < this.document.layers.length)
				return this.document.layers[index];
		} else {
			return this.base();
		}
	},

	getPreviousSibling: function() {
		if (!this.parent) {
			var index = this.index - 1;
			if (index <= 0)
				return this.document.layers[index];
		} else {
			return this.base();
		}
	},

	activate: function() {
		this.document.activeLayer = this;
	}
});
