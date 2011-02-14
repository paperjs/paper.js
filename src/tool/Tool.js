Tool = ToolHandler.extend({
	beans: true,

	initialize: function(handlers, doc) {
		this.base(handlers);
	},
	
	setDocument: function(doc) {
		this._document = doc;
		var that = this;
		$(doc.canvas).addEvents({
			mousedown: function(e) {
				that.onHandleEvent('MOUSE_DOWN', new Point(e.offset), null, null);
				that._document.redraw();
			},
			drag: function(e) {
				that.onHandleEvent('MOUSE_DRAG', new Point(e.offset), null, null);
				that._document.redraw();
			},
			dragend: function(e) {
				that.onHandleEvent('MOUSE_UP', new Point(e.offset), null, null);
				that._document.redraw();
			}
		});
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