/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
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
         * An object constant that can be passed to Item#initialize() to avoid
         * insertion into the scene graph.
         *
         * @private
         */
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
            this._events[name] = {
                install: function(type) {
                    this.getView()._countItemEvent(type, 1);
                },

                uninstall: function(type) {
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
    _initialize: function(props, point) {
        // Define this Item's unique id. But allow the creation of internally
        // used paths with no ids.
        var hasProps = props && Base.isPlainObject(props),
            internal = hasProps && props.internal === true,
            matrix = this._matrix = new Matrix(),
            // Allow setting another project than the currently active one.
            project = hasProps && props.project || paper.project,
            settings = paper.settings;
        this._id = internal ? null : UID.get();
        this._parent = this._index = null;
        // Inherit the applyMatrix setting from settings.applyMatrix
        this._applyMatrix = this._canApplyMatrix && settings.applyMatrix;
        // Handle matrix before everything else, to avoid issues with
        // #addChild() calling _changed() and accessing _matrix already.
        if (point)
            matrix.translate(point);
        matrix._owner = this;
        this._style = new Style(project._currentStyle, this, project);
        // Do not add to the project if it's an internal path,  or if
        // props.insert  or settings.isnertItems is false.
        if (internal || hasProps && props.insert === false
            || !settings.insertItems && !(hasProps && props.insert === true)) {
            this._setProject(project);
        } else {
            (hasProps && props.parent || project)
                    ._insertItem(undefined, this, true); // _created = true
        }
        // Filter out Item.NO_INSERT before _set(), for performance reasons.
        if (hasProps && props !== Item.NO_INSERT) {
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
     * @param {ChangeFlag} flags describes what exactly has changed
     */
    _changed: function(flags) {
        var symbol = this._symbol,
            cacheParent = this._parent || symbol,
            project = this._project;
        if (flags & /*#=*/ChangeFlag.GEOMETRY) {
            // Clear cached bounds, position and decomposed matrix whenever
            // geometry changes.
            this._bounds = this._position = this._decomposed =
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
        if (project)
            project._changed(flags, this);
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
        if (name && owner) {
            var children = owner._children,
                namedChildren = owner._namedChildren;
            (namedChildren[name] = namedChildren[name] || []).push(this);
            // Only set this item if there isn't one under the same name already
            if (!(name in children))
                children[name] = this;
        }
        this._name = name || undefined;
        this._changed(/*#=*/ChangeFlag.ATTRIBUTE);
    },

    /**
     * The path style of the item.
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
                // #visible changes apperance
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
     * Specifies whether the item is locked.
     *
     * @name Item#locked
     * @type Boolean
     * @default false
     * @ignore
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
     * are supported. If blend-modes cannot be rendered natively, they are
     * emulated. Be aware that emulation can have an impact on performance.
     *
     * @name Item#blendMode
     * @type String
     * @values 'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-
     *     light', 'color-dodge', 'color-burn', 'darken', 'lighten',
     *     'difference', 'exclusion', 'hue', 'saturation', 'luminosity',
     *     'color', 'add', 'subtract', 'average', 'pin-light', 'negation',
     *     'source- over', 'source-in', 'source-out', 'source-atop',
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
     * item will be drawn at the end as a guide.
     *
     * @name Item#guide
     * @type Boolean
     * @default true
     * @ignore
     */

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

    changeSelection: function(flag, selected) {
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
        this.changeSelection(/*#=*/ItemSelection.ITEM, selected);
    },

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
        this.changeSelection(/*#=*/ItemSelection.ITEM, selected);
    },

    /**
     * Specifies whether the item defines a clip mask. This can only be set on
     * paths, compound paths, and text frame objects, and only if the item is
     * already contained within a clipping group.
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
        getStrokeBounds: { stroke: true },
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
        var bounds = this._getCachedBounds(hasMatrix && matrix, opts);
        // If we're returning '#bounds', create a LinkedRectangle that uses
        // the setBounds() setter to update the Item whenever the bounds are
        // changed:
        return !arguments.length
                ? new LinkedRectangle(bounds.x, bounds.y, bounds.width,
                        bounds.height, this, 'setBounds')
                : bounds;
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
        // Scale to new Size, if size changes and avoid divisions by 0:
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
                    bounds.width !== 0 ? rect.width / bounds.width : 0,
                    bounds.height !== 0 ? rect.height / bounds.height : 0);
        }
        // Translate to bounds center:
        center = bounds.getCenter();
        matrix.translate(-center.x, -center.y);
        // Now execute the transformation
        this.transform(matrix);
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

    /**
     * Private method that deals with the calling of _getBounds, recursive
     * matrix concatenation and handles all the complicated caching mechanisms.
     */
    _getCachedBounds: function(matrix, options, noInternal) {
        // See if we can cache these bounds. We only cache the bounds
        // transformed with the internally stored _matrix, (the default if no
        // matrix is passed).
        matrix = matrix && matrix._orNullIfIdentity();
        // Do not transform by the internal matrix for internal, untransformed
        // bounds.
        var internal = options.internal && !noInternal,
            cacheItem = options.cacheItem,
            _matrix = internal ? null : this._matrix._orNullIfIdentity(),
            // Create a key for caching, reflecting all bounds options.
            cacheKey = cacheItem && (!matrix || matrix.equals(_matrix)) && [
                options.stroke ? 1 : 0,
                options.handle ? 1 : 0,
                internal ? 1 : 0
            ].join('');
        // NOTE: This needs to happen before returning cached values, since even
        // then, _boundsCache needs to be kept up-to-date.
        Item._updateBoundsCache(this._parent || this._symbol, cacheItem);
        if (cacheKey && this._bounds && cacheKey in this._bounds)
            return this._bounds[cacheKey].rect.clone();
        var bounds = this._getBounds(matrix || _matrix, options);
        // If we can cache the result, update the _bounds cache structure
        // before returning
        if (cacheKey) {
            if (!this._bounds)
                this._bounds = {};
            var cached = this._bounds[cacheKey] = {
                rect: bounds.clone(),
                // Mark as internal, so Item#transform() won't transform it
                internal: internal
            };
        }
        return bounds;
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
            mx = parent ? parent.getViewMatrix().invert() : matrix;
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
         * Gets the combined bounds of all specified items.
         */
        _getBounds: function(items, matrix, options) {
            var x1 = Infinity,
                x2 = -x1,
                y1 = x1,
                y2 = x2;
            options = options || {};
            for (var i = 0, l = items.length; i < l; i++) {
                var item = items[i];
                if (item._visible && !item.isEmpty()) {
                    // Pass true for noInternal, since even when getting
                    // internal bounds for this item, we need to apply the
                    // matrices to its children.
                    var rect = item._getCachedBounds(
                        matrix && matrix.appended(item._matrix), options, true);
                    x1 = Math.min(rect.x, x1);
                    y1 = Math.min(rect.y, y1);
                    x2 = Math.max(rect.x + rect.width, x2);
                    y2 = Math.max(rect.y + rect.height, y2);
                }
            }
            return isFinite(x1)
                    ? new Rectangle(x1, y1, x2 - x1, y2 - y1)
                    : new Rectangle();
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
     * The rough bounding rectangle of the item that is sure to include all of
     * the drawing, including stroke width.
     *
     * @name Item#roughBounds
     * @type Rectangle
     * @ignore
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
            var decomposed = this._decomposed;
            this.scale(scaling.x / current.x, scaling.y / current.y);
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
        matrix.initialize.apply(matrix, arguments);
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
        var matrix = this._globalMatrix,
            updateVersion = this._project._updateVersion;
        // If #_globalMatrix is out of sync, recalculate it now.
        if (matrix && matrix._updateVersion !== updateVersion)
            matrix = null;
        if (!matrix) {
            matrix = this._globalMatrix = this._matrix.clone();
            var parent = this._parent;
            if (parent)
                matrix.prepend(parent.getGlobalMatrix(true));
            matrix._updateVersion = updateVersion;
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
            // Uninstall events before switching project, then install them
            // again.
            // NOTE: _installEvents handles all children too!
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
     * The view that this item belongs to.
     * @type View
     * @bean
     */
    getView: function() {
        return this._project._view;
    },

    /**
     * Overrides Emitter#_installEvents to also call _installEvents on all
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
            // Both `insert` and `deep` are true by default:
            insert = Base.pick(options ? options.insert : undefined,
                    // Also support boolean parameter for insert, default: true.
                    options === undefined || options === true),
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
                '_clipMask', '_guide'];
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
     * Rasterizes the item into a newly created Raster object. The item itself
     * is not removed after rasterization.
     *
     * @param {Number} [resolution=view.resolution] the resolution of the raster
     *     in pixels per inch (DPI). If not specified, the value of
     *     `view.resolution` is used.
     * @param {Boolean} [insert=true] specifies whether the raster should be
     *     inserted into the scene graph. When set to `true`, it is inserted
     *     above the original
     * @return {Raster} the newly created raster item
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
    rasterize: function(resolution, insert) {
        // TODO: Switch to options object for more descriptive call signature.
        var bounds = this.getStrokeBounds(),
            scale = (resolution || this.getView().getResolution()) / 72,
            // Floor top-left corner and ceil bottom-right corner, to never
            // blur or cut pixels.
            topLeft = bounds.getTopLeft().floor(),
            bottomRight = bounds.getBottomRight().ceil(),
            size = new Size(bottomRight.subtract(topLeft)),
            raster = new Raster(Item.NO_INSERT);
        if (!size.isZero()) {
            var canvas = CanvasProvider.getCanvas(size.multiply(scale)),
                ctx = canvas.getContext('2d'),
                matrix = new Matrix().scale(scale).translate(topLeft.negate());
            ctx.save();
            matrix.applyToContext(ctx);
            // See Project#draw() for an explanation of new Base()
            this.draw(ctx, new Base({ matrices: [matrix] }));
            ctx.restore();
            // NOTE: We don't need to release the canvas since it belongs to the
            // raster now!
            raster.setCanvas(canvas);
        }
        raster.transform(new Matrix().translate(topLeft.add(size.divide(2)))
                // Take resolution into account and scale back to original size.
                .scale(1 / scale));
        if (insert === undefined || insert)
            raster.insertAbove(this);
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
     */
    contains: function(/* point */) {
        // See CompoundPath#_contains() for the reason for !!
        return !!this._contains(
                this._matrix._inverseTransform(Point.read(arguments)));
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
        return new Path.Rectangle({
            rectangle: this.getInternalBounds(),
            matrix: this._matrix,
            insert: false,
        });
    },

    // DOCS:
    // TEST:
    /**
     * @param {Item} item the item to check against
     * @return {Boolean}
     */
    intersects: function(item, _matrix) {
        if (!(item instanceof Item))
            return false;
        // Tell getIntersections() to return as soon as some intersections are
        // found, because all we care for here is there are some or none:
        return this._asPathItem().getIntersections(item._asPathItem(), null,
                _matrix, true).length > 0;
    }
},
new function() { // Injection scope for hit-test functions shared with project
    function hitTest(/* point, options */) {
        return this._hitTest(
                Point.read(arguments),
                HitResult.getOptions(arguments));
    }

    function hitTestAll(/* point, options */) {
        var point = Point.read(arguments),
            options = HitResult.getOptions(arguments),
            all = [];
        this._hitTest(point, Base.set({ all: all }, options));
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
     * The options object allows you to control the specifics of the hit-
     * test and may contain a combination of the following values:
     *
     * @name Item#hitTest
     * @function
     *
     * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
     *     {Number} the tolerance of the hit-test
     * @option options.class {Function} only hit-test against a specific item
     *     class, or any of its sub-classes, by providing the constructor
     *     function against which an `instanceof` check is performed:
     *     {@values  Group, Layer, Path, CompoundPath, Shape, Raster,
     *     SymbolItem, PointText, ...}
     * @option options.match {Function} a match function to be called for each
     *     found hit result: Return `true` to return the result, `false` to keep
     *     searching
     * @option [options.fill=true] {Boolean} hit-test the fill of items
     * @option [options.stroke=true] {Boolean} hit-test the stroke of path
     *     items, taking into account the setting of stroke color and width
     * @option [options.segments=true] {Boolean} hit-test for {@link
     *     Segment#point} of {@link Path} items
     * @option options.curves {Boolean} hit-test the curves of path items,
     *     without taking the stroke color or width into account
     * @option options.handles {Boolean} hit-test for the handles ({@link
     *     Segment#handleIn} / {@link Segment#handleOut}) of path segments.
     * @option options.ends {Boolean} only hit-test for the first or last
     *     segment points of open path items
     * @option options.bounds {Boolean} hit-test the corners and side-centers of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.guides {Boolean} hit-test items that have {@link
     *     Item#guide} set to `true`
     * @option options.selected {Boolean} only hit selected items
     *
     * @param {Point} point the point where the hit-test should be performed
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
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     *     tolerance: settings.hitTolerance }]
     * @return {HitResult[]} hit result objects for all hits, describing what
     *     exactly was hit or `null` if nothing was hit
     * @see #hitTest(point[, options]);
     */

    _hitTest: function(point, options, parentViewMatrix) {
        if (this._locked || !this._visible || this._guide && !options.guides
                || this.isEmpty()) {
            return null;
        }

        // Check if the point is withing roughBounds + tolerance, but only if
        // this item does not have children, since we'd have to travel up the
        // chain already to determine the rough bounds.
        var matrix = this._matrix,
            // Keep the accumulated matrices up to this item in options, so we
            // can keep calculating the correct _tolerancePadding values.
            viewMatrix = parentViewMatrix
                    ? parentViewMatrix.appended(matrix)
                    // If this is the first one in the recursion, factor in the
                    // zoom of the view and the globalMatrix of the item.
                    : this.getGlobalMatrix().prepend(this.getView()._matrix),
            // Calculate the transformed padding as 2D size that describes the
            // transformed tolerance circle / ellipse. Make sure it's never 0
            // since we're using it for division (see checkBounds()).
            tolerance = Math.max(options.tolerance, /*#=*/Numerical.EPSILON),
            // Hit-tests are performed in the item's local coordinate space.
            // To calculate the correct 2D padding for tolerance, we therefore
            // need to apply the inverted item matrix.
            tolerancePadding = options._tolerancePadding = new Size(
                    Path._getStrokePadding(tolerance,
                        matrix.inverted()._shiftless()));
        // Transform point to local coordinates.
        point = matrix._inverseTransform(point);
        // If the matrix is non-reversible, point will now be `null`:
        if (!point || !this._children &&
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
            if (hit && match && !match(hit))
                hit = null;
            // If we're collecting all matches, add it to options.all
            if (hit && options.all)
                options.all.push(hit);
            return hit;
        }

        function checkBounds(type, part) {
            var pt = bounds['get' + part]();
            // Since there are transformations, we cannot simply use a numerical
            // tolerance value. Instead, we divide by a padding size, see above.
            if (point.subtract(pt).divide(tolerancePadding).length <= 1) {
                return new HitResult(type, that,
                        { name: Base.hyphenate(part), point: pt });
            }
        }

        // Ignore top level layers by checking for _parent:
        if (checkSelf && (options.center || options.bounds) && this._parent) {
            // Don't get the transformed bounds, check against transformed
            // points instead
            bounds = this.getInternalBounds();
            if (options.center) {
                res = checkBounds('center', 'Center');
            }
            if (!res && options.bounds) {
                // TODO: Move these into a private scope
                var points = [
                    'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
                    'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'
                ];
                for (var i = 0; i < 8 && !res; i++) {
                    res = checkBounds('bounds', points[i]);
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
                            : viewMatrix.inverted()._shiftless()))
                || null;
        }
        // Transform the point back to the outer coordinate system.
        if (res && res.point) {
            res.point = matrix.transform(res.point);
        }
        return res;
    },

    _hitTestSelf: function(point, options) {
        // The default implementation honly handles 'fill' through #_contains()
        if (options.fill && this.hasFill() && this._contains(point))
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
     * either `options.inside` or `options.overlapping` to a rectangle describing
     * the area in which the items either have to be fully or partly contained.
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
     * @option options.class {Function} the constructor function of the item type
     *     to match against
     * @option options.inside {Rectangle} the rectangle in which the items need to
     *     be fully contained
     * @option options.overlapping {Rectangle} the rectangle with which the items
     *     need to at least partly overlap
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Item[]} the list of matching descendant items
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
     * @param {Object|Function} match the criteria to match against
     * @return {Item} the first descendant item matching the given criteria
     * @see #getItems(match)
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
                    recursive: obj && obj.recursive !== false,
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
                            || param.overlapping && (bounds.contains(rect)
                                || param.path.intersects(child, childMatrix))))
                        add = false;
                }
                if (add && child.matches(options)) {
                    items.push(child);
                    if (firstOnly)
                        break;
                }
                if (param.recursive !== false) {
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
     */
    importJSON: function(json) {
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
     *
     * @param {Object} [options] the export options
     * @return {SVGElement} the item converted to an SVG node
     */

    /**
     * Converts the provided SVG content into Paper.js items and adds them to
     * the this item's children list. Note that the item is not cleared first.
     * You can call {@link Item#removeChildren()} to do so.
     *
     * @name Item#importSVG
     * @function
     *
     * @option [options.expandShapes=false] {Boolean} whether imported shape
     *     items should be expanded to path items
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
            for (var i = items.length - 1; i >= 0; i--) {
                var item = items[i];
                if (!item) {
                    items.splice(i, 1);
                } else {
                    // Notify parent of change. Don't notify item itself yet,
                    // as we're doing so when adding it to the new owner below.
                    item._remove(false, true);
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
                    this._changed(/*#=*/Change.INSERTION);
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
     * @deprecated use {@link #addChild(item)} instead.
     */
    appendTop: '#addChild',

    /**
     * Inserts the specified item as a child of this item by appending it to
     * the list of children and moving it below all other children. You can
     * use this function for groups, compound paths and layers.
     *
     * @param {Item} item the item to be appended as a child
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
     * When passed a project, copies the item to the project,
     * or duplicates it within the same project. When passed an item,
     * copies the item into the specified item.
     *
     * @param {Project|Layer|Group|CompoundPath} owner the item or project to
     * copy the item to
     * @return {Item} the new copy of the item
     */
    copyTo: function(owner) {
        // Pass false for insert, since we're inserting at a specific location.
        return owner._insertItem(undefined, this.clone(false));
    },

    /**
     * If this is a group, layer or compound-path with only one child-item,
     * the child-item is moved outside and the parent is erased. Otherwise, the
     * item itself is returned unmodified.
     *
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
        if (owner) {
            var children = owner._children,
                namedChildren = owner._namedChildren,
                name = this._name,
                namedArray = namedChildren[name],
                index = namedArray ? namedArray.indexOf(this) : -1;
            if (index !== -1) {
                // Remove the named reference
                if (children[name] == this)
                    delete children[name];
                // Remove this entry
                namedArray.splice(index, 1);
                // If there are any items left in the named array, set the first
                // of them to be children[this.name]
                if (namedArray.length) {
                    children[name] = namedArray[0];
                } else {
                    // Otherwise delete the empty array
                    delete namedChildren[name];
                }
            }
        }
    },

    /**
     * Removes the item from its parent's children list.
     */
    _remove: function(notifySelf, notifyParent) {
        var owner = this._getOwner(),
            project = this._project,
            index = this._index;
        if (owner) {
            // Handle named children separately from index:
            if (this._name)
                this._removeNamed();
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
            this._installEvents(false);
            // Notify self of the insertion change. We only need this
            // notification if we're tracking changes for now.
            if (notifySelf && project._changes)
                this._changed(/*#=*/Change.INSERTION);
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
     * Replaces this item with the provided new item which will takes its place
     * in the project hierarchy instead.
     *
     * @return {Boolean} {@true if the item was replaced}
     */
    replaceWith: function(item) {
        var ok = item && item.insertBelow(this);
        if (ok)
            this.remove();
        return ok;
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
     * @return Boolean
     */
    isEmpty: function() {
        var children = this._children;
        return !children || !children.length;
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
     * Checks whether the item has a fill.
     *
     * @return {Boolean} {@true if the item has a fill}
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
     * of the project.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is above the specified item}
     */
    isAbove: function(item) {
        return this._getOrder(item) === -1;
    },

    /**
     * Checks if the item is below the specified item in the stacking order of
     * the project.
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
     * @type Color
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
     * appear as a non-scaling stroke.
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
     * @type Array
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
     * @type Color
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
     * @type Color
     */
}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
    var rotate = key === 'rotate';
    this[key] = function(/* value, center */) {
        var value = (rotate ? Base : Point).read(arguments),
            center = Point.read(arguments, 0, { readNull: true });
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
     * @param {Point} shear the horziontal and vertical shear factors as a point
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
     * @param {Point} skew the horziontal and vertical skew angles in degrees
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
    transform: function(matrix, _applyMatrix, _applyRecursively,
            _setApplyMatrix) {
        // If no matrix is provided, or the matrix is the identity, we might
        // still have some work to do in case _applyMatrix is true
        if (matrix && matrix.isIdentity())
            matrix = null;
        var _matrix = this._matrix,
            applyMatrix = (_applyMatrix || this._applyMatrix)
                    // Don't apply _matrix if the result of concatenating with
                    // matrix would be identity.
                    && ((!_matrix.isIdentity() || matrix)
                        // Even if it's an identity matrix, we still need to
                        // recursively apply the matrix to children.
                        || _applyMatrix && _applyRecursively && this._children);
        // Bail out if there is nothing to do.
        if (!matrix && !applyMatrix)
            return this;
        // Simply prepend the internal matrix with the passed one:
        if (matrix) {
            // Keep a backup of the last valid state before the matrix becomes
            // non-invertible. This is then used again in setBounds to restore.
            if (!matrix.isInvertible() && _matrix.isInvertible())
                _matrix._backup = _matrix.getValues();
            _matrix.prepend(matrix);
        }
        // Call #_transformContent() now, if we need to directly apply the
        // internal _matrix transformations to the item's content.
        // Application is not possible on Raster, PointText, SymbolItem, since
        // the matrix is where the actual transformation state is stored.
        if (applyMatrix = applyMatrix && this._transformContent(_matrix,
                    _applyRecursively, _setApplyMatrix)) {
            // When the _matrix could be applied, we also need to transform
            // color styles (only gradients so far) and pivot point:
            var pivot = this._pivot,
                style = this._style,
                // pass true for _dontMerge so we don't recursively transform
                // styles on groups' children.
                fillColor = style.getFillColor(true),
                strokeColor = style.getStrokeColor(true);
            if (pivot)
                _matrix._transformPoint(pivot, pivot, true);
            if (fillColor)
                fillColor.transform(_matrix);
            if (strokeColor)
                strokeColor.transform(_matrix);
            // Reset the internal matrix to the identity transformation if it
            // was possible to apply it.
            _matrix.reset(true);
            // Set the internal _applyMatrix flag to true if we're told to do so
            if (_setApplyMatrix && this._canApplyMatrix)
                this._applyMatrix = true;
        }
        // Calling _changed will clear _bounds and _position, but depending
        // on matrix we can calculate and set them again, so preserve them.
        var bounds = this._bounds,
            position = this._position;
        // We always need to call _changed since we're caching bounds on all
        // items, including Group.
        this._changed(/*#=*/Change.GEOMETRY);
        // Detect matrices that contain only translations and scaling
        // and transform the cached _bounds and _position without having to
        // fully recalculate each time.
        var decomp = bounds && matrix && matrix.decompose();
        if (decomp && !decomp.shearing && decomp.rotation % 90 === 0) {
            // Transform the old bound by looping through all the cached bounds
            // in _bounds and transform each.
            for (var key in bounds) {
                var cache = bounds[key];
                // If these are internal bounds, only transform them if this
                // item applied its matrix.
                if (applyMatrix || !cache.internal) {
                    var rect = cache.rect;
                    matrix._transformBounds(rect, rect);
                }
            }
            // If we have cached bounds, update _position again as its
            // center. We need to take into account _boundsGetter here too, in
            // case another getter is assigned to it, e.g. 'getStrokeBounds'.
            var getter = this._boundsGetter,
                rect = bounds[getter && getter.getBounds || getter || 'getBounds'];
            if (rect)
                this._position = rect.getCenter(true);
            this._bounds = bounds;
        } else if (matrix && position) {
            // Transform position as well.
            this._position = matrix._transformPoint(position, position);
        }
        // Allow chaining here, since transform() is related to Matrix functions
        return this;
    },

    _transformContent: function(matrix, applyRecursively, setApplyMatrix) {
        var children = this._children;
        if (children) {
            for (var i = 0, l = children.length; i < l; i++)
                children[i].transform(matrix, true, applyRecursively,
                        setApplyMatrix);
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
     * // rectangle with the fill parameter set to true:
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
     * circlePath.fitBounds(path.bounds, true);
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
    fitBounds: function(rectangle, fill) {
        // TODO: Think about passing options with various ways of defining
        // fitting. Compare with InDesign fitting to see possible options.
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
     * @type Function
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
     * @type Function
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
     * @type Function
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
     * @type Function
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
     * @type Function
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
     * @type Function
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
     * @type Function
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
     * @type Function
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
     * @type Function
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
    _setStyles: function(ctx, param, viewMatrix) {
        // We can access internal properties since we're only using this on
        // items without children, where styles would be merged.
        var style = this._style;
        if (style.hasFill()) {
            ctx.fillStyle = style.getFillColor().toCanvasStyle(ctx);
        }
        if (style.hasStroke()) {
            ctx.strokeStyle = style.getStrokeColor().toCanvasStyle(ctx);
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
        if (style.hasShadow()) {
            // In Canvas, shadows unfortunately ignore all transformations
            // completely. As almost no browser supports ctx.currentTransform,
            // we need to calculate our own here, and then use it to transform
            // the shadow-blur and offset accordingly.
            var pixelRatio = param.pixelRatio || 1,
                mx = viewMatrix._shiftless().prepend(
                    new Matrix().scale(pixelRatio, pixelRatio)),
                // Transform the blur value as a vector and use its new length:
                blur = mx.transform(new Point(style.getShadowBlur(), 0)),
                offset = mx.transform(this.getShadowOffset());
            ctx.shadowColor = style.getShadowColor().toCanvasStyle(ctx);
            ctx.shadowBlur = blur.getLength();
            ctx.shadowOffsetX = offset.x;
            ctx.shadowOffsetY = offset.y;
        }
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
            globalMatrix = matrices[matrices.length - 1].appended(matrix);
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
            // Update the cached _globalMatrix and keep it versioned.
            globalMatrix._updateVersion = updateVersion;
            this._globalMatrix = globalMatrix;
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
                    || param.dontStart // e.g. CompoundPath
                    || param.clip
                    // If native blending is possible, see if the item allows it
                    || (nativeBlend || normalBlend && opacity < 1)
                        && this._canComposite(),
            pixelRatio = param.pixelRatio || 1,
            mainCtx, itemOffset, prevOffset;
        if (!direct) {
            // Apply the parent's global matrix to the calculation of correct
            // bounds.
            var bounds = this.getStrokeBounds(viewMatrix);
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
        // Apply globalMatrix when drawing into temporary canvas.
        if (transform) {
            (direct ? matrix : viewMatrix).applyToContext(ctx);
        }
        if (clip) {
            param.clipItem.draw(ctx, param.extend({ clip: true }));
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
        this._draw(ctx, param, viewMatrix, strokeMatrix);
        ctx.restore();
        matrices.pop();
        if (param.clip && !param.dontFinish)
            ctx.clip();
        // If a temporary canvas was created, composite it onto the main canvas:
        if (!direct) {
            // Use BlendMode.process even for processing normal blendMode with
            // opacity.
            BlendMode.process(blendMode, ctx, mainCtx, opacity,
                    // Calculate the pixel offset of the temporary canvas to the
                    // main canvas. We also need to factor in the pixel-ratio.
                    itemOffset.subtract(prevOffset).multiply(pixelRatio));
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
            positionSelected = selection & /*#=*/ItemSelection.POSITION;
        if (!this._drawSelected)
            itemSelected = false;
        if ((itemSelected || boundsSelected || positionSelected)
                && this._isUpdated(updateVersion)) {
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
                var point = this.getPosition(true),
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
            if (boundsSelected) {
                var coords = mx._transformCorners(this.getInternalBounds());
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
            }
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
     * @option options.move {Boolean) remove the item when the next {@link
     *     Tool#onMouseMove} event is fired.
     *
     * @option options.drag {Boolena) remove the item when the next {@link
     *     Tool#onMouseDrag} event is fired.
     *
     * @option options.down {Boolean) remove the item when the next {@link
     *     Tool#onMouseDown} event is fired.
     *
     * @option options.up {Boolean) remove the item when the next {@link
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
}));
