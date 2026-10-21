/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
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
var Item = Base.extend(Emitter, /** @lends Item# */{
    statics: /** @lends Item */{
        /**
         * Override Item.extend() to merge the subclass' _serializeFields with
         * the parent class' _serializeFields.
         *
         * @private
         */
        extend: function extend(src) {
            if (src._serializeFields)
                src._serializeFields = Base.set({},
                    this.prototype._serializeFields, src._serializeFields);
            return extend.base.apply(this, arguments);
        },

        /**
         * Two object constants that can be passed to Item#initialize() to
         * control insertion into the scene graph in a performative way.
         *
         * @private
         */
        INSERT: { insert: true },
        NO_INSERT: { insert: false }
    },

    _class: 'Item',
    _name: null,
    // All items apply their matrix by default.
    // Exceptions are Raster, SymbolItem, Clip and Shape.
    _applyMatrix: true,
    _canApplyMatrix: true,
    _canScaleStroke: false,
    _pivot: null,
    _visible: true,
    _blendMode: 'normal',
    _opacity: 1,
    _locked: false,
    _guide: false,
    _textWrap: null,
    _clipMask: false,
    _selection: 0,
    // Controls whether bounds should appear selected when the item is selected.
    // This is only turned off for Group, Layer and PathItem, where it can be
    // selected separately by setting item.bounds.selected = true;
    _selectBounds: true,
    _selectChildren: false,
    // Provide information about fields to be serialized, with their defaults
    // that can be omitted.
    _serializeFields: {
        name: null,
        applyMatrix: null,
        matrix: new Matrix(),
        pivot: null,
        visible: true,
        blendMode: 'normal',
        opacity: 1,
        locked: false,
        guide: false,
        clipMask: false,
        textWrap: null,
        selected: false,
        data: {}
    },
    // Prioritize `applyMatrix` over `matrix`:
    _prioritize: ['applyMatrix']
},
new function() { // Injection scope for various item event handlers
    var handlers = ['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
            'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'];
    return Base.each(handlers,
        function(name) {
            // Only count the events of inserted items, so removing an item
            // from a removed parent doesn't count them down twice:
            this._events[name] = {
                install: function(type) {
                    if (this.isInserted())
                        this.getView()._countItemEvent(type, 1);
                },

                uninstall: function(type) {
                    if (this.isInserted())
                        this.getView()._countItemEvent(type, -1);
                }
            };
        }, {
            _events: {
                onFrame: {
                    install: function() {
                        this.getView()._animateItem(this, true);
                    },

                    uninstall: function() {
                        this.getView()._animateItem(this, false);
                    }
                },

                // Only for external sources, e.g. Raster
                onLoad: {},
                onError: {}
            },
            statics: {
                _itemHandlers: handlers
            }
        }
    );
}, /** @lends Item# */{
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
     * @return {Boolean} {@true if the properties were successfully be applied,
     * or if none were provided}
     */
    // The style a new item takes: the project's current style, see
    // Project#currentStyle.
    _getCurrentStyle: function(project) {
        return project._currentStyle;
    },

    _initialize: function(props, point) {
        // Define this Item's unique id. But allow the creation of internally
        // used paths with no ids.
        var hasProps = props && Base.isPlainObject(props),
            internal = hasProps && props.internal === true,
            matrix = this._matrix = new Matrix(),
            // Allow setting another project than the currently active one.
            project = hasProps && props.project || paper.project,
            settings = paper.settings;
        if (!project) {
            throw new Error('Unable to create an item without a project. '
                    + 'Call paper.setup() or create a Project first.');
        }
        this._id = internal ? null : UID.get();
        this._parent = this._index = null;
        // Inherit the applyMatrix setting from settings.applyMatrix
        this._applyMatrix = this._canApplyMatrix && settings.applyMatrix;
        // Handle matrix before everything else, to avoid issues with
        // #addChild() calling _changed() and accessing _matrix already.
        if (point)
            matrix.translate(point);
        matrix._owner = this;
        this._style = new Style(this._getCurrentStyle(project), this, project);
        // Do not add to the project if it's an internal path,  or if
        // props.insert  or settings.insertItems is false.
        if (internal || hasProps && props.insert == false
            || !settings.insertItems && !(hasProps && props.insert == true)) {
            this._setProject(project);
        } else {
            (hasProps && props.parent || project)
                    ._insertItem(undefined, this, true); // _created = true
        }
        // Filter out Item.*INSERT before _set(), for performance reasons.
        if (hasProps && props !== Item.NO_INSERT && props !== Item.INSERT) {
            this.set(props, {
                // Filter out these properties as they were handled above:
                internal: true, insert: true, project: true, parent: true
            });
        }
        return hasProps;
    },

    _serialize: function(options, dictionary) {
        var props = {},
            that = this;

        function serialize(fields) {
            for (var key in fields) {
                // value is the default value, only serialize if the current
                // value is different from it.
                var value = that[key];
                if (!Base.equals(value, fields[key])) {
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
     * @param {ChangeFlag} flags describes what exactly has changed
     */
    _changed: function(flags) {
        var symbol = this._symbol,
            cacheParent = this._parent || symbol,
            project = this._project;
        if (flags & /*#=*/ChangeFlag.GEOMETRY) {
            // Clear cached bounds, position and decomposed matrix whenever
            // geometry changes.
            this._bounds = this._position = this._decomposed = undefined;
        } else if (flags & /*#=*/ChangeFlag.STROKE) {
            // Strokes change the stroke bounds, but not the position:
            this._bounds = undefined;
        }
        if (flags & /*#=*/ChangeFlag.MATRIX) {
            this._globalMatrix = undefined;
        }
        if (cacheParent
                && (flags & /*#=*/(ChangeFlag.GEOMETRY | ChangeFlag.STROKE))) {
            // Clear cached bounds of all items that this item contributes to.
            // We call this on the parent, since the information is cached on
            // the parent, see getBounds().
            Item._clearBoundsCache(cacheParent);
        }
        if (flags & /*#=*/ChangeFlag.CHILDREN) {
            // Clear cached bounds of all items that this item contributes to.
            // Here we don't call this on the parent, since adding / removing a
            // child triggers this notification on the parent.
            Item._clearBoundsCache(this);
        }
        // Changes of a text wrap, or of what's in it, change the text it wraps:
        for (var item = this; item && !(item instanceof Layer);
                item = item._parent) {
            if (item._textWrap) {
                var layer = item.getLayer();
                if (layer)
                    layer._textWrapVersion++;
                break;
            }
        }
        // A child that its parent doesn't show is part of the parent, as a
        // text's path is: its changes are the parent's.
        var parent = this._parent,
            owner = parent && !parent.getChildren() && parent;
        if (project)
            project._changed(flags, owner ? null : this);
        if (owner)
            owner._changed(flags);
        // If this item is a symbol's definition, notify it of the change too
        if (symbol)
            symbol._changed(flags);
    },

    /**
     * Sets the properties of the passed object literal on this item to the
     * values defined in the object literal, if the item has property of the
     * given name (or a setter defined for it).
     *
     * @name Item#set
     * @function
     * @param {Object} props
     * @return {Item} the item itself
     * @chainable
     *
     * @example {@paperscript}
     * // Setting properties through an object literal
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * circle.set({
     *     strokeColor: 'red',
     *     strokeWidth: 10,
     *     fillColor: 'black',
     *     selected: true
     * });
     */

    /**
     * The unique id of the item.
     *
     * @bean
     * @type Number
     */
    getId: function() {
        return this._id;
    },

    /**
     * The class name of the item as a string.
     *
     * @name Item#className
     * @type String
     * @values 'Group', 'Layer', 'Path', 'CompoundPath', 'Shape', 'Raster',
     *     'SymbolItem', 'PointText'
     */

    /**
     * The name of the item. If the item has a name, it can be accessed by name
     * through its parent's children list.
     *
     * @bean
     * @type String
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
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

    setName: function(name) {
        // NOTE: Don't check if the name has changed and bail out if it has not,
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
        var owner = this._getOwner();
        if (name && owner)
            Base.addNamed(owner._children, owner._namedChildren, name, this);
        this._name = name || undefined;
        this._changed(/*#=*/ChangeFlag.ATTRIBUTE);
    },

    /**
     * The path style of the item.
     *
     * Styles set on a {@link Group} or {@link Layer} are applied to the
     * children that it contains at that moment. Items added to it later do not
     * receive them.
     *
     * @bean
     * @name Item#getStyle
     * @type Style
     *
     * @example {@paperscript}
     * // Applying several styles to an item in one go, by passing an object
     * // to its style property:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30
     * });
     * circle.style = {
     *     fillColor: 'blue',
     *     strokeColor: 'red',
     *     strokeWidth: 5
     * };
     *
     * @example {@paperscript split=true height=100}
     * // Copying the style of another item:
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * var path2 = new Path.Circle({
     *     center: new Point(180, 50),
     *     radius: 20
     * });
     *
     * // Copy the path style of path:
     * path2.style = path.style;
     *
     * @example {@paperscript}
     * // Applying the same style object to multiple items:
     * var myStyle = {
     *     fillColor: 'red',
     *     strokeColor: 'blue',
     *     strokeWidth: 4
     * };
     *
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 30
     * });
     * path.style = myStyle;
     *
     * var path2 = new Path.Circle({
     *     center: new Point(150, 50),
     *     radius: 20
     * });
     * path2.style = myStyle;
     */
    getStyle: function() {
        return this._style;
    },

    setStyle: function(style) {
        // Don't access _style directly so Path#getStyle() can be overridden for
        // CompoundPaths.
        this.getStyle().set(style);
    },

    // The styles that the item's style stands for, merged when read and set on
    // all when written, see Style.merge() and Style.apply().
    // @overridable
    _getStyles: function(/* style, key, setting */) {
        // None for plain items: their style is their own.
    }
}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
    // Produce getter/setters for properties. We need setters because we want to
    // call _changed() if a property was modified.
    function(name) {
        var part = Base.capitalize(name),
            key = '_' + name,
            flags = {
                // #locked does not change appearance, all others do:
                locked: /*#=*/ChangeFlag.ATTRIBUTE,
                // #visible changes appearance
                visible: /*#=*/(Change.ATTRIBUTE | Change.GEOMETRY)
            };
        this['get' + part] = function() {
            return this[key];
        };
        this['set' + part] = function(value) {
            if (value != this[key]) {
                this[key] = value;
                this._changed(flags[name] || /*#=*/Change.ATTRIBUTE);
            }
        };
    },
{}), /** @lends Item# */{
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See #getPosition() below.
    beans: true,

    // NOTE: These properties have their getter / setters produced in the
    // injection scope above.

    /**
     * Specifies whether the item is locked. When set to `true`, item
     * interactions with the mouse are disabled.
     *
     * @name Item#locked
     * @type Boolean
     * @default false
     *
     * @example {@paperscript}
     * var unlockedItem = new Path.Circle({
     *     center: view.center - [35, 0],
     *     radius: 30,
     *     fillColor: 'springgreen',
     *     onMouseDown: function() {
     *         this.fillColor = Color.random();
     *     }
     * });
     *
     * var lockedItem = new Path.Circle({
     *     center: view.center + [35, 0],
     *     radius: 30,
     *     fillColor: 'crimson',
     *     locked: true,
     *     // This event won't be triggered because the item is locked.
     *     onMouseDown: function() {
     *         this.fillColor = Color.random();
     *     }
     * });
     *
     * new PointText({
     *     content: 'Click on both circles to see which one is locked.',
     *     point: view.center - [0, 35],
     *     justification: 'center'
     * });
     */

    /**
     * Specifies whether the item is visible. When set to `false`, the item
     * won't be drawn.
     *
     * @name Item#visible
     * @type Boolean
     * @default true
     *
     * @example {@paperscript}
     * // Hiding an item:
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 20,
     *     fillColor: 'red'
     * });
     *
     * // Hide the path:
     * path.visible = false;
     */

    /**
     * The blend mode with which the item is composited onto the canvas. Both
     * the standard canvas compositing modes, as well as the new CSS blend modes
     * are supported. Where the canvas doesn't support a CSS blend mode
     * natively, it draws as `'normal'`. Paper.js's own modes `'add'`,
     * `'subtract'`, `'average'`, `'pin-light'` and `'negation'` are emulated,
     * which can have an impact on performance.
     *
     * @name Item#blendMode
     * @type String
     * @values 'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-
     *     light', 'color-dodge', 'color-burn', 'darken', 'lighten',
     *     'difference', 'exclusion', 'hue', 'saturation', 'luminosity',
     *     'color', 'add', 'subtract', 'average', 'pin-light', 'negation',
     *     'source-over', 'source-in', 'source-out', 'source-atop',
     *     'destination-over', 'destination-in', 'destination-out',
     *     'destination-atop', 'lighter', 'darker', 'copy', 'xor'
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
     *     center: [80, 50],
     *     radius: 35,
     *     fillColor: 'red'
     * });
     *
     * var circle2 = new Path.Circle({
     *     center: new Point(120, 50),
     *     radius: 35,
     *     fillColor: 'blue'
     * });
     *
     * // Set the blend mode of circle2:
     * circle2.blendMode = 'multiply';
     */

    /**
     * The opacity of the item as a value between `0` and `1`.
     *
     * @name Item#opacity
     * @type Number
     * @default 1
     *
     * @example {@paperscript}
     * // Making an item 50% transparent:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35,
     *     fillColor: 'red'
     * });
     *
     * var circle2 = new Path.Circle({
     *     center: new Point(120, 50),
     *     radius: 35,
     *     fillColor: 'blue',
     *     strokeColor: 'green',
     *     strokeWidth: 10
     * });
     *
     * // Make circle2 50% transparent:
     * circle2.opacity = 0.5;
     */

    // TODO: Implement guides
    /**
     * Specifies whether the item functions as a guide. When set to `true`, the
     * item is drawn as usual, but left out of hit-tests and mouse
     * interactions. Hit-tests only find guides when `options.guides` is set,
     * and then only them, see {@link #hitTest(point[, options])}.
     *
     * @name Item#guide
     * @type Boolean
     * @default false
     */

    /**
     * Specifies whether, and how, the item pushes aside the text of the
     * {@link AreaText} items below it in its layer: `null`, or an object with
     * `offset`, the space kept between them, and `invert`, to let the text
     * flow inside it instead. `true` sets the defaults.
     *
     * @bean
     * @type Object
     * @default null
     *
     * @example
     * var circle = new Path.Circle({ center: [100, 100], radius: 40 });
     * circle.textWrap = { offset: 10 };
     */
    getTextWrap: function() {
        var wrap = this._textWrap;
        return wrap && Base.set({}, wrap);
    },

    setTextWrap: function(wrap) {
        if (wrap || this._textWrap) {
            this._textWrap = wrap
                    ? Base.set({ offset: 6, invert: false },
                        Base.isPlainObject(wrap) ? wrap : null)
                    : null;
            this._updateTextWrap();
            this._changed(/*#=*/Change.ATTRIBUTE);
        }
    },

    // Keep the layer's text wraps in sync, and have its area texts lay out
    // again, see AreaText#_getTextWraps():
    _updateTextWrap: function(remove) {
        var layer = this.getLayer();
        if (layer) {
            var items = layer._textWrapItems || (layer._textWrapItems = {});
            if (this._textWrap && !remove) {
                items[this._id] = this;
            } else {
                delete items[this._id];
            }
            layer._textWrapVersion++;
        }
    },

    getSelection: function() {
        return this._selection;
    },

    setSelection: function(selection) {
        if (selection !== this._selection) {
            this._selection = selection;
            var project = this._project;
            if (project) {
                project._updateSelection(this);
                this._changed(/*#=*/Change.ATTRIBUTE);
            }
        }
    },

    _changeSelection: function(flag, selected) {
        var selection = this._selection;
        this.setSelection(selected ? selection | flag : selection & ~flag);
    },

    /**
     * Specifies whether the item is selected. This will also return `true` for
     * {@link Group} items if they are partially selected, e.g. groups
     * containing selected or partially selected paths.
     *
     * Paper.js draws the visual outlines of selected items on top of your
     * project. This can be useful for debugging, as it allows you to see the
     * construction of paths, position of path curves, individual segment points
     * and bounding boxes of symbol and raster items.
     *
     * @bean
     * @type Boolean
     * @default false
     * @see Project#selectedItems
     * @see Segment#selected
     * @see Curve#selected
     * @see Point#selected
     *
     * @example {@paperscript}
     * // Selecting an item:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * path.selected = true; // Select the path
     */
    isSelected: function() {
        if (this._selectChildren) {
            var children = this._children;
            for (var i = 0, l = children.length; i < l; i++)
                if (children[i].isSelected())
                    return true;
        }
        return !!(this._selection & /*#=*/ItemSelection.ITEM);
    },

    setSelected: function(selected) {
        if (this._selectChildren) {
            var children = this._children;
            for (var i = 0, l = children.length; i < l; i++)
                children[i].setSelected(selected);
        }
        this._changeSelection(/*#=*/ItemSelection.ITEM, selected);
    },

    /**
     * Specifies whether the item and all its descendants are selected. Setting
     * it selects or deselects them all.
     *
     * @bean
     * @type Boolean
     */
    isFullySelected: function() {
        var children = this._children,
            selected = !!(this._selection & /*#=*/ItemSelection.ITEM);
        if (children && selected) {
            for (var i = 0, l = children.length; i < l; i++)
                if (!children[i].isFullySelected())
                    return false;
            return true;
        }
        // If there are no children, this is the same as #selected
        return selected;
    },

    setFullySelected: function(selected) {
        var children = this._children;
        if (children) {
            for (var i = 0, l = children.length; i < l; i++)
                children[i].setFullySelected(selected);
        }
        this._changeSelection(/*#=*/ItemSelection.ITEM, selected);
    },

    /**
     * Specifies whether the item defines a clip mask. This can only be set on
     * paths and compound paths, and only if the item is already contained
     * within a clipping group.
     *
     * @bean
     * @type Boolean
     * @default false
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
            this._changed(/*#=*/Change.ATTRIBUTE);
            // Tell the parent the clipping mask has changed
            if (this._parent)
                this._parent._changed(/*#=*/ChangeFlag.CLIPPING);
        }
    },

    // TODO: get/setIsolated (print specific feature)
    // TODO: get/setKnockout (print specific feature)
    // TODO: get/setAlphaIsShape

    /**
     * A plain javascript object which can be used to store
     * arbitrary data on the item.
     *
     * @bean
     * @type Object
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
     *     home: 'Omicron Theta',
     *     found: 2338,
     *     pets: ['Spot']
     * };
     * console.log(path.data.pets.length); // 1
     *
     * @example
     * var path = new Path({
     *     data: {
     *         home: 'Omicron Theta',
     *         found: 2338,
     *         pets: ['Spot']
     *     }
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
     * @bean
     * @type Point
     *
     * @example {@paperscript}
     * // Changing the position of a path:
     *
     * // Create a circle at position { x: 10, y: 10 }
     * var circle = new Path.Circle({
     *     center: new Point(10, 10),
     *     radius: 10,
     *     fillColor: 'red'
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
     *     center: new Point(20, 20),
     *     radius: 10,
     *     fillColor: 'red'
     * });
     *
     * // Move the circle 100 points to the right
     * circle.position.x += 100;
     */
    getPosition: function(_dontLink) {
        // Cache position value.
        // Pass true for _dontLink in getCenter(), so receive back a normal point
        var ctor = _dontLink ? Point : LinkedPoint;
        // Do not cache LinkedPoints directly, since we would not be able to
        // use them to calculate the difference in #setPosition, as when it is
        // modified, it would hold new values already and only then cause the
        // calling of #setPosition.
        var position = this._position ||
            (this._position = this._getPositionFromBounds());
        return new ctor(position.x, position.y, this, 'setPosition');
    },

    setPosition: function(/* point */) {
        // Calculate the distance to the current position, by which to
        // translate the item. Pass true for _dontLink, as we do not need a
        // LinkedPoint to simply calculate this distance.
        this.translate(Point.read(arguments).subtract(this.getPosition(true)));
    },

    /**
     * Internal method used to calculate position either from pivot point or
     * bounds.
     * @param {Rectangle} bounds if provided, these bounds are used instead of
     *     calling getBounds()
     * @return {Point} the transformed pivot point or the center of the bounds
     * @private
     */
    _getPositionFromBounds: function(bounds) {
        // If an pivot point is provided, use it to determine position
        // based on the matrix. Otherwise use the center of the bounds.
        return this._pivot
                ? this._matrix._transformPoint(this._pivot)
                : (bounds || this.getBounds()).getCenter(true);
    },

    /**
     * The item's pivot point specified in the item coordinate system, defining
     * the point around which all transformations are hinging. This is also the
     * reference point for {@link #position}. By default, it is set to `null`,
     * meaning the {@link Rectangle#center} of the item's {@link #bounds}
     * rectangle is used as pivot.
     *
     * @bean
     * @type Point
     * @default null
     */
    getPivot: function() {
        var pivot = this._pivot;
        return pivot
                ? new LinkedPoint(pivot.x, pivot.y, this, 'setPivot')
                : null;
    },

    setPivot: function(/* point */) {
        // Clone existing points since we're caching internally.
        this._pivot = Point.read(arguments, 0, { clone: true, readNull: true });
        // No need for _changed() since the only thing this affects is _position
        this._position = undefined;
    }
}, Base.each({ // Produce getters for bounds properties:
        getHandleBounds: { handle: true },
        getInternalBounds: { internal: true }
    },
    function(options, key) {
        this[key] = function(matrix) {
            return this.getBounds(matrix, options);
        };
    },
/** @lends Item# */{
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See _matrix parameter above.
    beans: true,

    getBounds: function(matrix, options) {
        var hasMatrix = options || matrix instanceof Matrix,
            opts = Base.set({}, hasMatrix ? options : matrix,
                    this._boundsOptions);
        // We can only cache the bounds if the path uses stroke-scaling, or if
        // no stroke is involved in the calculation of the bounds.
        // When strokeScaling is false, the bounds are affected by the zoom
        // level of the view, hence we can't cache.
        // TODO: Look more into handling of stroke-scaling, e.g. on groups with
        // some children that have strokeScaling, as well as SymbolItem with
        // SymbolDefinition that have strokeScaling!
        // TODO: Once that is resolved, we should be able to turn off
        // opts.stroke if a resolved item definition does not have a stroke,
        // allowing the code to share caches between #strokeBounds and #bounds.
        if (!opts.stroke || this.getStrokeScaling())
            opts.cacheItem = this;
        // If we're caching bounds, pass on this item as cacheItem, so
        // the children can setup _boundsCache structures for it.
        var rect = this._getCachedBounds(hasMatrix && matrix, opts).rect;
        // If we're returning '#bounds', create a LinkedRectangle that uses
        // the setBounds() setter to update the Item whenever the bounds are
        // changed:
        return !arguments.length
                ? new LinkedRectangle(rect.x, rect.y, rect.width, rect.height,
                    this, 'setBounds')
                : rect;
    },

    getStrokeBounds: function(matrix) {
        var rect = this.getBounds(matrix, { stroke: true });
        // Link '#strokeBounds' to setStrokeBounds() as '#bounds' is linked to
        // setBounds() above:
        return !arguments.length
                ? new LinkedRectangle(rect.x, rect.y, rect.width, rect.height,
                    this, 'setStrokeBounds')
                : rect;
    },

    setBounds: function(/* rect */) {
        var rect = Rectangle.read(arguments),
            bounds = this.getBounds(),
            _matrix = this._matrix,
            matrix = new Matrix(),
            center = rect.getCenter();
        // Read this from bottom to top:
        // Translate to new center:
        matrix.translate(center);
        // Scale to new Size, if size changes. A zero dimension can't be
        // scaled, so keep its scaling at 1 to keep the matrix invertible:
        if (rect.width != bounds.width || rect.height != bounds.height) {
            // If a previous transformation resulted in a non-invertible matrix,
            // Restore to the last revertible matrix stored in _backup, and get
            // the bounds again. That way, we can prevent collapsing to 0-size.
            if (!_matrix.isInvertible()) {
                _matrix.set(_matrix._backup
                        || new Matrix().translate(_matrix.getTranslation()));
                bounds = this.getBounds();
            }
            matrix.scale(
                    bounds.width !== 0 ? rect.width / bounds.width : 1,
                    bounds.height !== 0 ? rect.height / bounds.height : 1);
        }
        // Translate to bounds center:
        center = bounds.getCenter();
        matrix.translate(-center.x, -center.y);
        // Now execute the transformation
        this.transform(matrix);
    },

    setStrokeBounds: function(/* rect */) {
        var rect = Rectangle.read(arguments),
            item = this,
            bounds = this.getBounds(),
            center = bounds.getCenter(),
            // Negative sizes mirror the item, as in setBounds():
            signX = rect.width < 0 ? -1 : 1,
            signY = rect.height < 0 ? -1 : 1,
            width = Math.abs(rect.width),
            height = Math.abs(rect.height),
            // Dimensions without size can't be scaled:
            canScaleX = !!bounds.width,
            canScaleY = !!bounds.height,
            // The smallest scale that keeps the matrix invertible, for
            // rectangles smaller than the stroke itself:
            min = /*#=*/Numerical.EPSILON,
            epsilon = /*#=*/Numerical.GEOMETRIC_EPSILON,
            sx = 1,
            sy = 1;

        function getMatrix(sx, sy) {
            return new Matrix().scale(signX * sx, signY * sy, center);
        }

        // Returns the stroke bounds that the item would have when scaled by sx
        // and sy, without transforming it. The strokes of items that apply the
        // scaling to their content keep their width, see #_getStrokeMatrix():
        function getStrokeBounds(sx, sy) {
            var matrix = getMatrix(sx, sy);
            return item.getBounds(matrix.appended(item._matrix), {
                stroke: true,
                transform: { matrix: matrix, item: item }
            });
        }

        // Under non-uniform scaling, the extent of the stroke changes with the
        // angles of miters, bevels and square caps, so solve for the scales
        // with Newton's method, estimating the derivatives from small changes:
        for (var i = 0; i < 16; i++) {
            var size = getStrokeBounds(sx, sy).getSize(),
                fx = canScaleX ? size.width - width : 0,
                fy = canScaleY ? size.height - height : 0;
            if (Math.abs(fx) < epsilon && Math.abs(fy) < epsilon)
                break;
            // Small changes, but large enough to be measured at tiny scales:
            var hx = Math.max(sx, 1) * 1e-6,
                hy = Math.max(sy, 1) * 1e-6,
                sizeX = getStrokeBounds(sx + hx, sy).getSize(),
                sizeY = getStrokeBounds(sx, sy + hy).getSize(),
                a = canScaleX ? (sizeX.width - size.width) / hx : 1,
                b = canScaleX && canScaleY
                        ? (sizeY.width - size.width) / hy : 0,
                c = canScaleX && canScaleY
                        ? (sizeX.height - size.height) / hx : 0,
                d = canScaleY ? (sizeY.height - size.height) / hy : 1,
                det = a * d - b * c;
            if (!det)
                break;
            var nx = Math.max(sx - (fx * d - fy * b) / det, min),
                ny = Math.max(sy - (fy * a - fx * c) / det, min);
            // Stop where rectangles smaller than the stroke keep the scales at
            // their minimum:
            if (nx === sx && ny === sy)
                break;
            sx = nx;
            sy = ny;
        }
        // Scale the item, and move the center of its stroke bounds to the
        // rectangle's center, which centers what can't be reached:
        this.transform(new Matrix().translate(rect.getCenter()
                .subtract(getStrokeBounds(sx, sy).getCenter()))
                .append(getMatrix(sx, sy)));
    },

    /**
     * Protected method used in all the bounds getters. It loops through all the
     * children, gets their bounds and finds the bounds around all of them.
     * Subclasses override it to define calculations for the various required
     * bounding types.
     */
    _getBounds: function(matrix, options) {
        // NOTE: We cannot cache these results here, since we do not get
        // _changed() notifications here for changing geometry in children.
        // But cacheName is used in sub-classes such as SymbolItem and Raster.
        var children = this._children;
        // TODO: What to return if nothing is defined, e.g. empty Groups?
        // Scriptographer behaves weirdly then too.
        if (!children || !children.length)
            return new Rectangle();
        // Call _updateBoundsCache() even when the group only holds empty /
        // invisible items), so future changes in these items will cause right
        // handling of _boundsCache.
        Item._updateBoundsCache(this, options.cacheItem);
        return Item._getBounds(children, matrix, options);
    },

    _getBoundsCacheKey: function(options, internal) {
        return [
            options.stroke ? 1 : 0,
            options.handle ? 1 : 0,
            internal ? 1 : 0
        ].join('');
    },

    /**
     * Private method that deals with the calling of _getBounds, recursive
     * matrix concatenation and handles all the complicated caching mechanisms.
     */
    _getCachedBounds: function(matrix, options, noInternal) {
        // See if we can cache these bounds. We only cache the bounds
        // transformed with the internally stored _matrix, (the default if no
        // matrix is passed).
        // Do not transform by the internal matrix for internal, untransformed
        // bounds.
        var internal = options.internal && !noInternal,
            cacheItem = options.cacheItem,
            _matrix = internal ? null : this._matrix._orNullIfIdentity();
        // A passed identity matrix still replaces the internal matrix:
        matrix = matrix ? matrix._orNullIfIdentity() : _matrix;
        // Create a key for caching, reflecting all bounds options.
        var cacheKey = cacheItem && (matrix ? matrix.equals(_matrix) : !_matrix)
                && this._getBoundsCacheKey(options, internal),
            // Only items whose bounds come from other items need to pass the
            // cacheItem chain on, so that clearing caches propagates up:
            isIntermediate = cacheKey && cacheItem !== this
                    && (this._children || this._definition),
            bounds = this._bounds;
        // NOTE: This needs to happen before returning cached values, since even
        // then, _boundsCache needs to be kept up-to-date.
        Item._updateBoundsCache(this._parent || this._symbol, cacheItem);
        if (isIntermediate)
            Item._updateBoundsCache(this, cacheItem);
        if (cacheKey && bounds && cacheKey in bounds) {
            var cached = bounds[cacheKey];
            return {
                rect: cached.rect.clone(),
                nonscaling: cached.nonscaling
            };
        }
        var res = this._getBounds(matrix, isIntermediate
                ? Base.set({}, options, { cacheItem: this })
                : options),
            // Support two versions of _getBounds(): One that directly returns a
            // Rectangle, and one that returns a bounds object with nonscaling.
            rect = res.rect || res,
            style = this._style,
            nonscaling = res.nonscaling || style.hasStroke()
                && !style.getStrokeScaling();
        // If we can cache the result, update the _bounds cache structure
        // before returning
        if (cacheKey) {
            if (!bounds) {
                this._bounds = bounds = {};
            }
            var cached = bounds[cacheKey] = {
                rect: rect.clone(),
                nonscaling: nonscaling,
                stroke: options.stroke,
                // Mark as internal, so Item#transform() won't transform it
                internal: internal
            };
        }
        return {
            rect: rect,
            nonscaling: nonscaling
        };
    },

    /**
     * Returns to correct matrix to use to transform stroke related geometries
     * when calculating bounds: the item's matrix if {@link #strokeScaling} is
     * `true`, otherwise the parent's inverted view matrix. The returned matrix
     * is always shiftless, meaning its translation vector is reset to zero.
     */
    _getStrokeMatrix: function(matrix, options) {
        var parent = this.getStrokeScaling() ? null
                : options && options.internal ? this
                    : this._parent || this._symbol && this._symbol._item,
            mx = parent ? parent.getViewMatrix().invert() : matrix,
            transform = !parent && options && options.transform;
        // When predicting the bounds after a transformation, see
        // #setStrokeBounds(), it doesn't scale the strokes of items that apply
        // it to their content, all the way up to the transformed item:
        if (transform) {
            for (var item = this; item && item._applyMatrix;
                    item = item._parent) {
                if (item === transform.item) {
                    mx = transform.matrix.inverted().appended(mx);
                    break;
                }
            }
        }
        return mx && mx._shiftless();
    },

    statics: /** @lends Item */{
        /**
         * Set up a boundsCache structure that keeps track of items that keep
         * cached bounds that depend on this item. We store this in the parent,
         * for multiple reasons:
         * The parent receives CHILDREN change notifications for when its
         * children are added or removed and can thus clear the cache, and we
         * save a lot of memory, e.g. when grouping 100 items and asking the
         * group for its bounds. If stored on the children, we would have 100
         * times the same structure.
         */
        _updateBoundsCache: function(parent, item) {
            if (parent && item) {
                // Set-up the parent's boundsCache structure if it does not
                // exist yet and add the item to it.
                var id = item._id,
                    ref = parent._boundsCache = parent._boundsCache || {
                        // Use a hash-table for ids and an array for the list,
                        // so we can keep track of items that were added already
                        ids: {},
                        list: []
                    };
                if (!ref.ids[id]) {
                    ref.list.push(item);
                    ref.ids[id] = item;
                }
            }
        },

        /**
         * Clears cached bounds of all items that the children of this item are
         * contributing to. See _updateBoundsCache() for an explanation why this
         * information is stored on parents, not the children themselves.
         */
        _clearBoundsCache: function(item) {
            // This is defined as a static method so Symbol can used it too.
            // Clear the position as well, since it's depending on bounds.
            var cache = item._boundsCache;
            if (cache) {
                // Erase cache before looping, to prevent circular recursion.
                item._bounds = item._position = item._boundsCache = undefined;
                for (var i = 0, list = cache.list, l = list.length; i < l; i++){
                    var other = list[i];
                    if (other !== item) {
                        other._bounds = other._position = undefined;
                        // We need to recursively call _clearBoundsCache, as
                        // when the cache for the other item's children is not
                        // valid anymore, that propagates up the scene graph.
                        if (other._boundsCache)
                            Item._clearBoundsCache(other);
                    }
                }
            }
        },

        /**
         * Returns the bounds of the given items in project coordinates, as if
         * they were grouped, without moving them, e.g. the bounds of the
         * selection: `Item.getBounds(project.selectedItems)`. As in groups,
         * items that aren't visible or are empty are left out.
         *
         * @option [options.stroke=false] {Boolean} include the stroke widths,
         *     as {@link Item#strokeBounds} does
         * @option [options.handle=false] {Boolean} include the handles, as
         *     {@link Item#handleBounds} does
         *
         * @param {Item[]} items the items to get the bounds of
         * @param {Object} [options] the kind of bounds
         * @return {Rectangle} the bounds of the items, empty if there are none
         */
        getBounds: function(items, options) {
            return Item._getBounds(items, null, options, true).rect;
        },

        /**
         * Gets the combined bounds of all specified items, transformed by the
         * matrix, or in project coordinates if global is set.
         */
        _getBounds: function(items, matrix, options, global) {
            var x1 = Infinity,
                x2 = -x1,
                y1 = x1,
                y2 = x2,
                nonscaling = false;
            // NOTE: As soon as one child-item has non-scaling strokes, the full
            // bounds need to be considered non-scaling for caching purposes.
            options = options || {};
            for (var i = 0, l = items.length; i < l; i++) {
                var item = items[i];
                // Item is handled if it is visible and not recursively empty.
                // This avoid errors with nested empty groups (#1467).
                if (item._visible && !item.isEmpty(true)) {
                    // Pass true for noInternal, since even when getting
                    // internal bounds for this item, we need to apply the
                    // matrices to its children.
                    var bounds = item._getCachedBounds(global
                            ? item.getGlobalMatrix(true)
                            : matrix && matrix.appended(item._matrix),
                            options, true),
                        rect = bounds.rect;
                    x1 = Math.min(rect.x, x1);
                    y1 = Math.min(rect.y, y1);
                    x2 = Math.max(rect.x + rect.width, x2);
                    y2 = Math.max(rect.y + rect.height, y2);
                    if (bounds.nonscaling)
                        nonscaling = true;
                }
            }
            return {
                rect: isFinite(x1)
                    ? new Rectangle(x1, y1, x2 - x1, y2 - y1)
                    : new Rectangle(),
                nonscaling: nonscaling
            };
        }
    }

    /**
     * The bounding rectangle of the item excluding stroke width.
     *
     * @name Item#bounds
     * @type Rectangle
     */

    /**
     * The bounding rectangle of the item including stroke width.
     *
     * Setting it fits the item's {@link #bounds} into the given rectangle minus
     * the extent of the stroke on each side, also where this extent changes
     * with the item's proportions, as with miters. A rectangle smaller than the
     * stroke itself shrinks the bounds to its center.
     *
     * @name Item#strokeBounds
     * @type Rectangle
     */

    /**
     * The bounding rectangle of the item including handles.
     *
     * @name Item#handleBounds
     * @type Rectangle
     */

    /**
     * The bounding rectangle of the item without any matrix transformations.
     *
     * Typical use case would be drawing a frame around the object where you
     * want to draw something of the same size, position, rotation, and scaling,
     * like a selection frame.
     *
     * @name Item#internalBounds
     * @type Rectangle
     */
}), /** @lends Item# */{
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See #getGlobalMatrix() below.
    beans: true,

    _decompose: function() {
        // Only decompose if the item isn't directly baking transformations into
        // its content.
        return this._applyMatrix
            ? null
            : this._decomposed || (this._decomposed = this._matrix.decompose());
    },

    /**
     * The current rotation angle of the item, as described by its
     * {@link #matrix}.
     * Please note that this only returns meaningful values for items with
     * {@link #applyMatrix} set to `false`, meaning they do not directly bake
     * transformations into their content.
     *
     * @bean
     * @type Number
     */
    getRotation: function() {
        var decomposed = this._decompose();
        // Return 0 if matrix wasn't decomposed, e.g. on items with #applyMatrix
        return decomposed ? decomposed.rotation : 0;
    },

    setRotation: function(rotation) {
        var current = this.getRotation();
        if (current != null && rotation != null) {
            // Preserve the cached _decomposed values over rotation, and only
            // update the rotation property on it.
            var decomposed = this._decomposed;
            this.rotate(rotation - current);
            if (decomposed) {
                decomposed.rotation = rotation;
                this._decomposed = decomposed;
            }
        }
    },

    /**
     * The current scale factor of the item, as described by its
     * {@link #matrix}.
     * Please note that this only returns meaningful values for items with
     * {@link #applyMatrix} set to `false`, meaning they do not directly bake
     * transformations into their content.
     *
     * @bean
     * @type Point
     */
    getScaling: function() {
        var decomposed = this._decompose(),
            s = decomposed && decomposed.scaling;
        // Return [1, 1] if matrix wasn't decomposed, e.g. with #applyMatrix.
        return new LinkedPoint(s ? s.x : 1, s ? s.y : 1, this, 'setScaling');
    },

    setScaling: function(/* scaling */) {
        var current = this.getScaling(),
            // Clone existing points since we're caching internally.
            scaling = Point.read(arguments, 0, { clone: true, readNull: true });
        if (current && scaling && !current.equals(scaling)) {
            // See #setRotation() for preservation of _decomposed.
            var rotation = this.getRotation(),
                decomposed = this._decomposed,
                matrix = new Matrix(),
                isZero = Numerical.isZero;
            // Create a matrix in which the scaling is applied in the non-
            // rotated state, so it is always applied before the rotation.
            // TODO: What about skewing? Do we need separately stored values for
            // these properties, and apply them separately from the matrix?
            if (isZero(current.x) || isZero(current.y)) {
                // If current scaling is destructive (at least one axis is 0),
                // create a new matrix that applies the desired rotation,
                // translation and scaling, without also preserving skewing.
                matrix.translate(decomposed.translation);
                if (rotation) {
                    matrix.rotate(rotation);
                }
                matrix.scale(scaling.x, scaling.y);
                this._matrix.set(matrix);
            } else {
                var center = this.getPosition(true);
                matrix.translate(center);
                if (rotation)
                    matrix.rotate(rotation);
                matrix.scale(scaling.x / current.x, scaling.y / current.y);
                if (rotation)
                    matrix.rotate(-rotation);
                matrix.translate(center.negate());
                this.transform(matrix);
            }
            if (decomposed) {
                decomposed.scaling = scaling;
                this._decomposed = decomposed;
            }
        }
    },

    /**
     * The item's transformation matrix, defining position and dimensions in
     * relation to its parent item in which it is contained.
     *
     * @bean
     * @type Matrix
     */
    getMatrix: function() {
        return this._matrix;
    },

    setMatrix: function() {
        // Use Matrix#initialize to easily copy over values.
        // NOTE: calling initialize() also calls #_changed() for us, through its
        // call to #set() / #reset(), and this also handles _applyMatrix for us.
        var matrix = this._matrix;
        matrix.set.apply(matrix, arguments);
    },

    /**
     * The item's global transformation matrix in relation to the global project
     * coordinate space. Note that the view's transformations resulting from
     * zooming and panning are not factored in.
     *
     * @bean
     * @type Matrix
     */
    getGlobalMatrix: function(_dontClone) {
        var parent = this._parent,
            parentMatrix = parent && parent.getGlobalMatrix(true),
            matrix = this._globalMatrix;
        // The cached matrix is only valid if it was built from the parent's
        // current global matrix, which is replaced whenever it changes.
        if (!matrix || this._parentGlobalMatrix !== parentMatrix) {
            matrix = this._globalMatrix = this._matrix.clone();
            if (parentMatrix)
                matrix.prepend(parentMatrix);
            this._parentGlobalMatrix = parentMatrix;
        }
        return _dontClone ? matrix : matrix.clone();
    },

    /**
     * The item's global matrix in relation to the view coordinate space. This
     * means that the view's transformations resulting from zooming and panning
     * are factored in.
     *
     * @bean
     * @type Matrix
     */
    getViewMatrix: function() {
        return this.getGlobalMatrix().prepend(this.getView()._matrix);
    },

    /**
     * Controls whether the transformations applied to the item (e.g. through
     * {@link #transform(matrix)}, {@link #rotate(angle)},
     * {@link #scale(scale)}, etc.) are stored in its {@link #matrix} property,
     * or whether they are directly applied to its contents or children (passed
     * on to the segments in {@link Path} items, the children of {@link Group}
     * items, etc.).
     *
     * @bean
     * @type Boolean
     * @default true
     */
    getApplyMatrix: function() {
        return this._applyMatrix;
    },

    setApplyMatrix: function(apply) {
        // Tell #transform() to apply the internal matrix if _applyMatrix
        // can be set to true.
        if (this._applyMatrix = this._canApplyMatrix && !!apply)
            this.transform(null, true);
    },

    /**
     * @bean
     * @type Boolean
     * @deprecated use {@link #applyMatrix} instead.
     */
    getTransformContent: '#getApplyMatrix',
    setTransformContent: '#setApplyMatrix',
}, /** @lends Item# */{
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
            this._project = project;
            var children = this._children;
            for (var i = 0, l = children && children.length; i < l; i++)
                children[i]._setProject(project);
        }
        // NOTE: _installEvents handles all children too!
        if (installEvents)
            this._installEvents(true);
    },

    /**
     * The view that this item belongs to.
     * @type View
     * @bean
     */
    getView: function() {
        return this._project._view;
    },

    /**
     * The scope that this item belongs to, through its project.
     * @type PaperScope
     * @bean
     */
    getScope: function() {
        return this._project._scope;
    },

    /**
     * Overrides Emitter#_installEvents to also call _installEvents on all
     * children.
     */
    _installEvents: function _installEvents(install) {
        _installEvents.base.call(this, install);
        // Keep the project's selection and the layer's text wraps in sync with
        // insertion and removal:
        if (this._selection)
            this._project._updateSelection(this, !install);
        if (this._textWrap)
            this._updateTextWrap(!install);
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
     * path.parent = group;
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
     *     parent: group
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
     * Private helper to return the owner, either the parent, or the project
     * for top-level layers. See Layer#_getOwner()
     */
    _getOwner: '#getParent',

    /**
     * The children items contained within this item. Items that define a
     * {@link #name} can also be accessed by name.
     *
     * Only {@link Group}, {@link Layer} and {@link CompoundPath} items can have
     * children. On all other items, such as {@link Path}, {@link Shape},
     * {@link Raster}, {@link SymbolItem} and {@link PointText}, `children` is
     * `undefined`.
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
     *     center: [80, 50],
     *     radius: 35
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
     *     center: [80, 50],
     *     radius: 35
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
     *     center: [80, 50],
     *     radius: 35
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
     * accessing `item.children[0]`.
     *
     * @type Item
     * @bean
     */
    getFirstChild: function() {
        return this._children && this._children[0] || null;
    },

    /**
     * The last item contained within this item.This is a shortcut for
     * accessing `item.children[item.children.length - 1]`.
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
        var owner = this._getOwner();
        return owner && owner._children[this._index + 1] || null;
    },

    /**
     * The previous item on the same level as this item.
     *
     * @type Item
     * @bean
     */
    getPreviousSibling: function() {
        var owner = this._getOwner();
        return owner && owner._children[this._index - 1] || null;
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

    setIndex: function(index) {
        var parent = this._parent,
            children = parent && parent._children;
        if (children) {
            parent.insertChildren(index in children ? index : undefined,
                                  [this]);
        }
    },

    equals: function(item) {
        // NOTE: We do not compare name and selected state.
        // TODO: Consider not comparing locked and visible also?
        return item === this || item && this._class === item._class
                && this._style.equals(item._style)
                && this._matrix.equals(item._matrix)
                && this._locked === item._locked
                && this._visible === item._visible
                && this._blendMode === item._blendMode
                && this._opacity === item._opacity
                && this._clipMask === item._clipMask
                && this._guide === item._guide
                && Base.equals(this._textWrap, item._textWrap)
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
     * @option [insert=true] specifies whether the copy should be
     *     inserted into the scene graph. When set to `true`, it is inserted
     *     above the original
     * @option [deep=true] specifies whether the item's children should also be
     *     cloned
     *
     * @param {Object} [options={ insert: true, deep: true }]
     *
     * @return {Item} the newly cloned item
     * @chainable
     *
     * @example {@paperscript}
     * // Cloning items:
     * var circle = new Path.Circle({
     *     center: [50, 50],
     *     radius: 10,
     *     fillColor: 'red'
     * });
     *
     * // Make 20 copies of the circle:
     * for (var i = 0; i < 20; i++) {
     *     var copy = circle.clone();
     *
     *     // Distribute the copies horizontally, so we can see them:
     *     copy.position.x += i * copy.bounds.width;
     * }
     */
    clone: function(options) {
        var copy = new this.constructor(Item.NO_INSERT),
            children = this._children,
            // `insert` follows settings.insertItems and `deep` is true by
            // default. Also support a boolean parameter for insert:
            insert = Base.pick(options ? options.insert : undefined,
                    typeof options === 'boolean' ? options
                        : paper.settings.insertItems),
            deep = Base.pick(options ? options.deep : undefined, true);
        // On items with children, for performance reasons due to the way that
        // styles are currently "flattened" into existing children, we need to
        // clone attributes first, then content.
        // For all other items, it's the other way around, since applying
        // attributes might have an impact on their content.
        if (children)
            copy.copyAttributes(this);
        // Only copy content if we don't have children or if we're ask to create
        // a deep clone, which is the default.
        if (!children || deep)
            copy.copyContent(this);
        if (!children)
            copy.copyAttributes(this);
        if (insert)
            copy.insertAbove(this);
        // Make sure we're not overriding the original name in the same parent
        var name = this._name,
            parent = this._parent;
        if (name && parent) {
            var children = parent._children,
                orig = name,
                i = 1;
            while (children[name])
                name = orig + ' ' + (i++);
            if (name !== orig)
                copy.setName(name);
        }
        return copy;
    },

    /**
     * Copies the content of the specified item over to this item.
     *
     * @param {Item} source the item to copy the content from
     */
    copyContent: function(source) {
        var children = source._children;
        // Clone all children and add them to the copy. tell #addChild we're
        // cloning, as needed by CompoundPath#insertChild().
        for (var i = 0, l = children && children.length; i < l; i++) {
            this.addChild(children[i].clone(false), true);
        }
    },

    /**
     * Copies all attributes of the specified item over to this item. This
     * includes its style, visibility, matrix, pivot, blend-mode, opacity,
     * selection state, data, name, etc.
     *
     * @param {Item} source the item to copy the attributes from
     * @param {Boolean} excludeMatrix whether to exclude the transformation
     * matrix when copying all attributes
     */
    copyAttributes: function(source, excludeMatrix) {
        // Copy over style
        this.setStyle(source._style);
        // Only copy over these fields if they are actually defined in 'source',
        // meaning the default value has been overwritten (default is on
        // prototype).
        var keys = ['_locked', '_visible', '_blendMode', '_opacity',
                '_clipMask', '_guide', '_textWrap'];
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            if (source.hasOwnProperty(key))
                this[key] = source[key];
        }
        // Use Matrix#initialize to easily copy over values.
        if (!excludeMatrix)
            this._matrix.set(source._matrix, true);
        // We can't just set _applyMatrix as many item types won't allow it,
        // e.g. creating a Shape in Path#toShape().
        // Using the setter instead takes care of it.
        // NOTE: This will also bake in the matrix that we just initialized,
        // in case #applyMatrix is true.
        this.setApplyMatrix(source._applyMatrix);
        this.setPivot(source._pivot);
        // Copy over the selection state, use setSelection so the item
        // is also added to Project#_selectionItems if it is selected.
        this.setSelection(source._selection);
        // Copy over data and name as well.
        var data = source._data,
            name = source._name;
        this._data = data ? Base.clone(data) : null;
        if (name)
            this.setName(name);
    },

    /**
     * @name Item#rasterize
     * @function
     * @param {Number} [resolution=view.resolution]
     * @param {Boolean} [insert=true]
     * @return {Raster}
     * @deprecated use {@link #rasterize(options)} instead.
     */
    /**
     * Rasterizes the item into a newly created Raster object. The item itself
     * is not removed after rasterization.
     *
     * @option [options.resolution=view.resolution] {Number} the desired
     *     resolution to be used when rasterizing, in pixels per inch (DPI). If
     *     not specified, the value of `view.resolution` is used by default.
     * @option [options.raster=null] {Raster} specifies a raster to be reused
     *     when rasterizing. If the raster has the desired size already, then the
     *     underlying canvas is reused and no new memory needs to be allocated.
     *     If no raster is provided, a new raster item is created and returned
     *     instead.
     * @option [options.insert=true] {Boolean} specifies whether the raster
     *     should be inserted into the scene graph. When set to `true`, it is
     *     inserted above the rasterized item.
     *
     * @name Item#rasterize
     * @function
     * @param {Object} [options={}] the rasterization options
     * @return {Raster} the reused raster or the newly created raster item
     *
     * @example {@paperscript}
     * // Rasterizing an item:
     * var circle = new Path.Circle({
     *     center: [50, 50],
     *     radius: 5,
     *     fillColor: 'red'
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
    rasterize: function(arg0, arg1) {
        var resolution,
            insert,
            raster;
        if (Base.isPlainObject(arg0)) {
            resolution = arg0.resolution;
            insert = arg0.insert;
            raster = arg0.raster;
        } else {
            resolution = arg0;
            insert = arg1;
        }
        if (!raster) {
            raster = new Raster(Item.NO_INSERT);
        }
        var bounds = this.getStrokeBounds(),
            scale = (resolution || this.getView().getResolution()) / 72,
            // Floor top-left corner and ceil bottom-right corner, to never
            // blur or cut pixels.
            topLeft = bounds.getTopLeft().floor(),
            bottomRight = bounds.getBottomRight().ceil(),
            boundsSize = new Size(bottomRight.subtract(topLeft)),
            rasterSize = boundsSize.multiply(scale);
        // Pass `true` for clear, so reused rasters don't draw over old pixels.
        raster.setSize(rasterSize, true);

        if (!rasterSize.isZero()) {
            var ctx = raster.getContext(true),
                matrix = new Matrix().scale(scale).translate(topLeft.negate());
            ctx.save();
            matrix.applyToContext(ctx);
            // See Project#draw() for an explanation of new Base()
            this.draw(ctx, new Base({ matrices: [matrix] }));
            ctx.restore();
        }
        raster._matrix.set(
            new Matrix()
                .translate(topLeft.add(boundsSize.divide(2)))
                // Take resolution into account and scale back to original size.
                .scale(1 / scale)
        );
        if (Base.pick(insert, paper.settings.insertItems)) {
            raster.insertAbove(this);
        }
        return raster;
    },

    /**
     * {@grouptitle Geometric Tests}
     *
     * Checks whether the item's geometry contains the given point.
     *
     * @example {@paperscript} // Click within and outside the star below
     * // Create a star shaped path:
     * var path = new Path.Star({
     *     center: [50, 50],
     *     points: 12,
     *     radius1: 20,
     *     radius2: 40,
     *     fillColor: 'black'
     * });
     *
     * // Whenever the user presses the mouse:
     * function onMouseDown(event) {
     *     // If the position of the mouse is within the path,
     *     // set its fill color to red, otherwise set it to
     *     // black:
     *     if (path.contains(event.point)) {
     *         path.fillColor = 'red';
     *     } else {
     *         path.fillColor = 'black';
     *     }
     * }
     *
     * @param {Point} point the point to check for
     * @return {Boolean}
     */
    contains: function(/* point */) {
        // See CompoundPath#_contains() for the reason for !!
        var matrix = this._matrix;
        return (
            matrix.isInvertible() &&
            !!this._contains(matrix._inverseTransform(Point.read(arguments)))
        );
    },

    _contains: function(point) {
        var children = this._children;
        if (children) {
            for (var i = children.length - 1; i >= 0; i--) {
                if (children[i].contains(point))
                    return true;
            }
            return false;
        }
        // We only implement it here for items with rectangular content,
        // for anything else we need to override #contains()
        return point.isInside(this.getInternalBounds());
    },

    // DOCS:
    // TEST:
    /**
     * @param {Rectangle} rect the rectangle to check against
     * @return {Boolean}
     */
    isInside: function(/* rect */) {
        return Rectangle.read(arguments).contains(this.getBounds());
    },

    // Internal helper function, used at the moment for intersects check only.
    // TODO: Move #getIntersections() to Item, make it handle all type of items
    // through _asPathItem(), and support Group items as well, taking nested
    // matrices into account properly!
    _asPathItem: function() {
        // Creates a temporary rectangular path item with this item's bounds.
        // Keep the matrix unapplied, so getIntersections() can override it:
        return new Path.Rectangle({
            rectangle: this.getInternalBounds(),
            applyMatrix: false,
            matrix: this._matrix,
            insert: false,
        });
    },

    /**
     * Checks whether the item overlaps with the given item: whether their
     * outlines cross, or one contains the other, as
     * {@link Rectangle#intersects(rect)} does for rectangles. Items other than
     * paths and shapes are checked through their bounds. To only check whether
     * outlines cross, use {@link PathItem#getIntersections(path)}.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if the items overlap}
     */
    intersects: function(item, _matrix) {
        if (!(item instanceof Item))
            return false;
        var path1 = this._asPathItem(),
            path2 = item._asPathItem(),
            matrix1 = path1._matrix,
            matrix2 = _matrix || path2._matrix;

        // Checks whether a point of any of the path's sub-paths lies inside
        // the other path, which then contains it, as the outlines don't cross:
        function contains(path, matrix, other, otherMatrix) {
            var paths = path._children || [path];
            for (var i = 0, l = paths.length; i < l; i++) {
                var segment = paths[i]._segments[0],
                    point = segment && otherMatrix._inverseTransform(
                            matrix._transformPoint(segment._point));
                if (point && other._contains(point))
                    return true;
            }
            return false;
        }

        // Tell getIntersections() to return as soon as some intersections are
        // found, because all we care for here is there are some or none:
        return path1.getIntersections(path2, null, _matrix, true).length > 0
                || contains(path2, matrix2, path1, matrix1)
                || contains(path1, matrix1, path2, matrix2);
    }
},
new function() { // Injection scope for hit-test functions shared with project
    function hitTest(/* point, options */) {
        var args = arguments;
        return this._hitTest(
                Point.read(args),
                HitResult.getOptions(args));
    }

    function hitTestAll(/* point, options */) {
        var args = arguments,
            point = Point.read(args),
            options = HitResult.getOptions(args),
            all = [];
        this._hitTest(point, new Base({ all: all }, options));
        return all;
    }

    function hitTestChildren(point, options, viewMatrix, _exclude) {
        // NOTE: _exclude is only used in Group#_hitTestChildren()
        // to exclude #clipItem
        var children = this._children;
        if (children) {
            // Loop backwards, so items that get drawn last are tested first.
            for (var i = children.length - 1; i >= 0; i--) {
                var child = children[i];
                var res = child !== _exclude && child._hitTest(point, options,
                        viewMatrix);
                // Only return the found result if we're not asked to collect
                // all matches through hitTestAll()
                if (res && !options.all)
                    return res;
            }
        }
        return null;
    }

    Project.inject({
        hitTest: hitTest,
        hitTestAll: hitTestAll,
        _hitTest: hitTestChildren
    });

    return {
        // NOTE: Documentation is in the scope that follows.
        hitTest: hitTest,
        hitTestAll: hitTestAll,
        _hitTestChildren: hitTestChildren,
    };
}, /** @lends Item# */{
    /**
     * {@grouptitle Hit-testing, Fetching and Matching Items}
     *
     * Performs a hit-test on the item and its children (if it is a {@link
     * Group} or {@link Layer}) at the location of the specified point,
     * returning the first found hit.
     *
     * The options object allows you to control the specifics of the hit-test.
     * Without options, `fill`, `stroke` and `segments` are hit-tested. As soon
     * as an options object is passed, only the hit-tests that it sets to `true`
     * are performed. It may contain a combination of the following values:
     *
     * @name Item#hitTest
     * @function
     *
     * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
     *     {Number} the tolerance of the hit-test, in project coordinates
     * @option options.class {Function} only hit-test against a specific item
     *     class, or any of its sub-classes, by providing the constructor
     *     function against which an `instanceof` check is performed:
     *     {@values  Group, Layer, Path, CompoundPath, Shape, Raster,
     *     SymbolItem, PointText, ...}
     * @option options.match {Function} a match function to be called for each
     *     found hit result: Return `true` to return the result, `false` to keep
     *     searching
     * @option options.fill {Boolean} hit-test the fill of items
     * @option options.stroke {Boolean} hit-test the stroke of path items,
     *     taking into account the setting of stroke color and width
     * @option options.segments {Boolean} hit-test for {@link Segment#point} of
     *     {@link Path} items
     * @option options.curves {Boolean} hit-test the curves of path items,
     *     without taking the stroke color or width into account
     * @option options.handles {Boolean} hit-test for the handles ({@link
     *     Segment#handleIn} / {@link Segment#handleOut}) of path segments.
     * @option options.ends {Boolean} only hit-test for the first or last
     *     segment points of open path items
     * @option options.position {Boolean} hit-test the {@link Item#position} of
     *     of items, which depends on the setting of {@link Item#pivot}
     * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.bounds {Boolean} hit-test the corners and side-centers of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.guides {Boolean} only hit-test items that have {@link
     *     Item#guide} set to `true`
     * @option options.selected {Boolean} only hit selected items
     *
     * @param {Point} point the point where the hit-test should be performed
     *     (in global coordinates system).
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     *     tolerance: settings.hitTolerance }]
     * @return {HitResult} a hit result object describing what exactly was hit
     *     or `null` if nothing was hit
     */

    /**
     * Performs a hit-test on the item and its children (if it is a {@link
     * Group} or {@link Layer}) at the location of the specified point,
     * returning all found hits.
     *
     * The options object allows you to control the specifics of the hit-
     * test. See {@link #hitTest(point[, options])} for a list of all options.
     *
     * @name Item#hitTestAll
     * @function
     * @param {Point} point the point where the hit-test should be performed
     *     (in global coordinates system).
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     *     tolerance: settings.hitTolerance }]
     * @return {HitResult[]} hit result objects for all hits, describing what
     *     exactly was hit or `null` if nothing was hit
     * @see #hitTest(point[, options]);
     */

    _hitTest: function(point, options, parentViewMatrix) {
        // Shells of hosted items are rejected by their bounds below, as
        // checking for emptiness would load them:
        if (this._locked || !this._visible || this._guide && !options.guides
                || !this._shell && this.isEmpty()) {
            return null;
        }

        // Check if the point is within the bounds including stroke and handles
        // + tolerance, but only if this item does not have children, since
        // we'd have to travel up the chain already to determine these bounds.
        // Shells of hosted items know them without loading their children.
        var matrix = this._matrix,
            // If this is the first one in the recursion, the point is in global
            // coordinates, so transform it by the item's globalMatrix:
            pointMatrix = parentViewMatrix ? matrix : this.getGlobalMatrix(),
            // Keep the accumulated matrices up to this item in options, so we
            // can keep calculating the correct _tolerancePadding values.
            viewMatrix = parentViewMatrix
                    ? parentViewMatrix.appended(matrix)
                    // If this is the first one in the recursion, factor in the
                    // zoom of the view and the globalMatrix of the item.
                    : pointMatrix.prepended(this.getView()._matrix),
            // Calculate the transformed padding as 2D size that describes the
            // transformed tolerance circle / ellipse. Make sure it's never 0
            // since we're using it for division (see checkBounds()).
            tolerance = Math.max(options.tolerance, /*#=*/Numerical.EPSILON),
            // Hit-tests are performed in the item's local coordinate space,
            // while the tolerance is in project coordinates. To calculate the
            // correct 2D padding for tolerance, we therefore need to apply the
            // inverted accumulated matrices without the view's matrix.
            tolerancePadding = options._tolerancePadding = new Size(
                    Matrix._getCircleExtents(tolerance, viewMatrix
                        .prepended(this.getView()._matrix.inverted())
                        ._shiftless().invert()));
        // Transform point to local coordinates.
        point = pointMatrix._inverseTransform(point);
        // If the matrix is non-reversible, point will now be `null`:
        if (!point || (this._shell || !this._children) &&
            !this.getBounds({ internal: true, stroke: true, handle: true })
                .expand(tolerancePadding.multiply(2))._containsPoint(point)) {
            return null;
        }

        // See if we should check self (own content), by filtering for type,
        // guides and selected items if that's required.
        var checkSelf = !(options.guides && !this._guide
                || options.selected && !this.isSelected()
                // Support legacy Item#type property to match hyphenated
                // class-names.
                || options.type && options.type !== Base.hyphenate(this._class)
                || options.class && !(this instanceof options.class)),
            match = options.match,
            that = this,
            bounds,
            res;

        function filter(hit) {
            // Path#_hitTestSelf() returns a list of all its hits when we're
            // collecting them, see hitTestAll():
            if (Array.isArray(hit)) {
                var first = null;
                for (var i = 0, l = hit.length; i < l; i++) {
                    var res = filter(hit[i]);
                    first = first || res;
                }
                return first;
            }
            if (hit && match && !match(hit))
                hit = null;
            // If we're collecting all matches, add it to options.all, with its
            // point in project coordinates, as it won't be returned through the
            // ancestors that transform it below:
            if (hit && options.all) {
                if (hit.point)
                    hit.point = that.getGlobalMatrix().transform(hit.point);
                options.all.push(hit);
            }
            return hit;
        }

        function checkPoint(type, part) {
            var pt = part ? bounds['get' + part]() : that.getPosition();
            // Since there are transformations, we cannot simply use a numerical
            // tolerance value. Instead, we divide by a padding size, see above.
            if (point.subtract(pt).divide(tolerancePadding).length <= 1) {
                return new HitResult(type, that, {
                    name: part ? Base.hyphenate(part) : type,
                    point: pt
                });
            }
        }

        var checkPosition = options.position,
            checkCenter = options.center,
            checkBounds = options.bounds;
        // Ignore top level layers by checking for _parent:
        if (checkSelf && this._parent
                && (checkPosition || checkCenter || checkBounds)) {
            if (checkCenter || checkBounds) {
                // Get the internal, untransformed bounds, as we check against
                // transformed points.
                bounds = this.getInternalBounds();
            }
            res = checkPosition && checkPoint('position') ||
                    checkCenter && checkPoint('center', 'Center');
            if (!res && checkBounds) {
                // TODO: Move these into a static property on Rectangle?
                var points = [
                    'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
                    'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'
                ];
                for (var i = 0; i < 8 && !res; i++) {
                    res = checkPoint('bounds', points[i]);
                }
            }
            res = filter(res);
        }

        if (!res) {
            res = this._hitTestChildren(point, options, viewMatrix)
                // NOTE: We don't call match on _hitTestChildren() because
                // it is already called internally.
                || checkSelf
                    && filter(this._hitTestSelf(point, options, viewMatrix,
                        // If the item has a non-scaling stroke, we need to
                        // apply the inverted viewMatrix to stroke dimensions.
                        this.getStrokeScaling() ? null
                            : viewMatrix._shiftless().invert()))
                || null;
        }
        // Transform the point back to the outer coordinate system, unless it
        // was collected in project coordinates already, see filter():
        if (res && res.point && !options.all) {
            res.point = pointMatrix.transform(res.point);
        }
        return res;
    },

    _hitTestSelf: function(point, options) {
        // The default implementation only handles 'fill' through #_contains(),
        // transparent fills too, see Path#_hitTestSelf():
        if (options.fill && this.getFillColor() && this._contains(point))
            return new HitResult('fill', this);
    },

    /**
     * Checks whether the item matches the criteria described by the given
     * object, by iterating over all of its properties and matching against
     * their values through {@link #matches(name, compare)}.
     *
     * See {@link Project#getItems(options)} for a selection of illustrated
     * examples.
     *
     * @name Item#matches
     * @function
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Boolean} {@true if the item matches all the criteria}
     * @see #getItems(options)
     */
    /**
     * Checks whether the item matches the given criteria. Extended matching is
     * possible by providing a compare function or a regular expression.
     * Matching points, colors only work as a comparison of the full object, not
     * partial matching (e.g. only providing the x-coordinate to match all
     * points with that x-value). Partial matching does work for
     * {@link Item#data}.
     *
     * See {@link Project#getItems(options)} for a selection of illustrated
     * examples.
     *
     * @name Item#matches
     * @function
     *
     * @param {String} name the name of the state to match against
     * @param {Object} compare the value, function or regular expression to
     * compare against
     * @return {Boolean} {@true if the item matches the state}
     * @see #getItems(options)
     */
    matches: function(name, compare) {
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
        var type = typeof name;
        if (type === 'object') {
            // `name` is the match object, not a string
            for (var key in name) {
                if (name.hasOwnProperty(key) && !this.matches(key, name[key]))
                    return false;
            }
            return true;
        } else if (type === 'function') {
            return name(this);
        } else if (name === 'match') {
            return compare(this);
        } else {
            var value = /^(empty|editable)$/.test(name)
                    // Handle boolean test functions separately, by calling them
                    // to get the value.
                    ? this['is' + Base.capitalize(name)]()
                    // Support legacy Item#type property to match hyphenated
                    // class-names.
                    // TODO: Remove after December 2016.
                    : name === 'type'
                        ? Base.hyphenate(this._class)
                        : this[name];
            if (name === 'class') {
                if (typeof compare === 'function')
                    return this instanceof compare;
                // Compare further with the _class property value instead.
                value = this._class;
            }
            if (typeof compare === 'function') {
                return !!compare(value);
            } else if (compare) {
                if (compare.test) { // RegExp-ish
                    return compare.test(value);
                } else if (Base.isPlainObject(compare)) {
                    return matchObject(compare, value);
                }
            }
            return Base.equals(value, compare);
        }
    },

    /**
     * Fetch the descendants (children or children of children) of this item
     * that match the properties in the specified object. Extended matching is
     * possible by providing a compare function or regular expression. Matching
     * points, colors only work as a comparison of the full object, not partial
     * matching (e.g. only providing the x- coordinate to match all points with
     * that x-value). Partial matching does work for {@link Item#data}.
     *
     * Matching items against a rectangular area is also possible, by setting
     * either `options.inside` or `options.overlapping` to a rectangle
     * describing the area in which the items either have to be fully or partly
     * contained.
     *
     * See {@link Project#getItems(options)} for a selection of illustrated
     * examples.
     *
     * @option [options.recursive=true] {Boolean} whether to loop recursively
     *     through all children, or stop at the current level
     * @option options.match {Function} a match function to be called for each
     *     item, allowing the definition of more flexible item checks that are
     *     not bound to properties. If no other match properties are defined,
     *     this function can also be passed instead of the `options` object
     * @option options.class {Function} the constructor function of the item
     *     type to match against
     * @option options.inside {Rectangle} the rectangle in which the items need
     *     to be fully contained
     * @option options.overlapping {Rectangle} the rectangle with which the
     *     items need to at least partly overlap
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Item[]} the list of matching descendant items, in their
     *     stacking order from bottom to top, with each item listed before its
     *     own descendants
     * @see #matches(options)
     */
    getItems: function(options) {
        return Item._getItems(this, options, this._matrix);
    },

    /**
     * Fetch the first descendant (child or child of child) of this item
     * that matches the properties in the specified object.
     * Extended matching is possible by providing a compare function or
     * regular expression. Matching points, colors only work as a comparison
     * of the full object, not partial matching (e.g. only providing the x-
     * coordinate to match all points with that x-value). Partial matching
     * does work for {@link Item#data}.
     * See {@link Project#getItems(match)} for a selection of illustrated
     * examples.
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Item} the first descendant item matching the given criteria
     * @see #getItems(options)
     */
    getItem: function(options) {
        return Item._getItems(this, options, this._matrix, null, true)[0]
                || null;
    },

    statics: /** @lends Item */{
        // NOTE: We pass children instead of item as first argument so the
        // method can be used for Project#layers as well in Project.
        _getItems: function _getItems(item, options, matrix, param, firstOnly) {
            if (!param) {
                // Set up a couple of "side-car" values for the recursive calls
                // of _getItems below, mainly related to the handling of
                // inside / overlapping:
                var obj = typeof options === 'object' && options,
                    overlapping = obj && obj.overlapping,
                    inside = obj && obj.inside,
                    // If overlapping is set, we also perform the inside check:
                    bounds = overlapping || inside,
                    rect = bounds && Rectangle.read([bounds]);
                param = {
                    items: [], // The list to contain the results.
                    recursive: !obj || obj.recursive !== false,
                    inside: !!inside,
                    overlapping: !!overlapping,
                    rect: rect,
                    path: overlapping && new Path.Rectangle({
                        rectangle: rect,
                        insert: false
                    })
                };
                if (obj) {
                    // Create a copy of the options object that doesn't contain
                    // these special properties:
                    options = Base.filter({}, options, {
                        recursive: true, inside: true, overlapping: true
                    });
                }
            }
            var children = item._children,
                items = param.items,
                rect = param.rect;
            matrix = rect && (matrix || new Matrix());
            for (var i = 0, l = children && children.length; i < l; i++) {
                var child = children[i],
                    childMatrix = matrix && matrix.appended(child._matrix),
                    add = true;
                if (rect) {
                    var bounds = child.getBounds(childMatrix);
                    // Regardless of the setting of inside / overlapping, if the
                    // bounds don't even intersect, we can skip this child.
                    if (!rect.intersects(bounds))
                        continue;
                    if (!(rect.contains(bounds)
                            // First check the bounds, if the rect is fully
                            // contained, we are always overlapping, and don't
                            // need to perform further checks, otherwise perform
                            // a proper #intersects() check:
                            || param.overlapping
                                && param.path.intersects(child, childMatrix)))
                        add = false;
                }
                if (add && child.matches(options)) {
                    items.push(child);
                    if (firstOnly)
                        break;
                }
                // Only into the children that the item shows:
                if (param.recursive !== false && child.getChildren()) {
                    _getItems(child, options, childMatrix, param, firstOnly);
                }
                if (firstOnly && items.length > 0)
                    break;
            }
            return items;
        }
    }
}, /** @lends Item# */{
    /**
     * {@grouptitle Importing / Exporting JSON and SVG}
     *
     * Exports (serializes) the item with its content and child items to a JSON
     * data string.
     *
     * @name Item#exportJSON
     * @function
     *
     * @option [options.asString=true] {Boolean} whether the JSON is returned as
     *     a `Object` or a `String`
     * @option [options.precision=5] {Number} the amount of fractional digits in
     *     numbers used in JSON data
     *
     * @param {Object} [options] the serialization options
     * @return {String} the exported JSON data
     */

    /**
     * Imports (deserializes) the stored JSON data into this item. If the data
     * describes an item of the same class or a parent class of the item, the
     * data is imported into the item itself. If not, the imported item is added
     * to this item's {@link Item#children} list. Note that not all type of
     * items can have children.
     *
     * @param {String} json the JSON data to import from
     * @return {Item}
     */
    importJSON: function(json) {
        json = typeof json === 'string' ? JSON.parse(json) : json;
        var props = json && json[0] === this._class && json[1];
        if (Base.isPlainObject(props)) {
            // Importing into this item: first reset the fields that the JSON
            // leaves out to the values of a new item, so it ends up the same
            // as a newly imported one (#1425):
            var item = new this.constructor(Item.NO_INSERT),
                fields = Base.set({}, this._serializeFields,
                    this instanceof Group ? null : this._style._defaults),
                defaults = {};
            for (var key in fields) {
                if (!(key in props) && !Base.equals(this[key], item[key]))
                    defaults[key] = item[key];
            }
            this.set(defaults);
        }
        // Try importing into `this`. If another item is returned, try adding
        // it as a child (this won't be successful on some classes, returning
        // null).
        var res = Base.importJSON(json, this);
        return res !== this ? this.addChild(res) : res;
    },

    /**
     * Exports the item with its content and child items as an SVG DOM.
     *
     * @name Item#exportSVG
     * @function
     *
     * @option [options.bounds='view'] {String|Rectangle} the bounds of the area
     *     to export, either as a string ({@values 'view', content'}), or a
     *     {@link Rectangle} object: `'view'` uses the view bounds,
     *     `'content'` uses the stroke bounds of all content
     * @option [options.matrix=paper.view.matrix] {Matrix} the matrix with which
     *     to transform the exported content: If `options.bounds` is set to
     *     `'view'`, `paper.view.matrix` is used, for all other settings of
     *     `options.bounds` the identity matrix is used.
     * @option [options.asString=false] {Boolean} whether a SVG node or a
     *     `String` is to be returned
     * @option [options.precision=5] {Number} the amount of fractional digits in
     *     numbers used in SVG data
     * @option [options.matchShapes=false] {Boolean} whether path items should
     *     tried to be converted to SVG shape items (rect, circle, ellipse,
     *     line, polyline, polygon), if their geometries match
     * @option [options.embedImages=true] {Boolean} whether raster images should
     *     be embedded as base64 data inlined in the xlink:href attribute, or
     *     kept as a link to their external URL.
     * @option [options.reuseImages=false] {Boolean} whether raster images with
     *     the same content should only be exported once into the `<defs>`
     *     element, and placed through `<use>` elements referencing it
     * @option [options.idPrefix=''] {String} a prefix for the ids generated
     *     for definitions such as gradients, clip paths and symbols, to keep
     *     them unique when several exported SVGs are placed in one document
     * @option [options.reduceAttributes=true] {Boolean} wether to only include
     *     style attributes in the SVG output that differ from their parents,
     *     or to always include them (much faster but leading to redundancies).
     * @option [options.processNode] {Function} the function to process the
     *     SVG node made for each exported item, receiving an object with the
     *     `item` and its `node`: It can change the node, e.g. to add attributes
     *     that Paper.js doesn't export, or return a node to replace it with. It
     *     is called before the item's name, style, visibility and data are set
     *     on the node, which replace attributes of the same names.
     *
     * @param {Object} [options] the export options
     * @return {SVGElement|String} the item converted to an SVG node or a
     * `String` depending on `option.asString` value
     */

    /**
     * Converts the provided SVG content into Paper.js items and adds them to
     * the this item's children list. Note that the item is not cleared first.
     * You can call {@link Item#removeChildren()} to do so.
     *
     * `<symbol>` elements are imported as {@link SymbolDefinition} items, and
     * the `<use>` elements that place them as {@link SymbolItem} items. The
     * styles that `<use>` elements inherit don't reach the symbols' content.
     *
     * URLs are fetched as they are, so validate URLs that come from untrusted
     * sources first, especially on servers, where they could reach internal
     * addresses.
     *
     * @name Item#importSVG
     * @function
     *
     * @option [options.expandShapes=false] {Boolean} whether imported shape
     *     items should be expanded to path items
     * @option [options.crossOrigin] {String} the {@link Raster#crossOrigin}
     *     value of the rasters created for `<image>` elements, to load their
     *     images with CORS
     * @option options.onLoad {Function} the callback function to call once the
     *     SVG content is loaded from the given URL receiving two arguments: the
     *     converted `item` and the original `svg` data as a string. Only
     *     required when loading from external resources.
     * @option options.onError {Function} the callback function to call if an
     *     error occurs during loading. Only required when loading from external
     *     resources.
     * @option [options.insert=true] {Boolean} whether the imported items should
     *     be added to the item that `importSVG()` is called on
     * @option [options.applyMatrix={@link PaperScope#settings}.applyMatrix]
     *     {Boolean} whether the imported items should have their transformation
     *     matrices applied to their contents or not
     * @option [options.processItem] {Function} the function to process the
     *     item made for each imported SVG element, receiving an object with
     *     the `item` and its `node`: It can read attributes that Paper.js
     *     doesn't import, or return an item to replace it with. It is called
     *     after the element's attributes and data are applied to the item, so
     *     it can extend `item.data`. A replacement item doesn't receive them:
     *     copy them over from `item` as needed.
     *
     * @param {SVGElement|String} svg the SVG content to import, either as a SVG
     *     DOM node, a string containing SVG content, or a string describing the
     *     URL of the SVG file to fetch.
     * @param {Object} [options] the import options
     * @return {Item} the newly created Paper.js item containing the converted
     *     SVG content
     */
    /**
     * Imports the provided external SVG file, converts it into Paper.js items
     * and adds them to the this item's children list. Note that the item is not
     * cleared first. You can call {@link Item#removeChildren()} to do so.
     *
     * @name Item#importSVG
     * @function
     *
     * @param {SVGElement|String} svg the URL of the SVG file to fetch.
     * @param {Function} onLoad the callback function to call once the SVG
     *     content is loaded from the given URL receiving two arguments: the
     *     converted `item` and the original `svg` data as a string. Only
     *     required when loading from external files.
     * @return {Item} the newly created Paper.js item containing the converted
     *     SVG content
     */

    /**
     * {@grouptitle Hierarchy Operations}
     *
     * Adds the specified item as a child of this item at the end of the its
     * {@link #children}  list. You can use this function for groups, compound
     * paths and layers.
     *
     * @param {Item} item the item to be added as a child
     * @return {Item} the added item, or `null` if adding was not possible
     */
    addChild: function(item) {
        return this.insertChild(undefined, item);
    },

    /**
     * Inserts the specified item as a child of this item at the specified index
     * in its {@link #children} list. You can use this function for groups,
     * compound paths and layers.
     *
     * @param {Number} index the index at which to insert the item
     * @param {Item} item the item to be inserted as a child
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    insertChild: function(index, item) {
        var res = item ? this.insertChildren(index, [item]) : null;
        return res && res[0];
    },

    /**
     * Adds the specified items as children of this item at the end of the its
     * children list. You can use this function for groups, compound paths and
     * layers.
     *
     * @param {Item[]} items the items to be added as children
     * @return {Item[]} the added items, or `null` if adding was not possible
     */
    addChildren: function(items) {
        return this.insertChildren(this._children.length, items);
    },

    /**
     * Inserts the specified items as children of this item at the specified
     * index in its {@link #children} list. You can use this function for
     * groups, compound paths and layers.
     *
     * @param {Number} index
     * @param {Item[]} items the items to be appended as children
     * @return {Item[]} the inserted items, or `null` if inserted was not
     *     possible
     */
    insertChildren: function(index, items) {
        var children = this._children;
        if (children && items && items.length > 0) {
            // We need to clone items because it may be an Item#children array.
            // Also, we're removing elements if they don't match _type.
            // Use Base.slice() because items can be an arguments object.
            items = Base.slice(items);
            // Remove the items from their parents first, since they might be
            // inserted into their own parents, affecting indices.
            // Use the loop also to filter invalid items.
            var inserted = {};
            for (var i = items.length - 1; i >= 0; i--) {
                var item = items[i],
                    id = item && item._id;
                // If an item was inserted already, it must be included multiple
                // times in the items array. Only insert once.
                if (!item || inserted[id]) {
                    items.splice(i, 1);
                } else {
                    // Notify parent of change. Don't notify item itself yet,
                    // as we're doing so when adding it to the new owner below.
                    item._remove(false, true);
                    inserted[id] = true;
                }
            }
            Base.splice(children, items, index, 0);
            var project = this._project,
                // See #_remove() for an explanation of this:
                notifySelf = project._changes;
            for (var i = 0, l = items.length; i < l; i++) {
                var item = items[i],
                    name = item._name;
                item._parent = this;
                item._setProject(project, true);
                // Set the name again to make sure all name lookup structures
                // are kept in sync.
                if (name)
                    item.setName(name);
                if (notifySelf)
                    item._changed(/*#=*/Change.INSERTION);
            }
            this._changed(/*#=*/Change.CHILDREN);
        } else {
            items = null;
        }
        return items;
    },

    // Internal alias, so both Project and Item can be used in #copyTo(), and
    // through _getOwner() in the various Item#insert*() methods.
    _insertItem: '#insertChild',

    /**
     * Private helper method used by {@link #insertAbove(item)} and
     * {@link #insertBelow(item)}, to insert this item in relation to a
     * specified other item.
     *
     * @param {Item} item the item in relation to which which it should be
     *     inserted
     * @param {Number} offset the offset at which the item should be inserted
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    _insertAt: function(item, offset) {
        var owner = item && item._getOwner(),
            // Only insert if the item is not the same as `this`, and if it
            // actually has an owner into which we can insert.
            res = item !== this && owner ? this : null;
        if (res) {
            // Notify parent of change. Don't notify item itself yet,
            // as we're doing so when adding it to the new owner below.
            res._remove(false, true);
            owner._insertItem(item._index + offset, res);
        }
        return res;
    },

    /**
     * Inserts this item above the specified item.
     *
     * @param {Item} item the item above which it should be inserted
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    insertAbove: function(item) {
        return this._insertAt(item, 1);
    },

    /**
     * Inserts this item below the specified item.
     *
     * @param {Item} item the item below which it should be inserted
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    insertBelow: function(item) {
        return this._insertAt(item, 0);
    },

    /**
     * Sends this item to the back of all other items within the same parent.
     */
    sendToBack: function() {
        var owner = this._getOwner();
        return owner ? owner._insertItem(0, this) : null;
    },

    /**
     * Brings this item to the front of all other items within the same parent.
     */
    bringToFront: function() {
        var owner = this._getOwner();
        return owner ? owner._insertItem(undefined, this) : null;
    },

    /**
     * Inserts the specified item as a child of this item by appending it to
     * the list of children and moving it above all other children. You can
     * use this function for groups, compound paths and layers.
     *
     * @function
     * @param {Item} item the item to be appended as a child
     * @return {Item}
     * @deprecated use {@link #addChild(item)} instead.
     */
    appendTop: '#addChild',

    /**
     * Inserts the specified item as a child of this item by appending it to
     * the list of children and moving it below all other children. You can
     * use this function for groups, compound paths and layers.
     *
     * @param {Item} item the item to be appended as a child
     * @return {Item}
     * @deprecated use {@link #insertChild(index, item)} instead.
     */
    appendBottom: function(item) {
        return this.insertChild(0, item);
    },

    /**
     * Moves this item above the specified item.
     *
     * @function
     * @param {Item} item the item above which it should be moved
     * @return {Boolean} {@true if it was moved}
     * @deprecated use {@link #insertAbove(item)} instead.
     */
    moveAbove: '#insertAbove',

    /**
     * Moves the item below the specified item.
     *
     * @function
     * @param {Item} item the item below which it should be moved
     * @return {Boolean} {@true if it was moved}
     * @deprecated use {@link #insertBelow(item)} instead.
     */
    moveBelow: '#insertBelow',

    /**
     * Adds it to the specified owner, which can be either a {@link Item} or a
     * {@link Project}.
     *
     * @param {Project|Layer|Group|CompoundPath} owner the item or project to
     * add the item to
     * @return {Item} the item itself, if it was successfully added
     * @chainable
     */
    addTo: function(owner) {
        return owner._insertItem(undefined, this);
    },

    /**
     * Clones the item and adds it to the specified owner, which can be either
     * a {@link Item} or a {@link Project}.
     *
     * @param {Project|Layer|Group|CompoundPath} owner the item or project to
     * copy the item to
     * @return {Item} the new copy of the item, if it was successfully added
     * @chainable
     */
    copyTo: function(owner) {
        return this.clone(false).addTo(owner);
    },

    /**
     * If this is a group, layer or compound-path with only one child-item,
     * the child-item is moved outside and the parent is erased. Otherwise, the
     * item itself is returned unmodified.
     *
     * @param {Object} [options] the options passed on to {@link
     *     Path#reduce(options)}
     * @return {Item} the reduced item
     */
    reduce: function(options) {
        var children = this._children;
        if (children && children.length === 1) {
            var child = children[0].reduce(options);
            // Make sure the reduced item has the same parent as the original.
            if (this._parent) {
                child.insertAbove(this);
                this.remove();
            } else {
                child.remove();
            }
            return child;
        }
        return this;
    },

    /**
     * Removes the item from its parent's named children list.
     */
    _removeNamed: function() {
        var owner = this._getOwner();
        if (owner)
            Base.removeNamed(owner._children, owner._namedChildren, this._name,
                    this);
    },

    /**
     * Removes the item from its parent's children list.
     */
    _remove: function(notifySelf, notifyParent) {
        var owner = this._getOwner(),
            project = this._project,
            index = this._index;
        if (this._style)
            this._style._dispose();
        if (owner) {
            // Handle named children separately from index:
            if (this._name)
                this._removeNamed();
            // Uninstall events while still inserted, as layers aren't anymore
            // after Base.splice() below.
            this._installEvents(false);
            // Notify self of the insertion change while still inserted, so it
            // is logged. We only need this notification if we're tracking
            // changes.
            if (notifySelf && project._changes)
                this._changed(/*#=*/Change.INSERTION);
            // Handle index separately from owner: There are situations where
            // the item is already removed from its list through Base.splice()
            // and index set to undefined, but the owner is still set,
            // e.g. in #removeChildren():
            if (index != null) {
                // Only required for layers but not enough to merit an override.
                if (project._activeLayer === this)
                    project._activeLayer = this.getNextSibling()
                            || this.getPreviousSibling();
                Base.splice(owner._children, null, index, 1);
            }
            // Notify owner of changed children (this can be the project too).
            if (notifyParent)
                owner._changed(/*#=*/Change.CHILDREN, this);
            this._parent = null;
            return true;
        }
        return false;
    },

    /**
     * Removes the item and all its children from the project. The item is not
     * destroyed and can be inserted again after removal.
     *
     * @return {Boolean} {@true if the item was removed}
     */
    remove: function() {
        // Notify self and parent of change:
        return this._remove(true, true);
    },

    /**
     * Replaces this item with the provided new items which will take its place
     * in the project hierarchy instead, in the given order. This also ungroups
     * a group, e.g. `group.replaceWith(...group.children)`, but note that the
     * items keep their own matrices, see {@link Group#ungroup()}.
     *
     * @param {...Item} item the items that will replace this item
     * @return {Boolean} {@true if the item was replaced}
     */
    replaceWith: function(item) {
        var ok = item;
        for (var i = 0, l = arguments.length; i < l && ok; i++)
            ok = arguments[i] && arguments[i].insertBelow(this);
        if (ok)
            this.remove();
        return ok && item;
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
     * Removes the children from the specified `start` index to and excluding
     * the `end` index from the parent's {@link #children} array.
     *
     * @name Item#removeChildren
     * @function
     * @param {Number} start the beginning index, inclusive
     * @param {Number} [end=children.length] the ending index, exclusive
     * @return {Item[]} an array containing the removed items
     */
    removeChildren: function(start, end) {
        if (!this._children)
            return null;
        start = start || 0;
        end = Base.pick(end, this._children.length);
        // Use Base.splice(), which adjusts #_index for the items above, and
        // deletes it for the removed items. Calling #_remove() afterwards is
        // fine, since it only calls Base.splice() if #_index is set.
        var removed = Base.splice(this._children, null, start, end - start);
        for (var i = removed.length - 1; i >= 0; i--) {
            // Don't notify parent each time, notify it separately after.
            removed[i]._remove(true, false);
        }
        if (removed.length > 0)
            this._changed(/*#=*/Change.CHILDREN);
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
            // Adjust indices
            for (var i = 0, l = this._children.length; i < l; i++)
                this._children[i]._index = i;
            this._changed(/*#=*/Change.CHILDREN);
        }
    },

    /**
     * {@grouptitle Tests}
     * Specifies whether the item has any content or not. The meaning of what
     * content is differs from type to type. For example, a {@link Group} with
     * no children, a {@link TextItem} with no text content and a {@link Path}
     * with no segments all are considered empty.
     *
     * @param {Boolean} [recursively=false] whether an item with children should be
     * considered empty if all its descendants are empty
     * @return {Boolean}
     */
    isEmpty: function(recursively) {
        var children = this._children;
        var numChildren = children ? children.length : 0;
        if (recursively) {
            // In recursive check, item is empty if all its children are empty.
            for (var i = 0; i < numChildren; i++) {
                if (!children[i].isEmpty(recursively)) {
                    return false;
                }
            }
            return true;
        }
        return !numChildren;
    },

    /**
     * Checks whether the item is editable.
     *
     * @return {Boolean} {@true when neither the item, nor its parents are
     * locked or hidden}
     * @ignore
     */
    // TODO: Item#isEditable is currently ignored in the documentation, as
    // locking an item currently has no effect
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
     * {@grouptitle Style Tests}
     *
     * Checks whether the item has a visible fill, a fill color with an alpha
     * above 0. Hit-tests also hit transparent fills, see {@link #hitTest}.
     *
     * @return {Boolean} {@true if the item has a visible fill}
     */
    hasFill: function() {
        return this.getStyle().hasFill();
    },

    /**
     * Checks whether the item has a stroke.
     *
     * @return {Boolean} {@true if the item has a stroke}
     */
    hasStroke: function() {
        return this.getStyle().hasStroke();
    },

    /**
     * Checks whether the item has a shadow.
     *
     * @return {Boolean} {@true if the item has a shadow}
     */
    hasShadow: function() {
        return this.getStyle().hasShadow();
    },

    /**
     * Returns -1 if 'this' is above 'item', 1 if below, 0 if their order is not
     * defined in such a way, e.g. if one is a descendant of the other.
     */
    _getOrder: function(item) {
        // Private method that produces a list of ancestors, starting with the
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
     * Checks whether the item and all its parents are inserted into scene graph
     * or not.
     *
     * @return {Boolean} {@true if the item is inserted into the scene graph}
     */
    isInserted: function() {
        return this._parent ? this._parent.isInserted() : false;
    },

    /**
     * Checks if this item is above the specified item in the stacking order
     * of the project. If one item is a descendant of the other, neither is
     * above the other and `false` is returned.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is above the specified item}
     */
    isAbove: function(item) {
        return this._getOrder(item) === -1;
    },

    /**
     * Checks if the item is below the specified item in the stacking order of
     * the project. If one item is a descendant of the other, neither is below
     * the other and `false` is returned.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is below the specified item}
     */
    isBelow: function(item) {
        return this._getOrder(item) === 1;
    },

    /**
     * Checks whether the specified item is the parent of the item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is the parent of the item}
     */
    isParent: function(item) {
        return this._parent === item;
    },

    /**
     * Checks whether the specified item is a child of the item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true it is a child of the item}
     */
    isChild: function(item) {
        return item && item._parent === this;
    },

    /**
     * Checks if the item is contained within the specified item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is inside the specified item}
     */
    isDescendant: function(item) {
        var parent = this;
        while (parent = parent._parent) {
            if (parent === item)
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
     * Checks if the item is an a sibling of the specified item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if the item is aa sibling of the specified item}
     */
    isSibling: function(item) {
        return this._parent === item._parent;
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
                && /^(Group|Layer|CompoundPath)$/.test(parent._class)
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
     * @type ?Color
     *
     * @example {@paperscript}
     * // Setting the stroke color of a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
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
     *     center: [80, 50],
     *     radius: 35,
     *     strokeColor: 'red'
     * });
     *
     * // Set its stroke width to 10:
     * circle.strokeWidth = 10;
     */

    /**
     * The shape to be used at the beginning and end of open {@link Path} items,
     * when they have a stroke.
     *
     * @name Item#strokeCap
     * @property
     * @type String
     * @values 'round', 'square', 'butt'
     * @default 'butt'
     *
     * @example {@paperscript height=200}
     * // A look at the different stroke caps:
     *
     * var line = new Path({
     *     segments: [[80, 50], [420, 50]],
     *     strokeColor: 'black',
     *     strokeWidth: 20,
     *     selected: true
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
     * The shape to be used at the segments and corners of {@link Path} items
     * when they have a stroke.
     *
     * @name Item#strokeJoin
     * @property
     * @type String
     * @values 'miter', 'round', 'bevel'
     * @default 'miter'
     *
     * @example {@paperscript height=120}
     * // A look at the different stroke joins:
     * var path = new Path({
     *     segments: [[80, 100], [120, 40], [160, 100]],
     *     strokeColor: 'black',
     *     strokeWidth: 20,
     *     // Select the path, in order to see where the stroke is formed:
     *     selected: true
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
     * @type Number
     * @default 0
     */

    /**
     * Specifies whether the stroke is to be drawn taking the current affine
     * transformation into account (the default behavior), or whether it should
     * appear as a non-scaling stroke. On text, non-scaling strokes are exact for
     * uniform scaling only, as the glyphs are always stroked through the
     * transformation.
     *
     * @name Item#strokeScaling
     * @property
     * @type Boolean
     * @default true
     */

    /**
     * Specifies an array containing the dash and gap lengths of the stroke.
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 40,
     *     strokeWidth: 2,
     *     strokeColor: 'black'
     * });
     *
     * // Set the dashed stroke to [10pt dash, 4pt gap]:
     * path.dashArray = [10, 4];
     *
     * @name Item#dashArray
     * @property
     * @type Number[]
     * @default []
     */

    /**
     * The miter limit of the stroke.
     * When two line segments meet at a sharp angle and miter joins have been
     * specified for {@link Item#strokeJoin}, it is possible for the miter to
     * extend far beyond the {@link Item#strokeWidth} of the path. The
     * miterLimit imposes a limit on the ratio of the miter length to the
     * {@link Item#strokeWidth}.
     *
     * @name Item#miterLimit
     * @property
     * @type Number
     * @default 10
     */

    /**
     * The order in which the fill and the stroke are painted, as in SVG's
     * `paint-order`, named after what is painted first: `'fill'` paints the
     * fill first, `'stroke'` paints the stroke first, so the fill covers its
     * inner half.
     *
     * @name Item#paintOrder
     * @property
     * @type String
     * @values 'fill', 'stroke'
     * @default 'fill'
     */

    /**
     * {@grouptitle Fill Style}
     *
     * The fill color of the item.
     *
     * @name Item#fillColor
     * @property
     * @type ?Color
     *
     * @example {@paperscript}
     * // Setting the fill color of a path to red:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * // Set the fill color of the circle to RGB red:
     * circle.fillColor = new Color(1, 0, 0);
     */

    /**
     * The fill-rule with which the shape gets filled. Please note that only
     * modern browsers support fill-rules other than `'nonzero'`.
     *
     * @name Item#fillRule
     * @property
     * @type String
     * @values 'nonzero', 'evenodd'
     * @default 'nonzero'
     */

    /**
     * {@grouptitle Shadow Style}
     *
     * The shadow color.
     *
     * @property
     * @name Item#shadowColor
     * @type ?Color
     *
     * @example {@paperscript}
     * // Creating a circle with a black shadow:
     *
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35,
     *     fillColor: 'white',
     *     // Set the shadow color of the circle to RGB black:
     *     shadowColor: new Color(0, 0, 0),
     *     // Set the shadow blur radius to 12:
     *     shadowBlur: 12,
     *     // Offset the shadow by { x: 5, y: 5 }
     *     shadowOffset: new Point(5, 5)
     * });
     */

    /**
     * The shadow's blur radius.
     *
     * @property
     * @name Item#shadowBlur
     * @type Number
     * @default 0
     */

    /**
     * The shadow's offset.
     *
     * @property
     * @name Item#shadowOffset
     * @type Point
     * @default 0
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
     * @type ?Color
     */
}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
    var rotate = key === 'rotate';
    this[key] = function(/* value, center */) {
        var args = arguments,
            value = (rotate ? Base : Point).read(args),
            center = Point.read(args, 0, { readNull: true });
        return this.transform(new Matrix()[key](value,
                center || this.getPosition(true)));
    };
}, /** @lends Item# */{
    /**
     * {@grouptitle Transform Functions}
     *
     * Translates (moves) the item by the given offset views.
     *
     * @param {Point} delta the offset to translate the item by
     */
    translate: function(/* delta */) {
        var mx = new Matrix();
        return this.transform(mx.translate.apply(mx, arguments));
    },

    /**
     * Rotates the item by a given angle around the given center point.
     *
     * Angles are oriented clockwise and measured in degrees.
     *
     * @name Item#rotate
     * @function
     * @param {Number} angle the rotation angle
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#rotate(angle[, center])
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
     *     center: view.center,
     *     radius: 5,
     *     fillColor: 'white'
     * });
     *
     * // Each frame rotate the path 3 degrees around the center point
     * // of the view:
     * function onFrame(event) {
     *     path.rotate(3, view.center);
     * }
     */

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
     *     center: [80, 50],
     *     radius: 20,
     *     fillColor: 'red'
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
     *     center: [80, 50],
     *     radius: 20,
     *     fillColor: 'red'
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
     *     center: [100, 50],
     *     radius: 20,
     *     fillColor: 'red'
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
     * @param {Point} shear the horizontal and vertical shear factors as a point
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#shear(shear[, center])
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
     * @see Matrix#shear(hor, ver[, center])
     */

    /**
     * Skews the item by the given angles from its center point, or optionally
     * by a supplied point.
     *
     * @name Item#skew
     * @function
     * @param {Point} skew the horizontal and vertical skew angles in degrees
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#shear(skew[, center])
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
     * @see Matrix#shear(hor, ver[, center])
     */

    /**
     * Transform the item.
     *
     * @param {Matrix} matrix the matrix by which the item shall be transformed
     */
    // TODO: Implement flags:
    // @param {String[]} flags array of any of the following: 'objects',
    //        'children', 'fill-gradients', 'fill-patterns', 'stroke-patterns',
    //        'lines'. Default: ['objects', 'children']
    transform: function(matrix, _applyRecursively, _setApplyMatrix) {
        var _matrix = this._matrix,
            transformMatrix = matrix && !matrix.isIdentity(),
            // If no matrix is provided, or the matrix is the identity, we might
            // still have some work to do: _setApplyMatrix or _applyRecursively.
            applyMatrix = (
                _setApplyMatrix && this._canApplyMatrix ||
                this._applyMatrix && (
                    // Don't apply _matrix if the result of concatenating with
                    // matrix would be identity.
                    transformMatrix || !_matrix.isIdentity() ||
                    // Even if it's an identity matrix, we may still need to
                    // recursively apply the matrix to children.
                    _applyRecursively && this._children
                )
            );
        // Bail out if there is nothing to do.
        if (!transformMatrix && !applyMatrix)
            return this;
        // Simply prepend the internal matrix with the passed one:
        if (transformMatrix) {
            // Keep a backup of the last valid state before the matrix becomes
            // non-invertible. This is then used again in setBounds to restore.
            if (!matrix.isInvertible() && _matrix.isInvertible())
                _matrix._backup = _matrix.getValues();
            // Pass `true` for _dontNotify, as we're handling this after.
            _matrix.prepend(matrix, true);
            // When a new matrix was applied, we also need to transform gradient
            // color points. These always need transforming, regardless of
            // #applyMatrix, as they are defined in the parent's coordinate
            // system.
            // TODO: Introduce options to control whether fills should be
            // transformed or not.
            var style = this._style,
                // Pass true for _dontMerge so we don't recursively transform
                // styles on groups' children.
                fillColor = style.getFillColor(true),
                strokeColor = style.getStrokeColor(true);
            if (fillColor)
                fillColor.transform(matrix);
            if (strokeColor)
                strokeColor.transform(matrix);
        }
        // Call #_transformContent() now, if we need to directly apply the
        // internal _matrix transformations to the item's content.
        // Application is not possible on Raster, PointText, SymbolItem, since
        // the matrix is where the actual transformation state is stored.

        if (applyMatrix && (applyMatrix = this._transformContent(
                _matrix, _applyRecursively, _setApplyMatrix))) {
            // Pivot is provided in the parent's coordinate system, so transform
            // it along too.
            var pivot = this._pivot;
            if (pivot)
                _matrix._transformPoint(pivot, pivot, true);
            // Reset the internal matrix to the identity transformation if
            // it was possible to apply it, but do not notify owner of change.
            _matrix.reset(true);
            // Set the internal _applyMatrix flag to true if we're told to
            // do so
            if (_setApplyMatrix && this._canApplyMatrix)
                this._applyMatrix = true;
        }
        // Calling _changed will clear _bounds and _position, but depending
        // on matrix we can calculate and set them again, so preserve them.
        var bounds = this._bounds,
            position = this._position;
        if (transformMatrix || applyMatrix) {
            this._changed(/*#=*/Change.MATRIX);
        }
        // Detect matrices that contain only translations and scaling
        // and transform the cached _bounds and _position without having to
        // fully recalculate each time.
        var decomp = transformMatrix && bounds && matrix.decompose();
        if (decomp && decomp.skewing.isZero() && decomp.rotation % 90 === 0) {
            // Transform the old bound by looping through all the cached
            // bounds in _bounds and transform each.
            for (var key in bounds) {
                var cache = bounds[key];
                // If any item involved in the determination of these bounds has
                // non-scaling strokes, or if a scaling matrix is applied to
                // the content without scaling its strokes, delete the cache
                // now as it can't be preserved through the transformation.
                if (cache.nonscaling || applyMatrix && cache.stroke
                        && !decomp.scaling.abs().equals([1, 1])) {
                    delete bounds[key];
                } else if (applyMatrix || !cache.internal) {
                    // If these are internal bounds, only transform them if this
                    // item applied its matrix.
                    var rect = cache.rect;
                    matrix._transformBounds(rect, rect);
                }
            }
            this._bounds = bounds;
            // If we have cached bounds, try to determine _position as its
            // center. Use _boundsOptions do get the cached default bounds.
            var cached = bounds[this._getBoundsCacheKey(
                this._boundsOptions || {})];
            if (cached) {
                // use this method to handle pivot case (see #1503)
                this._position = this._getPositionFromBounds(cached.rect);
            }
        } else if (transformMatrix && position && this._pivot) {
            // If the item has a pivot defined, it means that the default
            // position defined as the center of the bounds won't shift with
            // arbitrary transformations and we can therefore update _position:
            this._position = matrix._transformPoint(position, position);
        }
        // Allow chaining here, since transform() is related to Matrix functions
        return this;
    },

    _transformContent: function(matrix, applyRecursively, setApplyMatrix) {
        var children = this._children;
        if (children) {
            for (var i = 0, l = children.length; i < l; i++) {
                children[i].transform(matrix, applyRecursively, setApplyMatrix);
            }
            return true;
        }
    },

    /**
     * Converts the specified point from global project coordinate space to the
     * item's own local coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    globalToLocal: function(/* point */) {
        return this.getGlobalMatrix(true)._inverseTransform(
                Point.read(arguments));
    },

    /**
     * Converts the specified point from the item's own local coordinate space
     * to the global project coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    localToGlobal: function(/* point */) {
        return this.getGlobalMatrix(true)._transformPoint(
                Point.read(arguments));
    },

    /**
     * Converts the specified point from the parent's coordinate space to
     * item's own local coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    parentToLocal: function(/* point */) {
        return this._matrix._inverseTransform(Point.read(arguments));
    },

    /**
     * Converts the specified point from the item's own local coordinate space
     * to the parent's coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    localToParent: function(/* point */) {
        return this._matrix._transformPoint(Point.read(arguments));
    },

    /**
     * Transform the item so that its {@link #bounds} are centered in the
     * specified rectangle and fitted to it as described by `fit`.
     *
     * @param {Rectangle} rectangle
     * @param {String|Boolean} [fit='contain'] how to fit the item, as in CSS's
     * `object-fit`: `'contain'` fits all of it within the rectangle, `'cover'`
     * makes it cover the whole rectangle, and `'fill'` stretches it to the
     * rectangle, changing its aspect ratio. The deprecated `true` and `false`
     * stand for `'cover'` and `'contain'`.
     *
     * @example {@paperscript height=100}
     * // Fitting an item to the bounding rectangle of another item's bounding
     * // rectangle:
     *
     * // Create a rectangle shaped path with its top left corner
     * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
     * var path = new Path.Rectangle({
     *     point: [80, 25],
     *     size: [75, 50],
     *     fillColor: 'black'
     * });
     *
     * // Create a circle shaped path with its center at {x: 80, y: 50}
     * // and a radius of 30.
     * var circlePath = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * // Fit the circlePath to the bounding rectangle of
     * // the rectangular path:
     * circlePath.fitBounds(path.bounds);
     *
     * @example {@paperscript height=100}
     * // Fitting an item to the bounding rectangle of another item's bounding
     * // rectangle, covering all of it:
     *
     * // Create a rectangle shaped path with its top left corner
     * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
     * var path = new Path.Rectangle({
     *     point: [80, 25],
     *     size: [75, 50],
     *     fillColor: 'black'
     * });
     *
     * // Create a circle shaped path with its center at {x: 80, y: 50}
     * // and a radius of 30.
     * var circlePath = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * // Fit the circlePath to the bounding rectangle of
     * // the rectangular path:
     * circlePath.fitBounds(path.bounds, 'cover');
     *
     * @example {@paperscript height=200}
     * // Fitting an item to the bounding rectangle of the view
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * // Fit the path to the bounding rectangle of the view:
     * path.fitBounds(view.bounds);
     */
    fitBounds: function(rectangle, fit) {
        rectangle = Rectangle.read(arguments);
        fit = Base.read(arguments);
        // TODO: Remove the boolean values in 1.0.0? (deprecated October 2026)
        if (fit === true)
            fit = 'cover';
        var bounds = this.getBounds(),
            hor = rectangle.width / bounds.width,
            ver = rectangle.height / bounds.height,
            size;

        // Empty sides of the item or the rectangle give ratios of Infinity or
        // 0, which can't scale it, so only use the others:
        function isScaling(ratio) {
            return ratio > 0 && isFinite(ratio);
        }

        if (fit === 'fill') {
            size = new Size(
                isScaling(hor) ? rectangle.width : bounds.width,
                isScaling(ver) ? rectangle.height : bounds.height);
        } else {
            var ratios = [hor, ver].filter(isScaling),
                scale = !ratios.length ? 1
                    : fit === 'cover' ? Math.max.apply(Math, ratios)
                    : Math.min.apply(Math, ratios);
            size = bounds.getSize().multiply(scale);
        }
        this.setBounds(new Rectangle(new Point(), size)
                .setCenter(rectangle.getCenter()));
    }
}), /** @lends Item# */{
    /**
     * {@grouptitle Event Handlers}
     *
     * Item level handler function to be called on each frame of an animation.
     * The function receives an event object which contains information about
     * the frame event:
     *
     * @option event.count {Number} the number of times the frame event was
     *     fired
     * @option event.time {Number} the total amount of time passed since the
     *     first frame event in seconds
     * @option event.delta {Number} the time passed in seconds since the last
     *     frame event
     *
     * @name Item#onFrame
     * @property
     * @type ?Function
     * @see View#onFrame
     *
     * @example {@paperscript}
     * // Creating an animation:
     *
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * path.onFrame = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     this.rotate(3);
     * }
     */

    /**
     * The function to be called when the mouse button is pushed down on the
     * item. The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseDown
     * @property
     * @type ?Function
     * @see View#onMouseDown
     *
     * @example {@paperscript}
     * // Press the mouse button down on the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is pressed on the item,
     * // set its fill color to red:
     * path.onMouseDown = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * @example {@paperscript}
     * // Press the mouse on the circle shaped paths to remove them:
     *
     * // Loop 30 times:
     * for (var i = 0; i < 30; i++) {
     *     // Create a circle shaped path at a random position
     *     // in the view:
     *     var path = new Path.Circle({
     *         center: Point.random() * view.size,
     *         radius: 25,
     *         fillColor: 'black',
     *         strokeColor: 'white'
     *     });
     *
     *     // When the mouse is pressed on the item, remove it:
     *     path.onMouseDown = function(event) {
     *         this.remove();
     *     }
     * }
     */

    /**
     * The function to be called when the mouse position changes while the mouse
     * is being dragged over the item. The function receives a {@link
     * MouseEvent} object which contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseDrag
     * @property
     * @type ?Function
     * @see View#onMouseDrag
     *
     * @example {@paperscript height=240}
     * // Press and drag the mouse on the blue circle to move it:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 50,
     *     fillColor: 'blue'
     * });
     *
     * // Install a drag event handler that moves the path along.
     * path.onMouseDrag = function(event) {
     *     path.position += event.delta;
     * }
     */

    /**
     * The function to be called when the mouse button is released over the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseUp
     * @property
     * @type ?Function
     * @see View#onMouseUp
     *
     * @example {@paperscript}
     * // Release the mouse button over the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is released over the item,
     * // set its fill color to red:
     * path.onMouseUp = function(event) {
     *     this.fillColor = 'red';
     * }
     */

    /**
     * The function to be called when the mouse clicks on the item. The function
     * receives a {@link MouseEvent} object which contains information about the
     * mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onClick
     * @property
     * @type ?Function
     * @see View#onClick
     *
     * @example {@paperscript}
     * // Click on the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is clicked on the item,
     * // set its fill color to red:
     * path.onClick = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * @example {@paperscript}
     * // Click on the circle shaped paths to remove them:
     *
     * // Loop 30 times:
     * for (var i = 0; i < 30; i++) {
     *     // Create a circle shaped path at a random position
     *     // in the view:
     *     var path = new Path.Circle({
     *         center: Point.random() * view.size,
     *         radius: 25,
     *         fillColor: 'black',
     *         strokeColor: 'white'
     *     });
     *
     *     // When the mouse clicks on the item, remove it:
     *     path.onClick = function(event) {
     *         this.remove();
     *     }
     * }
     */

    /**
     * The function to be called when the mouse double clicks on the item. The
     * function receives a {@link MouseEvent} object which contains information
     * about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onDoubleClick
     * @property
     * @type ?Function
     * @see View#onDoubleClick
     *
     * @example {@paperscript}
     * // Double click on the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is double clicked on the item,
     * // set its fill color to red:
     * path.onDoubleClick = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * @example {@paperscript}
     * // Double click on the circle shaped paths to remove them:
     *
     * // Loop 30 times:
     * for (var i = 0; i < 30; i++) {
     *     // Create a circle shaped path at a random position
     *     // in the view:
     *     var path = new Path.Circle({
     *         center: Point.random() * view.size,
     *         radius: 25,
     *         fillColor: 'black',
     *         strokeColor: 'white'
     *     });
     *
     *     // When the mouse is double clicked on the item, remove it:
     *     path.onDoubleClick = function(event) {
     *         this.remove();
     *     }
     * }
     */

    /**
     * The function to be called repeatedly while the mouse moves over the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseMove
     * @property
     * @type ?Function
     * @see View#onMouseMove
     *
     * @example {@paperscript}
     * // Move over the circle shaped path, to change its opacity:
     *
     * // Create a circle shaped path at the center of the view:
     *     var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     *     });
     *
     * // When the mouse moves on top of the item, set its opacity
     * // to a random value between 0 and 1:
     * path.onMouseMove = function(event) {
     *     this.opacity = Math.random();
     * }
     */

    /**
     * The function to be called when the mouse moves over the item. This
     * function will only be called again, once the mouse moved outside of the
     * item first. The function receives a {@link MouseEvent} object which
     * contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseEnter
     * @property
     * @type ?Function
     * @see View#onMouseEnter
     *
     * @example {@paperscript}
     * // When you move the mouse over the item, its fill color is set to red.
     * // When you move the mouse outside again, its fill color is set back
     * // to black.
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse enters the item, set its fill color to red:
     * path.onMouseEnter = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * // When the mouse leaves the item, set its fill color to black:
     * path.onMouseLeave = function(event) {
     *     this.fillColor = 'black';
     * }
     * @example {@paperscript}
     * // When you click the mouse, you create new circle shaped items. When you
     * // move the mouse over the item, its fill color is set to red. When you
     * // move the mouse outside again, its fill color is set back
     * // to black.
     *
     * function enter(event) {
     *     this.fillColor = 'red';
     * }
     *
     * function leave(event) {
     *     this.fillColor = 'black';
     * }
     *
     * // When the mouse is pressed:
     * function onMouseDown(event) {
     *     // Create a circle shaped path at the position of the mouse:
     *     var path = new Path.Circle(event.point, 25);
     *     path.fillColor = 'black';
     *
     *     // When the mouse enters the item, set its fill color to red:
     *     path.onMouseEnter = enter;
     *
     *     // When the mouse leaves the item, set its fill color to black:
     *     path.onMouseLeave = leave;
     * }
     */

    /**
     * The function to be called when the mouse moves out of the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseLeave
     * @property
     * @type ?Function
     * @see View#onMouseLeave
     *
     * @example {@paperscript}
     * // Move the mouse over the circle shaped path and then move it out
     * // of it again to set its fill color to red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse leaves the item, set its fill color to red:
     * path.onMouseLeave = function(event) {
     *     this.fillColor = 'red';
     * }
     */

    /**
     * {@grouptitle Event Handling}
     *
     * Attaches an event handler to the item.
     *
     * @name Item#on
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @param {Function} function the function to be called when the event
     *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
     *     sole argument
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     *
     * @example {@paperscript}
     * // Change the fill color of the path to red when the mouse enters its
     * // shape and back to black again, when it leaves its shape.
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse enters the item, set its fill color to red:
     * path.on('mouseenter', function() {
     *     this.fillColor = 'red';
     * });
     *
     * // When the mouse leaves the item, set its fill color to black:
     * path.on('mouseleave', function() {
     *     this.fillColor = 'black';
     * });
     */
    /**
     * Attaches one or more event handlers to the item.
     *
     * @name Item#on
     * @function
     * @param {Object} object an object containing one or more of the following
     *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
     *     doubleclick, mousemove, mouseenter, mouseleave}
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     *
     * @example {@paperscript}
     * // Change the fill color of the path to red when the mouse enters its
     * // shape and back to black again, when it leaves its shape.
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25
     * });
     * path.fillColor = 'black';
     *
     * // When the mouse enters the item, set its fill color to red:
     * path.on({
     *     mouseenter: function(event) {
     *         this.fillColor = 'red';
     *     },
     *     mouseleave: function(event) {
     *         this.fillColor = 'black';
     *     }
     * });
     * @example {@paperscript}
     * // When you click the mouse, you create new circle shaped items. When you
     * // move the mouse over the item, its fill color is set to red. When you
     * // move the mouse outside again, its fill color is set black.
     *
     * var pathHandlers = {
     *     mouseenter: function(event) {
     *         this.fillColor = 'red';
     *     },
     *     mouseleave: function(event) {
     *         this.fillColor = 'black';
     *     }
     * }
     *
     * // When the mouse is pressed:
     * function onMouseDown(event) {
     *     // Create a circle shaped path at the position of the mouse:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 25,
     *         fillColor: 'black'
     *     });
     *
     *     // Attach the handers inside the object literal to the path:
     *     path.on(pathHandlers);
     * }
     */

    /**
     * Detach an event handler from the item.
     *
     * @name Item#off
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @param {Function} function the function to be detached
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     */
    /**
     * Detach one or more event handlers to the item.
     *
     * @name Item#off
     * @function
     * @param {Object} object an object containing one or more of the following
     *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
     *     doubleclick, mousemove, mouseenter, mouseleave}
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     */

    /**
     * Emit an event on the item.
     *
     * @name Item#emit
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */

    /**
     * Check if the item has one or more event handlers of the specified type.
     *
     * @name Item#responds
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @return {Boolean} {@true if the item has one or more event handlers of
     * the specified type}
     */

    /**
     * Private method that sets Path related styles on the canvas context.
     * Not defined in Path as it is required by other classes too,
     * e.g. PointText.
     */
    _setStyles: function(ctx, param, viewMatrix, strokeMatrix, style) {
        // We can access internal properties since we're only using this on
        // items without children, where styles would be merged. Text passes
        // the style of each of its runs.
        var matrix = this._matrix;
        style = style || this._style;
        if (style.hasFill()) {
            ctx.fillStyle = style.getFillColor().toCanvasStyle(ctx, matrix,
                    strokeMatrix);
        }
        if (style.hasStroke()) {
            ctx.strokeStyle = style.getStrokeColor().toCanvasStyle(ctx,
                    matrix, strokeMatrix);
            ctx.lineWidth = style.getStrokeWidth();
            var strokeJoin = style.getStrokeJoin(),
                strokeCap = style.getStrokeCap(),
                miterLimit = style.getMiterLimit();
            if (strokeJoin)
                ctx.lineJoin = strokeJoin;
            if (strokeCap)
                ctx.lineCap = strokeCap;
            if (miterLimit)
                ctx.miterLimit = miterLimit;
            var dashArray = style.getDashArray();
            if (dashArray && dashArray.length) {
                ctx.setLineDash(dashArray);
                ctx.lineDashOffset = style.getDashOffset();
            }
        }
        // The shadow is the item's, also for text, which passes the styles of
        // its runs. Items whose shadow is cast when compositing them don't
        // draw it, see #draw():
        if (this._style.hasShadow() && !param.dontShadow)
            this._setShadow(ctx, param, viewMatrix);
    },

    /**
     * Private method that fills and strokes the path defined on the canvas
     * context, shared by Path, CompoundPath and Shape.
     */
    _paint: function(ctx, param, viewMatrix, strokeMatrix) {
        var style = this._style,
            hasFill = style.hasFill(),
            hasStroke = style.hasStroke();
        if (hasFill || hasStroke) {
            var isStrokeFirst = hasStroke && style.getPaintOrder() === 'stroke';
            this._setStyles(ctx, param, viewMatrix, strokeMatrix);
            // If shadowColor is defined, clear it after the first paint, so it
            // won't be applied to both fill and stroke.
            if (isStrokeFirst) {
                ctx.stroke();
                ctx.shadowColor = 'rgba(0,0,0,0)';
            }
            if (hasFill) {
                ctx.fill(style.getFillRule());
                ctx.shadowColor = 'rgba(0,0,0,0)';
            }
            if (hasStroke && !isStrokeFirst)
                ctx.stroke();
        }
    },

    _setShadow: function(ctx, param, viewMatrix) {
        // In Canvas, shadows unfortunately ignore all transformations
        // completely. As almost no browser supports ctx.currentTransform,
        // we need to calculate our own here, and then use it to transform
        // the shadow-blur and offset accordingly.
        var style = this._style,
            pixelRatio = param.pixelRatio || 1,
            mx = viewMatrix._shiftless().prepend(
                new Matrix().scale(pixelRatio, pixelRatio)),
            // Transform the blur value as a vector and use its new length:
            blur = mx.transform(new Point(style.getShadowBlur(), 0)),
            offset = mx.transform(this.getShadowOffset());
        ctx.shadowColor = style.getShadowColor().toCanvasStyle(ctx);
        ctx.shadowBlur = blur.getLength();
        ctx.shadowOffsetX = offset.x;
        ctx.shadowOffsetY = offset.y;
    },

    draw: function(ctx, param, parentStrokeMatrix) {
        // Each time the project gets drawn, it's _updateVersion is increased.
        // Keep the _updateVersion of drawn items in sync, so we have an easy
        // way to know for which selected items we need to draw selection info.
        var updateVersion = this._updateVersion = this._project._updateVersion;
        // Now bail out if no actual drawing is required.
        if (!this._visible || this._opacity === 0)
            return;
        // Keep calculating the current global matrix, by keeping a history
        // and pushing / popping as we go along.
        var matrices = param.matrices,
            viewMatrix = param.viewMatrix,
            matrix = this._matrix,
            parentMatrix = matrices[matrices.length - 1],
            globalMatrix = parentMatrix.appended(matrix);
        // If this item is not invertible, do not draw it. It appears to be a
        // good idea generally to not draw in such circumstances, e.g. SVG
        // handles it the same way.
        if (!globalMatrix.isInvertible())
            return;

        // Since globalMatrix does not take the view's matrix into account (we
        // could have multiple views with different zooms), we may have to
        // prepend the view's matrix.
        // NOTE: viewMatrix is only provided if it isn't the identity matrix.
        viewMatrix = viewMatrix ? viewMatrix.appended(globalMatrix)
                : globalMatrix;

        // Only keep track of transformation if told so. See Project#draw()
        matrices.push(globalMatrix);
        if (param.updateMatrix) {
            // Remember the parent's global matrix that this one is built from,
            // see getGlobalMatrix(). Layers start from identity, not a parent.
            this._globalMatrix = globalMatrix;
            this._parentGlobalMatrix = this._parent && parentMatrix;
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
            opacity = Numerical.clamp(this._opacity, 0, 1),
            normalBlend = blendMode === 'normal',
            nativeBlend = BlendMode.nativeModes[blendMode],
            style = this._style,
            // Canvas fills and strokes separately, so items with both can only
            // cast the shadow of one. Draw them on a temporary canvas, and cast
            // the shadow when compositing it, which native blending can. Pass
            // true for _dontMerge, as groups don't draw the shadows of their
            // children (#892):
            shadow = (normalBlend || nativeBlend)
                    && style.getShadowColor(true) && style.hasShadow()
                    && style.hasFill() && style.hasStroke(),
            // Determine if we can draw directly, or if we need to draw into a
            // separate canvas and then composite onto the main canvas.
            direct = !shadow && (normalBlend && opacity === 1
                        && !this._isolated
                    // If native blending is possible, see if the item allows it
                    || (nativeBlend || normalBlend && opacity < 1)
                        && this._canComposite())
                    || param.dontStart // e.g. CompoundPath
                    || param.clip,
            pixelRatio = param.pixelRatio || 1,
            mainCtx, itemOffset, prevOffset;
        if (!direct) {
            // Apply the parent's global matrix to the calculation of correct
            // bounds, and include the item's shadow (#1628).
            var bounds = this.getStrokeBounds(viewMatrix);
            // Pass true for _dontMerge, as groups don't draw the shadows of
            // their children.
            if (style.getShadowColor(true)) {
                // Transform the shadow the same way as in _setStyles(), and
                // cover its blur up to three times the standard deviation,
                // which is half of shadowBlur in Canvas.
                var mx = viewMatrix._shiftless(),
                    blur = mx.transform(
                            new Point(style.getShadowBlur(true), 0)),
                    offset = mx.transform(style.getShadowOffset(true));
                bounds = bounds.unite(
                    new Rectangle(bounds.getPoint().add(offset),
                        bounds.getSize()).expand(blur.getLength() * 3));
            }
            // Only cover the part of the bounds that is visible on the canvas
            // that we're drawing into (#1644). NOTE: Item#rasterize() doesn't
            // set param.offset, so new Point() turns it into 0, 0.
            var canvas = ctx.canvas;
            bounds = bounds.intersect(
                    new Rectangle(new Point(param.offset),
                        new Size(canvas.width, canvas.height)
                            .divide(pixelRatio)));
            if (bounds.width <= 0 || bounds.height <= 0) {
                // Item won't be drawn so its global matrix need to be removed
                // from the stack (#1561).
                matrices.pop();
                return;
            }
            // Store previous offset and save the main context, so we can
            // draw onto it later.
            prevOffset = param.offset;
            // Floor the offset and ceil the size, so we don't cut off any
            // antialiased pixels when drawing onto the temporary canvas.
            itemOffset = param.offset = bounds.getTopLeft().floor();
            // Set ctx to the context of the temporary canvas, so we draw onto
            // it, instead of the mainCtx.
            mainCtx = ctx;
            ctx = CanvasProvider.getContext(bounds.getSize().ceil().add(1)
                    .multiply(pixelRatio));
            if (pixelRatio !== 1)
                ctx.scale(pixelRatio, pixelRatio);
        }
        ctx.save();
        // Get the transformation matrix for non-scaling strokes.
        var strokeMatrix = parentStrokeMatrix
                ? parentStrokeMatrix.appended(matrix)
                // pass `true` for dontMerge
                : this._canScaleStroke && !this.getStrokeScaling(true)
                    && viewMatrix,
            // If we're drawing into a separate canvas and a clipItem is defined
            // for the current rendering loop, we need to draw the clip item
            // again.
            clip = !direct && param.clipItem,
            // If we're drawing with a strokeMatrix, the CTM is reset either way
            // so we don't need to set it, except when we also have to draw a
            // clipItem.
            transform = !strokeMatrix || clip;
        // If drawing directly, handle opacity and native blending now,
        // otherwise we will do it later when the temporary canvas is composited.
        if (direct) {
            ctx.globalAlpha = opacity;
            if (nativeBlend)
                ctx.globalCompositeOperation = blendMode;
        } else if (transform) {
            // Translate the context so the topLeft of the item is at (0, 0)
            // on the temporary canvas.
            ctx.translate(-itemOffset.x, -itemOffset.y);
        }
        if (clip) {
            // The clip item is a sibling of this item, so draw it with the
            // parent's matrices before applying this item's matrix (#1594):
            (param.viewMatrix ? param.viewMatrix.appended(parentMatrix)
                    : parentMatrix).applyToContext(ctx);
            param.clipItem.draw(ctx, param.extend({
                clip: true,
                matrices: matrices.slice(0, -1)
            }));
            matrix.applyToContext(ctx);
        } else if (transform) {
            // Apply viewMatrix when drawing into temporary canvas.
            (direct ? matrix : viewMatrix).applyToContext(ctx);
        }
        if (strokeMatrix) {
            // Reset the transformation but take HiDPI pixel ratio into account.
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            // Also offset again when drawing non-directly.
            // NOTE: Don't use itemOffset since offset might be from the parent,
            // e.g. CompoundPath
            var offset = param.offset;
            if (offset)
                ctx.translate(-offset.x, -offset.y);
        }
        this._draw(ctx, shadow && !direct
                ? param.extend({ dontShadow: true }) : param,
                viewMatrix, strokeMatrix);
        ctx.restore();
        matrices.pop();
        if (param.clip && !param.dontFinish) {
            // Pass fill-rule to handle clipping with compound-paths (#1361).
            ctx.clip(this.getFillRule());
        }
        // If a temporary canvas was created, composite it onto the main canvas:
        if (!direct) {
            if (shadow) {
                mainCtx.save();
                this._setShadow(mainCtx, param, viewMatrix);
            }
            // Use BlendMode.process even for processing normal blendMode with
            // opacity.
            BlendMode.process(blendMode, ctx, mainCtx, opacity,
                    // Calculate the pixel offset of the temporary canvas to the
                    // main canvas. We also need to factor in the pixel-ratio.
                    itemOffset.subtract(prevOffset).multiply(pixelRatio));
            if (shadow)
                mainCtx.restore();
            // Return the temporary context, so it can be reused
            CanvasProvider.release(ctx);
            // Restore previous offset.
            param.offset = prevOffset;
        }
    },

    /**
     * Checks the _updateVersion of the item to see if it got drawn in the draw
     * loop. If the version is out of sync, the item is either not in the scene
     * graph anymore or is invisible.
     */
    _isUpdated: function(updateVersion) {
        var parent = this._parent;
        // For compound-paths, use the _updateVersion of the parent, because the
        // shape gets drawn at once at might get cached (e.g. Path2D soon).
        if (parent instanceof CompoundPath)
            return parent._isUpdated(updateVersion);
        // In case a parent is visible but isn't drawn (e.g. opacity == 0), the
        // _updateVersion of all its children will not be updated, but the
        // children should still be considered updated, and selections should be
        // drawn for them. Excluded are only items with _visible == false:
        var updated = this._updateVersion === updateVersion;
        if (!updated && parent && parent._visible
                && parent._isUpdated(updateVersion)) {
            this._updateVersion = updateVersion;
            updated = true;
        }
        return updated;
    },

    _drawSelection: function(ctx, matrix, size, selectionItems, updateVersion) {
        var selection = this._selection,
            itemSelected = selection & /*#=*/ItemSelection.ITEM,
            boundsSelected = selection & /*#=*/ItemSelection.BOUNDS
                    || itemSelected && this._selectBounds,
            strokeBoundsSelected = selection
                    & /*#=*/ItemSelection.STROKE_BOUNDS,
            positionSelected = selection & /*#=*/ItemSelection.POSITION;
        if (!this._drawSelected)
            itemSelected = false;
        // Items of symbol definitions are drawn too, but aren't inserted:
        if ((itemSelected || boundsSelected || strokeBoundsSelected
                || positionSelected)
                && this._isUpdated(updateVersion) && this.isInserted()) {
            // Allow definition of selected color on a per item and per
            // layer level, with a fallback to #009dec
            var layer,
                color = this.getSelectedColor(true) || (layer = this.getLayer())
                    && layer.getSelectedColor(true),
                mx = matrix.appended(this.getGlobalMatrix(true)),
                half = size / 2;
            ctx.strokeStyle = ctx.fillStyle = color
                    ? color.toCanvasStyle(ctx) : '#009dec';
            if (itemSelected)
                this._drawSelected(ctx, mx, selectionItems);
            if (positionSelected) {
                // Convert position from the parent's coordinates system to the
                // global one:
                var pos = this.getPosition(true),
                    parent = this._parent,
                    point = parent ? parent.localToGlobal(pos) : pos,
                    x = point.x,
                    y = point.y;
                ctx.beginPath();
                ctx.arc(x, y, half, 0, Math.PI * 2, true);
                ctx.stroke();
                var deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]],
                    start = half,
                    end = size + 1;
                for (var i = 0; i < 4; i++) {
                    var delta = deltas[i],
                        dx = delta[0],
                        dy = delta[1];
                    ctx.moveTo(x + dx * start, y + dy * start);
                    ctx.lineTo(x + dx * end, y + dy * end);
                    ctx.stroke();
                }
            }
            var drawBounds = function(bounds) {
                var coords = mx._transformCorners(bounds);
                // Now draw a rectangle that connects the transformed
                // bounds corners, and draw the corners.
                ctx.beginPath();
                for (var i = 0; i < 8; i++) {
                    ctx[!i ? 'moveTo' : 'lineTo'](coords[i], coords[++i]);
                }
                ctx.closePath();
                ctx.stroke();
                for (var i = 0; i < 8; i++) {
                    ctx.fillRect(coords[i] - half, coords[++i] - half,
                            size, size);
                }
            };
            if (boundsSelected)
                drawBounds(this.getInternalBounds());
            if (strokeBoundsSelected)
                drawBounds(this.getBounds({ internal: true, stroke: true }));
        }
    },

    _canComposite: function() {
        return false;
    }
}, Base.each(['down', 'drag', 'up', 'move'], function(key) {
    this['removeOn' + Base.capitalize(key)] = function() {
        var hash = {};
        hash[key] = true;
        return this.removeOn(hash);
    };
}, /** @lends Item# */{
    /**
     * {@grouptitle Remove On Event}
     *
     * Removes the item when the events specified in the passed options object
     * occur.
     *
     * @option options.move {Boolean} remove the item when the next {@link
     *     Tool#onMouseMove} event is fired.
     *
     * @option options.drag {Boolean} remove the item when the next {@link
     *     Tool#onMouseDrag} event is fired.
     *
     * @option options.down {Boolean} remove the item when the next {@link
     *     Tool#onMouseDown} event is fired.
     *
     * @option options.up {Boolean} remove the item when the next {@link
     *     Tool#onMouseUp} event is fired.
     *
     * @name Item#removeOn
     * @function
     * @param {Object} options
     *
     * @example {@paperscript height=200}
     * // Click and drag below:
     * function onMouseDrag(event) {
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // Remove the path on the next onMouseDrag or onMouseDown event:
     *     path.removeOn({
     *         drag: true,
     *         down: true
     *     });
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
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // On the next move event, automatically remove the path:
     *     path.removeOnMove();
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
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // Remove the path, next time the mouse is pressed:
     *     path.removeOnDown();
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
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // On the next drag event, automatically remove the path:
     *     path.removeOnDrag();
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
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // Remove the path, when the mouse is released:
     *     path.removeOnUp();
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
}), /** @lends Item# */{
    /**
     * {@grouptitle Tweening Functions}
     *
     * Tween item between two states.
     *
     * @name Item#tween
     *
     * @option options.duration {Number} the duration of the tweening
     * @option [options.easing='linear'] {Function|String} an easing function or the type
     * of the easing: {@values 'linear' 'easeInQuad' 'easeOutQuad'
     * 'easeInOutQuad' 'easeInCubic' 'easeOutCubic' 'easeInOutCubic'
     * 'easeInQuart' 'easeOutQuart' 'easeInOutQuart' 'easeInQuint'
     * 'easeOutQuint' 'easeInOutQuint' 'easeInSine' 'easeOutSine'
     * 'easeInOutSine' 'easeInExpo' 'easeOutExpo' 'easeInOutExpo'
     * 'easeInCirc' 'easeOutCirc' 'easeInOutCirc'}
     * @option [options.start=true] {Boolean} whether to start tweening automatically
     *
     * @function
     * @param {Object} from the state at the start of the tweening
     * @param {Object} to the state at the end of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @example {@paperscript height=100}
     * // Tween fillColor:
     * var path = new Path.Circle({
     *     radius: view.bounds.height * 0.4,
     *     center: view.center
     * });
     * path.tween(
     *     { fillColor: 'blue' },
     *     { fillColor: 'red' },
     *     3000
     * );
     * @example {@paperscript height=100}
     * // Tween rotation:
     * var path = new Shape.Rectangle({
     *     fillColor: 'red',
     *     center: [50, view.center.y],
     *     size: [60, 60]
     * });
     * path.tween({
     *     rotation: 180,
     *     'position.x': view.bounds.width - 50,
     *     'fillColor.hue': '+= 90'
     * }, {
     *     easing: 'easeInOutCubic',
     *     duration: 2000
     * });
     */
    /**
     * Tween item to a state.
     *
     * @name Item#tween
     *
     * @function
     * @param  {Object} to the state at the end of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @example {@paperscript height=200}
     * // Tween a nested property with relative values
     * var path = new Path.Rectangle({
     *     size: [100, 100],
     *     position: view.center,
     *     fillColor: 'red',
     * });
     *
     * var delta = { x: path.bounds.width / 2, y: 0 };
     *
     * path.tween({
     *     'segments[1].point': ['+=', delta],
     *     'segments[2].point.x': '-= 50'
     * }, 3000);
     *
     * @see Item#tween(from, to, options)
     */
    /**
     * Tween item.
     *
     * @name Item#tween
     *
     * @function
     * @param  {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @see Item#tween(from, to, options)
     *
     * @example {@paperscript height=100}
     * // Start an empty tween and just use the update callback:
     * var path = new Path.Circle({
     *     fillColor: 'blue',
     *     radius: view.bounds.height * 0.4,
     *     center: view.center,
     * });
     * var pathFrom = path.clone({ insert: false })
     * var pathTo = new Path.Rectangle({
     *     position: view.center,
     *     rectangle: path.bounds,
     *     insert: false
     * });
     * path.tween(2000).onUpdate = function(event) {
     *     path.interpolate(pathFrom, pathTo, event.factor)
     * };
     */
    tween: function(from, to, options) {
        if (!options) {
            // If there are only two or one arguments, shift arguments to the
            // left by one (omit `from`):
            options = to;
            to = from;
            from = null;
            if (!options) {
                options = to;
                to = null;
            }
        }
        var easing = options && options.easing,
            start = options && options.start,
            duration = options != null && (
                typeof options === 'number' ? options : options.duration
            ),
            tween = new Tween(this, from, to, duration, easing, start);
        function onFrame(event) {
            tween._handleFrame(event.time * 1000);
            if (!tween.running) {
                this.off('frame', onFrame);
            }
        }
        if (duration) {
            this.on('frame', onFrame);
        }
        return tween;
    },

    /**
     *
     * Tween item to a state.
     *
     * @function
     * @param {Object} to the state at the end of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @see Item#tween(to, options)
     */
    tweenTo: function(to, options) {
        return this.tween(null, to, options);
    },

    /**
     *
     * Tween item from a state to its state before the tweening.
     *
     * @function
     * @param {Object} from the state at the start of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @see Item#tween(from, to, options)
     *
     * @example {@paperscript height=100}
     * // Tween fillColor from red to the path's initial fillColor:
     * var path = new Path.Circle({
     *     fillColor: 'blue',
     *     radius: view.bounds.height * 0.4,
     *     center: view.center
     * });
     * path.tweenFrom({ fillColor: 'red' }, { duration: 1000 });
     */
    tweenFrom: function(from, options) {
        return this.tween(from, null, options);
    }
});
