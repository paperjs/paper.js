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
	/** @lends Item# */

	beans: true,

	/**
	 * @name Item
	 * @class The Item type allows you to access and modify the items in
	 * Paper.js projects. Its functionality is inherited by different project
	 * item types such as {@link Path}, {@link CompoundPath}, {@link Group},
	 * {@link Layer} and {@link Raster}. They each add a layer of functionality that
	 * is unique to their type, but share the underlying properties and functions
	 * that they inherit from Item.
	 */
	initialize: function() {
		// If _project is already set, the item was already moved into the DOM
		// hierarchy. Used by Layer, where it's added to project.layers instead
		if (!this._project)
			paper.project.activeLayer.addChild(this);
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
	 * @type Number
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
	 * @type String
	 * @bean
	 * 
	 * @example {@paperscript}
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * // Set the name of the path:
	 * path.name = 'example';
	 * 
	 * // Create a group and add path to it as a child:
	 * var group = new Group();
	 * group.addChild(path);
	 * 
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'red';
	 */
	getName: function() {
		return this._name;
	},

	setName: function(name) {
		// Note: Don't check if the name has changed and bail out if it has not,
		// because setName is used internally also to update internal structures
		// when an item is moved from one parent to another.

		// If the item already had a name, remove the reference to it from the
		// parent's children object:
		if (this._name)
			this._removeFromNamed();
		this._name = name || undefined;
		if (name) {
			var children = this._parent._children,
				namedChildren = this._parent._namedChildren;
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		}
		this._changed(ChangeFlags.ATTRIBUTE);
	},

	/**
	 * The item's position within the project. This is the
	 * {@link Rectangle#center} of the item's {@link #bounds} rectangle.
	 * 
	 * @type Point
	 * @bean
	 * 
	 * @example {@paperscript}
	 * // Changing the position of a path:
	 * 
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.fillColor = 'red';
	 * 
	 * // Move the circle to { x: 20, y: 20 }
	 * circle.position = new Point(20, 20);
	 * 
	 * // Move the circle 100 points to the right and 50 points down
	 * circle.position += new Point(100, 50);
	 * 
	 * @example {@paperscript split=true height=100}
	 * // Changing the x coordinate of an item's position:
	 * 
	 * // Create a circle at position { x: 20, y: 20 }
	 * var circle = new Path.Circle(new Point(20, 20), 10);
	 * circle.fillColor = 'red';
	 * 
	 * // Move the circle 100 points to the right
	 * circle.position.x += 100;
	 */
	getPosition: function() {
		// Cache position value
		var pos = this._position
				|| (this._position = this.getBounds().getCenter());
		// this._position is a LinkedPoint as well, so we can use _x and _y.
		// Do not cache LinkedPoints directly, since we would not be able to
		// use them to calculate the difference in #setPosition, as when it is
		// modified, it would hold new values already and only then cause the
		// calling of #setPosition.
		return LinkedPoint.create(this, 'setPosition', pos._x, pos._y);
	},

	setPosition: function(point) {
		this.translate(Point.read(arguments).subtract(this.getPosition()));
	},

	/**
	 * The path style of the item.
	 * 
	 * @type PathStyle
	 * @bean
	 * 
	 * @example {@paperscript}
	 * // Applying several styles to an item in one go, by passing an object
	 * // to its style property:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.style = {
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 5
	 * };
	 * 
	 * @example {@paperscript split=true height=100}
	 * // Copying the style of another item:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * path.fillColor = 'red';
	 * 
	 * var path2 = new Path.Circle(new Point(180, 50), 20);
	 * // Copy the path style of path:
	 * path2.style = path.style;
	 * 
	 * @example {@paperscript}
	 * // Applying the same style object to multiple items:
	 * var myStyle = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'blue',
	 * 	strokeWidth: 4
	 * };
	 * 
	 * var path = new Path.Circle(new Point(80, 50), 30);
	 * path.style = myStyle;
	 * 
	 * var path2 = new Path.Circle(new Point(150, 50), 20);
	 * path2.style = myStyle;
	 */
	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this._style.initialize(style);
	},

	/**
	 * Specifies whether an item is selected and will also return {@code true}
	 * if the item is partially selected (groups with some selected or partially
	 * selected paths).
	 * 
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 * 
	 * @type Boolean
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Point#selected
	 * 
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 * path.selected = true; // Select the path
	 */	
	isSelected: function() {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (this._children[i].isSelected())
					return true;
		}
		return this._selected;
	},

	setSelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				this._children[i].setSelected(selected);
			}
		} else if ((selected = !!selected) != this._selected) {
			this._selected = selected;
			this._project._updateSelection(this);
		}
		this._changed(ChangeFlags.ATTRIBUTE | ChangeFlags.APPEARANCE);
	},

	_selected: false,

	// TODO: isFullySelected / setFullySelected
	// TODO: Change to getter / setters for these below that notify of changes
	// through _changed()

	/**
	 * Specifies whether the item is locked.
	 * 
	 * @type Boolean
	 * @default false
	 * @ignore
	 */
	locked: false,

	/**
	 * Specifies whether the item is visible. When set to {@code false}, the
	 * item won't be drawn.
	 * 
	 * @type Boolean
	 * @default true
	 * 
	 * @example {@paperscript}
	 * // Hiding an item:
	 * var path = new Path.Circle(new Point(50, 50), 20);
	 * path.fillColor = 'red';
	 * 
	 * // Hide the path:
	 * path.visible = false;
	 */
	visible: true,

	// TODO Item#clipMask is currently not used for clipping - consider
	// taking it out, as we could also simply always use the first child as the
	// clipping mask.
	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 * 
	 * @type Boolean
	 * @default false
	 * @bean
	 * @ignore // ignoring this until we actually make use of it for drawing
	 */
	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		this._clipMask = clipMask;
		if (clipMask) {
			this.setFillColor(null);
			this.setStrokeColor(null);
		}
		this._changed(ChangeFlags.ATTRIBUTE | ChangeFlags.APPEARANCE);
	},

	/**
	 * The blend mode of the item.
	 * 
	 * @type String('normal', 'multiply', 'screen', 'overlay', 'soft-light',
	 * 'hard-light', 'color-dodge', 'color-burn', 'darken', 'lighten',
	 * 'difference', 'exclusion', 'hue', 'saturation', 'luminosity', 'color',
	 * 'add', 'subtract', 'average', 'pin-light', 'negation')
	 * @default 'normal'
	 * 
	 * @example {@paperscript}
	 * // Setting an item's blend mode:
	 * 
	 * // Create a white rectangle in the background
	 * // with the same dimensions as the view:
	 * var background = new Path.Rectangle(view.bounds);
	 * background.fillColor = 'white';
	 * 
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 * circle.fillColor = 'red';
	 * 
	 * var circle2 = new Path.Circle(new Point(120, 50), 35);
	 * circle2.fillColor = 'blue';
	 * 
	 * // Set the blend mode of circle2:
	 * circle2.blendMode = 'multiply';
	 */
	blendMode: 'normal',

	/**
	 * The opacity of the item as a value between {@code 0} and {@code 1}.
	 * 
	 * @example {@paperscript}
	 * // Making an item 50% transparent:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 * circle.fillColor = 'red';
     * 
	 * var circle2 = new Path.Circle(new Point(120, 50), 35);
	 * circle2.style = {
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'green',
	 * 	strokeWidth: 10
	 * };
	 * 
	 * // Make circle2 50% transparent:
	 * circle2.opacity = 0.5;
	 * 
	 * @type Number
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
	 * @type Item
	 * @bean
	 * 
	 * @example
	 * var path = new Path();
	 * 
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 * 
	 * var group = new Group();
	 * group.addChild(path);
	 * 
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 */
	getParent: function() {
		return this._parent;
	},

	// DOCS: add comment to Item#children about not playing around with the
	// array directly - use addChild etc instead.
	/**
	 * The children items contained within this item. Items that define a
	 * {@link #name} can also be accessed by name.
	 * 
	 * <b>Please note:</b> The children array should not be modified directly
	 * using array functions. To remove single items from the children list, use
	 * {@link Item#remove()}, to remove all items from the children list, use
	 * {@link Item#removeChildren()}. To add items to the children list, use
	 * {@link Item#addChild(item)} or {@link Item#insertChild(index, item)}.
	 * 
	 * @type Item[]
	 * @bean
	 * 
	 * @example {@paperscript}
	 * // Accessing items in the children array:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * 
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 * 
	 * // Access the path through the group's children array:
	 * group.children[0].fillColor = 'red';
	 * 
	 * @example {@paperscript}
	 * // Accessing children by name:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * // Set the name of the path:
	 * path.name = 'example';
	 * 
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 * 
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'orange';
	 * 
	 * @example {@paperscript}
	 * // Passing an array of items to item.children:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * 
	 * var group = new Group();
	 * group.children = [path];
	 * 
	 * // The path is the first child of the group:
	 * group.firstChild.fillColor = 'green';
	 */
	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		for (var i = 0, l = items && items.length; i < l; i++)
			this.addChild(items[i]);
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
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * Clones the item within the same project and places the copy above the
	 * item.
	 * 
	 * @return {Item} the newly cloned item
	 * 
	 * @example {@paperscript}
	 * // Cloning items:
	 * var circle = new Path.Circle(new Point(50, 50), 10);
	 * circle.fillColor = 'red';
	 * 
	 * // Make 20 copies of the circle:
	 * for (var i = 0; i < 20; i++) {
	 * 	var copy = circle.clone();
	 * 
	 * 	// Distribute the copies horizontally, so we can see them:
	 * 	copy.position.x += i * copy.bounds.width;
	 * }
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
				copy.addChild(this._children[i].clone());
		}
		// Only copy over these fields if they are actually defined in 'this'
		// TODO: Consider moving this to Base once it's useful in more than one
		// place
		var keys = ['locked', 'visible', 'opacity', 'blendMode', '_clipMask',
				'_selected'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		// Insert the clone above the original, at the same position.
		copy.insertAbove(this);
		// Only set name once the copy is moved, to avoid setting and unsettting
		// name related structures.
		if (this._name)
			copy.setName(this._name);
		return copy;
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
			itemOrProject.activeLayer.addChild(copy);
		} else {
			itemOrProject.addChild(copy);
		}
		return copy;
	},

	/**
	 * Rasterizes the item into a newly created Raster object. The item itself
	 * is not removed after rasterization.
	 * 
	 * @param {Number} [resolution=72] the resolution of the raster in dpi
	 * @return {Raster} the newly created raster item
	 * 
	 * @example {@paperscript}
	 * // Rasterizing an item:
	 * var circle = new Path.Circle(new Point(80, 50), 5);
	 * circle.fillColor = 'red';
	 * 
	 * // Create a rasterized version of the path:
	 * var raster = circle.rasterize();
	 * 
	 * // Move it 100pt to the right:
	 * raster.position.x += 100;
	 * 
	 * // Scale the path and the raster by 300%, so we can compare them:
	 * circle.scale(5);
	 * raster.scale(5);
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
	 * {@grouptitle Hierarchy Operations}
	 * Adds the specified item as a child of the item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 * 
	 * @param {Item} item The item that will be added as a child
	 */		
	addChild: function(item) {
		return this.insertChild(undefined, item);
	},

	/**
	 * Inserts the specified item as a child of the item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 * 
	 * @param {Number} index
	 * @param {Item} item The item that will be appended as a child
	 */
	insertChild: function(index, item) {
		if (this._children) {
			item._removeFromParent();
			Base.splice(this._children, [item], index, 0);
			item._parent = this;
			item._setProject(this._project);
			if (item._name)
				item.setName(item._name);
			return true;
		}
		return false;
	},

	/**
	 * Inserts this item above the specified item.
	 * 
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true it was inserted}
	 */
	insertAbove: function(item) {
		return item._parent && item._parent.insertChild(
				item._index + 1, this);
	},

	/**
	 * Inserts this item below the specified item.
	 * 
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true it was inserted}
	 */
	insertBelow: function(item) {
		return item._parent && item._parent.insertChild(
				item._index - 1, this);
	},

	/**
	 * Inserts the specified item as a child of the item by appending it to
	 * the list of children and moving it above all other children. You can
	 * use this function for groups, compound paths and layers.
	 * 
	 * @param {Item} item The item that will be appended as a child
	 * @deprecated use {@link #addChild(item)} instead.
	 */
	appendTop: function(item) {
		return this.addChild(item);
	},

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it below all other children. You can
	 * use this function for groups, compound paths and layers.
	 * 
	 * @param {Item} item The item that will be appended as a child
	 * @deprecated use {@link #insertChild(index, item)} instead.
	 */
	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	/**
	 * Moves this item above the specified item.
	 * 
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true it was moved}
	 * @deprecated use {@link #insertAbove(item)} instead.
	 */
	moveAbove: function(item) {
		return this.insertAbove(item);
	},

	/**
	 * Moves the item below the specified item.
	 * 
	 * @param {Item} item the item below which it should be moved
	 * @return {Boolean} {@true it was moved}
	 * @deprecated use {@link #insertBelow(item)} instead.
	 */
	moveBelow: function(item) {
		return this.insertBelow(item);
	},

	_removeFromNamed: function() {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren,
			name = this._name,
			namedArray = namedChildren[name],
			index = namedArray ? namedArray.indexOf(this) : -1;
		if (index == -1)
			return;
		// Remove the named reference
		if (children[name] == this)
			delete children[name];
		// Remove this entry
		namedArray.splice(index, 1);
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
	* @return {Boolean} {@true the item was removed}
	*/
	remove: function() {
		if (this.isSelected())
			this.setSelected(false);
		return this._removeFromParent();
	},

	/**
	 * Removes all of the item's {@link #children} (if any).
	 * 
	 * @name Item#removeChildren
	 * @function
	 * @return {Array} an array containing the removed items
	 */
	/**
	 * Removes all of the item's {@link #children} (if any).
	 * 
	 * @return {Array} an array containing the removed items
	 */
	/**
	 * Removes the children from the specified {@code from} index to the
	 * {@code to} index from the parent's {@link #children} array.
	 * 
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=children.length] the ending index, exclusive
	 * @return {Array} an array containing the removed items
	 */
	removeChildren: function(from, to) {
		if (!this._children)
			return null;
		from = from || 0;
	 	to = Base.pick(to, this._children.length);
		var removed = this._children.splice(from, to - from);
		for (var i = removed.length - 1; i >= 0; i--)
			removed[i].remove();
		return removed;
	},

	/**
	 * Reverses the order of the item's children
	 */
	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			for (var i = 0, l = this._children.length; i < l; i++) {
				this._children[i]._index = i;
			}
		}
	},

	// TODO: Item#isEditable is currently ignored in the documentation, as
	// locking an item currently has no effect
	/**
	 * {@grouptitle Tests}
	 * Checks whether the item is editable.
	 * 
	 * @return {Boolean} {@true when neither the item, nor its parents are
	 * locked or hidden}
	 * @ignore
	 */
	isEditable: function() {
		var item = this;
		while (item) {
			if (!item.visible || item.locked)
				return false;
			item = item._parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 * 
	 * @return {Boolean} {@true the item is valid}
	 */
	// TODO: isValid / checkValid

	/**
	 * Returns -1 if 'this' is above 'item', 1 if below, 0 if their order is not
	 * defined in such a way, e.g. if one is a descendant of the other.
	 */
	_getOrder: function(item) {
		// Private method that produces a list of anchestors, starting with the
		// root and ending with the actual element as the last entry.
		function getList(item) {
			var list = [];
			do {
				list.unshift(item);
			} while (item = item._parent)
			return list;
		}
		var list1 = getList(this),
			list2 = getList(item);
		for (var i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
			if (list1[i] != list2[i]) {
				// Found the position in the parents list where the two start
				// to differ. Look at who's above who.
				return list1[i]._index < list2[i]._index ? 1 : -1;
			}
		}
		return 0;
	},

	/**
	 * {@grouptitle Hierarchy Tests}
	 *
	 * Checks if the item contains any children items.
	 * 
	 * @return {Boolean} {@true it has one or more children}
	 */
	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	/**
	 * Checks if this item is above the specified item in the stacking order
	 * of the project.
	 * 
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is above the specified item}
	 */
	isAbove: function(item) {
		return this._getOrder(item) == -1;
	},

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the project.
	 * 
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is below the specified item}
	 */
	isBelow: function(item) {
		return this._getOrder(item) == 1;
	},

	/**
	 * Checks whether the specified item is the parent of the item.
	 * 
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is the parent of the item}
	 */
	isParent: function(item) {
		return this._parent == item;
	},

	/**
	 * Checks whether the specified item is a child of the item.
	 * 
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true it is a child of the item}
	 */
	isChild: function(item) {
		return item && item._parent == this;
	},

	/**
	 * Checks if the item is contained within the specified item.
	 * 
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is inside the specified item}
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
	 * @return {Boolean} {@true if the item is an ancestor of the specified
	 * item}
	 */
	isAncestor: function(item) {
		return item ? item.isDescendant(this) : false;
	},

	/**
	 * Checks whether the item is grouped with the specified item.
	 * 
	 * @param {Item} item
	 * @return {Boolean} {@true if the items are grouped together}
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

	/**
	 * {@grouptitle Stroke Style}
	 * 
	 * The color of the stroke.
	 * 
	 * @property
	 * @name Item#strokeColor
	 * @type RGBColor|HSBColor|GrayColor
	 * 
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 * 
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 * 
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new RGBColor(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 * 
	 * @property
	 * @name Item#strokeWidth
	 * @type Number
	 * 
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 * 
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 * 
	 * // Set its stroke color to black:
	 * circle.strokeColor = 'black';
	 * 
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the end of open {@link Path} items, when they
	 * have a stroke.
	 * 
	 * @property
	 * @name Item#strokeCap
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 * 
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 * 
	 * var line = new Path(new Point(80, 50), new Point(420, 50));
	 * line.strokeColor = 'black';
	 * line.strokeWidth = 20;
	 * 
	 * // Select the path, so we can see where the stroke is formed:
	 * line.selected = true;
	 * 
	 * // Set the stroke cap of the line to be round:
	 * line.strokeCap = 'round';
	 * 
	 * // Copy the path and set its stroke cap to be square:
	 * var line2 = line.clone();
	 * line2.position.y += 50;
	 * line2.strokeCap = 'square';
	 * 
	 * // Make another copy and set its stroke cap to be butt:
	 * var line2 = line.clone();
	 * line2.position.y += 100;
	 * line2.strokeCap = 'butt';
	 */

	/**
	 * The shape to be used at the corners of paths when they have a stroke.
	 * 
	 * @property
	 * @name Item#strokeJoin
	 * @default 'miter'
	 * @type String ('miter', 'round', 'bevel')
	 * 
	 * 
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path();
	 * path.add(new Point(80, 100));
	 * path.add(new Point(120, 40));
	 * path.add(new Point(160, 100));
	 * path.strokeColor = 'black';
	 * path.strokeWidth = 20;
	 * 
	 * // Select the path, so we can see where the stroke is formed:
	 * path.selected = true;
     * 
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
     * 
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	// /**
	//  * The dash offset of the stroke.
	//  * 
	//  * @property
	//  * @name Item#dashOffset
	//  * @type Number
	//  */

	// /**
	//  * Specifies an array containing the dash and gap lengths of the stroke.
	//  * 
	//  * @example {@paperscript}
	//  * // Create a line from { x: 0, y: 50 } to { x: 50, y: 50 };
	//  * var line = new Path.Line(new Point(0, 50), new Point(50, 50));
	//  * 
	//  * line.strokeWidth = 3;
	//  * 
	//  * // Set the dashed stroke to [10pt dash, 5pt gap, 8pt dash, 10pt gap]:
	//  * line.dashArray = [10, 5, 8, 10];
	//  * 
	//  * @property
	//  * @name Item#dashArray
	//  * @type Array
	//  */

	/**
	 * The miter limit of the stroke.
	 * When two line segments meet at a sharp angle and miter joins have been
	 * specified for {@link Item#strokeJoin}, it is possible for the miter to
	 * extend far beyond the {@link Item#strokeWidth} of the path. The
	 * miterLimit imposes a limit on the ratio of the miter length to the
	 * {@link Item#strokeWidth}.
	 * 
	 * @property
	 * @default 10
	 * @name Item#miterLimit
	 * @type Number
	 */

	/**
	 * {@grouptitle Fill Style}
	 * 
	 * The fill color of the item.
	 * 
	 * @property
	 * @name Item#fillColor
	 * @type RGBColor|HSBColor|GrayColor
	 * 
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 * 
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 * 
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new RGBColor(1, 0, 0);
	 */

	// DOCS: document the different arguments that this function can receive.
	/**
	 * {@grouptitle Transform Functions}
	 * 
	 * Scales the item by the given value from its center point, or optionally
	 * from a supplied point.
	 * 
	 * @name Item#scale
	 * @function
	 * @param {Number} scale the scale factor
	 * @param {Point} [center=the center point of the item]
	 * 
	 * @example {@paperscript}
	 * // Scaling an item from its center point:
	 * 
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle(new Point(80, 50), 20);
	 * circle.fillColor = 'red';
	 * 
	 * // Scale the path by 150% from its center point
	 * circle.scale(1.5);
	 * 
	 * @example {@paperscript}
	 * // Scaling an item from a specific point:
	 * 
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle(new Point(80, 50), 20);
	 * circle.fillColor = 'red';
	 * 
	 * // Scale the path 150% from its bottom left corner
	 * circle.scale(1.5, circle.bounds.bottomLeft);
	 */
	/**
	 * Scales the item by the given values from its center point, or optionally
	 * from a supplied point.
	 * 
	 * @name Item#scale
	 * @function
	 * @param {Number} sx the horizontal scale factor
	 * @param {Number} sy the vertical scale factor
	 * @param {Point} [center=the center point of the item]
	 * 
	 * @example {@paperscript}
	 * // Scaling an item horizontally by 300%:
	 * 
	 * // Create a circle shaped path at { x: 100, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle(new Point(100, 50), 20);
	 * circle.fillColor = 'red';
     * 
	 * // Scale the path horizontally by 300%
	 * circle.scale(3, 1);
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
	 * Angles are oriented clockwise and measured in degrees.
	 * 
	 * @param {Number} angle the rotation angle
	 * @param {Point} [center=the center point of the item]
	 * @see Matrix#rotate
	 * 
	 * @example {@paperscript}
	 * // Rotating an item:
	 * 
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 80, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(80, 25), new Size(50, 50));
	 * path.fillColor = 'black';
     * 
	 * // Rotate the path by 30 degrees:
	 * path.rotate(30);
	 * 
	 * @example {@paperscript height=200}
	 * // Rotating an item around a specific point:
	 * 
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 175, y: 50} and a size of {width: 100, height: 100}:
	 * var topLeft = new Point(175, 50);
	 * var size = new Size(100, 100);
	 * var path = new Path.Rectangle(topLeft, size);
	 * path.fillColor = 'black';
	 * 
	 * // Draw a circle shaped path in the center of the view,
	 * // to show the rotation point:
	 * var circle = new Path.Circle(view.center, 5);
	 * circle.fillColor = 'white';
	 * 
	 * // Each frame rotate the path 3 degrees around the center point
	 * // of the view:
	 * function onFrame(event) {
	 * 	path.rotate(3, view.center);
	 * }
	 */
	rotate: function(angle, center) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition()));
	},

	// TODO: add test for item shearing, as it might be behaving oddly.
	/**
	 * Shears the item by the given value from its center point, or optionally
	 * by a supplied point.
	 * 
	 * @name Item#shear
	 * @function
	 * @param {Point} point
	 * @param {Point} [center=the center point of the item]
	 * @see Matrix#shear
	 */
	/**
	 * Shears the item by the given values from its center point, or optionally
	 * by a supplied point.
	 * 
	 * @name Item#shear
	 * @function
	 * @param {Number} shx
	 * @param {Number} shy
	 * @param {Point} [center=the center point of the item]
	 * @see Matrix#shear
	 */
	shear: function(shx, shy, center) {
		// PORT: Add support for center back to Scriptographer too!
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
	 * @param {Array} flags Array of any of the following: 'objects', 'children',
	 *     'fill-gradients', 'fill-patterns', 'stroke-patterns', 'lines'. 
	 *     Default: ['objects', 'children']
	 */
	transform: function(matrix, flags) {
		// TODO: Handle flags, add TransformFlag class and convert to bit mask
		// for quicker checking.
		// TODO: Call transform on chidren only if 'children' flag is provided.
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

		// TODO: Implement View into the drawing.
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
	/**
	 * {@grouptitle Remove On Event}
	 * 
	 * Removes the item when the events specified in the passed object literal
	 * occur.
	 * The object literal can contain the following values:
	 * Remove the item when the next {@link Tool#onMouseMove} event is
	 * fired: {@code object.move = true}
	 * 
	 * Remove the item when the next {@link Tool#onMouseDrag} event is
	 * fired: {@code object.drag = true}
	 * 
	 * Remove the item when the next {@link Tool#onMouseDown} event is
	 * fired: {@code object.down = true}
	 * 
	 * Remove the item when the next {@link Tool#onMouseUp} event is
	 * fired: {@code object.up = true}
	 * 
	 * @name Item#removeOn
	 * @function
	 * @param {Object} object
	 * 
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 * 	
	 * 	// Remove the path on the next onMouseDrag or onMouseDown event:
	 * 	path.removeOn({
	 * 		drag: true,
	 * 		down: true
	 * 	});
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseMove} event is fired.
	 * 
	 * @name Item#removeOnMove
	 * @function
	 * 
	 * @example {@paperscript height=200}
	 * // Move your mouse below:
	 * function onMouseMove(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 * 	
	 * 	// On the next move event, automatically remove the path:
	 * 	path.removeOnMove();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDown} event is fired.
	 * 
	 * @name Item#removeOnDown
	 * @function
	 * 
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 * 
	 * 	// Remove the path, next time the mouse is pressed:
	 * 	path.removeOnDown();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
	 * 
	 * @name Item#removeOnDrag
	 * @function
	 * 
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 * 	
	 * 	// On the next drag event, automatically remove the path:
	 * 	path.removeOnDrag();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseUp} event is fired.
	 * 
	 * @name Item#removeOnUp
	 * @function
	 * 
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 * 	
	 * 	// Remove the path, when the mouse is released:
	 * 	path.removeOnUp();
	 * }
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

	// TODO: implement Item#removeOnFrame
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
