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

/**
 * Define internal PaperScope class that handles all the fields available on the
 * global paper object, which simply is a pointer to the currently active scope.
 */
var PaperScope = this.PaperScope = Base.extend({
	initialize: function(id) {
		this.document = null;
		this.documents = [];
		this.tools = [];
		this.id = id;
	},

	/**
	 * Installs the paper scope into any other given scope. Can be used for
	 * examle to inject the currently active PaperScope into the window's global
	 * scope, to emulate PaperScript-style globally accessible Paper classes:
	 *
	 * paper.install(window);
	 */
	install: function(scope) {
		// Use scope as side-car (= 'this' inside iterator), and have it
		// returned at the end.
		return Base.each(this, function(value, key) {
			this[key] = value;
		}, scope);
	},

	// Methods for setting and restoring paper scopes:
	statics: {
		set: function(scope) {
			this.previous = paper;
			paper = scope;
		},

		restore: function() {
			paper = this.previous;
		}
	}
});
