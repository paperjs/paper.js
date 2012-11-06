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

var SvgStyles = Base.each({
	fillColor: 'fill',
	strokeColor: 'stroke',
	strokeWidth: 'stroke-width',
	strokeCap: 'stroke-linecap',
	strokeJoin: 'stroke-linejoin',
	miterLimit: 'stroke-miterlimit',
	dashArray: 'stroke-dasharray',
	dashOffset: 'stroke-dashoffset'
}, function(attr, prop) {
	var part = Base.capitalize(prop);
	this.attributes[attr] = this.properties[prop] = {
		type: /Color$/.test(prop)
			? 'color'
			: prop == 'dashArray'
				? 'array'
				: 'value',
		property: prop,
		attribute: attr,
		get: 'get' + part,
		set: 'set' + part
	};
}, {
	properties: {},
	attributes: {}
});
