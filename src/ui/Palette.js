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

var Palette = this.Palette = Base.extend(Callback, /** @lends Palette# */{
	_events: [ 'onChange' ],

	initialize: function(title, components, values) {
		var parent = DomElement.find('.paperjs-palettes')
			|| DomElement.find('body').appendChild(
				DomElement.create('div', { 'class': 'paperjs-palettes' })),
			table = parent.appendChild(
				DomElement.create('table', { 'class': 'paperjs-palette' })),
			that = this;
		this._title = title;
		if (!values)
			values = {};
		this._components = Base.each(components, function(component, name) {
			if (!(component instanceof Component)) {
				if (component.value == null)
					component.value = values[name];
				component.name = name;
				component = components[name] = new Component(component);
			}
			component.palette = that;
			// Make sure each component has an entry in values, so observers get
			// installed further down.
			if (values[name] === undefined)
				values[name] = null;
			var row = table.appendChild(
				DomElement.create('tr', [
					'td', { text: (component.label || name) + ':' },
					'td', component.element
				])
			);
		});
		this._values = Base.each(values, function(value, name) {
			// Replace each entry with an getter / setters so we can observe
			// change.
			Base.define(values, name, {
				enumerable: true,
				configurable: true,
				writable: true,
				get: function() {
					return value;
				},
				set: function(val) {
					value = val;
					components[name].setValue(val);
				}
			});
		});
	},

	reset: function() {
		for (var i in this._components)
			this._components[i].reset();
	}
});
