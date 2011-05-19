/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var Symbol = this.Symbol = Base.extend({
	beans: true,

	initialize: function(item) {
		this.project = paper.project;
		this.project.symbols.push(this);
		this.setDefinition(item);
	},

	clone: function() {
		// TODO: Implement!
		return this.base();
	},

	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item) {
		this._definition = item;
		item._removeFromParent();
		item.setPosition(new Point());
	}

	// TODO:
	// remove()
});
