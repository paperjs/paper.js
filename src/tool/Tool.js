Tool = ToolHandler.extend({
	beans: true,

	initialize: function(handlers, doc) {
		this.base(handlers);
		if(Paper.document)
			this.document = Paper.document;
	},
	
	setDocument: function(doc) {
		this._document = doc;
		var that = this, curPoint;
		var events = {
			mousedown: function(e) {
				curPoint = new Point(e.offset);
				that.onHandleEvent('MOUSE_DOWN', curPoint, null, null);
				that._document.redraw();
				if(that.eventInterval != -1)
					this.intervalId = setInterval(events.drag, that.eventInterval);
			},
			drag: function(e) {
				if(e) curPoint = new Point(e.offset);
				if(curPoint) {
					that.onHandleEvent('MOUSE_DRAG', curPoint, null, null);
					that._document.redraw();
				}
			},
			dragend: function(e) {
				curPoint = null;
				if(this.eventInterval != -1)
					clearInterval(this.intervalId);
				that.onHandleEvent('MOUSE_UP', new Point(e.offset), null, null);
				that._document.redraw();
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
});