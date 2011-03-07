/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved. See LICENSE file for details.
 */

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
