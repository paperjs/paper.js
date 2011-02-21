CompoundPath = PathItem.extend(new function() {

	function getCurrentPath(compoundPath) {
		if (compoundPath.children.length) {
			return compoundPath.children[compoundPath.children.length - 1];
		} else {
			throw Error('Use a moveTo() command first');
		}
	}
	
	var fields = {
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
			if(!this.visible)
				return;
			if (this.children.length) {
				var firstChild = this.children[0];
				ctx.beginPath();
				for (var i = 0, l = this.children.length; i < l; i++) {
					var child = this.children[i];
					child.draw(ctx, true);
				}
				firstChild.setCtxStyles(ctx);
				if (firstChild.fillColor) {
					ctx.fillStyle = firstChild.fillColor.getCssString();
					ctx.fill();
				}
				if (firstChild.strokeColor) {
					ctx.strokeStyle = firstChild.strokeColor.getCssString();
					ctx.stroke();
				}
			}
		},
		
		// TODO: add getBounds
		
		/**
		 * If this is a compound path with only one path inside,
		 * the path is moved outside and the compound path is erased.
		 * Otherwise, the compound path is returned unmodified.
		 *
		 * @return the simplified compound path.
		 */
		simplify: function() {
			if (this.children.length == 1) {
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
				// TODO: Shouldn't this be relative to the previous position
				// in lack of an argument? This should then be corrected in
				// Scriptographer too.
				this.moveTo(0, 0);
			} else {
				var point = Point.read(arguments);
				var path = getCurrentPath(this);
				var current = path.segments[path.segments.length - 1].point;
				this.moveTo(current.add(point));
			}
		},

		closePath: function() {
			var path = getCurrentPath();
			path.setClosed(true);
		}
	};

	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'curveBy', 'arcBy'], function(key) {
		fields[key] = function() {
			var path = getCurrentPath(this);
			path[key].apply(path, arguments);
		};
	});

	return fields;
});