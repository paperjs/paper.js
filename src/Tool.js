Tool = ToolHandler.extend({
	initialize: function(handlers, doc) {
		this.base(handlers);
		this.setEventInterval(-1);
	},
	
	setDocument: function(doc) {
		this.document = doc;
		var that = this;
		$(doc.canvas).addEvents({
			mousedown: function(e) {
				that.onHandleEvent('MOUSE_DOWN', new Point(e.offset), null, null);
				that.document.redraw();
			},
			drag: function(e) {
				that.onHandleEvent('MOUSE_DRAG', new Point(e.offset), null, null);
				that.document.redraw();
			},
			mouseup: function(e) {
				that.onHandleEvent('MOUSE_UP', new Point(e.offset), null, null);
				that.document.redraw();
			}
		});
	},
	
	/**
	 * Sets the fixed time delay between each call to the {@link #onMouseDrag}
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
	getEventInterval: function() {
		return this.eventInterval;
	},
	
	setEventInterval: function(interval) {
		this.eventInterval = interval;
	}
});