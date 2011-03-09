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

var RGBColor = this.RGBColor = Color.extend(new function() {
	var components = ['red', 'green', 'blue', 'alpha'];
	return Base.each(components, function(name) {
		var internalName = '_' + name;
		name = Base.capitalize(name);
		if (name !== 'alpha') {
			this['get' + name] = function() {
				return this[internalName];
			};
			this['set' + name] = function(value) {
				this._cssString = null;
				this[internalName] = value;
				return this;
			};
		}
	}, {
		beans: true,
		_colorType: 'rgb',
		_components: components
	});
});
