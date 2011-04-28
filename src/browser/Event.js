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

var Event = {
	add: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.addEventListener) {
				el.addEventListener(type, func, false);
			} else if (el.attachEvent) {
				// Make a bound closure that calls on the right object and
				// passes on the global event object as a parameter.
				el.attachEvent('on' + type, func.bound = function() {
					func.call(el, window.event);
				});
			}
		}
	},

	remove: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.removeEventListener) {
				el.removeEventListener(type, func, false);
			} else if (el.detachEvent) {
				// Remove the bound closure instead of func itself
				el.detachEvent('on' + type, func.bound);
			}
		}
	},

	getPoint: function(event) {
		return Point.create(
			event.pageX || event.clientX + document.documentElement.scrollLeft,
			event.pageY || event.clientY + document.documentElement.scrollTop
		);
	},

	getElement: function(event) {
		return event.target || event.srcElement;
	},

	getOffset: function(event) {
		// Remove target offsets from page coordinates
		return Event.getPoint(event).subtract(
				Element.getOffset(Event.getElement(event)));
	}
};

Event.requestAnimationFrame = new function() {
	var part = 'equestAnimationFrame',
		request = window['r' + part] || window['webkitR' + part]
			|| window['mozR' + part] || window['oR' + part]
			|| window['msR' + part];
	if (request) {
		// Chrome shipped without the time arg in m10. We need to check if time
		// is defined in callbacks, and if not, clear request again so we won't
		// use the faulty method.
		request(function(time) {
			if (time == undefined)
				request = null;
		});
	}

	// So we need to fake it. Define helper functions first:
	var callbacks = [],
		fastRate = 1000 / 60,
		slowRate = 1000,
		focused = true,
		timer;

	// Installs interval timer that checks all callbacks. This results in much
	// faster animations than repeatedly installing timout timers.
	function setTimer(timeout) {
		window.clearInterval(timer);
		timer = window.setInterval(function() {
			// Checks all installed callbacks for element visibility and execute
			// if needed.
			if (!focused)
				return;
			for (var i = callbacks.length - 1; i >= 0; i--) {
				var entry = callbacks[i],
					func = entry[0],
					element = entry[1];
				if (!element || Element.isVisible(element)) {
					// Handle callback and remove it from callbacks list.
					callbacks.splice(i, 1);
					func(+new Date);
				}
			}
		}, timeout);
	}

	if (!paper.debug) {
		Event.add(window, {
			focus: function() {
				focused = true;
				// Switch to falst checkCallback calls while window is focused.
				timer && setTimer(fastRate);
			},
			blur: function() {
				focused = false;
				// Switch to slow checkCallback calls while window is blured.
				timer && setTimer(slowRate);
			}
		});
	}

	return function(callback, element) {
		if (request)
			return request(callback, element);
		callbacks.push([callback, element]);
		!timer && setTimer(fastRate);
	};
};
