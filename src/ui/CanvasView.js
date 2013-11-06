/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CanvasView
 * @class
 * @private
 */
var CanvasView = View.extend(/** @lends CanvasView# */{
	_class: 'CanvasView',

	/**
	 * Creates a view object that wraps a canvas element.
	 * 
	 * @name CanvasView#initialize
	 * @param {HTMLCanvasElement} canvas the canvas object that this view should
	 * wrap
	 */
	/**
	 * Creates a view object that wraps a newly created canvas element.
	 * 
	 * @name CanvasView#initialize
	 * @param {Size} size the size of the canvas to be created
	 */
	initialize: function CanvasView(canvas) {
		// Handle canvas argument
		if (!(canvas instanceof HTMLCanvasElement)) {
			// See if the arguments describe the view size:
			var size = Size.read(arguments);
			if (size.isZero())
				throw new Error(
						'Cannot create CanvasView with the provided argument: '
						+ canvas);
			canvas = CanvasProvider.getCanvas(size);
		}
		var ctx = this._context = canvas.getContext('2d');
		// Have Item count installed mouse events.
		this._eventCounters = {};
		this._ratio = 1;
		if (PaperScope.hasAttribute(canvas, 'hidpi')) {
			// Hi-DPI Canvas support based on:
			// http://www.html5rocks.com/en/tutorials/canvas/hidpi/
			var deviceRatio = window.devicePixelRatio || 1,
				backingStoreRatio = DomElement.getPrefixValue(ctx,
						'backingStorePixelRatio') || 1;
			this._ratio = deviceRatio / backingStoreRatio;
		}
		View.call(this, canvas);
	},

	_setViewSize: function(size) {
		var width = size.width,
			height = size.height,
			ratio = this._ratio,
			element = this._element,
			style = element.style;
		// Upscale the canvas if the two ratios don't match.
		element.width = width * ratio;
		element.height = height * ratio;
		if (ratio !== 1) {
			style.width = width + 'px';
			style.height = height + 'px';
			// Now scale the context to counter the fact that we've manually
			// scaled our canvas element.
			this._context.scale(ratio, ratio);
		}
	},

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	draw: function(checkRedraw) {
		if (checkRedraw && !this._project._needsRedraw)
			return false;
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size.width + 1, size.height + 1);
		this._project.draw(ctx, this._matrix);
		this._project._needsRedraw = false;
		return true;
	}
}, new function() { // Item based mouse handling:

	var downPoint,
		lastPoint,
		overPoint,
		downItem,
		lastItem,
		overItem,
		hasDrag,
		doubleClick,
		clickTime;

	// Returns false if event was stopped, true otherwise, whether handler was
	// called or not!
	function callEvent(type, event, point, target, lastPoint, bubble) {
		var item = target,
			mouseEvent;
		while (item) {
			if (item.responds(type)) {
				// Create an reuse the event object if we're bubbling
				if (!mouseEvent)
					mouseEvent = new MouseEvent(type, event, point, target,
							// Calculate delta if lastPoint was passed
							lastPoint ? point.subtract(lastPoint) : null);
				if (item.fire(type, mouseEvent)
						&& (!bubble || mouseEvent._stopped))
					return false;
			}
			item = item.getParent();
		}
		return true;
	}

	function handleEvent(view, type, event, point, lastPoint) {
		if (view._eventCounters[type]) {
			var project = view._project,
				hit = project.hitTest(point, {
					tolerance: project.options.hitTolerance || 0,
					fill: true,
					stroke: true
				}),
				item = hit && hit.item;
			if (item) {
				// If this is a mousemove event and we change the overItem,
				// reset lastPoint to point so delta is (0, 0)
				if (type === 'mousemove' && item != overItem)
					lastPoint = point;
				// If we have a downItem with a mousedrag event, do not send
				// mousemove events to any item while we're dragging.
				// TODO: Do we also need to lock mousenter / mouseleave in the
				// same way?
				if (type !== 'mousemove' || !hasDrag)
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
			doubleClick = lastItem == item && (Date.now() - clickTime < 300);
			downItem = lastItem = item;
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
			if (item === downItem) {
				clickTime = Date.now();
				if (!doubleClick
						// callEvent returns false if event is stopped.
						|| callEvent('doubleclick', event, downPoint, item))
					callEvent('click', event, downPoint, item);
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
			if (item !== overItem) {
				callEvent('mouseleave', event, point, overItem);
				overItem = item;
				callEvent('mouseenter', event, point, item);
			}
		}
	};
});

/*#*/ if (options.environment == 'node') {
// Node.js based image exporting code.
CanvasView.inject(new function() {
	// Utility function that converts a number to a string with
	// x amount of padded 0 digits:
	function toPaddedString(number, length) {
		var str = number.toString(10);
		for (var i = 0, l = length - str.length; i < l; i++) {
			str = '0' + str;
		}
		return str;
	}

	var fs = require('fs');

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
				startTime = Date.now(),
				lastTime = startTime;

			// Start exporting frames by exporting the first frame:
			exportFrame(param);

			function exportFrame(param) {
				var filename = param.prefix + toPaddedString(count, 6) + '.png',
					path = param.directory + '/' + filename;
				var out = view.exportImage(path, function() {
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
				// Use Base.merge to convert into a Base object, for #toString()
				view.fire('frame', Base.merge({
					delta: frameDuration,
					time: frameDuration * count,
					count: count
				}));
				count++;
			}
		},

		// DOCS: View#exportImage(path, callback);
		exportImage: function(path, callback) {
			this.draw();
			var out = fs.createWriteStream(path),
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
/*#*/ } // options.environment == 'node'
