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

var KeyModifiers = Base.extend({
	initialize: function(event) {
		this.event = event;
	}
}, new function() {
	var modifiers = {
		shift: 'shiftKey',
		control: 'ctrlKey',
		alt: 'altKey',
		command: 'metaKey'
	};
	
	return Base.each(modifiers, function(modifier, key) {
		this['get' + Base.capitalize(key)] = function() {
			return this.event[modifier];
		};
	}, { beans: true });
});
