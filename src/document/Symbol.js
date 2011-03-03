var Symbol = Base.extend({
	beans: true,

	initialize: function(item) {
		this.document = paper.document;
		this.document.symbols.push(this);
		this.definition = item;
	},

	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item) {
		this._definition = item;
		this._definition.removeFromParent();
		this._definition.position = new Point(0, 0);
	}

	// TODO:
	// remove()
});
