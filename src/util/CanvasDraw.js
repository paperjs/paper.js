new function() {
	// TODO: Implement DocumentView into the drawing
	// TODO: Optimize temporary canvas drawing to ignore parts that are
	// outside of the visible view.
	function draw(context, item, param) {
		if (!item.visible || item.opacity == 0)
			return;

		var tempCanvas, parentContext;
		// If the item has a blendMode or is defining an opacity, draw it on
		// a temporary canvas first and composite the canvas afterwards.
		// Paths with an opacity < 1 that both define a fillColor
		// and strokeColor also need to be drawn on a temporary canvas first,
		// since otherwise their stroke is drawn half transparent over their
		// fill.
		if (item.blendMode !== 'normal'
			|| item.opacity < 1
			&& !(item.segments && (!item.fillColor || !item.strokeColor))
		) {
			var bounds = item.strokeBounds;
			if (!item.bounds.width || !item.bounds.height)
				return;
			
			// Floor the offset and ceil the size, so we don't cut off any
			// antialiased pixels when drawing onto the temporary canvas.
			var itemOffset = bounds.topLeft.floor();
			var size = bounds.size.ceil().add(1, 1);
			tempCanvas = CanvasProvider.getCanvas(size);
			
			// Save the parent context, so we can draw onto it later
			parentContext = context;
			
			// Set context to the context of the temporary canvas,
			// so we draw onto it, instead of the parentContext
			context = tempCanvas.getContext('2d');
			context.save();
			
			// Translate the context so the topLeft of the item is at (0, 0)
			// on the temporary canvas.
			context.translate(-itemOffset.x, -itemOffset.y);
		}

		item._draw(context, {
			offset: itemOffset || param.offset,
			compound: param.compound
		});
		
		// If we created a temporary canvas before, composite it onto the
		// parent canvas:
		if (tempCanvas) {

			// Restore the temporary canvas to its state before the translation
			// matrix was applied above.
			context.restore();
			
			// If the item has a blendMode, use BlendMode#process to composite
			// its canvas on the parentCanvas.
			if (item.blendMode != 'normal') {
				// The pixel offset of the temporary canvas to the parent
				// canvas.
				var pixelOffset = itemOffset.subtract(param.offset);
				BlendMode.process(item.blendMode, context, parentContext,
					item.opacity, pixelOffset);
			} else {
			// Otherwise we just need to set the globalAlpha before drawing
			// the temporary canvas on the parent canvas.
				parentContext.save();
				parentContext.globalAlpha = item.opacity;
				parentContext.drawImage(tempCanvas, itemOffset.x, itemOffset.y);
				parentContext.restore();
			}
			
			// Return the temporary canvas, so it can be reused
			CanvasProvider.returnCanvas(tempCanvas);
		}
	}
	
	Doc.inject({
		_draw: function() {
			if (this.canvas) {
				// Initial tests conclude that clearing the canvas using clearRect
				// is always faster than setting canvas.width = canvas.width
				// http://jsperf.com/clearrect-vs-setting-width/7
				this.ctx.clearRect(0, 0, this.size.width + 1, this.size.height + 1);
				this.ctx.save();

				for (var i = 0, l = this.layers.length; i < l; i++) {
					draw(this.ctx, this.layers[i], { offset: new Point(0, 0)});
				}
				this.ctx.restore();
			}
		}
	});

	Group.inject({
		_draw: function(ctx, param) {
			for (var i = 0, l = this.children.length; i < l; i++) {
				draw(ctx, this.children[i], param);
				if (this.clipped && i == 0)
					ctx.clip();
			}
		}
	});

	PlacedSymbol.inject({
		_draw: function(ctx, param) {
			// TODO: we need to preserve strokewidth
			ctx.save();
			this.matrix.applyToContext(ctx);
			draw(ctx, this.symbol.definition, param);
			ctx.restore();
		}
	});

	Raster.inject({
		_draw: function(ctx, param) {
			ctx.save();
			this.matrix.applyToContext(ctx);
			ctx.drawImage(this._canvas || this._image,
					-this.size.width / 2, -this.size.height / 2);
			ctx.restore();
		}
	});

	Path.inject({
		_draw: function(ctx, param) {
			if (!param.compound)
				ctx.beginPath();
			var segments = this._segments;
			var length = segments.length;
			for (var i = 0; i < length; i++) {
				var segment = segments[i];
				var x = segment.point.x;
				var y = segment.point.y;
				var handleIn = segment.handleIn;
				if (i == 0) {
					ctx.moveTo(x, y);
				} else {
					if (handleOut.isZero() && handleIn.isZero()) {
						ctx.lineTo(x, y);
					} else {
						ctx.bezierCurveTo(
							outX, outY,
							handleIn.x + x, handleIn.y + y,
							x, y
						);
					}
				}
				var handleOut = segment.handleOut;
				var outX = handleOut.x + x;
				var outY = handleOut.y + y;
			}
			if (this.closed && length > 1) {
				var segment = segments[0];
				var x = segment.point.x;
				var y = segment.point.y;
				var handleIn = segment.handleIn;
				ctx.bezierCurveTo(outX, outY, handleIn.x + x, handleIn.y + y, x, y);
				ctx.closePath();
			}
			// If the path is part of a compound path or doesn't have a fill or
			// stroke, there is no need to continue.
			if (!param.compound && (this.fillColor || this.strokeColor)) {
				this.setCtxStyles(ctx);
				ctx.save();
				// If the path only defines a strokeColor or a fillColor,
				// draw it directly with the globalAlpha set, otherwise
				// we will do it later when we composite the temporary canvas.
				if (!this.fillColor || !this.strokeColor)
					ctx.globalAlpha = this.opacity;
				if (this.fillColor) {
					ctx.fillStyle = this.fillColor.getCanvasStyle(ctx);
					ctx.fill();
				}
				if (this.strokeColor) {
					ctx.strokeStyle = this.strokeColor.getCanvasStyle(ctx);
					ctx.stroke();
				}
				ctx.restore();
			}
		}
	});

	CompoundPath.inject({
		_draw: function(ctx, param) {
			var firstChild = this.children[0];
			ctx.beginPath();
			param.compound = true;
			for (var i = 0, l = this.children.length; i < l; i++) {
				draw(ctx, this.children[i], param);
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
	});
};