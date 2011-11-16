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
				size = new Size(1024, 768);
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
		downItem,
		hasDrag,
		overItem,
		doubleClick,
		clickTime;

	function callEvent(type, point, target, event, bubble) {
		var item = target,
			mouseEvent,
			called = false;
		while (item) {
			if (item.responds(type)) {
				if (!mouseEvent)
					mouseEvent = new MouseEvent(type, point, target, event);
				called = item.fire(type, mouseEvent) || called;
				if (called && (!bubble || mouseEvent._stopped))
					break;
			}
			item = item.getParent();
		}
		return called;
	}

	function handleEvent(view, type, event, point) {
		if (view._eventCounters[type]) {
			var hit = view._project.hitTest(point, hitOptions),
				item = hit && hit.item;
			if (item) {
				// If we have a downItem with a mousedrag event, do not send
				// mousemove events to any item while we're dragging.
				if (type != 'mousemove' || !downItem)
					callEvent(type, point, item, event);
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
			downPoint = point;
			hasDrag = downItem && downItem.responds('mousedrag');
		},

		_onMouseUp: function(event, point) {
			var item = handleEvent(this, 'mouseup', event, point);
			// If we had a mousedrag event locking mousemove events and are over
			// another item, send it a mousemove event now
			if (hasDrag && item != downItem)
				callEvent('mousemove', point, item, event);
			if (item == downItem) {
				clickTime = Date.now();
				callEvent(doubleClick ? 'doubleclick' : 'click', downPoint,
						overItem, event);
				doubleClick = false;
			}
			downItem = null;
			hasDrag = false;
		},

		_onMouseMove: function(event, point) {
			// Call the mousedrag event first if an item was clicked earlier
			if (downItem)
				callEvent('mousedrag', point, downItem, event);
			var item = handleEvent(this, 'mousemove', event, point);
			if (item != overItem) {
				callEvent('mouseleave', point, overItem, event);
				overItem = item;
				callEvent('mouseenter', point, item, event);
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
