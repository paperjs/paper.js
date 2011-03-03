var Tool = ToolHandler.extend(new function() {
	function viewToArtwork(event, document) {
		var point = Point.create(event.offset.x, event.offset.y);
		// TODO: always the active view?
		return document.activeView.viewToArtwork(point);
	};
	
	return {
		beans: true,

		initialize: function(handlers, doc) {
			this.base(handlers);
			if (paper.document)
				this.document = paper.document;
		},

		setDocument: function(doc) {
			if (this._document)
				$(this._document.canvas).removeEvents();
			this._document = doc || paper.document;
			var that = this, curPoint;
			var dragging = false;
			var events = {
				dragstart: function(e) {
					curPoint = viewToArtwork(e, that._document);
					that.onHandleEvent('MOUSE_DOWN', curPoint, null, null);
					if (that.onMouseDown)
						that._document.redraw();
					if (that.eventInterval != -1)
						this.intervalId = setInterval(events.drag, that.eventInterval);
					dragging = true;
				},
				drag: function(e) {
					if (e) curPoint = viewToArtwork(e, that._document);
					if (curPoint) {
						that.onHandleEvent('MOUSE_DRAG', curPoint, null, null);
						if (that.onMouseDrag)
							that._document.redraw();
					}
				},
				dragend: function(e) {
					curPoint = null;
					if (this.eventInterval != -1)
						clearInterval(this.intervalId);
					that.onHandleEvent('MOUSE_UP', 
						viewToArtwork(e, that._document), null, null);
					if (that.onMouseUp)
						that._document.redraw();
					dragging = false;
				},
				mousemove: function(e) {
					if (!dragging) {
						that.onHandleEvent('MOUSE_MOVE',
							viewToArtwork(e, that._document), null, null);
						if (that.onMouseMove)
							that._document.redraw();
					}
				}
			};
			$(doc.canvas).addEvents(events);
		},

		/**
		 * The fixed time delay between each call to the {@link #onMouseDrag}
		 * event. Setting this to an interval means the {@link #onMouseDrag} event
		 * is called repeatedly after the initial {@link #onMouseDown} until the
		 * user releases the mouse.
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
		eventInterval: -1,

		getDocument: function() {
			return this._document;
		}
	};
});