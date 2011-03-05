var Symbol = this.Symbol = Base.extend({
	beans: true,

	initialize: function(item) {
		this.document = paper.document;
		this.document.symbols.push(this);
		this.setDefinition(item);
	},

	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item) {
		this._definition = item;
		this._definition.removeFromParent();
		this._definition.setPosition(new Point(0, 0));
	}

	// TODO:
	// remove()
});
