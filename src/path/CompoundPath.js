new function() {
	CompoundPath = PathItem.extend({
		initialize: function(items) {
			this.base();
			this.children = [];
			if (items) {
				for (var i = 0, l = items.length; i < l; i++) {
					this.appendTop(items[i]);
				}
			}
		},

		draw: function(ctx) {
			if (this.children.length) {
				var firstChild = this.children[0];
				// if (!child.visible) return;
				ctx.beginPath();
				for(var i = 0, l = this.children.length; i < l; i++) {
					var child = this.children[i];
					child.draw(ctx, true);
				}
				firstChild.setCtxStyles(ctx);
				if (firstChild.fillColor) ctx.fill();
				if (firstChild.strokeColor) ctx.stroke();
			}
		},

		moveTo: function() {
			var path = new Path();
			this.appendTop(path);
			path.moveTo.apply(path, arguments);
		},
		
		moveBy: function() {
			if(!arguments.length) {
				this.moveTo(0, 0);
			} else {
				var point = Point.read(arguments);
				var curPath = this._getCurrentPath();
				var current = curPath.segments[curPath.segments.length - 1].point;
				this.moveTo(current.add(point));
			}
		},
		
		_getCurrentPath: function() {
			if(this.children.length) {
				return this.children[this.children.length - 1];
			} else {
				throw Error('Use a moveTo() command first');
			}
		}
	});
	
	var keys = ['lineTo', 'cubicCurveTo', 'curveTo', 'quadraticCurveTo',
	'arcTo', 'lineBy', 'curveBy', 'arcBy'];
	var props = {};

	function addProp(key) {
		props[key] = function() {
			var curPath = this._getCurrentPath();
			curPath[key].apply(curPath, arguments);
		};
	}

	for (var i = 0, l = keys.length; i < l; i++) {
		addProp(keys[i]);
	}
	CompoundPath.inject(props);
};