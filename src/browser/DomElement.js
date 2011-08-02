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
 * @name DomElement
 * @namespace
 * @private
 */
var DomElement = {
	getBounds: function(el, viewport) {
		var rect = el.getBoundingClientRect(),
			doc = el.ownerDocument,
			body = doc.body,
			docEl = doc.documentElement,
			x = rect.left - (docEl.clientLeft || body.clientLeft || 0),
			y = rect.top - (docEl.clientTop  || body.clientTop  || 0);
		if (!viewport) {
			var win = DomElement.getViewport(doc);
			x += win.pageXOffset || docEl.scrollLeft || body.scrollLeft;
			y += win.pageYOffset || docEl.scrollTop || body.scrollTop;
		}
		return new Rectangle(x, y, rect.width, rect.height);
	},

	getOffset: function(el, viewport) {
		return this.getBounds(el, viewport).getPoint();
	},

	getSize: function(el) {
		return this.getBounds(el, true).getSize();
	},

	/**
	 * Checks if element is invisibile (display: none, ...)
	 */
	isInvisible: function(el) {
		return this.getSize(el).equals([0, 0]);
	},

	/**
	 * Checks if element is visibile in current viewport
	 */
	isVisible: function(el) {
		// See if the viewport bounds intersect with the windows rectangle
		// which always starts at 0, 0
		return !this.isInvisible(el) && this.getViewportBounds(el).intersects(
				this.getBounds(el, true));
	},

	getViewport: function(doc) {
		return doc.defaultView || doc.parentWindow;
	},

	getViewportBounds: function(el) {
		var doc = el.ownerDocument,
			view = this.getViewport(doc),
			body = doc.getElementsByTagName(
				doc.compatMode === 'CSS1Compat' ? 'html' : 'body')[0];
		return Rectangle.create(0, 0, 
			view.innerWidth || body.clientWidth,
			view.innerHeight || body.clientHeight
		);
	},

	getComputedStyle: function(el, name) {
		if (el.currentStyle)
			return el.currentStyle[Base.camelize(name)];
		var style = this.getViewport(el.ownerDocument)
				.getComputedStyle(el, null);
		return style ? style.getPropertyValue(Base.hyphenate(name)) : null;
	}
};
