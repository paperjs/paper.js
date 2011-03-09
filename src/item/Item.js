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
		paper.document.activeLayer.appendTop(this);
		this.setStyle(this.document.getCurrentStyle());
	},

	/**
	 * When passed a document, copies the item to the document,
	 * or duplicates it within the same document. When passed an item,
	 * copies the item into the specified item.
	 * 
	 * @param document the document to copy the item to
	 * @return the new copy of the item
	 */
	copyTo: function(itemOrDocument) {
		var copy = this.clone();
		if (itemOrDocument.layers) {
			itemOrDocument.activeLayer.appendTop(copy);
		} else {
			itemOrDocument.appendTop(copy);
		}
		return copy;
	},

	/**
	 * Clones the item within the same document.
	 * 
	 * @return the newly cloned item
	 */
	clone: function() {
		var copy = new this.constructor();
		// TODO: Copy children and other things.
		if (this.parent)
			this.parent.appendTop(copy);
		return copy;
	},

	// TODO: isSelected / setSelected
	// TODO: isFullySelected / setFullySelected

	/**
	 * Specifies whether the item is locked.
	 * 
	 * Sample code:
	 * <code>
	 * var path = new Path();
	 * print(path.locked) // false
	 * path.locked = true; // Locks the path
	 * </code>
	 * 
	 * @return {@true if the item is locked}
	 */
	locked: false,

	/**
	 * Specifies whether the item is visible.
	 * 
	 * Sample code:
	 * <code>
	 * var path = new Path();
	 * print(path.visible) // true
	 * path.visible = false; // Hides the path
	 * </code>
	 * 
	 * @return {@true if the item is visible}
	 */
	visible: true,

	/**
	 * The opacity of the item.
	 * 
	 * Sample code:
	 * <code>
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * 
	 * // Change the opacity of the circle to 50%:
	 * circle.opacity = 0.5;
	 * </code>
	 * 
	 * @return the opacity of the item as a value between 0 and 1.
	 */
	opacity: 1,

	/**
	 * The blend mode of the item.
	 * 
	 * Sample code:
	 * <code>
	 * var circle = new Path.Circle(new Point(50, 50), 10);
	 * print(circle.blendMode); // normal
	 * 
	 * // Change the blend mode of the path item:
	 * circle.blendMode = 'multiply';
	 * </code>
	 */
	blendMode: 'normal',

	/**
	 * Specifies whether the item is hidden.
	 * 
	 * Sample code:
	 * <code>
	 * var path = new Path();
	 * print(path.hidden); // false
	 * path.hidden = true; // Hides the path
	 * </code>
	 * 
	 * @return {@true if the item is hidden}
	 * 
	 * @jshide
	 */
	isHidden: function() {
		return !this.visible;
	},

	setHidden: function(hidden) {
		this.visible = !hidden;
	},

	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 * 
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * group.appendChild(path);
	 * group.clipped = true;
	 * path.clipMask = true;
	 * </code>
	 * 
	 * @return {@true if the item defines a clip mask}
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

	// TODO: getIsolated / setIsolated (print specific feature)
	// TODO: get/setKnockout (print specific feature)
	// TODO get/setAlphaIsShape
	// TODO: get/setData

	/**
	 * Reverses the order of this item's children
	 */
	reverseChildren: function() {
		if (this.children)
			this.children.reverse();
	},

	/**
	 * The first item contained within this item.
	 */
	getFirstChild: function() {
		return this.children && this.children[0] || null;
	},

	/**
	 * The last item contained within this item.
	 */
	getLastChild: function() {
		return this.children && this.children[this.children.length - 1] || null;
	},

	/**
	 * The next item on the same level as this item.
	 */
	getNextSibling: function() {
		return this.parent && this.parent.children[this.getIndex() + 1] || null;
	},

	/**
	 * The previous item on the same level as this item.
	 */
	getPreviousSibling: function() {
		return this.parent && this.parent.children[this.getIndex() - 1] || null;
	},

	/**
	 * The index of this item within the list of it's parent's children.
	 */
	getIndex: function() {
		// TODO: Relying on indexOf() here is slow, especially since it is
		// used for getPrevious/NextSibling(). 
		// We need linked lists instead.
		return this.parent ? this.parent.children.indexOf(this) : -1;
	},

	/**
	* Removes the item from its parent's children list.
	*/
	removeFromParent: function() {
		if (this.parent) {
			var ok = !!this.parent.children.splice(this.getIndex(), 1).length;
			this.parent = null;
			return ok;
		}
		return false;
	},

	/**
	* Removes the item.
	*/
	remove: function() {
		return this.removeFromParent();
	},

	/**
	 * {@grouptitle Tests}
	 * 
	 * Checks if the item contains any children items.
	 * 
	 * @return {@true if it has one or more children}
	 */
	hasChildren: function() {
		return this.children && this.children.length > 0;
	},

	/**
	 * Checks whether the item is editable.
	 * 
	 * @return {@true when neither the item, nor it's parents are locked or
	 * hidden}
	 */
	isEditable: function() {
		var parent = this;
		while(parent) {
			if (parent.hidden || parent.locked)
				return false;
			parent = parent.parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 * 
	 * Sample code:
	 * <code>
	 * var path = new Path();
	 * print(path.isValid()); // true
	 * path.remove();
	 * print(path.isValid()); // false
	 * </code>
	 * 
	 * @return {@true if the item is valid}
	 */
	// TODO: isValid / checkValid

	/**
	 * {@grouptitle Hierarchy Tests}
	 * 
	 * Checks if this item is above the specified item in the stacking order of
	 * the document.
	 * 
	 * Sample code:
	 * <code>
	 * var firstPath = new Path();
	 * var secondPath = new Path();
	 * print(secondPath.isAbove(firstPath)); // true
	 * </code>
	 * 
	 * @param item The item to check against
	 * @return {@true if it is above the specified item}
	 */
	// TODO: isAbove

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the document.
	 * 
	 * Sample code:
	 * <code>
	 * var firstPath = new Path();
	 * var secondPath = new Path();
	 * print(firstPath.isBelow(secondPath)); // true
	 * </code>
	 * 
	 * @param item The item to check against
	 * @return {@true if it is below the specified item}
	 */
	// TODO: isBelow

	// TODO: this is confusing the beans
	// isParent: function(item) {
	// 	return this.parent == item;
	// },

	isChild: function(item) {
		return item.parent == this;
	},

	/**
	 * Checks if the item is contained within the specified item.
	 * 
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * var path = new Path();
	 * group.appendTop(path);
	 * print(path.isDescendant(group)); // true
	 * </code>
	 * 
	 * @param item The item to check against
	 * @return {@true if it is inside the specified item}
	 */
	isDescendant: function(item) {
		var parent = this.parent;
		while(parent) {
			if (parent == item)
				return true;
			parent = parent.parent;
		}
		return false;
	},

	/**
	 * Checks if the item is an ancestor of the specified item.
	 * 
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * var path = new Path();
	 * group.appendChild(path);
	 * print(group.isAncestor(path)); // true
	 * print(path.isAncestor(group)); // false
	 * </code>
	 * 
	 * @param item the item to check against
	 * @return {@true if the item is an ancestor of the specified item}
	 */
	isAncestor: function(item) {
		var parent = item.parent;
		while(parent) {
			if (parent == this)
				return true;
			parent = parent.parent;
		}
		return false;
	},

	/**
	 * Checks whether the item is grouped with the specified item.
	 * 
	 * @param item
	 * @return {@true if the items are grouped together}
	 */
	isGroupedWith: function(item) {
		var parent = this.parent;
		while(parent) {
			// Find group parents. Check for parent.parent, since don't want
			// top level layers, because they also inherit from Group
			if (parent.parent
				&& (parent instanceof Group || parent instanceof CompoundPath)
				&& item.isDescendant(parent))
					return true;
			// Keep walking up otherwise
			parent = parent.parent
		}
		return false;
	},

	getBounds: function() {
		// TODO: Implement for items other than paths
		return new Rectangle();
	},

	setBounds: function(rect) {
		var bounds = this.getBounds();
		rect = Rectangle.read(arguments);
		if (!rect)
			return;
		var matrix = new Matrix();
		// Read this from bottom to top:
		// Translate to new center:
		var center = rect.center;
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
		// Canvas doesn't support it yet. Document colorMode is also out of the
		// question for now.
		if (!resolution)
			resolution = 72;
		var bounds = this.getStrokeBounds();
		var scale = resolution / 72;
		var canvas = CanvasProvider.getCanvas(bounds.getSize().multiply(scale));
		var context = canvas.getContext('2d');
		var matrix = new Matrix().scale(scale).translate(-bounds.x, -bounds.y);
		matrix.applyToContext(context);
		this.draw(context, {});
		var raster = new Raster(canvas);
		raster.setPosition(this.getBounds().getCenter());
		raster.scale(1 / scale);
		return raster;
	},

	/**
	 * The item's position within the art board. This is the
	 * {@link Rectangle#getCenter()} of the {@link Item#getBounds()} rectangle.
	 * 
	 * Sample code:
	 * <code>
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * 
	 * // Move the circle to { x: 20, y: 20 }
	 * circle.position = new Point(20, 20);
	 * 
	 * // Move the circle 10 points to the right
	 * circle.position += new Point(10, 0);
	 * print(circle.position); // { x: 30, y: 20 }
	 * </code>
	 */
	getPosition: function() {
		return this.getBounds().getCenter();
	},

	setPosition: function(point) {
		point = Point.read(arguments);
		if (point) {
			this.translate(point.subtract(this.getPosition()));
		}
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
		if (this.children) {
			for (var i = 0, l = this.children.length; i < l; i++) {
				var child = this.children[i];
				child.transform(matrix, flags);
			}
		}
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
	 * Sample code:
	 * <code>
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.translate(new Point(5, 10));
	 * print(circle.position); // {x: 15, y: 20}
	 * </code>
	 * 
	 * Alternatively you can also add to the {@link #getPosition()} of the item:
	 * <code>
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.position += new Point(5, 10);
	 * print(circle.position); // {x: 15, y: 20}
	 * </code>
	 * 
	 * @param delta
	 */
	translate: function(delta) {
		var mx = new Matrix();
		mx.translate.apply(mx, arguments);
		return this.transform(mx);
	},

	/**
	 * {@grouptitle Transform Functions}
	 * 
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
		if (arguments.length < 2 || typeof sy == 'object') {
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
		if (arguments.length < 2 || typeof sy == 'object') {
			center = shy;
			shy = shx;
		}
		return this.transform(new Matrix().shear(shx, shy,
				center || this.getPosition()));
	},

	/**
	 * The path style of the item.
	 * 
	 * Sample code:
	 * <code>
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.style = {
	 * 	fillColor: new RGBColor(1, 0, 0),
	 * 	strokeColor: new RGBColor(0, 1, 0),
	 * 	strokeWidth: 5
	 * };
	 * </code>
	 */
	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this._style = new PathStyle(this, style);
	},

	// TODO: toString

	statics: {
		// TODO: Implement DocumentView into the drawing
		// TODO: Optimize temporary canvas drawing to ignore parts that are
		// outside of the visible view.
		draw: function(item, context, param) {
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
					&& !(item.segments && (!item.getFillColor()
							|| !item.getStrokeColor()))) {
				var bounds = item.getStrokeBounds() || item.getBounds();
				if (!bounds.width || !bounds.height)
					return;

				// Floor the offset and ceil the size, so we don't cut off any
				// antialiased pixels when drawing onto the temporary canvas.
				var itemOffset = bounds.getTopLeft().floor();
				var size = bounds.getSize().ceil().add(1, 1);
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

			item.draw(context, {
				offset: itemOffset || param.offset,
				compound: param.compound
			});

			// If we created a temporary canvas before, composite it onto the
			// parent canvas:
			if (tempCanvas) {

				// Restore the temporary canvas to its state before the
				// translation matrix was applied above.
				context.restore();

				// If the item has a blendMode, use BlendMode#process to
				// composite its canvas on the parentCanvas.
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
					parentContext.drawImage(tempCanvas,
							itemOffset.x, itemOffset.y);
					parentContext.restore();
				}

				// Return the temporary canvas, so it can be reused
				CanvasProvider.returnCanvas(tempCanvas);
			}
		}
	}
}, new function() {

	function append(top) {
		return function(item) {
			if (this.children) {
				item.removeFromParent();
				this.children.splice(top ? this.children.length : 0, 0, item);
				item.parent = this;
				item.document = this.document;
				return true;
			}
			return false;
		}
	}

	function move(above) {
		return function(item) {
			// first remove the item from its parent's children list
			if (item.parent && this.removeFromParent()) {
				item.parent.children.splice(item.getIndex()
						+ (above ? 1 : -1), 0, this);
				this.parent = item.parent;
				this.document = item.document;
				return true;
			}
			return false;
		}
	}

	return {
		/**
		 * {@grouptitle Hierarchy Operations}
		 * 
		 * Inserts the specified item as a child of the item by appending it to
		 * the list of children and moving it above all other children. You can
		 * use this function for groups, compound paths and layers.
		 * 
		 * Sample code:
		 * <code>
		 * var group = new Group();
		 * var path = new Path();
		 * group.appendTop(path);
		 * print(path.isDescendant(group)); // true
		 * </code>
		 * 
		 * @param item The item that will be appended as a child
		 */
		appendTop: append(true),

		/**
		 * Inserts the specified item as a child of this item by appending it to
		 * the list of children and moving it below all other children. You can
		 * use this function for groups, compound paths and layers.
		 * 
		 * Sample code:
		 * <code>
		 * var group = new Group();
		 * var path = new Path();
		 * group.appendBottom(path);
		 * print(path.isDescendant(group)); // true
		 * </code>
		 * 
		 * @param item The item that will be appended as a child
		 */
		appendBottom: append(false),

		/**
		 * A link to {@link #appendTop}
		 * 
		 * @deprecated use {@link #appendTop} or {@link #appendBottom} instead.
		 */
		appendChild: function(item) {
			return this.appendTop(item);
		},

		/**
		 * Moves this item above the specified item.
		 * 
		 * Sample code:
		 * <code>
		 * var firstPath = new Path();
		 * var secondPath = new Path();
		 * print(firstPath.isAbove(secondPath)); // false
		 * firstPath.moveAbove(secondPath);
		 * print(firstPath.isAbove(secondPath)); // true
		 * </code>
		 * 
		 * @param item The item above which it should be moved
		 * @return true if it was moved, false otherwise
		 */
		moveAbove: move(true),

		/**
		 * Moves the item below the specified item.
		 * 
		 * Sample code:
		 * <code>
		 * var firstPath = new Path();
		 * var secondPath = new Path();
		 * print(secondPath.isBelow(firstPath)); // false
		 * secondPath.moveBelow(firstPath);
		 * print(secondPath.isBelow(firstPath)); // true
		 * </code>
		 * 
		 * @param item the item below which it should be moved
		 * @return true if it was moved, false otherwise
		 */
		moveBelow: move(false)
	}
}, new function() {
	var sets = {
		down: {}, drag: {}, up: {}
	};

	function removeAll(set) {
		for(var id in set) {
			var item = set[id];
			item.remove();
			for(var type in sets) {
				var other = sets[type];
				if(other != set && other[item.getId()])
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
				// Always clear the drag set on mouse-up
				if (name == 'up')
					sets.drag = {};
				removeAll(sets[name]);
				sets[name] = {};
				// Call the script's overridden handler, if defined
				if(this.base)
					this.base(event);
			}
			paper.tool.inject(hash);
			// Only install this handler once, and mark it as installed,
			// to prevent repeated installing.
			paper.tool[handler]._installed = true;
		}
	}

	return Base.each(['up', 'down', 'drag'], function(name) {
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
					if (name == 'drag')
						installHandler('up');
					installHandler(name);
				}
			}
			return this;
		}
	});
}, new function() {
	var id = 0;
	return {
		beans: true,
		
		/**
		 * The unique id of the item.
		 */
		getId: function() {
			if (this._id === undefined)
				this._id = id++;
			return this._id;
		}
	}
});
