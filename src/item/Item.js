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

 /**
 * @name Item
 * @class The Item type allows you to access and modify the items in
 * Paper.js projects. Its functionality is inherited by different project
 * item types such as {@link Path}, {@link CompoundPath}, {@link Group},
 * {@link Layer} and {@link Raster}. They each add a layer of functionality that
 * is unique to their type, but share the underlying properties and functions
 * that they inherit from Item.
 */
var Item = this.Item = Base.extend({
	/** @lends Item# */
	beans: true,

	initialize: function() {
		// If _project is already set, the item was already moved into the DOM
		// hierarchy. Used by Layer, where it's added to project.layers instead
		if (!this._project)
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
	 * 
	 * @type number
	 * @bean
	 */
	getId: function() {
		if (this._id == null)
			this._id = Item._id = (Item._id || 0) + 1;
		return this._id;
	},

	/**
	 * The name of the item. If the item has a name, it can be accessed by name
	 * through its parent's children list.
	 * 
	 * @example
	 * var path = new Path();
	 * path.name = 'example';
	 * project.activeLayer.children['example'].remove();
	 * 
	 * @type string
	 * @bean
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

	/**
	 * The item's position within the project. This is the
	 * {@link Rectangle#center} of the {@link #bounds} rectangle.
	 * 
	 * @example
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.fillColor = 'red';
	 * 
	 * // Move the circle to { x: 20, y: 20 }
	 * circle.position = new Point(20, 20);
	 * 
	 * // Move the circle 10 points to the right and 10 points down
	 * circle.position += new Point(10, 10);
	 * console.log(circle.position); // { x: 30, y: 30 }
	 *
	 * @example
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.fillColor = 'red';
	 * 
	 * // Move the circle 10 points to the right
	 * circle.position.x += 10;
	 * console.log(circle.position); // { x: 20, y: 10 }
	 * 
	 * @type Point
	 * @bean
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
	 * The path style of the item.
	 *
	 * @example
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.style = {
	 * 	fillColor: new RGBColor(1, 0, 0),
	 * 	strokeColor: new RGBColor(0, 1, 0),
	 * 	strokeWidth: 5
	 * };
	 * 
	 * @type PathStyle
	 * @bean
	 */
	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this._style.initialize(style);
	},

	/**
	 * Specifies whether an item is selected and will also return {@code true} if
	 * the item is partially selected (groups with some selected items/partially
	 * selected paths).
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 * 
	 * @example
	 * console.log(project.selectedItems.length); // 0
	 * var path = new Path.Circle(new Size(50, 50), 25);
	 * path.selected = true; // Select the path
	 * console.log(project.selectedItems.length) // 1
	 *
	 * @type boolean {@true the item is selected}
	 * @bean
	 */	
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

	setSelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				this._children[i].setSelected(selected);
			}
		} else {
			if ((selected = !!selected) != this._selected) {
				this._selected = selected;
				this._project._selectItem(this, selected);
			}
		}
	},

	// TODO: isFullySelected / setFullySelected
	// TODO: Change to getter / setters for these below that notify of changes
	// through _changed()

	// TODO: Item#isLocked is currently ignored in the documentation, as
	// locking an item currently has no effect
	/**
	 * Specifies whether the item is locked.
	 * 
	 * @type boolean
	 * @default false
	 * @ignore
	 */
	locked: false,

	/**
	 * Specifies whether the item is visible. When set to {@code false}, the
	 * item won't be drawn.
	 * 
	 * @example
	 * var path = new Path.Circle(new Point(50, 50), 20);
	 * path.fillColor = 'red';
	 * console.log(path.visible) // true
	 * path.visible = false; // Hides the path
	 * 
	 * @type boolean {@true the item is visible}
	 * @default true
	 */
	visible: true,

	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 * 
	 * @type boolean
	 * @default false
	 * @bean
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

	/**
	 * The blend mode of the item.
	 * 
	 * @example
	 * var circle = new Path.Circle(new Point(50, 50), 10);
	 * circle.fillColor = 'red';
	 * 
	 * // Change the blend mode of the path item:
	 * circle.blendMode = 'multiply';
	 * 
	 * @type String('normal','screen','multiply','difference','src-in','add','overlay','hard-light','dodge','burn','darken','lighten','exclusion')
	 * @default 'normal'
	 */
	blendMode: 'normal',

	/**
	 * The opacity of the item as a value between 0 and 1.
	 * 
	 * @example
	 * // Create a circle at position { x: 50, y: 50 } 
	 * var circle = new Path.Circle(new Point(50, 50), 20);
	 * circle.fillColor = 'red';
	 * 
	 * // Change the opacity of the circle to 50%:
	 * circle.opacity = 0.5;
	 * 
	 * @type number
	 * @default 1
	 */
	opacity: 1,

	// TODO: get/setIsolated (print specific feature)
	// TODO: get/setKnockout (print specific feature)
	// TODO: get/setAlphaIsShape
	// TODO: get/setData

	/**
	 * {@grouptitle Project Hierarchy}
	 * The project that this item belongs to.
	 * 
	 * @type Project
	 * @bean
	 */
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

	// TODO: #getLayer()

	/**
	 * The item that this item is contained within.
	 * 
	 * @example
	 * var path = new Path();
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 * 
	 * var group = new Group();
	 * group.appendTop(path);
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 * 
	 * @type Item
	 * @bean
	 */
	getParent: function() {
		return this._parent;
	},

	/**
	 * The children items contained within this item. Items that define a
	 * {@link #name} can also be accessed by name.
	 *
	 * @example
	 * var path = new Path();
	 * var group = new Group();
	 * group.appendTop(path);
	 *
	 * // The path has been placed in the children list of the group:
	 * console.log(group.children[0] == path);
	 * 
	 * path.name = 'example';
	 * // Now the path can also be accessed by name:
	 * console.log(group.children['example'] == path); // true
	 * 
	 * @type Item[]
	 * @bean
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
	 * The first item contained within this item. This is a shortcut for
	 * accessing {@code item.children[0]}.
	 * 
	 * @type Item
	 * @bean
	 */
	getFirstChild: function() {
		return this._children && this._children[0] || null;
	},

	/**
	 * The last item contained within this item.This is a shortcut for
	 * accessing {@code item.children[item.children.length - 1]}.
	 * 
	 * @type Item
	 * @bean
	 */
	getLastChild: function() {
		return this._children && this._children[this._children.length - 1]
				|| null;
	},

	/**
	 * The next item on the same level as this item.
	 * 
	 * @type Item
	 * @bean
	 */
	getNextSibling: function() {
		return this._parent && this._parent._children[this._index + 1] || null;
	},

	/**
	 * The previous item on the same level as this item.
	 * 
	 * @type Item
	 * @bean
	 */
	getPreviousSibling: function() {
		return this._parent && this._parent._children[this._index - 1] || null;
	},

	/**
	 * The index of this item within the list of its parent's children.
	 * 
	 * @type number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
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
	* Removes the item from the project. If the item has children, they are also
	* removed.
	* 
	* @return {boolean} {@true the item was removed}
	*/
	remove: function() {
		if (this.isSelected())
			this.setSelected(false);
		return this._removeFromParent();
	},

	/**
	 * Removes all of the item's children (if any).
	 * 
	 * @return {boolean} {@true removing was successful}
	 */
	removeChildren: function() {
		var removed = false;
		if (this._children) {
			for (var i = this._children.length - 1; i >= 0; i--)
				removed = this._children[i].remove() || removed;
		}
		return removed;
	},

	/**
	 * When passed a project, copies the item to the project,
	 * or duplicates it within the same project. When passed an item,
	 * copies the item into the specified item.
	 * 
	 * @param {Project|Layer|Group|CompoundPath} item the item or project to
	 * copy the item to
	 * @return {Item} the new copy of the item
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
	 * Clones the item within the same project and places the copy above the
	 * item.
	 * 
	 * @return {Item} the newly cloned item
	 */
	clone: function() {
		return this._clone(new this.constructor());
	},

	_clone: function(copy) {
		// Copy over style
		copy.setStyle(this._style);
		// If this item has children, clone and append each of them:
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				copy.appendTop(this._children[i].clone());
		}
		// Only copy over these fields if they are actually defined in 'this'
		// TODO: Consider moving this to Base once it's useful in more than one
		// place
		var keys = ['locked', 'visible', 'opacity', 'blendMode', '_clipMask'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		// Move the clone above the original, at the same position.
		copy.moveAbove(this);
		// Only set name once the copy is moved, to avoid setting and unsettting
		// name related structures.
		if (this._name)
			copy.setName(this._name);
		return copy;
	},

	/**
	 * Reverses the order of this item's children
	 * 
	 * @return {boolean} {@true the children were removed}
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
	 * Rasterizes the item into a newly created Raster object. The item itself
	 * is not removed after rasterization.
	 * 
	 * @param {number} [resolution=72] the resolution of the raster in dpi
	 * @return {Raster} the newly created raster item
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
	 * {@grouptitle Tests}
	 * Checks if the item contains any children items.
	 * 
	 * @return {boolean} {@true it has one or more children}
	 */
	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	// TODO: Item#isEditable is currently ignored in the documentation, as
	// locking an item currently has no effect
	/**
	 * Checks whether the item is editable.
	 * 
	 * @return {boolean} {@true when neither the item, nor its parents are
	 * locked or hidden}
	 * @ignore
	 */
	isEditable: function() {
		var parent = this;
		while (parent) {
			if (!parent.visible || parent.locked)
				return false;
			parent = parent._parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 * 
	 * @return {boolean} {@true the item is valid}
	 */
	// TODO: isValid / checkValid

	/**
	 * Checks if this item is above the specified item in the stacking order
	 * of the project.
	 * 
	 * @param {Item} item The item to check against
	 * @return {boolean} {@true if it is above the specified item}
	 */
	// TODO: isAbove

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the project.
	 * 
	 * @param {Item} item The item to check against
	 * @return {boolean} {@true if it is below the specified item}
	 */
	// TODO: isBelow

	/**
	 * {@grouptitle Hierarchy Tests}
	 * Checks whether the specified item is the parent of the item.
	 * 
	 * @param {Item} item The item to check against
	 * @return {boolean} {@true if it is the parent of the item}
	 */
	isParent: function(item) {
		return this._parent == item;
	},

	/**
	 * Checks whether the specified item is a child of the item.
	 * 
	 * @param {Item} item The item to check against
	 * @return {boolean} {@true it is a child of the item}
	 */
	isChild: function(item) {
		return item._parent == this;
	},

	/**
	 * Checks if the item is contained within the specified item.
	 * 
	 * @param {Item} item The item to check against
	 * @return {boolean} {@true if it is inside the specified item}
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
	 * @param {Item} item the item to check against
	 * @return {boolean} {@true if the item is an ancestor of the specified
	 * item}
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
	 * @param {Item} item
	 * @return {boolean} {@true if the items are grouped together}
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

	/**
	 * {@grouptitle Bounding Rectangles}
	 * 
	 * The bounding rectangle of the item excluding stroke width.
	 * @type Rectangle
	 * @bean
	 */
	getBounds: function() {
		return this._getBounds(false);
	},

	/**
	 * The bounding rectangle of the item including stroke width.
	 * 
	 * @type Rectangle
	 * @bean
	 */
	getStrokeBounds: function() {
		return this._getBounds(true);
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
	 * The bounding rectangle of the item including stroke width and controls.
	 */
	// TODO: getControlBounds

	// DOCS: document the different arguments that this function can receive.
	/**
	 * {@grouptitle Transform Functions}
	 * 
	 * Scales the item by the given value from its center point, or optionally
	 * by a supplied point.
	 * 
	 * @example
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * console.log(circle.bounds.width); // 20
	 * 
	 * // Scale the path by 200% around its center point
	 * circle.scale(2);
	 * 
	 * console.log(circle.bounds.width); // 40
	 * 
	 * @example
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * 
	 * // Scale the path 200% from its bottom left corner
	 * circle.scale(2, circle.bounds.bottomLeft);
	 * 
	 * @name Item#scale^1
	 * @function
	 * @param {number} scale the scale factor
	 * @param {Point} [center=the center point of the item]
	 */
	/**
	 * Scales the item by the given values from its center point, or optionally
	 * by a supplied point.
	 * 
	 * @example
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * console.log(circle.bounds.width); // 20
	 * 
	 * // Scale the path horizontally by 200%
	 * circle.scale(1, 2);
	 * 
	 * console.log(circle.bounds.width); // 40
	 * 
	 * @example
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * 
	 * // Scale the path 200% horizontally from its bottom left corner
	 * circle.scale(1, 2, circle.bounds.bottomLeft);
	 * 
	 * @param {number} sx the horizontal scale factor
	 * @param {number} sy the vertical scale factor
	 * @param {Point} [center=the center point of the item]
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
	 * Translates (moves) the item by the given offset point.
	 * 
	 * @param {Point} delta the offset to translate the item by
	 */
	translate: function(delta) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	/**
	 * Rotates the item by a given angle around the given point.
	 * 
	 * Angles are oriented clockwise and measured in degrees by default. Read
	 * more about angle units and orientation in the description of the
	 * {@link Point#angle} property.
	 * 
	 * @param {number} angle the rotation angle
	 * @param {Point} [center=the center point of the item]
	 * @see Matrix#rotate
	 */
	rotate: function(angle, center) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition()));
	},

	/**
	 * Shears the item with a given amount around its center point.
	 * 
	 * @param {number} shx
	 * @param {number} shy
	 * @param {Point} [center=the center point of the item]
	 * @see Matrix#shear
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
	 * Transform the item.
	 *
	 * @param {Matrix} matrix
	 * @param {array} flags Array of any of the following: 'objects', 'children',
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

		// TODO: Implement View into the drawing
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
		/** @lends Item# */

		/**
		 * {@grouptitle Hierarchy Operations}
		 * Inserts the specified item as a child of the item by appending it to
		 * the list of children and moving it above all other children. You can
		 * use this function for groups, compound paths and layers.
		 *
		 * @function
		 * @param {Item} item The item that will be appended as a child
		 */
		appendTop: append(true),

		/**
		 * Inserts the specified item as a child of this item by appending it to
		 * the list of children and moving it below all other children. You can
		 * use this function for groups, compound paths and layers.
		 * 
		 * @function
		 * @param {Item} item The item that will be appended as a child
		 */
		appendBottom: append(false),

		/**
		 * Moves this item above the specified item.
		 * 
		 * @function
		 * @param {Item} item The item above which it should be moved
		 * @return {boolean} {@true it was moved}
		 */
		moveAbove: move(true),

		/**
		 * Moves the item below the specified item.
		 *
		 * @function
		 * @param {Item} item the item below which it should be moved
		 * @return {boolean} {@true it was moved}
		 */
		moveBelow: move(false)
	};
}, new function() {
	//DOCS: document removeOn(param)

	/**
	 * {@grouptitle Remove On Event}
	 * Removes the item when the next {@link Tool#onMouseMove} event is fired.
	 * 
	 * @name Item#removeOnMove
	 * @function
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDown} event is fired.
	 * 
	 * @name Item#removeOnDown
	 * @function
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
	 * 
	 * @name Item#removeOnDrag
	 * @function
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseUp} event is fired.
	 * 
	 * @name Item#removeOnUp
	 * @function
	 */

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
