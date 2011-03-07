/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved. See LICENSE file for details.
 */

var Tool = this.Tool = ToolHandler.extend(new function() {
	function viewToArtwork(event, document) {
		var point = Events.getOffset(event);
		// TODO: always the active view?
		return document.activeView.viewToArtwork(point);
	};

	return {
		beans: true,

		initialize: function(handlers, doc) {
			this.base(handlers);
			// Create events once, so they can be removed easily too.
			var that = this, curPoint;
			var dragging = false;
			this.events = {
				mousedown: function(event) {
					curPoint = viewToArtwork(event, that._document);
					that.onHandleEvent('mouse-down', curPoint, null, null);
					if (that.onMouseDown)
						that._document.redraw();
					if (that.eventInterval != null) {
						this.timer = setInterval(that.events.mousemove,
								that.eventInterval);
					}
					dragging = true;
				},

				mousemove: function(event) {
					var point = event && viewToArtwork(event, that._document);
					if (dragging) {
						curPoint = point || curPoint;
						if (curPoint) {
							that.onHandleEvent('mouse-drag', curPoint, null, null);
							if (that.onMouseDrag)
								that._document.redraw();
						}
					} else {
						that.onHandleEvent('mouse-move', point, null, null);
						if (that.onMouseMove)
							that._document.redraw();
					}
				},

				mouseup: function(event) {
					if (dragging) {
						curPoint = null;
						if (this.eventInterval != null)
							clearInterval(this.timer);
						that.onHandleEvent('mouse-up',
								viewToArtwork(event, that._document), null, null);
						if (that.onMouseUp)
							that._document.redraw();
						dragging = false;
					}
				}
			}
			if (paper.document)
				this.setDocument(paper.document);
			
		},

		getDocument: function() {
			return this._document;
		},

		setDocument: function(doc) {
			// Remove old events first.
			if (this._document)
				Events.remove(this._document.canvas, this.events);
			this._document = doc || paper.document;
			Events.add(doc.canvas, this.events);
		},

		/**
		 * The fixed time delay between each call to the {@link #onMouseDrag}
		 * event. Setting this to an interval means the {@link #onMouseDrag}
		 * event is called repeatedly after the initial {@link #onMouseDown}
		 * until the user releases the mouse.
		 * 
		 * Sample code:
		 * <code>
		 * // Fire the onMouseDrag event once a second,
		 * // while the mouse button is down
		 * tool.eventInterval = 1000;
		 * </code>
		 * 
		 * @return the interval time in milliseconds
		 */
		eventInterval: null
	};
});
