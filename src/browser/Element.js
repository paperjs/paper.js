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

var Element = {
	getOffset: function(el) {
		var x = 0, y = 0;
		while (el) {
			x += el.offsetLeft;
			y += el.offsetTop;
			el = el.offsetParent;
		}
		return Point.create(x, y);
	},

	getSize: function(el) {
		return Size.create(el.offsetWidth, el.offsetHeight);
	},

	getBounds: function(el) {
		return new Rectangle(Element.getOffset(el), Element.getSize(el));
	},

	getScrollBounds: function() {
		var doc = document.getElementsByTagName(
				document.compatMode == 'CSS1Compat' ? 'html' : 'body')[0];
		return Rectangle.create(
			window.pageXOffset || doc.scrollLeft,
			window.pageYOffset || doc.scrollTop,
			window.innerWidth || doc.clientWidth,
			window.innerHeight || doc.clientHeight
		);
	},

	// Checks if element is visibile in current viewport
	isVisible: function(el) {
		// See if the two rectangle intersect
		return Element.getScrollBounds().intersects(Element.getBounds(el));
	}
};
