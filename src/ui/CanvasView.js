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
 * @name CanvasView
 *
 * @private
 */
var CanvasView = View.extend(/** @lends CanvasView# */{
	/**
	 * Creates a view object that wraps a canvas element.
	 * 
	 * @param {HTMLCanvasElement} canvas The canvas object that this view should
	 * wrap
	 */
	initialize: function(canvas) {
		// Handle canvas argument
		if (!(canvas instanceof HTMLCanvasElement)) {
			// 2nd argument onwards could be view size, otherwise use default:
			var size = Size.read(arguments, 1);
			if (size.isZero())
				size = Size.create(1024, 768);
			canvas = CanvasProvider.getCanvas(size);
		}
		this._context = canvas.getContext('2d');
		// Have Item count installed mouse events.
		this._eventCounters = {};
		this.base(canvas);
	},

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	draw: function(checkRedraw) {
		if (checkRedraw && !this._redrawNeeded)
			return false;
		if (this._stats)
			this._stats.update();
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size._width + 1, size._height + 1);

		ctx.save();
		this._matrix.applyToContext(ctx);
		this._project.draw(ctx);
		ctx.restore();
		this._redrawNeeded = false;
		return true;
	}
}, new function() { // Item based mouse handling:

	var hitOptions = {
		fill: true,
		stroke: true,
		tolerance: 0
	};

	var downPoint,
		lastPoint,
		overPoint,
		downItem,
		overItem,
		hasDrag,
		doubleClick,
		clickTime;

	function callEvent(type, event, point, target, lastPoint, bubble) {
		var item = target,
			mouseEvent,
			called = false;
		while (item) {
			if (item.responds(type)) {
				// Create an reuse the event object if we're bubbling
				if (!mouseEvent)
					mouseEvent = new MouseEvent(type, event, point, target,
							// Calculate delta if lastPoint was passed
							lastPoint ? point.subtract(lastPoint) : null);
				called = item.fire(type, mouseEvent) || called;
				if (called && (!bubble || mouseEvent._stopped))
					break;
			}
			item = item.getParent();
		}
		return called;
	}

	function handleEvent(view, type, event, point, lastPoint) {
		if (view._eventCounters[type]) {
			var hit = view._project.hitTest(point, hitOptions),
				item = hit && hit.item;
			if (item) {
				// If this is a mousemove event and we change the overItem,
				// reset lastPoint to point so delta is (0, 0)
				if (type == 'mousemove' && item != overItem)
					lastPoint = point;
				// If we have a downItem with a mousedrag event, do not send
				// mousemove events to any item while we're dragging.
				// TODO: Do we also need to lock mousenter / mouseleave in the
				// same way?
				if (type != 'mousemove' || !hasDrag)
					callEvent(type, event, point, item, lastPoint);
				return item;
			}
		}
	}

	return {
		_onMouseDown: function(event, point) {
			var item = handleEvent(this, 'mousedown', event, point);
			// See if we're clicking again on the same item, within the
			// double-click time. Firefox uses 300ms as the max time difference:
			doubleClick = downItem == item && Date.now() - clickTime < 300;
			downItem = item;
			downPoint = lastPoint = overPoint = point;
			hasDrag = downItem && downItem.responds('mousedrag');
		},

		_onMouseUp: function(event, point) {
			// TODO: Check 
			var item = handleEvent(this, 'mouseup', event, point);
			if (hasDrag) {
				// If the point has changed since the last mousedrag event, send
				// another one
				if (lastPoint && !lastPoint.equals(point))
					callEvent('mousedrag', event, point, downItem, lastPoint);
				// If we had a mousedrag event locking mousemove events and are
				// over another item, send it a mousemove event now.
				// Use point as overPoint, so delta is (0, 0) since this will
				// be the first mousemove event for this item.
				if (item != downItem) {
					overPoint = point;
					callEvent('mousemove', event, point, item, overPoint);
				}
			}
			if (item == downItem) {
				clickTime = Date.now();
				callEvent(doubleClick ? 'doubleclick' : 'click', event,
						downPoint, overItem);
				doubleClick = false;
			}
			downItem = null;
			hasDrag = false;
		},

		_onMouseMove: function(event, point) {
			// Call the mousedrag event first if an item was clicked earlier
			if (downItem)
				callEvent('mousedrag', event, point, downItem, lastPoint);
			var item = handleEvent(this, 'mousemove', event, point, overPoint);
			lastPoint = overPoint = point;
			if (item != overItem) {
				callEvent('mouseleave', event, point, overItem);
				overItem = item;
				callEvent('mouseenter', event, point, item);
			}
		}
	};
});

/*#*/ if (options.server) {
// Node.js server based image exporting code.
CanvasView.inject(new function() {
	var path = require('path');
	// Utility function that converts a number to a string with
	// x amount of padded 0 digits:
	function toPaddedString(number, length) {
		var str = number.toString(10);
		for (var i = 0, l = length - str.length; i < l; i++) {
			str = '0' + str;
		}
		return str;
	}
	return {
		// DOCS: CanvasView#exportFrames(param);
		exportFrames: function(param) {
			param = Base.merge({
				fps: 30,
				prefix: 'frame-',
				amount: 1
			}, param);
			if (!param.directory) {
				throw new Error('Missing param.directory');
			}
			var view = this,
				count = 0,
				frameDuration = 1 / param.fps,
				lastTime = startTime = Date.now();

			// Start exporting frames by exporting the first frame:
			exportFrame(param);

			function exportFrame(param) {
				count++;
				var filename = param.prefix + toPaddedString(count, 6) + '.png',
					uri = param.directory + '/' + filename;
				var out = view.exportImage(uri, function() {
					// When the file has been closed, export the next fame:
					var then = Date.now();
					if (param.onProgress) {
						param.onProgress({
							count: count,
							amount: param.amount,
							percentage: Math.round(count / param.amount
									* 10000) / 100,
							time: then - startTime,
							delta: then - lastTime
						});
					}
					lastTime = then;
					if (count < param.amount) {
						exportFrame(param);
					} else {
						// Call onComplete handler when finished:
						if (param.onComplete) {
							param.onComplete();
						}
					}
				});
				if (view.onFrame) {
					view.onFrame({
						delta: frameDuration,
						time: frameDuration * count,
						count: count
					});
				}
			}
		},
		// DOCS: View#exportImage(uri, callback);
		exportImage: function(uri, callback) {
			this.draw();
			// TODO: is it necessary to resolve the path?
			var out = fs.createWriteStream(path.resolve(__dirname, uri)),
				stream = this._element.createPNGStream();
			// Pipe the png stream to the write stream:
			stream.pipe(out);
			if (callback) {
				out.on('close', callback);
			}
			return out;
		}
	};
});
/*#*/ } // options.server
