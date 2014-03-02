/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Item
 *
 * @class The Item type allows you to access and modify the items in
 * Paper.js projects. Its functionality is inherited by different project
 * item types such as {@link Path}, {@link CompoundPath}, {@link Group},
 * {@link Layer} and {@link Raster}. They each add a layer of functionality that
 * is unique to their type, but share the underlying properties and functions
 * that they inherit from Item.
 */
var Item = Base.extend(Callback, /** @lends Item# */{
	statics: {
		/**
		 * Override Item.extend() to merge the subclass' _serializeFields with
		 * the parent class' _serializeFields.
		 *
		 * @private
		 */
		extend: function extend(src) {
			if (src._serializeFields)
				src._serializeFields = new Base(
						this.prototype._serializeFields, src._serializeFields);
			var res = extend.base.apply(this, arguments),
				proto = res.prototype,
				name = proto._class;
			// Derive the _type string from class name
			if (name)
				proto._type = Base.hyphenate(name);
			return res;
		},

		/**
		 * An object constant that can be passed to Item#initialize() to avoid
		 * insertion into the DOM.
		 *
		 * @private
		 */
		NO_INSERT: { insert: false }
	},

	_class: 'Item',
	// All items apply their matrix by default.
	// Exceptions are Raster, PlacedSymbol, Clip and Shape.
	_transformContent: true,
	_boundsSelected: false,
	_selectChildren: false,
	// Provide information about fields to be serialized, with their defaults
	// that can be ommited.
	_serializeFields: {
		name: null,
		matrix: new Matrix(),
		pivot: null,
		locked: false,
		visible: true,
		blendMode: 'normal',
		opacity: 1,
		guide: false,
		selected: false,
		clipMask: false,
		data: {}
	},

	initialize: function Item() {
		// Do nothing, but declare it for named constructors.
	},

	/**
	 * Private helper for #initialize() that tries setting properties from the
	 * passed props object, and apply the point translation to the internal 
	 * matrix.
	 *
	 * @param {Object} props the properties to be applied to the item
	 * @param {Point} point the point by which to transform the internal matrix
	 * @returns {Boolean} {@true if the properties were successfully be applied,
	 * or if none were provided}
	 */
	_initialize: function(props, point) {
		// Define this Item's unique id. But allow the creation of internally
		// used paths with no ids.
		var internal = props && props.internal === true;
		if (!internal)
			this._id = Item._id = (Item._id || 0) + 1;
		// Handle matrix before everything else, to avoid issues with
		// #addChild() calling _changed() and accessing _matrix already.
		var matrix = this._matrix = new Matrix();
		if (point)
			matrix.translate(point);
		matrix._owner = this;
		// If _project is already set, the item was already moved into the DOM
		// hierarchy. Used by Layer, where it's added to project.layers instead
		if (!this._project) {
			var project = paper.project;
			// Do not insert into DOM if it's an internal path or
			// props.insert is false.
			if (internal || props && props.insert === false) {
				this._setProject(project);
			} else {
				// Create a new layer if there is no active one. This will
				// automatically make it the new activeLayer.
				(project.activeLayer || new Layer()).addChild(this);
			}
		}
		this._style = new Style(this._project._currentStyle, this);
		// Filter out Item.NO_INSERT before _set(), for performance reasons
		return props && props !== Item.NO_INSERT
				? this._set(props, { insert: true }) // Filter out insert prop.
				: true;
	},

	_events: new function() {

		// Flags defining which native events are required by which Paper events
		// as required for counting amount of necessary natives events.
		// The mapping is native -> virtual
		var mouseFlags = {
			mousedown: {
				mousedown: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mouseup: {
				mouseup: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mousemove: {
				mousedrag: 1,
				mousemove: 1,
				mouseenter: 1,
				mouseleave: 1
			}
		};

		// Entry for all mouse events in the _events list
		var mouseEvent = {
			install: function(type) {
				// If the view requires counting of installed mouse events,
				// increase the counters now according to mouseFlags
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags) {
						counters[key] = (counters[key] || 0)
								+ (mouseFlags[key][type] || 0);
					}
				}
			},
			uninstall: function(type) {
				// If the view requires counting of installed mouse events,
				// decrease the counters now according to mouseFlags
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags)
						counters[key] -= mouseFlags[key][type] || 0;
				}
			}
		};

		return Base.each(['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
			'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'],
			function(name) {
				this[name] = mouseEvent;
			}, {
				onFrame: {
					install: function() {
						this._animateItem(true);
					},
					uninstall: function() {
						this._animateItem(false);
					}
				},

				// Only for external sources, e.g. Raster
				onLoad: {}
			}
		);
	},

	_animateItem: function(animate) {
		this._project.view._animateItem(this, animate);
	},

	_serialize: function(options, dictionary) {
		var props = {},
			that = this;

		function serialize(fields) {
			for (var key in fields) {
				var value = that[key];
				// Style#leading is a special case, as its default value is
				// dependent on the fontSize. Handle this here separately.
				if (!Base.equals(value, key === 'leading'
						? fields.fontSize * 1.2 : fields[key])) {
					props[key] = Base.serialize(value, options,
							// Do not use compact mode for data
							key !== 'data', dictionary);
				}
			}
		}

		// Serialize fields that this Item subclass defines first
		serialize(this._serializeFields);
		// Serialize style fields, but only if they differ from defaults.
		// Do not serialize styles on Groups and Layers, since they just unify
		// their children's own styles.
		if (!(this instanceof Group))
			serialize(this._style._defaults);
		// There is no compact form for Item serialization, we always keep the
		// class.
		return [ this._class, props ];
	},

	/**
	 * Private notifier that is called whenever a change occurs in this item or
	 * its sub-elements, such as Segments, Curves, Styles, etc.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed.
	 */
	_changed: function(flags) {
		var symbol = this._parentSymbol,
			cacheParent = this._parent || symbol,
			project = this._project;
		if (flags & /*#=*/ ChangeFlag.GEOMETRY) {
			// Clear cached bounds and position whenever geometry changes
			this._bounds = this._position = this._decomposed =
					this._globalMatrix = undefined;
		}
		if (cacheParent && (flags
				& (/*#=*/ ChangeFlag.GEOMETRY | /*#=*/ ChangeFlag.STROKE))) {
			// Clear cached bounds of all items that this item contributes to.
			// We call this on the parent, since the information is cached on
			// the parent, see getBounds().
			Item._clearBoundsCache(cacheParent);
		}
		if (flags & /*#=*/ ChangeFlag.HIERARCHY) {
			// Clear cached bounds of all items that this item contributes to.
			// We don't call this on the parent, since we're already the parent
			// of the child that modified the hierarchy (that's where these
			// HIERARCHY notifications go)
			Item._clearBoundsCache(this);
		}
		if (project) {
			if (flags & /*#=*/ ChangeFlag.APPEARANCE) {
				project._needsUpdate = true;
			}
			// Have project keep track of changed items so they can be iterated.
			// This can be used for example to update the SVG tree. Needs to be
			// activated in Project
			if (project._changes) {
				var entry = project._changesById[this._id];
				if (entry) {
					entry.flags |= flags;
				} else {
					entry = { item: this, flags: flags };
					project._changesById[this._id] = entry;
					project._changes.push(entry);
				}
			}
		}
		// If this item is a symbol's definition, notify it of the change too
		if (symbol)
			symbol._changed(flags);
	},

	/**
	 * Sets those properties of the passed object literal on this item to
	 * the values defined in the object literal, if the item has property of the
	 * given name (or a setter defined for it).
	 * @param {Object} props
	 * @return {Item} the item itself.
	 *
	 * @example {@paperscript}
	 * // Setting properties through an object literal
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 * 
	 * circle.set({
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 10,
	 * 	fillColor: 'black',
	 * 	selected: true
	 * });
	 */
	set: function(props) {
		if (props)
			this._set(props, { insert: true });
		return this;
	},

	/**
	 * The unique id of the item.
	 *
	 * @type Number
	 * @bean
	 */
	getId: function() {
		return this._id;
	},

	/**
	 * The type of the item as a string.
	 *
	 * @type String('group', 'layer', 'path', 'compound-path', 'shape',
	 * 'raster', 'placed-symbol', 'point-text')
	 * @bean
	 */
	getType: function() {
		return this._type;
	},

	/**
	 * The name of the item. If the item has a name, it can be accessed by name
	 * through its parent's children list.
	 *
	 * @type String
	 * @bean
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });

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

	setName: function(name, unique) {
		// Note: Don't check if the name has changed and bail out if it has not,
		// because setName is used internally also to update internal structures
		// when an item is moved from one parent to another.

		// If the item already had a name, remove the reference to it from the
		// parent's children object:
		if (this._name)
			this._removeNamed();
		// See if the name is a simple number, which we cannot support due to
		// the named lookup on the children array.
		if (name === (+name) + '')
			throw new Error(
					'Names consisting only of numbers are not supported.');
		if (name && this._parent) {
			var children = this._parent._children,
				namedChildren = this._parent._namedChildren,
				orig = name,
				i = 1;
			// If unique is true, make sure we're not overriding other names
			while (unique && children[name])
				name = orig + ' ' + (i++);
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		}
		this._name = name || undefined;
		this._changed(/*#=*/ ChangeFlag.ATTRIBUTE);
	},

	/**
	 * The path style of the item.
	 *
	 * @name Item#getStyle
	 * @type Style
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Applying several styles to an item in one go, by passing an object
	 * // to its style property:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30
	 * });
	 * circle.style = {
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 5
	 * };
	 *
	 * @example {@paperscript split=true height=100}
	 * // Copying the style of another item:
	 * var path = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 *
	 * var path2 = new Path.Circle({
	 * 	center: new Point(180, 50),
	 * 	radius: 20
	 * });
	 * 
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
	 * var path = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 30
	 * });
	 * path.style = myStyle;
	 *
	 * var path2 = new Path.Circle({
	 * 	center: new Point(150, 50),
	 * 	radius: 20
	 * });
	 * path2.style = myStyle;
	 */
	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		// Don't access _style directly so Path#getStyle() can be overriden for
		// CompoundPaths.
		this.getStyle().set(style);
	},

	// DOCS: Item#hasFill()
	hasFill: function() {
		return this.getStyle().hasFill();
	},

	// DOCS: Item#hasStroke()
	hasStroke: function() {
		return this.getStyle().hasStroke();
	},

	// DOCS: Item#hasShadow()
	hasShadow: function() {
		return this.getStyle().hasShadow();
	}
}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
	// Produce getter/setters for properties. We need setters because we want to
	// call _changed() if a property was modified.
	function(name) {
		var part = Base.capitalize(name),
			name = '_' + name;
		this['get' + part] = function() {
			return this[name];
		};
		this['set' + part] = function(value) {
			if (value != this[name]) {
				this[name] = value;
				// #locked does not change appearance, all others do:
				this._changed(name === '_locked'
						? /*#=*/ ChangeFlag.ATTRIBUTE : /*#=*/ Change.ATTRIBUTE);
			}
		};
}, {}), /** @lends Item# */{
	// Note: These properties have their getter / setters produced in the
	// injection scope above.

	/**
	 * Specifies whether the item is locked.
	 *
	 * @name Item#locked
	 * @type Boolean
	 * @default false
	 * @ignore
	 */
	_locked: false,

	/**
	 * Specifies whether the item is visible. When set to {@code false}, the
	 * item won't be drawn.
	 *
	 * @name Item#visible
	 * @type Boolean
	 * @default true
	 *
	 * @example {@paperscript}
	 * // Hiding an item:
	 * var path = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Hide the path:
	 * path.visible = false;
	 */
	_visible: true,

	/**
	 * The blend mode with which the item is composited onto the canvas. Both
	 * the standard canvas compositing modes, as well as the new CSS blend modes
	 * are supported. If blend-modes cannot be rendered natively, they are
	 * emulated. Be aware that emulation can have an impact on performance.
	 *
	 * @name Item#blendMode
	 * @type String('normal', 'multiply', 'screen', 'overlay', 'soft-light',
	 * 'hard-light', 'color-dodge', 'color-burn', 'darken', 'lighten',
	 * 'difference', 'exclusion', 'hue', 'saturation', 'luminosity', 'color',
	 * 'add', 'subtract', 'average', 'pin-light', 'negation', 'source-over',
	 * 'source-in', 'source-out', 'source-atop', 'destination-over',
	 * 'destination-in', 'destination-out', 'destination-atop', 'lighter',
	 * 'darker', 'copy', 'xor')
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
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35,
	 * 	fillColor: 'red'
	 * });
	 *
	 * var circle2 = new Path.Circle({
	 * 	center: new Point(120, 50),
	 * 	radius: 35,
	 * 	fillColor: 'blue'
	 * });
	 *
	 * // Set the blend mode of circle2:
	 * circle2.blendMode = 'multiply';
	 */
	_blendMode: 'normal',

	/**
	 * The opacity of the item as a value between {@code 0} and {@code 1}.
	 *
	 * @name Item#opacity
	 * @type Number
	 * @default 1
	 *
	 * @example {@paperscript}
	 * // Making an item 50% transparent:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35,
	 * 	fillColor: 'red'
	 * });
     *
	 * var circle2 = new Path.Circle({
	 * 	center: new Point(120, 50),
	 * 	radius: 35,
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'green',
	 * 	strokeWidth: 10
	 * });
	 *
	 * // Make circle2 50% transparent:
	 * circle2.opacity = 0.5;
	 */
	_opacity: 1,

	// TODO: Implement guides
	/**
	 * Specifies whether the item functions as a guide. When set to
	 * {@code true}, the item will be drawn at the end as a guide.
	 *
	 * @name Item#guide
	 * @type Boolean
	 * @default true
	 * @ignore
	 */
	_guide: false,

	/**
	 * Specifies whether the item is selected. This will also return
	 * {@code true} for {@link Group} items if they are partially selected, e.g.
	 * groups containing selected or partially selected paths.
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Curve#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 * path.selected = true; // Select the path
	 */
	isSelected: function() {
		if (this._selectChildren) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (this._children[i].isSelected())
					return true;
		}
		return this._selected;
	},

	setSelected: function(selected, noChildren) {
		// Don't recursively call #setSelected() if it was called with
		// noChildren set to true, see #setFullySelected().
		if (!noChildren && this._selectChildren) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setSelected(selected);
		}
		if ((selected = !!selected) ^ this._selected) {
			this._selected = selected;
			this._project._updateSelection(this);
			this._changed(/*#=*/ Change.ATTRIBUTE);
		}
	},

	_selected: false,

	isFullySelected: function() {
		if (this._children && this._selected) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (!this._children[i].isFullySelected())
					return false;
			return true;
		}
		// If there are no children, this is the same as #selected
		return this._selected;
	},

	setFullySelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setFullySelected(selected);
		}
		// Pass true for hidden noChildren argument
		this.setSelected(selected, true);
	},

	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 */
	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		// On-the-fly conversion to boolean:
		if (this._clipMask != (clipMask = !!clipMask)) {
			this._clipMask = clipMask;
			if (clipMask) {
				this.setFillColor(null);
				this.setStrokeColor(null);
			}
			this._changed(/*#=*/ Change.ATTRIBUTE);
			// Tell the parent the clipping mask has changed
			if (this._parent)
				this._parent._changed(/*#=*/ ChangeFlag.CLIPPING);
		}
	},

	_clipMask: false,

	// TODO: get/setIsolated (print specific feature)
	// TODO: get/setKnockout (print specific feature)
	// TODO: get/setAlphaIsShape

	/**
	 * A plain javascript object which can be used to store
	 * arbitrary data on the item.
	 *
	 * @type Object
	 * @bean
	 *
	 * @example
	 * var path = new Path();
	 * path.data.remember = 'milk';
	 * 
	 * @example
	 * var path = new Path();
	 * path.data.malcolm = new Point(20, 30);
	 * console.log(path.data.malcolm.x); // 20
	 * 
	 * @example
	 * var path = new Path();
	 * path.data = {
	 * 	home: 'Omicron Theta',
	 * 	found: 2338,
	 * 	pets: ['Spot']
	 * };
	 * console.log(path.data.pets.length); // 1
	 * 
	 * @example
	 * var path = new Path({
	 * 	data: {
	 * 		home: 'Omicron Theta',
	 * 		found: 2338,
	 * 		pets: ['Spot']
	 * 	}
	 * });
	 * console.log(path.data.pets.length); // 1
	 */
	getData: function() {
		if (!this._data)
			this._data = {};
		return this._data;
	},

	setData: function(data) {
		this._data = data;		
	},

	/**
	 * {@grouptitle Position and Bounding Boxes}
	 *
	 * The item's position within the parent item's coordinate system. By
	 * default, this is the {@link Rectangle#center} of the item's
	 * {@link #bounds} rectangle.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Changing the position of a path:
	 *
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle({
	 * 	center: new Point(10, 10),
	 * 	radius: 10,
	 * 	fillColor: 'red'
	 * });
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
	 * var circle = new Path.Circle({
	 * 	center: new Point(20, 20),
	 * 	radius: 10,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Move the circle 100 points to the right
	 * circle.position.x += 100;
	 */
	getPosition: function(_dontLink) {
		// Cache position value.
		// Pass true for _dontLink in getCenter(), so receive back a normal point
		var position = this._position,
			ctor = _dontLink ? Point : LinkedPoint;
		// Do not cache LinkedPoints directly, since we would not be able to
		// use them to calculate the difference in #setPosition, as when it is
		// modified, it would hold new values already and only then cause the
		// calling of #setPosition.
		if (!position) {
			// If an pivot point is provided, use it to determine position
			// based on the matrix. Otherwise use the center of the bounds.
			var pivot = this._pivot;
			position = this._position = pivot
					? this._matrix._transformPoint(pivot)
					: this.getBounds().getCenter(true);
		}
		return new ctor(position.x, position.y, this, 'setPosition');
	},

	setPosition: function(/* point */) {
		// Calculate the distance to the current position, by which to
		// translate the item. Pass true for _dontLink, as we do not need a
		// LinkedPoint to simply calculate this distance.
		this.translate(Point.read(arguments).subtract(this.getPosition(true)));
	},

	/**
	 * The item's pivot point specified in the item coordinate system, defining
	 * the point around which all transformations are hinging. This is also the
	 * reference point for {@link #position}. By default, it is set to
	 * {@code null}, meaning the {@link Rectangle#center} of the item's
	 * {@link #bounds} rectangle is used as pivot.
	 *
	 * @type Point
	 * @bean
	 * @default null
	 *
	 * @example {@paperscript}
	 */
	getPivot: function(_dontLink) {
		var pivot = this._pivot;
		if (pivot) {
			var ctor = _dontLink ? Point : LinkedPoint;
			pivot = new ctor(pivot.x, pivot.y, this, 'setAnchor');
		}
		return pivot;
	},

	setPivot: function(/* point */) {
		this._pivot = Point.read(arguments);
		// No need for _changed() since the only thing this affects is _position
		this._position = undefined;
	},

	_pivot: null,

	// TODO: Keep these around for a bit since it was introduced on the mailing
	// list, then remove in a while.
	getRegistration: '#getPivot',
	setRegistration: '#setPivot'
}, Base.each(['bounds', 'strokeBounds', 'handleBounds', 'roughBounds',
		'internalBounds', 'internalRoughBounds'],
	function(key) {
		// Produce getters for bounds properties. These handle caching, matrices
		// and redirect the call to the private _getBounds, which can be
		// overridden by subclasses, see below.
		// Treat internalBounds and internalRoughBounds untransformed, as
		// required by the code that uses these methods internally, but make
		// sure they can be cached like all the others as well.
		// Pass on the getter that these version actually use, untransformed,
		// as internalGetter.
		// NOTE: These need to be versions of other methods, as otherwise the
		// cache gets messed up.
		var getter = 'get' + Base.capitalize(key),
			match = key.match(/^internal(.*)$/),
			internalGetter = match ? 'get' + match[1] : null;
		this[getter] = function(_matrix) {
			var boundsGetter = this._boundsGetter,
				// Allow subclasses to override _boundsGetter if they use the
				// same calculations for multiple type of bounds.
				// The default is getter:
				name = !internalGetter && (typeof boundsGetter === 'string'
						? boundsGetter : boundsGetter && boundsGetter[getter])
						|| getter,
				bounds = this._getCachedBounds(name, _matrix, null,
						internalGetter);
			// If we're returning 'bounds', create a LinkedRectangle that uses
			// the setBounds() setter to update the Item whenever the bounds are
			// changed:
			return key === 'bounds'
					? new LinkedRectangle(bounds.x, bounds.y, bounds.width,
							bounds.height, this, 'setBounds') 
					: bounds;
		};
		// As the function defines a _matrix parameter and has no setter,
		// Straps.js doesn't produce a bean for it. Explicitely define an
		// accesor now too:
		this[key] = {
			get: this[getter]
		};
	},
/** @lends Item# */{
	/**
	 * Protected method used in all the bounds getters. It loops through all the
	 * children, gets their bounds and finds the bounds around all of them.
	 * Subclasses override it to define calculations for the various required
	 * bounding types.
	 */
	_getBounds: function(getter, matrix, cacheItem) {
		// Note: We cannot cache these results here, since we do not get
		// _changed() notifications here for changing geometry in children.
		// But cacheName is used in sub-classes such as PlacedSymbol and Raster.
		var children = this._children;
		// TODO: What to return if nothing is defined, e.g. empty Groups?
		// Scriptographer behaves weirdly then too.
		if (!children || children.length == 0)
			return new Rectangle();
		var x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			if (child._visible && !child.isEmpty()) {
				var rect = child._getCachedBounds(getter, matrix, cacheItem);
				x1 = Math.min(rect.x, x1);
				y1 = Math.min(rect.y, y1);
				x2 = Math.max(rect.x + rect.width, x2);
				y2 = Math.max(rect.y + rect.height, y2);
			}
		}
		return isFinite(x1)
				? new Rectangle(x1, y1, x2 - x1, y2 - y1)
				: new Rectangle();
	},

	setBounds: function(/* rect */) {
		var rect = Rectangle.read(arguments),
			bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.getCenter();
		// Read this from bottom to top:
		// Translate to new center:
		matrix.translate(center);
		// Scale to new Size, if size changes and avoid divisions by 0:
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		// Translate to bounds center:
		center = bounds.getCenter();
		matrix.translate(-center.x, -center.y);
		// Now execute the transformation
		this.transform(matrix);
	},

	/**
	 * Private method that deals with the calling of _getBounds, recursive
	 * matrix concatenation and handles all the complicated caching mechanisms.
	 */
	_getCachedBounds: function(getter, matrix, cacheItem, internalGetter) {
		// See if we can cache these bounds. We only cache the bounds
		// transformed with the internally stored _matrix, (the default if no
		// matrix is passed).
		matrix = matrix && matrix.orNullIfIdentity();
		// Do not transform by the internal matrix if there is a internalGetter.
		var _matrix = internalGetter ? null : this._matrix.orNullIfIdentity(),
			cache = (!matrix || matrix.equals(_matrix)) && getter;
		// Set up a boundsCache structure that keeps track of items that keep
		// cached bounds that depend on this item. We store this in our parent,
		// for multiple reasons:
		// The parent receives HIERARCHY change notifications for when its
		// children are added or removed and can thus clear the cache, and we
		// save a lot of memory, e.g. when grouping 100 items and asking the
		// group for its bounds. If stored on the children, we would have 100
		// times the same structure.
		// Note: This needs to happen before returning cached values, since even
		// then, _boundsCache needs to be kept up-to-date.
		var cacheParent = this._parent || this._parentSymbol;
		if (cacheItem && cacheParent) {
			// Set-up the parent's boundsCache structure if it does not
			// exist yet and add the cacheItem to it.
			var id = cacheItem._id,
				ref = cacheParent._boundsCache = cacheParent._boundsCache || {
					// Use both a hashtable for ids and an array for the list,
					// so we can keep track of items that were added already
					ids: {},
					list: []
				};
			if (!ref.ids[id]) {
				ref.list.push(cacheItem);
				ref.ids[id] = cacheItem;
			}
		}
		if (cache && this._bounds && this._bounds[cache])
			return this._bounds[cache].clone();
		// If the result of concatinating the passed matrix with our internal
		// one is an identity transformation, set it to null for faster
		// processing
		matrix = !matrix
				? _matrix
				: _matrix
					? matrix.clone().concatenate(_matrix)
					: matrix;
		// If we're caching bounds on this item, pass it on as cacheItem, so the
		// children can setup the _boundsCache structures for it.
		// getInternalBounds is getBounds untransformed. Do not replace earlier,
		// so we can cache both separately, since they're not in the same 
		// transformation space!
		var bounds = this._getBounds(internalGetter || getter, matrix,
				cache ? this : cacheItem);
		// If we can cache the result, update the _bounds cache structure
		// before returning
		if (cache) {
			if (!this._bounds)
				this._bounds = {};
			var cached = this._bounds[cache] = bounds.clone();
			// Mark as internal, so Item#transform() won't transform it!
			cached._internal = !!internalGetter;
		}
		return bounds;
	},

	statics: {
		/**
		 * Clears cached bounds of all items that the children of this item are
		 * contributing to. See #_getCachedBounds() for an explanation why this
		 * information is stored on parents, not the children themselves.
		 */
		_clearBoundsCache: function(item) {
			// This is defined as a static method so Symbol can used it too.
			if (item._boundsCache) {
				for (var i = 0, list = item._boundsCache.list, l = list.length;
						i < l; i++) {
					var child = list[i];
					child._bounds = child._position = undefined;
					// Delete position as well, since it's depending on bounds.
					// We need to recursively call _clearBoundsCache, because if
					// the cache for this child's children is not valid anymore,
					// that propagates up the DOM tree.
					if (child !== item && child._boundsCache)
						child._clearBoundsCache();
				}
				item._boundsCache = undefined;
			}
		}
	}

	/**
	 * The bounding rectangle of the item excluding stroke width.
	 *
	 * @name Item#getBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the item including stroke width.
	 *
	 * @name Item#getStrokeBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the item including handles.
	 *
	 * @name Item#getHandleBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The rough bounding rectangle of the item that is shure to include all of
	 * the drawing, including stroke width.
	 *
	 * @name Item#getRoughBounds
	 * @type Rectangle
	 * @bean
	 * @ignore
	 */
}), /** @lends Item# */{
	_decompose: function() {
		return this._decomposed = this._matrix.decompose();
	},

	/**
	 * The current rotation angle of the item, as described by its
	 * {@link #matrix}.
	 *
	 * @type Number
	 * @bean
	 */
	getRotation: function() {
		var decomposed = this._decomposed || this._decompose();
		return decomposed && decomposed.rotation;
	},

	setRotation: function(rotation) {
		var current = this.getRotation();
		if (current != null && rotation != null) {
			// Preseve the cached _decomposed values over rotation, and only
			// update the rotation property on it.
			var decomposed = this._decomposed;
			this.rotate(rotation - current);
			decomposed.rotation = rotation;
			this._decomposed = decomposed;
		}
	},

	/**
	 * The current scale factor of the item, as described by its
	 * {@link #matrix}.
	 *
	 * @type Point
	 * @bean
	 */
	getScaling: function() {
		var decomposed = this._decomposed || this._decompose();
		return decomposed && decomposed.scaling;
	},

	setScaling: function(/* scaling */) {
		var current = this.getScaling();
		if (current != null) {
			// Clone existing points since we're caching internally.
			var scaling = Point.read(arguments, 0, { clone: true }),
				// See #setRotation() for preservation of _decomposed.
				decomposed = this._decomposed;
			this.scale(scaling.x / current.x, scaling.y / current.y);
			decomposed.scaling = scaling;
			this._decomposed = decomposed;
		}
	},

	/**
	 * The item's transformation matrix, defining position and dimensions in
	 * relation to its parent item in which it is contained.
	 *
	 * @type Matrix
	 * @bean
	 */
	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function(matrix) {
		// Use Matrix#initialize to easily copy over values.
		this._matrix.initialize(matrix);
		if (this._transformContent)
			this.applyMatrix(true);
		this._changed(/*#=*/ Change.GEOMETRY);
	},

	/**
	 * The item's global transformation matrix in relation to the global project
	 * coordinate space.
	 *
	 * @type Matrix
	 * @bean
	 */
	getGlobalMatrix: function() {
		var matrix = this._globalMatrix,
			updateVersion = this._project._updateVersion;
		// If _globalMatrix is out of sync, recalculate it now
		if (matrix && matrix._updateVersion !== updateVersion)
			matrix = null;
		if (!matrix) {
			matrix = this._globalMatrix = this._matrix.clone();
			if (this._parent)
				matrix.preConcatenate(this._parent.getGlobalMatrix());
			matrix._updateVersion = updateVersion;
		}
		return matrix;
	},

	/**
	 * Specifies whether the group applies transformations directly to its
	 * children, or whether they are to be stored in its {@link #matrix}
	 *
	 * @type Boolean
	 * @default true
	 * @bean
	 */
	getTransformContent: function() {
		return this._transformContent;
	},

	setTransformContent: function(transform) {
		this._transformContent = transform;
		if (transform)
			this.applyMatrix();
	},

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

	_setProject: function(project, installEvents) {
		if (this._project !== project) {
			// Uninstall events before switching project, then install them
			// again.
			if (this._project)
				this._installEvents(false);
			this._project = project;
			var children = this._children;
			for (var i = 0, l = children && children.length; i < l; i++)
				children[i]._setProject(project);
			// We need to call _installEvents(true) again, but merge it with
			// handling of installEvents argument below.
			installEvents = true;
		}
		if (installEvents)
			this._installEvents(true);
	},

	/**
	 * Overrides Callback#_installEvents to also call _installEvents on all
	 * children.
	 */
	_installEvents: function _installEvents(install) {
		_installEvents.base.call(this, install);
		var children = this._children;
		for (var i = 0, l = children && children.length; i < l; i++)
			children[i]._installEvents(install);
	},

	/**
	 * The layer that this item is contained within.
	 *
	 * @type Layer
	 * @bean
	 */
	getLayer: function() {
		var parent = this;
		while (parent = parent._parent) {
			if (parent instanceof Layer)
				return parent;
		}
		return null;
	},

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
	 * 
	 * @example // Setting the parent of the item to another item
	 * var path = new Path();
	 *
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 *
	 * var group = new Group();
	 * group.parent = path;
	 *
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 * 
	 * // The path is now contained in the children list of group:
	 * console.log(group.children[0] == path); // true
	 * 
	 * @example // Setting the parent of an item in the constructor
	 * var group = new Group();
	 * 
	 * var path = new Path({
	 * 	parent: group
	 * });
	 * 
	 * // The parent of the path is the group:
	 * console.log(path.parent == group); // true
	 * 
	 * // The path is contained in the children list of group:
	 * console.log(group.children[0] == path); // true
	 */
	getParent: function() {
		return this._parent;
	},

	setParent: function(item) {
		return item.addChild(this);
	},

	/**
	 * The children items contained within this item. Items that define a
	 * {@link #name} can also be accessed by name.
	 *
	 * <b>Please note:</b> The children array should not be modified directly
	 * using array functions. To remove single items from the children list, use
	 * {@link Item#remove()}, to remove all items from the children list, use
	 * {@link Item#removeChildren()}. To add items to the children list, use
	 * {@link Item#addChild(item)} or {@link Item#insertChild(index,item)}.
	 *
	 * @type Item[]
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Accessing items in the children array:
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
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
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
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
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
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
		this.addChildren(items);
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
	 * Checks whether the item and all its parents are inserted into the DOM or
	 * not.
	 *
	 * @return {Boolean} {@true if the item is inserted into the DOM}
	 */
	isInserted: function() {
		return this._parent ? this._parent.isInserted() : false;
	},

	equals: function(item) {
		// Note: We do not compare name and selected state.
		return item === this || item && this._class === item._class
				&& this._style.equals(item._style) 
				&& this._matrix.equals(item._matrix)
				&& this._locked === item._locked
				&& this._visible === item._visible
				&& this._blendMode === item._blendMode
				&& this._opacity === item._opacity
				&& this._clipMask === item._clipMask
				&& this._guide === item._guide
				&& this._equals(item)
				|| false;
	},

	/**
	 * A private helper for #equals(), to be overridden in sub-classes. When it
	 * is called, item is always defined, of the same class as `this` and has
	 * equal general state attributes such as matrix, style, opacity, etc.
	 */
	_equals: function(item) {
		return Base.equals(this._children, item._children);
	},

	/**
	 * Clones the item within the same project and places the copy above the
	 * item.
	 *
	 * @param {Boolean} [insert=true] specifies whether the copy should be
	 * inserted into the DOM. When set to {@code true}, it is inserted above the
	 * original.
	 * @return {Item} the newly cloned item
	 *
	 * @example {@paperscript}
	 * // Cloning items:
	 * var circle = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 10,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Make 20 copies of the circle:
	 * for (var i = 0; i < 20; i++) {
	 * 	var copy = circle.clone();
	 *
	 * 	// Distribute the copies horizontally, so we can see them:
	 * 	copy.position.x += i * copy.bounds.width;
	 * }
	 */
	clone: function(insert) {
		return this._clone(new this.constructor(Item.NO_INSERT), insert);
	},

	_clone: function(copy, insert) {
		// Copy over style
		copy.setStyle(this._style);
		// If this item has children, clone and append each of them:
		if (this._children) {
			// Clone all children and add them to the copy. tell #addChild we're
			// cloning, as needed by CompoundPath#insertChild().
			for (var i = 0, l = this._children.length; i < l; i++)
				copy.addChild(this._children[i].clone(false), true);
		}
		// Insert is true by default.
		if (insert || insert === undefined)
			copy.insertAbove(this);
		// Only copy over these fields if they are actually defined in 'this',
		// meaning the default value has been overwritten (default is on
		// prototype).
		var keys = ['_locked', '_visible', '_blendMode', '_opacity',
				'_clipMask', '_guide'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		// Use Matrix#initialize to easily copy over values.
		copy._matrix.initialize(this._matrix);
		// Copy over _data as well.
		copy._data = this._data ? Base.clone(this._data) : null;
		// Copy over the selection state, use setSelected so the item
		// is also added to Project#selectedItems if it is selected.
		copy.setSelected(this._selected);
		// Clone the name too, but make sure we're not overriding the original
		// in the same parent, by passing true for the unique parameter.
		if (this._name)
			copy.setName(this._name, true);
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
		// Pass false fo insert, since we're inserting at a specific location.
		return itemOrProject.addChild(this.clone(false));
	},

	/**
	 * Rasterizes the item into a newly created Raster object. The item itself
	 * is not removed after rasterization.
	 *
	 * @param {Number} [resolution=view.resolution] the resolution of the raster
	 * in pixels per inch (DPI). If not speceified, the value of
	 * {@code view.resolution} is used.
	 * @return {Raster} the newly created raster item
	 *
	 * @example {@paperscript}
	 * // Rasterizing an item:
	 * var circle = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 5,
	 * 	fillColor: 'red'
	 * });
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
		var bounds = this.getStrokeBounds(),
			view = this._project.view,
			scale = (resolution || view && view.getResolution() || 72) / 72,
			// Floor top-left corner and ceil bottom-right corner, to never
			// blur or cut pixels.
			topLeft = bounds.getTopLeft().floor(),
			bottomRight = bounds.getBottomRight().ceil()
			size = new Size(bottomRight.subtract(topLeft)),
			canvas = CanvasProvider.getCanvas(size.multiply(scale)),
			ctx = canvas.getContext('2d'),
			matrix = new Matrix().scale(scale).translate(topLeft.negate());
		ctx.save();
		matrix.applyToContext(ctx);
		// See Project#draw() for an explanation of new Base()
		this.draw(ctx, new Base({ transforms: [matrix] }));
		ctx.restore();
		var raster = new Raster(Item.NO_INSERT);
		raster.setCanvas(canvas);
		raster.transform(new Matrix().translate(topLeft.add(size.divide(2)))
				// Take resolution into account and scale back to original size.
				.scale(1 / scale));
		raster.insertAbove(this);
		// NOTE: We don't need to release the canvas since it now belongs to the
		// Raster!
		return raster;
	},

	/**
	 * Checks whether the item's geometry contains the given point.
	 * 
	 * @example {@paperscript} // Click within and outside the star below
	 * // Create a star shaped path:
	 * var path = new Path.Star({
	 * 	center: [50, 50],
	 * 	points: 12,
	 * 	radius1: 20,
	 * 	radius2: 40,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // Whenever the user presses the mouse:
	 * function onMouseDown(event) {
	 * 	// If the position of the mouse is within the path,
	 * 	// set its fill color to red, otherwise set it to
	 * 	// black:
	 * 	if (path.contains(event.point)) {
	 * 		path.fillColor = 'red';
	 * 	} else {
	 * 		path.fillColor = 'black';
	 * 	}
	 * }
	 * 
	 * @param {Point} point The point to check for.
	 */
	contains: function(/* point */) {
		// See CompoundPath#_contains() for the reason for !!
		return !!this._contains(
				this._matrix._inverseTransform(Point.read(arguments)));
	},

	_contains: function(point) {
		if (this._children) {
			for (var i = this._children.length - 1; i >= 0; i--) {
				if (this._children[i].contains(point))
					return true;
			}
			return false;
		}
		// We only implement it here for items with rectangular content,
		// for anything else we need to override #contains()
		return point.isInside(this.getInternalBounds());
	},

	/**
	 * Perform a hit test on the item (and its children, if it is a
	 * {@link Group} or {@link Layer}) at the location of the specified point.
	 * 
	 * The options object allows you to control the specifics of the hit test
	 * and may contain a combination of the following values:
	 * <b>options.tolerance:</b> {@code Number} – the tolerance of the hit test
	 * in points. Can also be controlled through
	 * {@link Project#options}{@code .hitTolerance}.
	 * <b>options.type:</b> Only hit test again a certain item
	 * type: {String('group', 'layer', 'path', 'compound-path', 'shape',
	 * 'raster', 'placed-symbol', 'point-text')}, etc.
	 * <b>options.fill:</b> {@code Boolean} – hit test the fill of items.
	 * <b>options.stroke:</b> {@code Boolean} – hit test the curves of path
	 * items, taking into account stroke width.
	 * <b>options.segment:</b> {@code Boolean} – hit test for
	 * {@link Segment#point} of {@link Path} items.
	 * <b>options.handles:</b> {@code Boolean} – hit test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
	 * <b>options.ends:</b> {@code Boolean} – only hit test for the first or
	 * last segment points of open path items.
	 * <b>options.bounds:</b> {@code Boolean} – hit test the corners and
	 * side-centers of the bounding rectangle of items ({@link Item#bounds}).
	 * <b>options.center:</b> {@code Boolean} – hit test the
	 * {@link Rectangle#center} of the bounding rectangle of items
	 * ({@link Item#bounds}).
	 * <b>options.guides:</b> {@code Boolean} – hit test items that have
	 * {@link Item#guide} set to {@code true}.
	 * <b>options.selected:</b> {@code Boolean} – only hit selected items.<b
	 *
	 * @param {Point} point The point where the hit test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: 2 }]
	 * @return {HitResult} a hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit
	 */
	hitTest: function(point, options) {
		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));
		if (this._locked || !this._visible || this._guide && !options.guides)
			return null;

		// Check if the point is withing roughBounds + tolerance, but only if
		// this item does not have children, since we'd have to travel up the
		// chain already to determine the rough bounds.
		var matrix = this._matrix,
			parentTotalMatrix = options._totalMatrix,
			view = this._project.view,
			// Keep the accumulated matrices up to this item in options, so we
			// can keep calculating the correct _tolerancePadding values.
			totalMatrix = options._totalMatrix = parentTotalMatrix
					? parentTotalMatrix.clone().concatenate(matrix)
					// If this is the first one in the recursion, factor in the
					// zoom of the view and the globalMatrix of the item.
					: this.getGlobalMatrix().clone().preConcatenate(
						view ? view._matrix : new Matrix()),
			// Calculate the transformed padding as 2D size that describes the
			// transformed tolerance circle / ellipse. Make sure it's never 0
			// since we're using it for division.
			tolerancePadding = options._tolerancePadding = new Size(
						Path._getPenPadding(1, totalMatrix.inverted())
					).multiply(
						Math.max(options.tolerance, /*#=*/ Numerical.TOLERANCE)
					);
		// Transform point to local coordinates.
		point = matrix._inverseTransform(point);

		if (!this._children && !this.getInternalRoughBounds()
				.expand(tolerancePadding.multiply(2))._containsPoint(point))
			return null;
		// Filter for type, guides and selected items if that's required.
		var checkSelf = !(options.guides && !this._guide
				|| options.selected && !this._selected
				|| options.type && this._type !== options.type),
			that = this,
			res;

		function checkBounds(type, part) {
			var pt = bounds['get' + part]();
			// Since there are transformations, we cannot simply use a numerical
			// tolerance value. Instead, we divide by a padding size, see above.
			if (point.subtract(pt).divide(tolerancePadding).length <= 1)
				return new HitResult(type, that,
						{ name: Base.hyphenate(part), point: pt });
		}

		// Ignore top level layers by checking for _parent:
		if (checkSelf && (options.center || options.bounds) && this._parent) {
			// Don't get the transformed bounds, check against transformed
			// points instead
			var bounds = this.getInternalBounds();
			if (options.center)
				res = checkBounds('center', 'Center');
			if (!res && options.bounds) {
				// TODO: Move these into a private scope
				var points = [
					'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
					'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'
				];
				for (var i = 0; i < 8 && !res; i++)
					res = checkBounds('bounds', points[i]);
			}
		}

		var children = !res && this._children;
		if (children) {
			var opts = this._getChildHitTestOptions(options);
			// Loop backwards, so items that get drawn last are tested first
			for (var i = children.length - 1; i >= 0 && !res; i--)
				res = children[i].hitTest(point, opts);
		}
		if (!res && checkSelf)
			res = this._hitTest(point, options);
		// Transform the point back to the outer coordinate system.
		if (res && res.point)
			res.point = matrix.transform(res.point);
		// Restore totalMatrix for next child.
		options._totalMatrix = parentTotalMatrix;
		return res;
	},

	_getChildHitTestOptions: function(options) {
		// This is overriden in CompoundPath, for treatment of type === 'path'.
		return options;
	},

	_hitTest: function(point, options) {
		// The default implementation honly handles 'fill' through #_contains()
		if (options.fill && this.hasFill() && this._contains(point))
			return new HitResult('fill', this);
	},

	// DOCS: Item#matches
	matches: function(match) {
		// matchObject() is used to match against objects in a nested manner.
		// This is useful for matching against Item#data.
		function matchObject(obj1, obj2) {
			for (var i in obj1) {
				if (obj1.hasOwnProperty(i)) {
					var val1 = obj1[i],
						val2 = obj2[i];
					if (Base.isPlainObject(val1) && Base.isPlainObject(val2)) {
						if (!matchObject(val1, val2))
							return false;
					} else if (!Base.equals(val1, val2)) {
						return false;
					}
				}
			}
			return true;
		}
		for (var key in match) {
			if (match.hasOwnProperty(key)) {
				var value = this[key],
					compare = match[key];
				if (compare instanceof RegExp) {
					if (!compare.test(value))
						return false;
				} else if (typeof compare === 'function') {
					if (!compare(value))
						return false;
				} else if (Base.isPlainObject(compare)) {
					if (!matchObject(compare, value))
						return false;
				} else if (!Base.equals(value, compare)) {
					return false;
				}
			}
		}
		return true;
	}
}, new function() {
	function getItems(item, match, list) {
		var children = item._children,
			items = list && [];
		for (var i = 0, l = children && children.length; i < l; i++) {
			var child = children[i];
			if (child.matches(match)) {
				if (list) {
					items.push(child);
				} else {
					return child;
				}
			}
			var res = getItems(child, match, list);
			if (list) {
				items.push.apply(items, res);
			} else if (res) {
				return res;
			}
		}
		return list ? items : null;
	}

	return /** @lends Item# */{
		// DOCS: Item#getItems
		getItems: function(match) {
			return getItems(this, match, true);
		},

		// DOCS: Item#getItem
		getItem: function(match) {
			return getItems(this, match, false);
		}
	};
}, /** @lends Item# */{
	/**
	 * {@grouptitle Importing / Exporting JSON and SVG}
	 *
	 * Exports (serializes) the item with its content and child items to a JSON
	 * data string.
	 *
	 * The options object offers control over some aspects of the SVG export:
	 * <b>options.asString:</b> {@code Boolean} – wether the JSON is returned as
	 * a {@code Object} or a {@code String}.
	 * <b>options.precision:</b> {@code Number} – the amount of fractional
	 * digits in numbers used in JSON data.
	 *
	 * @name Item#exportJSON
	 * @function
	 * @param {Object} [options={ asString: true, precision: 5 }] the
	 * serialization options
	 * @return {String} the exported JSON data
	 */

	/**
	 * Imports (deserializes) the stored JSON data into this item. If the data
	 * describes an item of the same class or a parent class of the item, the
	 * data is imported into the item itself. If not, the imported item is added
	 * to this item's {@link Item#children} list. Note that not all type of
	 * items can have children.
	 *
	 * @param {String} json the JSON data to import from.
	 */
	importJSON: function(json) {
		// Try importing into `this`. If another item is returned, try adding
		// it as a child (this won't be successful on some classes, returning
		// null).
		var res = Base.importJSON(json, this);
		return res !== this
				? this.addChild(res)
				: res;
	},

	/**
	 * Exports the item with its content and child items as an SVG DOM.
	 *
	 * The options object offers control over some aspects of the SVG export:
	 * <b>options.asString:</b> {@code Boolean} – wether a SVG node or a
	 * {@code String} is to be returned.
	 * <b>options.precision:</b> {@code Number} – the amount of fractional
	 * digits in numbers used in SVG data.
	 * <b>options.matchShapes:</b> {@code Boolean} – wether imported path
	 * items should tried to be converted to shape items, if their geometries
	 * match.
	 *
	 * @name Item#exportSVG
	 * @function
	 * @param {Object} [options={ asString: false, precision: 5,
	 * matchShapes: false }] the export options.
	 * @return {SVGSVGElement} the item converted to an SVG node
	 */

	// DOCS: Document importSVG('file.svg', callback);
	/**
	 * Converts the provided SVG content into Paper.js items and adds them to
	 * the this item's children list.
	 * Note that the item is not cleared first. You can call
	 * {@link Item#removeChildren()} to do so.
	 *
	 * The options object offers control over some aspects of the SVG import:
	 * <b>options.expandShapes:</b> {@code Boolean} – wether imported shape
	 * items should be expanded to path items.
	 *
	 * @name Item#importSVG
	 * @function
	 * @param {SVGSVGElement|String} svg the SVG content to import
	 * @param {Object} [options={ expandShapes: false }] the import options
	 * @return {Item} the imported Paper.js parent item
	 */

	/**
	 * {@grouptitle Hierarchy Operations}
	 * Adds the specified item as a child of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {Item} item the item to be added as a child
	 * @return {Item} the added item, or {@code null} if adding was not
	 * possible.
	 */
	addChild: function(item, _preserve) {
		return this.insertChild(undefined, item, _preserve);
	},

	/**
	 * Inserts the specified item as a child of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item} item the item to be inserted as a child
	 * @return {Item} the inserted item, or {@code null} if inserting was not
	 * possible.
	 */
	insertChild: function(index, item, _preserve) {
		var res = this.insertChildren(index, [item], _preserve);
		return res && res[0];
	},

	/**
	 * Adds the specified items as children of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {Item[]} items The items to be added as children
	 * @return {Item[]} the added items, or {@code null} if adding was not
	 * possible.
	 */
	addChildren: function(items, _preserve) {
		return this.insertChildren(this._children.length, items, _preserve);
	},

	/**
	 * Inserts the specified items as children of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item[]} items The items to be appended as children
	 * @return {Item[]} the inserted items, or {@code null} if inserted was not
	 * possible.
	 */
	insertChildren: function(index, items, _preserve, _type) {
		// CompoundPath#insertChildren() requires _preserve and _type:
		// _preserve avoids changing of the children's path orientation
		// _type enforces the inserted type.
		var children = this._children;
		if (children && items && items.length > 0) {
			// We need to clone items because it might be
			// an Item#children array. Also, we're removing elements if they
			// don't match _type. Use Array.prototype.slice becaus items can be
			// an arguments object.
			items = Array.prototype.slice.apply(items);
			// Remove the items from their parents first, since they might be
			// inserted into their own parents, affecting indices.
			// Use the loop also to filter out wrong _type.
			for (var i = items.length - 1; i >= 0; i--) {
				var item = items[i];
				if (_type && item._type !== _type)
					items.splice(i, 1);
				else
					item._remove(true);
			}
			Base.splice(children, items, index, 0);
			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];
				item._parent = this;
				item._setProject(this._project, true);
				// Setting the name again makes sure all name lookup structures
				// are kept in sync.
				if (item._name)
					item.setName(item._name);
			}
			this._changed(/*#=*/ Change.HIERARCHY);
		} else {
			items = null;
		}
		return items;
	},

	// Private helper for #insertAbove() / #insertBelow()
	_insert: function(above, item, _preserve) {
		if (!item._parent)
			return null;
		var index = item._index + (above ? 1 : 0);
		// If the item is removed and inserted it again further above,
		// the index needs to be adjusted accordingly.
		if (item._parent === this._parent && index > this._index)
			 index--;
		return item._parent.insertChild(index, this, _preserve);
	},

	/**
	 * Inserts this item above the specified item.
	 *
	 * @param {Item} item the item above which it should be inserted
	 * @return {Item} the inserted item, or {@code null} if inserting was not
	 * possible.
	 */
	insertAbove: function(item, _preserve) {
		return this._insert(true, item, _preserve);
	},

	/**
	 * Inserts this item below the specified item.
	 *
	 * @param {Item} item the item below which it should be inserted
	 * @return {Item} the inserted item, or {@code null} if inserting was not
	 * possible.
	 */
	insertBelow: function(item, _preserve) {
	 	return this._insert(false, item, _preserve);
	 },

	/**
	 * Sends this item to the back of all other items within the same parent.
	 */
	sendToBack: function() {
		return this._parent.insertChild(0, this);
	},

	/**
	 * Brings this item to the front of all other items within the same parent.
	 */
	bringToFront: function() {
		return this._parent.addChild(this);
	},

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it above all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #addChild(item)} instead.
	 */
	appendTop: '#addChild',

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it below all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #insertChild(index, item)} instead.
	 */
	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	/**
	 * Moves this item above the specified item.
	 *
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true if it was moved}
	 * @deprecated use {@link #insertAbove(item)} instead.
	 */
	moveAbove: '#insertAbove',

	/**
	 * Moves the item below the specified item.
	 *
	 * @param {Item} item the item below which it should be moved
	 * @return {Boolean} {@true if it was moved}
	 * @deprecated use {@link #insertBelow(item)} instead.
	 */
	moveBelow: '#insertBelow',

	/**
	 * If this is a group, layer or compound-path with only one child-item,
	 * the child-item is moved outside and the parent is erased. Otherwise, the
	 * item itself is returned unmodified.
	 *
	 * @return {Item} the reduced item
	 */
	reduce: function() {
		if (this._children && this._children.length === 1) {
			var child = this._children[0].reduce();
			child.insertAbove(this);
			child.setStyle(this._style);
			this.remove();
			return child;
		}
		return this;
	},

	/**
	* Removes the item from its parent's named children list.
	*/
	_removeNamed: function() {
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
	_remove: function(notify) {
		if (this._parent) {
			if (this._name)
				this._removeNamed();
			if (this._index != null)
				Base.splice(this._parent._children, null, this._index, 1);
			this._installEvents(false);
			// Notify parent of changed hierarchy
			if (notify)
				this._parent._changed(/*#=*/ Change.HIERARCHY);
			this._parent = null;
			return true;
		}
		return false;
	},

	/**
	* Removes the item from the project. If the item has children, they are also
	* removed.
	*
	* @return {Boolean} {@true if the item was removed}
	*/
	remove: function() {
		return this._remove(true);
	},

	/**
	 * Removes all of the item's {@link #children} (if any).
	 *
	 * @name Item#removeChildren
	 * @alias Item#clear
	 * @function
	 * @return {Item[]} an array containing the removed items
	 */
	/**
	 * Removes the children from the specified {@code from} index to the
	 * {@code to} index from the parent's {@link #children} array.
	 *
	 * @name Item#removeChildren
	 * @function
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=children.length] the ending index, exclusive
	 * @return {Item[]} an array containing the removed items
	 */
	removeChildren: function(from, to) {
		if (!this._children)
			return null;
		from = from || 0;
		to = Base.pick(to, this._children.length);
		// Use Base.splice(), wich adjusts #_index for the items above, and
		// deletes it for the removed items. Calling #_remove() afterwards is
		// fine, since it only calls Base.splice() if #_index is set.
		var removed = Base.splice(this._children, null, from, to - from);
		for (var i = removed.length - 1; i >= 0; i--)
			removed[i]._remove(false);
		if (removed.length > 0)
			this._changed(/*#=*/ Change.HIERARCHY);
		return removed;
	},

	// DOCS Item#clear()
	clear: '#removeChildren',

	/**
	 * Reverses the order of the item's children
	 */
	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			// Adjust inidces
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i]._index = i;
			this._changed(/*#=*/ Change.HIERARCHY);
		}
	},

	// TODO: Item#isEditable is currently ignored in the documentation, as
	// locking an item currently has no effect
	/**
	 * {@grouptitle Tests}
	 * Specifies whether the item has any content or not. The meaning of what
	 * content is differs from type to type. For example, a {@link Group} with
	 * no children, a {@link TextItem} with no text content and a {@link Path}
	 * with no segments all are considered empty.
	 *
	 * @return Boolean
	 */
	isEmpty: function() {
		return !this._children || this._children.length == 0;
	},

	/**
	 * Checks whether the item is editable.
	 *
	 * @return {Boolean} {@true when neither the item, nor its parents are
	 * locked or hidden}
	 * @ignore
	 */
	isEditable: function() {
		var item = this;
		while (item) {
			if (!item._visible || item._locked)
				return false;
			item = item._parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 *
	 * @return {Boolean} {@true if the item is valid}
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
			} while (item = item._parent);
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
		return this._getOrder(item) === -1;
	},

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the project.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is below the specified item}
	 */
	isBelow: function(item) {
		return this._getOrder(item) === 1;
	},

	/**
	 * Checks whether the specified item is the parent of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is the parent of the item}
	 */
	isParent: function(item) {
		return this._parent === item;
	},

	/**
	 * Checks whether the specified item is a child of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true it is a child of the item}
	 */
	isChild: function(item) {
		return item && item._parent === this;
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
				&& /^(group|layer|compound-path)$/.test(parent._type)
				&& item.isDescendant(parent))
					return true;
			// Keep walking up otherwise
			parent = parent._parent;
		}
		return false;
	},

	// Document all style properties which get injected into Item by Style:

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name Item#strokeColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new Color(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name Item#strokeWidth
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35,
	 * 	strokeColor: 'red'
	 * });
	 *
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the end of open {@link Path} items, when they
	 * have a stroke.
	 *
	 * @name Item#strokeCap
	 * @property
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 *
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 *
	 * var line = new Path({
	 * 	segments: [[80, 50], [420, 50]],
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 20,
	 * 	selected: true
	 * });
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
	 * @name Item#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String('miter', 'round', 'bevel')
	 *
	 *
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path({
	 * 	segments: [[80, 100], [120, 40], [160, 100]],
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 20,
	 * 	// Select the path, in order to see where the stroke is formed:
	 * 	selected: true
	 * });
     *
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
     *
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	/**
	 * The dash offset of the stroke.
	 *
	 * @name Item#dashOffset
	 * @property
	 * @default 0
	 * @type Number
	 */

	/**
	 * Specifies an array containing the dash and gap lengths of the stroke.
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 40,
	 * 	strokeWidth: 2,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Set the dashed stroke to [10pt dash, 4pt gap]:
	 * path.dashArray = [10, 4];
	 *
	 * @name Item#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke.
	 * When two line segments meet at a sharp angle and miter joins have been
	 * specified for {@link Item#strokeJoin}, it is possible for the miter to
	 * extend far beyond the {@link Item#strokeWidth} of the path. The
	 * miterLimit imposes a limit on the ratio of the miter length to the
	 * {@link Item#strokeWidth}.
	 *
	 * @property
	 * @name Item#miterLimit
	 * @default 10
	 * @type Number
	 */

	/**
	 * The winding-rule with which the shape gets filled. Please note that only
	 * modern browsers support winding-rules other than {@code 'nonzero'}.
	 *
	 * @property
	 * @name Item#windingRule
	 * @default 'nonzero'
	 * @type String('nonzero', 'evenodd')
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color of the item.
	 *
	 * @name Item#fillColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new Color(1, 0, 0);
	 */

	// TODO: Find a better name than selectedColor. It should also be used for
	// guides, etc.
	/**
	 * {@grouptitle Selection Style}
	 *
	 * The color the item is highlighted with when selected. If the item does
	 * not specify its own color, the color defined by its layer is used instead.
	 *
	 * @name Item#selectedColor
	 * @property
	 * @type Color
	 */

	/**
	 * {@grouptitle Transform Functions}
	 *
	 * Translates (moves) the item by the given offset point.
	 *
	 * @param {Point} delta the offset to translate the item by
	 */
	translate: function(/* delta */) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	/**
	 * Rotates the item by a given angle around the given point.
	 *
	 * Angles are oriented clockwise and measured in degrees.
	 *
	 * @param {Number} angle the rotation angle
	 * @param {Point} [center={@link Item#position}]
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
	 * var circle = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 5,
	 * 	fillColor: 'white'
	 * });
	 *
	 * // Each frame rotate the path 3 degrees around the center point
	 * // of the view:
	 * function onFrame(event) {
	 * 	path.rotate(3, view.center);
	 * }
	 */
	rotate: function(angle /*, center */) {
		return this.transform(new Matrix().rotate(angle,
				Point.read(arguments, 1, { readNull: true })
					|| this.getPosition(true)));
	}
}, Base.each(['scale', 'shear', 'skew'], function(name) {
	this[name] = function() {
		// See Matrix#scale for explanation of this:
		var point = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		return this.transform(new Matrix()[name](point,
				center || this.getPosition(true)));
	};
}, /** @lends Item# */{
	/**
	 * Scales the item by the given value from its center point, or optionally
	 * from a supplied point.
	 *
	 * @name Item#scale
	 * @function
	 * @param {Number} scale the scale factor
	 * @param {Point} [center={@link Item#position}]
	 *
	 * @example {@paperscript}
	 * // Scaling an item from its center point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Scale the path by 150% from its center point
	 * circle.scale(1.5);
	 *
	 * @example {@paperscript}
	 * // Scaling an item from a specific point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
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
	 * @param {Number} hor the horizontal scale factor
	 * @param {Number} ver the vertical scale factor
	 * @param {Point} [center={@link Item#position}]
	 *
	 * @example {@paperscript}
	 * // Scaling an item horizontally by 300%:
	 *
	 * // Create a circle shaped path at { x: 100, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 * 	center: [100, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
     *
	 * // Scale the path horizontally by 300%
	 * circle.scale(3, 1);
	 */

	// TODO: Add test for item shearing, as it might be behaving oddly.
	/**
	 * Shears the item by the given value from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Point} shear the horziontal and vertical shear factors as a point
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
	/**
	 * Shears the item by the given values from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Number} hor the horizontal shear factor
	 * @param {Number} ver the vertical shear factor
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */

	/**
	 * Skews the item by the given angles from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#skew
	 * @function
	 * @param {Point} skew  the horziontal and vertical skew angles in degrees
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
	/**
	 * Skews the item by the given angles from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#skew
	 * @function
	 * @param {Number} hor the horizontal skew angle in degrees
	 * @param {Number} ver the vertical sskew angle in degrees
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
}), /** @lends Item# */{
	/**
	 * Transform the item.
	 *
	 * @param {Matrix} matrix the matrix by which the item shall be transformed.
	 */
	// Remove this for now:
	// @param {String[]} flags Array of any of the following: 'objects',
	//        'children', 'fill-gradients', 'fill-patterns', 'stroke-patterns',
	//        'lines'. Default: ['objects', 'children']
	transform: function(matrix, _applyMatrix) {
		// Bail out immediatelly if there is nothing to do
		if (matrix.isIdentity())
			return this;
		// Calling _changed will clear _bounds and _position, but depending
		// on matrix we can calculate and set them again.
		var bounds = this._bounds,
			position = this._position;
		// Simply preconcatenate the internal matrix with the passed one:
		this._matrix.preConcatenate(matrix);
		// Call applyMatrix if we need to directly apply the accumulated
		// transformations to the item's content.
		if (this._transformContent || _applyMatrix)
			this.applyMatrix(true);
		// We always need to call _changed since we're caching bounds on all
		// items, including Group.
		this._changed(/*#=*/ Change.GEOMETRY);
		// Detect matrices that contain only translations and scaling
		// and transform the cached _bounds and _position without having to
		// fully recalculate each time.
		var decomp = bounds && matrix.decompose();
		if (decomp && !decomp.shearing && decomp.rotation % 90 === 0) {
			// Transform the old bound by looping through all the cached bounds
			// in _bounds and transform each.
			for (var key in bounds) {
				var rect = bounds[key];
				// If these are internal bounds, only transform them if this
				// item transforming its content.
				if (this._transformContent || !rect._internal)
					matrix._transformBounds(rect, rect);
			}
			// If we have cached bounds, update _position again as its 
			// center. We need to take into account _boundsGetter here too, in 
			// case another getter is assigned to it, e.g. 'getStrokeBounds'.
			var getter = this._boundsGetter,
				rect = bounds[getter && getter.getBounds || getter || 'getBounds'];
			if (rect)
				this._position = rect.getCenter(true);
			this._bounds = bounds;
		} else if (position) {
			// Transform position as well.
			this._position = matrix._transformPoint(position, position);
		}
		// Allow chaining here, since transform() is related to Matrix functions
		return this;
	},

	_applyMatrix: function(matrix, applyMatrix) {
		var children = this._children;

		if (children && children.length > 0) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].transform(matrix, applyMatrix);
			return true;
		}
	},

	applyMatrix: function(_dontNotify) {
		// Call #_applyMatrix() with the internal _matrix and pass true for
		// applyMatrix. Application is not possible on Raster, PointText,
		// PlacedSymbol, since the matrix is where the actual location /
		// transformation state is stored.
		// Pass on the transformation to the content, and apply it there too,
		// by passing true for the 2nd hidden parameter.
		var matrix = this._matrix;
		if (this._applyMatrix(matrix, true)) {
			// When the matrix could be applied, we also need to transform
			// color styles (only gradients so far) and pivot point:
			var pivot = this._pivot,
				style = this._style,
				// pass true for _dontMerge so we don't recursively transform
				// styles on groups' children.
				fillColor = style.getFillColor(true),
				strokeColor = style.getStrokeColor(true);
			if (pivot)
				pivot.transform(matrix);
			if (fillColor)
				fillColor.transform(matrix);
			if (strokeColor)
				strokeColor.transform(matrix);
			// Reset the internal matrix to the identity transformation if it
			// was possible to apply it.
			matrix.reset(true);
		}
		if (!_dontNotify)
			this._changed(/*#=*/ Change.GEOMETRY);
		return this;
	},

	/**
	 * Converts the specified point from global project coordinates to local
	 * coordinates in relation to the the item's own coordinate space.
	 *
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point as a new instance
	 */
	globalToLocal: function(/* point */) {
		var matrix = this.getGlobalMatrix();
		return matrix && matrix._inverseTransform(Point.read(arguments));
	},

	/**
	 * Converts the specified point from local coordinates to global coordinates
	 * in relation to the the project coordinate space.
	 *
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point as a new instance
	 */
	localToGlobal: function(/* point */) {
		var matrix = this.getGlobalMatrix();
		return matrix && matrix._transformPoint(Point.read(arguments));
	},

	/**
	 * Transform the item so that its {@link #bounds} fit within the specified
	 * rectangle, without changing its aspect ratio.
	 *
	 * @param {Rectangle} rectangle
	 * @param {Boolean} [fill=false]
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var path = new Path.Rectangle({
	 * 	point: [80, 25],
	 * 	size: [75, 50],
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds);
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle with the fill parameter set to true:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var path = new Path.Rectangle({
	 * 	point: [80, 25],
	 * 	size: [75, 50],
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds, true);
	 *
	 * @example {@paperscript height=200}
	 * // Fitting an item to the bounding rectangle of the view
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Fit the path to the bounding rectangle of the view:
	 * path.fitBounds(view.bounds);
	 */
	fitBounds: function(rectangle, fill) {
		// TODO: Think about passing options with various ways of defining
		// fitting.
		rectangle = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			itemRatio = bounds.height / bounds.width,
			rectRatio = rectangle.height / rectangle.width,
			scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
					? rectangle.width / bounds.width
					: rectangle.height / bounds.height,
			newBounds = new Rectangle(new Point(),
					new Size(bounds.width * scale, bounds.height * scale));
		newBounds.setCenter(rectangle.getCenter());
		this.setBounds(newBounds);
	},

	/**
	 * {@grouptitle Event Handlers}
	 * Item level handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * <b>{@code event.count}</b>: the number of times the frame event was
	 * fired.
	 * <b>{@code event.time}</b>: the total amount of time passed since the
	 * first frame event in seconds.
	 * <b>{@code event.delta}</b>: the time passed in seconds since the last
	 * frame event.
	 *
 	 * @see View#onFrame
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * path.onFrame = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	this.rotate(3);
	 * }
	 *
	 * @name Item#onFrame
	 * @property
	 * @type Function
	 */

	/**
	 * The function to be called when the mouse button is pushed down on the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Press the mouse button down on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is pressed on the item,
	 * // set its fill color to red:
	 * path.onMouseDown = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Press the mouse on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var path = new Path.Circle({
	 * 		center: Point.random() * view.size,
	 * 		radius: 25,
	 * 		fillColor: 'black',
	 * 		strokeColor: 'white'
	 * 	});
	 * 
	 * 	// When the mouse is pressed on the item, remove it:
	 * 	path.onMouseDown = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the mouse button is released over the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseUp
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Release the mouse button over the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is released over the item,
	 * // set its fill color to red:
	 * path.onMouseUp = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 */

	/**
	 * The function to be called when the mouse clicks on the item. The function
	 * receives a {@link MouseEvent} object which contains information about the
	 * mouse event.
	 *
	 * @name Item#onClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Click on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is clicked on the item,
	 * // set its fill color to red:
	 * path.onClick = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Click on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var path = new Path.Circle({
	 * 		center: Point.random() * view.size,
	 * 		radius: 25,
	 * 		fillColor: 'black',
	 * 		strokeColor: 'white'
	 * 	});
	 * 
	 * 	// When the mouse clicks on the item, remove it:
	 * 	path.onClick = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the mouse double clicks on the item. The
	 * function receives a {@link MouseEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Item#onDoubleClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Double click on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is double clicked on the item,
	 * // set its fill color to red:
	 * path.onDoubleClick = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Double click on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var path = new Path.Circle({
	 * 		center: Point.random() * view.size,
	 * 		radius: 25,
	 * 		fillColor: 'black',
	 * 		strokeColor: 'white'
	 * 	});
	 * 
	 * 	// When the mouse is double clicked on the item, remove it:
	 * 	path.onDoubleClick = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called repeatedly when the mouse moves on top of the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseMove
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move over the circle shaped path, to change its opacity:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * 	var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * 	});
	 * 
	 * // When the mouse moves on top of the item, set its opacity
	 * // to a random value between 0 and 1:
	 * path.onMouseMove = function(event) {
	 * 	this.opacity = Math.random();
	 * }
	 */

	/**
	 * The function to be called when the mouse moves over the item. This
	 * function will only be called again, once the mouse moved outside of the
	 * item first. The function receives a {@link MouseEvent} object which
	 * contains information about the mouse event.
	 *
	 * @name Item#onMouseEnter
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // When you move the mouse over the item, its fill color is set to red.
	 * // When you move the mouse outside again, its fill color is set back
	 * // to black.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.onMouseEnter = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.onMouseLeave = function(event) {
	 * 	this.fillColor = 'black';
	 * }
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set back
	 * // to black.
	 * 
	 * function enter(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * function leave(event) {
	 * 	this.fillColor = 'black';
	 * }
	 * 
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the position of the mouse:
	 * 	var path = new Path.Circle(event.point, 25);
	 * 	path.fillColor = 'black';
     * 
	 * 	// When the mouse enters the item, set its fill color to red:
	 * 	path.onMouseEnter = enter;
     * 
	 * 	// When the mouse leaves the item, set its fill color to black:
	 * 	path.onMouseLeave = leave;
	 * }
	 */

	/**
	 * The function to be called when the mouse moves out of the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseLeave
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move the mouse over the circle shaped path and then move it out
	 * // of it again to set its fill color to red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse leaves the item, set its fill color to red:
	 * path.onMouseLeave = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 */

	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attaches an event handler to the item.
	 *
	 * @name Item#attach
	 * @alias Item#on
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.on('mouseenter', function() {
	 * 	this.fillColor = 'red';
	 * });
	 * 
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.on('mouseleave', function() {
	 * 	this.fillColor = 'black';
	 * });
	 */
	/**
	 * Attaches one or more event handlers to the item.
	 *
	 * @name Item#attach
	 * @alias Item#on
	 * @function
	 * @param {Object} object an object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}.
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25
	 * });
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.on({
	 * 	mouseenter: function(event) {
	 * 		this.fillColor = 'red';
	 * 	},
	 * 	mouseleave: function(event) {
	 * 		this.fillColor = 'black';
	 * 	}
	 * });
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set black.
	 * 
	 * var pathHandlers = {
	 * 	mouseenter: function(event) {
	 * 		this.fillColor = 'red';
	 * 	},
	 * 	mouseleave: function(event) {
	 * 		this.fillColor = 'black';
	 * 	}
	 * }
	 * 
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the position of the mouse:
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 25,
	 * 		fillColor: 'black'
	 * 	});
	 * 
	 * 	// Attach the handers inside the object literal to the path:
	 * 	path.on(pathHandlers);
	 * }
	 */

	/**
	 * Detach an event handler from the item.
	 *
	 * @name Item#detach
	 * @alias Item#off
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be detached
	 */
	/**
	 * Detach one or more event handlers to the item.
	 *
	 * @name Item#detach
	 * @alias Item#off
	 * @function
	 * @param {Object} object an object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}
	 */

	/**
	 * Fire an event on the item.
	 *
	 * @name Item#fire
	 * @alias Item#trigger
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Object} event an object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the item has one or more event handlers of the specified type.
	 *
	 * @name Item#responds
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @return {Boolean} {@true if the item has one or more event handlers of
	 * the specified type}
	 */

	/**
	 * Private method that sets Path related styles on the canvas context.
	 * Not defined in Path as it is required by other classes too,
	 * e.g. PointText.
	 */
	_setStyles: function(ctx) {
		// We can access internal properties since we're only using this on
		// items without children, where styles would be merged.
		var style = this._style,
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor(),
			shadowColor = style.getShadowColor();
		if (fillColor)
			ctx.fillStyle = fillColor.toCanvasStyle(ctx);
		if (strokeColor) {
			var strokeWidth = style.getStrokeWidth();
			if (strokeWidth > 0) {
				ctx.strokeStyle = strokeColor.toCanvasStyle(ctx);
				ctx.lineWidth = strokeWidth;
				var strokeJoin = style.getStrokeJoin(),
					strokeCap = style.getStrokeCap(),
					miterLimit = style.getMiterLimit();
				if (strokeJoin)
					ctx.lineJoin = strokeJoin;
				if (strokeCap)
					ctx.lineCap = strokeCap;
				if (miterLimit)
					ctx.miterLimit = miterLimit;
				if (paper.support.nativeDash) {
					var dashArray = style.getDashArray(),
						dashOffset = style.getDashOffset();
					if (dashArray && dashArray.length) {
						if ('setLineDash' in ctx) {
							ctx.setLineDash(dashArray);
							ctx.lineDashOffset = dashOffset;
						} else {
							ctx.mozDash = dashArray;
							ctx.mozDashOffset = dashOffset;
						}
					}
				}
			}
		}
		if (shadowColor) {
			var shadowBlur = style.getShadowBlur();
			if (shadowBlur > 0) {
				ctx.shadowColor = shadowColor.toCanvasStyle(ctx);
				ctx.shadowBlur = shadowBlur;
				var offset = this.getShadowOffset();
				ctx.shadowOffsetX = offset.x;
				ctx.shadowOffsetY = offset.y;
			}
		}
	},

	draw: function(ctx, param) {
		if (!this._visible || this._opacity === 0)
			return;
		// Each time the project gets drawn, it's _updateVersion is increased.
		// Keep the _updateVersion of drawn items in sync, so we have an easy
		// way to know for which selected items we need to draw selection info.
		var updateVersion = this._updateVersion = this._project._updateVersion;
		// Keep calculating the current global matrix, by keeping a history
		// and pushing / popping as we go along.
		var trackTransforms = param.trackTransforms,
			// If transforms does not exist, set it up with the identity matrix
			transforms = param.transforms = param.transforms || [new Matrix()],
			matrix = this._matrix,
			parentMatrix = transforms[transforms.length - 1],
			globalMatrix = parentMatrix.clone().concatenate(matrix);
		// If this item is not invertible, do not draw it, since it would cause
		// empty ctx.currentPath and mess up caching. It appears to also be a
		// good idea generally to not draw in such cirucmstances, e.g. SVG
		// handles it the same way.
		if (!globalMatrix.isInvertible())
			return;
		// Only keep track of transformation if told so. See Project#draw()
		if (trackTransforms) {
			if (!transforms)
				transforms = param.transforms = [];
			transforms.push(this._globalMatrix = globalMatrix);
			// We also keep the cached _globalMatrix versioned.
			globalMatrix._updateVersion = updateVersion;
		}

		// If the item has a blendMode or is defining an opacity, draw it on
		// a temporary canvas first and composite the canvas afterwards.
		// Paths with an opacity < 1 that both define a fillColor
		// and strokeColor also need to be drawn on a temporary canvas
		// first, since otherwise their stroke is drawn half transparent
		// over their fill.
		// Exclude Raster items since they never draw a stroke and handle
		// opacity by themselves (they also don't call _setStyles)
		var blendMode = this._blendMode,
			opacity = this._opacity,
			normalBlend = blendMode === 'normal',
			nativeBlend = BlendMode.nativeModes[blendMode],
			// Determine if we can draw directly, or if we need to draw into a
			// separate canvas and then composite onto the main canvas.
			direct = normalBlend && opacity === 1
					// If native blending is possible, see if the item allows it
					|| (nativeBlend || normalBlend && opacity < 1)
						&& this._canComposite(),
			mainCtx, itemOffset, prevOffset;
		if (!direct) {
			// Apply the paren't global matrix to the calculation of correct
			// bounds.
			var bounds = this.getStrokeBounds(parentMatrix);
			if (!bounds.width || !bounds.height)
				return;
			// Store previous offset and save the main context, so we can
			// draw onto it later.
			prevOffset = param.offset;
			// Floor the offset and ceil the size, so we don't cut off any
			// antialiased pixels when drawing onto the temporary canvas.
			itemOffset = param.offset = bounds.getTopLeft().floor();
			// Set ctx to the context of the temporary canvas, so we draw onto
			// it, instead of the mainCtx.
			mainCtx = ctx;
			ctx = CanvasProvider.getContext(
					bounds.getSize().ceil().add(new Size(1, 1)),
					param.pixelRatio);
		}
		ctx.save();
		// If drawing directly, handle opacity and native blending now,
		// otherwise we will do it later when the temporary canvas is composited.
		if (direct) {
			ctx.globalAlpha = opacity;
			if (nativeBlend)
				ctx.globalCompositeOperation = blendMode;
		} else {
			// Translate the context so the topLeft of the item is at (0, 0)
			// on the temporary canvas.
			ctx.translate(-itemOffset.x, -itemOffset.y);
		}
		// Apply globalMatrix when drawing into temporary canvas.
		(direct ? matrix : globalMatrix).applyToContext(ctx);
		// If we're drawing into a separate canvas and a clipItem is defined for
		// the current rendering loop, we need to draw the clip item again.
		if (!direct && param.clipItem)
			param.clipItem.draw(ctx, param.extend({ clip: true }));
		this._draw(ctx, param);
		ctx.restore();
		if (trackTransforms)
			transforms.pop();
		if (param.clip)
			ctx.clip();
		// If a temporary canvas was created, composite it onto the main canvas:
		if (!direct) {
			// Use BlendMode.process even for processing normal blendMode with
			// opacity.
			BlendMode.process(blendMode, ctx, mainCtx, opacity,
					// Calculate the pixel offset of the temporary canvas to the
					// main canvas. We also need to factor in the pixel-ratio.
					itemOffset.subtract(prevOffset).multiply(param.pixelRatio));
			// Return the temporary context, so it can be reused
			CanvasProvider.release(ctx);
			// Restore previous offset.
			param.offset = prevOffset;
		}
	},

	_canComposite: function() {
		return false;
	}
}, Base.each(['down', 'drag', 'up', 'move'], function(name) {
	this['removeOn' + Base.capitalize(name)] = function() {
		var hash = {};
		hash[name] = true;
		return this.removeOn(hash);
	};
}, /** @lends Item# */{
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
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
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
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
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
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
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
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
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
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 *
	 * 	// Remove the path, when the mouse is released:
	 * 	path.removeOnUp();
	 * }
	 */
	// TODO: implement Item#removeOnFrame
	removeOn: function(obj) {
		for (var name in obj) {
			if (obj[name]) {
				var key = 'mouse' + name,
					project = this._project,
					sets = project._removeSets = project._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	}
}));
