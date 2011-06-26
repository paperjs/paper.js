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

var DomElement = new function() {
	function cumulateOffset(el, name, parent, test) {
		var left = name + 'Left',
			top = name + 'Top',
			x = 0,
			y = 0,
			style;
		// If we're asked to calculate positioned offset, stop at any parent
		// element that has relative or absolute position.
		while (el && el.style && (!test || !test.test(
					style = DomElement.getComputedStyle(el, 'position')))) {
			x += el[left] || 0;
			y += el[top] || 0;
			el = el[parent];
		}
		return {
			offset: Point.create(x, y),
			element: el,
			style: style
		};
	}

	function getScrollOffset(el, test) {
		return cumulateOffset(el, 'scroll', 'parentNode', test).offset;
	}

	return {
		getViewport: function(doc) {
			return doc.defaultView || doc.parentWindow;
		},

		getViewportSize: function(el) {
			var doc = el.ownerDocument,
				view = this.getViewport(doc),
				body = doc.getElementsByTagName(
					doc.compatMode === 'CSS1Compat' ? 'html' : 'body')[0];
			return Size.create(
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
		},

		getOffset: function(el, positioned, viewport) {
			var res = cumulateOffset(el, 'offset', 'offsetParent',
					positioned ? /^(relative|absolute|fixed)$/ : /^fixed$/);
			// We need to handle fixed positioned elements seperately if we're
			// asked to calculate offsets within the page (= not within
			// viewport), by adding their scroll offset to the result.
			if (res.style == 'fixed' && !viewport)
				return res.offset.add(getScrollOffset(res.element));
			// Otherwise remove scrolling from the calculated offset if we asked
			// for viewport coordinates
			return viewport
					? res.offset.subtract(getScrollOffset(el, /^fixed$/))
					: res.offset;
		},

		getSize: function(el) {
			return Size.create(el.offsetWidth, el.offsetHeight);
		},

		getBounds: function(el, positioned, viewport) {
			return new Rectangle(this.getOffset(el, positioned, viewport),
					this.getSize(el));
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
			return !this.isInvisible(el)
					&& new Rectangle([0, 0], this.getViewportSize(el))
						.intersects(this.getBounds(el, false, true));
		}
	};
};
