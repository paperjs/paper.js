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
		var parent = DomElement.find('.palettejs-panel')
			|| DomElement.find('body').appendChild(
				DomElement.create('div', { 'class': 'palettejs-panel' }));
		this._element = parent.appendChild(
			DomElement.create('table', { 'class': 'palettejs-pane' })),
		this._title = title;
		if (!values)
			values = {};
		for (var name in (this._components = components)) {
			var component = components[name];
			if (!(component instanceof Component)) {
				if (component.value == null)
					component.value = values[name];
				component.name = name;
				component = components[name] = new Component(component);
			}
			this._element.appendChild(component._element);
			component.palette = this;
			// Make sure each component has an entry in values, so observers get
			// installed further down.
			if (values[name] === undefined)
				values[name] = null;
		}
		// Now replace each entry in values with a getter / setters so we can
		// observe change.
		});
		this._values = Base.each(values, function(value, name) {
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
	},

	remove: function() {
		DomElement.remove(this._element);
	}
});
