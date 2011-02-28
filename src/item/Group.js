Group = Item.extend({
	beans: true,
	initialize: function(items) {
		this.base();
		this.children = [];
		if (items) {
			for (var i = 0, l = items.length; i < l; i++) {
				this.appendTop(items[i]);
			}
		}
		this.clipped = false;
	},
	
	draw: function(ctx, param) {
		if (!this.visible)
			return;
		// If the group has an opacity of less then 1, draw its children on a
		// temporary canvas, and then draw that canvas onto ctx afterwards
		// with globalAlpha set.
		var tempCanvas, originalCtx;
		if (this.blendMode != 'normal' && !param.ignoreBlendMode) {
			BlendMode.process(ctx, this, param);
		} else {
			param.ignoreBlendMode = false;
			if (this.opacity < 1) {
				var originalCtx = ctx;
				// TODO: use strokeBounds for this, when implemented:
				tempCanvas = CanvasProvider.getCanvas(this.document.size);
				ctx = tempCanvas.getContext('2d');
				ctx.save();
				this.document.activeView.matrix.applyToContext(ctx);
			}
			for (var i = 0, l = this.children.length; i < l; i++) {
				this.children[i].draw(ctx, param);
				if (this.clipped & i == 0)
					ctx.clip();
			}
			if (tempCanvas) {
				// restore the activeView.matrix transformation,
				// so we can draw the image without transformation.
				originalCtx.restore();
				originalCtx.save();
				originalCtx.globalAlpha = this.opacity;
				originalCtx.drawImage(tempCanvas, 0, 0);
				originalCtx.restore();
				// apply the view transformation again.
				this.document.activeView.matrix.applyToContext(ctx);
				// Restore the state of the temp canvas:
				ctx.restore();
				// Return the temp canvas, so it can be reused
				CanvasProvider.returnCanvas(tempCanvas);
			}
		}
	},
	
	getBounds: function() {
		if (this.children.length) {
			var rect = this.children[0].bounds;
			var x1 = rect.x;
			var y1 = rect.y;
			var x2 = rect.x + rect.width;
			var y2 = rect.y + rect.height;
			for (var i = 1, l = this.children.length; i < l; i++) {
				var rect2 = this.children[i].bounds;
				x1 = Math.min(rect2.x, x1);
				y1 = Math.min(rect2.y, y1);
				x2 = Math.max(rect2.x + rect2.width, x1 + x2 - x1);
				y2 = Math.max(rect2.y + rect2.height, y1 + y2 - y1);
			}
		}
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},
	
	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to true, the first child in the group is automatically
	 * defined as the clipping mask.
	 *
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * group.appendChild(path);
	 * group.clipped = true;
	 * </code>
	 * @return {@true if the group item is to be clipped}
	 */
	isClipped: function() {
		return this._clipped;
	},
	
	setClipped: function(clipped) {
		this._clipped = clipped;
		var child = this.firstChild;
		if (child)
			child.setClipMask(clipped);
	}
});
