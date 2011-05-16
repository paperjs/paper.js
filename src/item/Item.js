/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var Item = this.Item = Base.extend({
	beans: true,

	initialize: function() {
		paper.project.activeLayer.appendTop(this);
		this._style = PathStyle.create(this);
		this.setStyle(this._project.getCurrentStyle());
	},

	/**
	 * Private notifier that is called whenever a change occurs in this item or
	 * its sub-elements, such as Segments, Curves, PathStyles, etc.
	 *
	 * @param {ChangeFlags} flags describes what exactly has changed.
	 */
	_changed: function(flags) {
		if (flags & ChangeFlags.GEOMETRY) {
			delete this._position;
		}
	},

	/**
	 * The unique id of the item.
	 */
	getId: function() {
		if (this._id == null)
			this._id = Item._id = (Item._id || 0) + 1;
		return this._id;
	},

	/**
	 * The name of the item.
	 */
	getName: function() {
		return this._name;
	},

	setName: function(name) {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren;
		if (name != this._name) {
			// If the item already had a name,
			// remove its property from the parent's children object:
			if (this._name)
				this._removeFromNamed();
			this._name = name || undefined;
		}
		if (name) {
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		} else {
			delete children[name];
		}
	},
	
	_removeFromNamed: function() {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren,
			name = this._name,
			namedArray = namedChildren[name];
		if (children[name] = this)
			delete children[name];
		namedArray.splice(namedArray.indexOf(this), 1);
		// If there are any items left in the named array, set
		// the last of them to be this.parent.children[this.name]
		if (namedArray.length) {
			children[name] = namedArray[namedArray.length - 1];
		} else {
			// Otherwise delete the empty array
			delete namedChildren[name];
		}
	},

	/**
	* Removes the item from its parent's children list.
	*/
	_removeFromParent: function() {
		if (this._parent) {
			if (this._name)
				this._removeFromNamed();
			var res = Base.splice(this._parent._children, null, this._index, 1);
			this._parent = null;
			return !!res.length;
		}
		return false;
	},

	/**
	* Removes the item.
	*/
	remove: function() {
		if (this.isSelected())
			this.setSelected(false);
		return this._removeFromParent();
	},

	/**
	 * When passed a project, copies the item to the project,
	 * or duplicates it within the same project. When passed an item,
	 * copies the item into the specified item.
	 * 
	 * @param project the project to copy the item to
	 * @return the new copy of the item
	 */
	copyTo: function(itemOrProject) {
		var copy = this.clone();
		if (itemOrProject.layers) {
			itemOrProject.activeLayer.appendTop(copy);
		} else {
			itemOrProject.appendTop(copy);
		}
		return copy;
	},

	/**
	 * Clones the item within the same project.
	 * 
	 * @return the newly cloned item
	 */
	clone: function() {
		var copy = new this.constructor();
		// TODO: Copy children and other things.
		if (this._parent) {
			this._parent.appendTop(copy);
		}
		return copy;
	},

	setSelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				this._children[i].setSelected(selected);
			}
		} else {
			if ((selected = !!selected) != this._selected) {
				// TODO: when an item is removed or moved to another
				// project, it needs to be removed from _selectedItems
				this._selected = selected;
				this._project._selectItem(this, selected);
			}
		}
	},
	
	isSelected: function() {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				if (this._children[i].isSelected()) {
					return true;
				}
			}
		} else {
			return !!this._selected;
		}
		return false;
	},
	
	getProject: function() {
		return this._project;
	},

	_setProject: function(project) {
		if (this._project != project) {
			this._project = project;
			if (this._children) {
				for (var i = 0, l = this._children.length; i < l; i++) {
					this._children[i]._setProject(project);
				}
			}
		}
	},
	
	// TODO: isFullySelected / setFullySelected
	// TODO: Change to getter / setters for these below that notify of changes
	// through _changed()
	/**
	 * Specifies whether the item is locked.
	 * 
	 * @return true if the item is locked, false otherwise.
	 */
	locked: false,

	/**
	 * Specifies whether the item is visible.
	 * 
	 * @return true if the item is visible, false otherwise.
	 */
	visible: true,

	/**
	 * The opacity of the item.
	 * 
	 * @return the opacity of the item as a value between 0 and 1.
	 */
	opacity: 1,

	/**
	 * The blend mode of the item.
	 */
	blendMode: 'normal',

	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 * 
	 * @return true if the item defines a clip mask, false otherwise.
	 */
	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		this._clipMask = clipMask;
		if (this._clipMask) {
			this.setFillColor(null);
			this.setStrokeColor(null);
		}
	},

	// TODO: get/setIsolated (print specific feature)
	// TODO: get/setKnockout (print specific feature)
	// TODO get/setAlphaIsShape
	// TODO: get/setData

	/**
	 * The item that this item is contained within.
	 */
	getParent: function() {
		return this._parent;
	},

	// TODO: #getLayer()

	/**
	 * The index of this item within the list of it's parent's children.
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * The children items contained within this item.
	 */
	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		for (var i = 0, l = items && items.length; i < l; i++)
			this.appendTop(items[i]);
	},

	/**
	 * Checks if the item contains any children items.
	 * 
	 * @return true if it has one or more children, false otherwise.
	 */
	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	/**
	 * Reverses the order of this item's children
	 */
	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			for (var i = 0, l = this._children.length; i < l; i++) {
				this._children[i]._index = i;
			}
		}
	},

	/**
	 * Removes all of the item's children, if it has any
	 */
	removeChildren: function() {
		var removed = false;
		if (this._children) {
			for (var i = this._children.length; i >= 0; i--)
				removed = this._children[i].remove() || removed;
		}
		return removed;
	},

	/**
	 * The first item contained within this item.
	 */
	getFirstChild: function() {
		return this._children && this._children[0] || null;
	},

	/**
	 * The last item contained within this item.
	 */
	getLastChild: function() {
		return this._children && this._children[this._children.length - 1]
				|| null;
	},

	/**
	 * The next item on the same level as this item.
	 */
	getNextSibling: function() {
		return this._parent && this._parent._children[this._index + 1] || null;
	},

	/**
	 * The previous item on the same level as this item.
	 */
	getPreviousSibling: function() {
		return this._parent && this._parent._children[this._index - 1] || null;
	},

	/**
	 * Checks whether the item is editable.
	 * 
	 * @return true when neither the item, nor it's parents are locked or
	 * hidden, false otherwise.
	 */
	isEditable: function() {
		var parent = this;
		while (parent) {
			if (parent.hidden || parent.locked)
				return false;
			parent = parent._parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 * 
	 * @return true if the item is valid, false otherwise.
	 */
	// TODO: isValid / checkValid

	/**
	 * Checks if this item is above the specified item in the stacking order of
	 * the project.
	 * 
	 * @param item The item to check against
	 * @return true if it is above the specified item, false otherwise.
	 */
	// TODO: isAbove

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the project.
	 * 
	 * @param item The item to check against
	 * @return true if it is below the specified item, false otherwise.
	 */
	// TODO: isBelow

	isParent: function(item) {
		return this._parent == item;
	},

	isChild: function(item) {
		return item._parent == this;
	},

	/**
	 * Checks if the item is contained within the specified item.
	 * 
	 * @param item The item to check against
	 * @return true if it is inside the specified item, false otherwise.
	 */
	isDescendant: function(item) {
		var parent = this;
		while (parent = parent._parent) {
			if (parent == item)
				return true;
		}
		return false;
	},

	/**
	 * Checks if the item is an ancestor of the specified item.
	 * 
	 * @param item the item to check against
	 * @return true if the item is an ancestor of the specified item, false otherwise.
	 */
	isAncestor: function(item) {
		var parent = item;
		while (parent = parent._parent) {
			if (parent == this)
				return true;
		}
		return false;
	},

	/**
	 * Checks whether the item is grouped with the specified item.
	 * 
	 * @param item
	 * @return true if the items are grouped together, false otherwise.
	 */
	isGroupedWith: function(item) {
		var parent = this._parent;
		while (parent) {
			// Find group parents. Check for parent._parent, since don't want
			// top level layers, because they also inherit from Group
			if (parent._parent
				&& (parent instanceof Group || parent instanceof CompoundPath)
				&& item.isDescendant(parent))
					return true;
			// Keep walking up otherwise
			parent = parent._parent;
		}
		return false;
	},
	
	getStrokeBounds: function() {
		return this._getBounds(true);
	},
	
	getBounds: function() {
		return this._getBounds(false);
	},
	
	_getBounds: function(includeStroke) {
		var children = this._children;
		if (children && children.length) {
			var x1 = Infinity,
				x2 = -Infinity,
				y1 = x1,
				y2 = x2;
			for (var i = 0, l = children.length; i < l; i++) {
				var child = children[i];
				if (child.visible) {
					var rect = includeStroke
							? child.getStrokeBounds()
							: child.getBounds();
					x1 = Math.min(rect.x, x1);
					y1 = Math.min(rect.y, y1);
					x2 = Math.max(rect.x + rect.width, x2);
					y2 = Math.max(rect.y + rect.height, y2);
				}
			}
			return includeStroke
				? Rectangle.create(x1, y1, x2 - x1, y2 - y1)
				: LinkedRectangle.create(this, 'setBounds',
						x1, y1, x2 - x1, y2 - y1);
		}
		// TODO: What to return if nothing is defined, e.g. empty Groups?
		// Scriptographer behaves weirdly then too.
		return new Rectangle();
	},

	setBounds: function(rect) {
		rect = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.center;
		// Read this from bottom to top:
		// Translate to new center:
		matrix.translate(center);
		// Scale to new Size, if size changes and avoid divisions by 0:
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		// Translate to center:
		center = bounds.center;
		matrix.translate(-center.x, -center.y);
		// Now execute the transformation:
		this.transform(matrix);
	},

	/**
	 * The bounding rectangle of the item including stroke width.
	 */
	// TODO: getStrokeBounds

	/**
	 * The bounding rectangle of the item including stroke width and controls.
	 */
	// TODO: getControlBounds

	/**
	 * Rasterizes the item into a newly created Raster object. The item itself
	 * is not removed after rasterization.
	 * 
	 * @param resolution the resolution of the raster in dpi {@default 72}
	 * @return the newly created Raster item
	 */
	rasterize: function(resolution) {
		// TODO: why would we want to pass a size to rasterize? Seems to produce
		// weird results on Scriptographer. Also we can't use antialiasing, since
		// Canvas doesn't support it yet. Project colorMode is also out of the
		// question for now.
		var bounds = this.getStrokeBounds(),
			scale = (resolution || 72) / 72,
			canvas = CanvasProvider.getCanvas(bounds.getSize().multiply(scale)),
			ctx = canvas.getContext('2d'),
			matrix = new Matrix().scale(scale).translate(-bounds.x, -bounds.y);
		matrix.applyToContext(ctx);
		this.draw(ctx, {});
		var raster = new Raster(canvas);
		raster.setPosition(this.getPosition());
		raster.scale(1 / scale);
		return raster;
	},

	/**
	 * The item's position within the art board. This is the
	 * {@link Rectangle#getCenter()} of the {@link Item#getBounds()} rectangle.
	 */
	getPosition: function() {
		// Cache position value
		if (!this._position) {
			// Center is a LinkedPoint as well, so we can use _x and _y
			var center = this.getBounds().getCenter();
			this._position = LinkedPoint.create(this, 'setPosition',
					center._x, center._y);
		}
		return this._position;
	},

	setPosition: function(point) {
		point = Point.read(arguments);
		if (point)
			this.translate(point.subtract(this.getPosition()));
	},

	/**
	 * @param flags: Array of any of the following: 'objects', 'children',
	 *     'fill-gradients', 'fill-patterns', 'stroke-patterns', 'lines'. 
	 *     Default: ['objects', 'children']
	 */
	transform: function(matrix, flags) {
		// TODO: Handle flags, add TransformFlag class and convert to bit mask
		// for quicker checking
		// TODO: Call transform on chidren only if 'children' flag is provided
		if (this._transform)
			this._transform(matrix, flags);
		// Transform position as well. Do not modify _position directly,
		// since it's a LinkedPoint and would cause recursion!
		if (this._position)
			matrix._transformPoint(this._position, this._position, true);
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				var child = this._children[i];
				child.transform(matrix, flags);
			}
		}
		// PORT: Return 'this' in all chainable commands
		return this;
	},

