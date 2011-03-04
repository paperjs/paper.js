var Events = {
	add: function(obj, events) {
		for (var type in events) {
			var func = events[type];
			if (obj.addEventListener) {
				obj.addEventListener(type, func, false);
			} else if (obj.attachEvent) {
				// Make a bound closure that calls on the write object and
				// passes the event object.
				obj.attachEvent('on' + type, func.bound = function() {
					func.call(obj, window.event);
				});
			}
		}
	},

	remove: function(obj, events) {
		for (var type in events) {
			var func = events[type];
			if (obj.removeEventListener) {
				obj.removeEventListener(type, func, false);
			} else if (obj.detachEvent) {
				// Remove the bound function instead of func itself
				obj.detachEvent('on' + type, func.bound);
			}
		}
	},

	getPoint: function(event) {
		return Point.create(
			event.pageX || event.clientX + document.documentElement.scrollLeft,
			event.pageY || event.clientY + document.documentElement.scrollTop
		);
	},

	getOffset: function(event) {
		var point = Events.getPoint(event);
		// Remove target offsets from page coordinates
		for (var el = event.target || event.srcElement; el;
				point.x -= el.offsetLeft, point.y -= el.offsetTop,
				el = el.offsetParent);
		return point;
	}
};
