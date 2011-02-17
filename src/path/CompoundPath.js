new function() {
	
	function getCurrentPath(compoundPath) {
		if (compoundPath.children.length) {
			return compoundPath.children[compoundPath.children.length - 1];
		} else {
			throw Error('Use a moveTo() command first');
		}
	}
	
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
				for (var i = 0, l = this.children.length; i < l; i++) {
					var child = this.children[i];
					child.draw(ctx, true);
				}
				firstChild.setCtxStyles(ctx);
				if (firstChild.fillColor) ctx.fill();
				if (firstChild.strokeColor) ctx.stroke();
			}
		},
		
		/**
		 * If this is a compound path with only one path inside,
		 * the path is moved outside and the compound path is erased.
		 * Otherwise, the compound path is returned unmodified.
		 *
		 * @return the simplified compound path.
		 */
		simplify: function() {
			if(this.children.length == 1) {
				var child = this.children[0];
				child.moveAbove(this);
				this.remove();
				return child;
			}
			return this;
		},
		
		smooth: function() {
			for (var i = 0, l = this.children.length; i < l; i++) {
				this.children[i].smooth();
			}
		},
		
		moveTo: function() {
			var path = new Path();
			this.appendTop(path);
			path.moveTo.apply(path, arguments);
		},
		
		moveBy: function() {
			if (!arguments.length) {
				this.moveTo(0, 0);
			} else {
				var point = Point.read(arguments);
				var curPath = this.getCurrentPath(this);
				var current = curPath.segments[curPath.segments.length - 1].point;
				this.moveTo(current.add(point));
			}
		}
	});
	
	var keys = ['lineTo', 'cubicCurveTo', 'curveTo', 'quadraticCurveTo',
	'arcTo', 'lineBy', 'curveBy', 'arcBy'];
	var props = {};

	function addProp(key) {
		props[key] = function() {
			var curPath = getCurrentPath(this);
			curPath[key].apply(curPath, arguments);
		};
	}

	for (var i = 0, l = keys.length; i < l; i++) {
		addProp(keys[i]);
	}
	CompoundPath.inject(props);
};