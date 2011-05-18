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

var HSBColor = this.HSBColor = Color.extend({
	_colorType: 'hsb',
	_components: ['hue', 'saturation', 'brightness', 'alpha'],

	// Hue needs a special setter, bug getter is produced for it in Color.extend
	// No need to set beans: true here since Color.extend() does that for us.
	setHue: function(hue) {
		if (hue < 0)
			hue = 360 + hue;
		this._cssString = null;
		this._hue = hue % 360;
		return this;
	}
});