/*
	_transform: function(matrix, flags) {
		// The code that performs the actual transformation of content,
		// if defined. Item itself does not define this.
	},
*/
	/**
	 * Translates (moves) the item by the given offset point.
	 * 
	 * @param delta
	 */
	translate: function(delta) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	/**
	 * Scales the item by the given values from its center point, or optionally
	 * by a supplied point.
	 * 
	 * @param sx
	 * @param sy
	 * @param center {@default the center point of the item}
	 * 
	 * @see Matrix#scale(double, double, Point center)
	 */
	scale: function(sx, sy /* | scale */, center) {
		// See Matrix#scale for explanation of this:
		if (arguments.length < 2 || typeof sy === 'object') {
			center = sy;
			sy = sx;
		}
		return this.transform(new Matrix().scale(sx, sy,
				center || this.getPosition()));
	},

	/**
	 * Rotates the item by a given angle around the given point.
	 * 
	 * Angles are oriented clockwise and measured in degrees by default. Read
	 * more about angle units and orientation in the description of the
	 * {@link com.scriptographer.ai.Point#getAngle()} property.
	 * 
	 * @param angle the rotation angle
	 * @see Matrix#rotate(double, Point)
	 */
	rotate: function(angle, center) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition()));
	},

	/**
	 * Shears the item with a given amount around its center point.
	 * 
	 * @param shx
	 * @param shy
	 * @see Matrix#shear(double, double)
	 */
	shear: function(shx, shy, center) {
		// TODO: Add support for center back to Scriptographer too!
		// See Matrix#scale for explanation of this:
		if (arguments.length < 2 || typeof sy === 'object') {
			center = shy;
			shy = shx;
		}
		return this.transform(new Matrix().shear(shx, shy,
				center || this.getPosition()));
	},

	/**
	 * The path style of the item.
	 */
	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this._style.initialize(style);
	},

	// TODO: toString

	statics: {
		drawSelectedBounds: function(bounds, ctx, matrix) {
			var coords = matrix._transformCorners(bounds);
			ctx.beginPath();
			for (var i = 0; i < 8; i++)
				ctx[i == 0 ? 'moveTo' : 'lineTo'](coords[i], coords[++i]);
			ctx.closePath();
			ctx.stroke();
			for (var i = 0; i < 8; i++) {
				ctx.beginPath();
				ctx.rect(coords[i] - 2, coords[++i] - 2, 4, 4);
				ctx.fill();
			}
		},

		// TODO: Implement ProjectView into the drawing
		// TODO: Optimize temporary canvas drawing to ignore parts that are
		// outside of the visible view.
		draw: function(item, ctx, param) {
			if (!item.visible || item.opacity == 0)
				return;

			var tempCanvas, parentCtx;
			// If the item has a blendMode or is defining an opacity, draw it on
			// a temporary canvas first and composite the canvas afterwards.
			// Paths with an opacity < 1 that both define a fillColor
			// and strokeColor also need to be drawn on a temporary canvas first,
			// since otherwise their stroke is drawn half transparent over their
			// fill.
			if (item.blendMode !== 'normal'
					|| item.opacity < 1
					&& !(item._segments && (!item.getFillColor()
							|| !item.getStrokeColor()))) {
				var bounds = item.getStrokeBounds() || item.getBounds();
				if (!bounds.width || !bounds.height)
					return;

				// Floor the offset and ceil the size, so we don't cut off any
				// antialiased pixels when drawing onto the temporary canvas.
				var itemOffset = bounds.getTopLeft().floor(),
					size = bounds.getSize().ceil().add(new Size(1, 1));
				tempCanvas = CanvasProvider.getCanvas(size);

				// Save the parent context, so we can draw onto it later
				parentCtx = ctx;

				// Set ctx to the context of the temporary canvas,
				// so we draw onto it, instead of the parentCtx
				ctx = tempCanvas.getContext('2d');
				ctx.save();

				// Translate the context so the topLeft of the item is at (0, 0)
				// on the temporary canvas.
				ctx.translate(-itemOffset.x, -itemOffset.y);
			}
			var savedOffset;
			if (itemOffset) {
				savedOffset = param.offset;
				param.offset = itemOffset;
			}
			item.draw(ctx, param);
			if (itemOffset)
				param.offset = savedOffset;

			// If we created a temporary canvas before, composite it onto the
			// parent canvas:
			if (tempCanvas) {

				// Restore the temporary canvas to its state before the
				// translation matrix was applied above.
				ctx.restore();

				// If the item has a blendMode, use BlendMode#process to
				// composite its canvas on the parentCanvas.
				if (item.blendMode !== 'normal') {
					// The pixel offset of the temporary canvas to the parent
					// canvas.
					var pixelOffset = itemOffset.subtract(param.offset);
					BlendMode.process(item.blendMode, ctx, parentCtx,
						item.opacity, pixelOffset);
				} else {
				// Otherwise we just need to set the globalAlpha before drawing
				// the temporary canvas on the parent canvas.
					parentCtx.save();
					parentCtx.globalAlpha = item.opacity;
					parentCtx.drawImage(tempCanvas,
							itemOffset.x, itemOffset.y);
					parentCtx.restore();
				}

				// Return the temporary canvas, so it can be reused
				CanvasProvider.returnCanvas(tempCanvas);
			}
		}
	}
}, new function() {

	function append(top) {
		return function(item) {
			item._removeFromParent();
			if (this._children) {
				Base.splice(this._children, [item], top ? undefined : 0, 0);
				item._parent = this;
				item._setProject(this._project);
				if (item._name)
					item.setName(item._name);
				return true;
			}
			return false;
		};
	}

	function move(above) {
		return function(item) {
			// first remove the item from its parent's children list
			if (item._parent && this._removeFromParent()) {
				Base.splice(item._parent._children, [this],
						item._index + (above ? 1 : -1), 0);
				this._parent = item._parent;
				this._setProject(item._project);
				if (item._name)
					item.setName(item._name);
				return true;
			}
			return false;
		};
	}

	return {
		/**
		 * Inserts the specified item as a child of the item by appending it to
		 * the list of children and moving it above all other children. You can
		 * use this function for groups, compound paths and layers.
		 *
		 * @param item The item that will be appended as a child
		 */
		appendTop: append(true),

		/**
		 * Inserts the specified item as a child of this item by appending it to
		 * the list of children and moving it below all other children. You can
		 * use this function for groups, compound paths and layers.
		 * 
		 * @param item The item that will be appended as a child
		 */
		appendBottom: append(false),

		/**
		 * Moves this item above the specified item.
		 * 
		 * @param item The item above which it should be moved
		 * @return true if it was moved, false otherwise
		 */
		moveAbove: move(true),

		/**
		 * Moves the item below the specified item.
		 *
		 * @param item the item below which it should be moved
		 * @return true if it was moved, false otherwise
		 */
		moveBelow: move(false)
	};
}, new function() {
	var sets = {
		down: {}, drag: {}, up: {}, move: {}
	};

	function removeAll(set) {
		for (var id in set) {
			var item = set[id];
			item.remove();
			for (var type in sets) {
				var other = sets[type];
				if (other != set && other[item.getId()])
					delete other[item.getId()];
			}
		}
	}

	function installHandler(name) {
		var handler = 'onMouse' + Base.capitalize(name);
		// Inject a onMouse handler that performs all the behind the scene magic
		// and calls the script's handler at the end, if defined.
		var func = paper.tool[handler];
		if (!func || !func._installed) {
			var hash = {};
			hash[handler] = function(event) {
				// Always clear the drag set on mouseup
				if (name === 'up')
					sets.drag = {};
				removeAll(sets[name]);
				sets[name] = {};
				// Call the script's overridden handler, if defined
				if (this.base)
					this.base(event);
			};
			paper.tool.inject(hash);
			// Only install this handler once, and mark it as installed,
			// to prevent repeated installing.
			paper.tool[handler]._installed = true;
		}
	}

	return Base.each(['down', 'drag', 'up', 'move'], function(name) {
		this['removeOn' + Base.capitalize(name)] = function() {
			var hash = {};
			hash[name] = true;
			return this.removeOn(hash);
		};
	}, {
		removeOn: function(obj) {
			for (var name in obj) {
				if (obj[name]) {
					sets[name][this.getId()] = this;
					// Since the drag set gets cleared in up, we need to make
					// sure it's installed too
					if (name === 'drag')
						installHandler('up');
					installHandler(name);
				}
			}
			return this;
		}
	});
});
