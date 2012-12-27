/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Event
 * @class
 */
var Event = this.Event = Base.extend(/** @lends Event# */{
	initialize: function(event) {
		this.event = event;
	},

	preventDefault: function() {
		this._prevented = true;
		DomEvent.preventDefault(this.event);
		return this;
	},

	stopPropagation: function() {
		this._stopped = true;
		DomEvent.stopPropagation(this.event);
		return this;
	},

	stop: function() {
		return this.stopPropagation().preventDefault();
	},

	// DOCS: Document Event#modifiers
	/**
	 * @type object
	 * @bean
	 */
	getModifiers: function() {
		return Key.modifiers;
	}
});
