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
 * @name Project
 *
 * @class A Project object in Paper.js is what usually is referred to as the
 * document: The top level object that holds all the items contained in the
 * scene graph. As the term document is already taken in the browser context,
 * it is called Project.
 *
 * Projects allow the manipulation of the styles that are applied to all newly
 * created items, give access to the selected items, and will in future versions
 * offer ways to query for items in the scene graph defining specific
 * requirements, and means to persist and load from different formats, such as
 * SVG and PDF.
 *
 * The currently active project can be accessed through the
 * {@link PaperScope#project} variable.
 *
 * An array of all open projects is accessible through the
 * {@link PaperScope#projects} variable.
 */
var Project = PaperScopeItem.extend(/** @lends Project# */{
    _class: 'Project',
    _list: 'projects',
    _reference: 'project',
    _compactSerialize: true, // Never include the class name for Project

    // TODO: Add arguments to define pages
    /**
     * Creates a Paper.js project containing one empty {@link Layer}, referenced
     * by {@link Project#activeLayer}.
     *
     * Note that when working with PaperScript, a project is automatically
     * created for us and the {@link PaperScope#project} variable points to it.
     *
     * @param {HTMLCanvasElement|String|Size} element the HTML canvas element
     * that should be used as the element for the view, or an ID string by which
     * to find the element, or the size of the canvas to be created for usage in
     * a web worker.
     */
    initialize: function Project(element) {
        // Activate straight away by passing true to PaperScopeItem constructor,
        // so paper.project is set, as required by Layer and DoumentView
        // constructors.
        PaperScopeItem.call(this, true);
        this._children = [];
        this._namedChildren = {};
        this._activeLayer = null;
        this._currentStyle = new Style(null, null, this);
        // If no view is provided, we create a 1x1 px canvas view just so we
        // have something to do size calculations with.
        // (e.g. PointText#_getBounds)
        this._view = View.create(this,
                element || CanvasProvider.getCanvas(1, 1));
        this._selectionItems = {};
        this._selectionCount = 0;
        // See Item#draw() for an explanation of _updateVersion
        this._updateVersion = 0;
        // Change tracking, not in use for now. Activate once required:
        // this._changes = [];
        // this._changesById = {};
    },

    _serialize: function(options, dictionary) {
        // Just serialize layers to an array for now, they will be unserialized
        // into the active project automatically. We might want to add proper
        // project serialization later, but deserialization of a layers array
        // will always work.
        return Base.serialize(this._children, options, true, dictionary);
    },

    /**
     * Private notifier that is called whenever a change occurs in the project.
     *
     * @param {ChangeFlag} flags describes what exactly has changed
     * @param {Item} item the item that has caused the change
     */
    _changed: function(flags, item) {
        if (flags & /*#=*/ChangeFlag.APPEARANCE) {
            var view = this._view;
            if (view) {
                // Never draw changes right away. Simply mark view as "dirty"
                // and request an update through view.requestUpdate().
                view._needsUpdate = true;
                if (!view._requested && view._autoUpdate)
                    view.requestUpdate();
            }
        }
        // Have project keep track of changed items so they can be iterated.
        // This can be used for example to update the SVG tree. Needs to be
        // activated in Project
        var changes = this._changes;
        if (changes && item) {
            var changesById = this._changesById,
                id = item._id,
                entry = changesById[id];
            if (entry) {
                entry.flags |= flags;
            } else {
                changes.push(changesById[id] = { item: item, flags: flags });
            }
        }
    },

    /**
     * Activates this project, so all newly created items will be placed
     * in it.
     *
     * @name Project#activate
     * @function
     */

    /**
     * Clears the project by removing all {@link Project#layers}.
     */
    clear: function() {
        var children = this._children;
        for (var i = children.length - 1; i >= 0; i--)
            children[i].remove();
    },

    /**
     * Checks whether the project has any content or not.
     *
     * @return {Boolean}
     */
    isEmpty: function() {
        return !this._children.length;
    },

    /**
     * Removes this project from the {@link PaperScope#projects} list, and also
     * removes its view, if one was defined.
     */
    remove: function remove() {
        if (!remove.base.call(this))
            return false;
        if (this._view)
            this._view.remove();
        return true;
    },

    /**
     * The reference to the project's view.
     *
     * @bean
     * @type View
     */
    getView: function() {
        return this._view;
    },

    /**
     * The currently active path style. All selected items and newly
     * created items will be styled with this style.
     *
     * @bean
     * @type Style
     *
     * @example {@paperscript}
     * project.currentStyle = {
     *     fillColor: 'red',
     *     strokeColor: 'black',
     *     strokeWidth: 5
     * }
     *
     * // The following paths will take over all style properties of
     * // the current style:
     * var path = new Path.Circle(new Point(75, 50), 30);
     * var path2 = new Path.Circle(new Point(175, 50), 20);
     *
     * @example {@paperscript}
     * project.currentStyle.fillColor = 'red';
     *
     * // The following path will take over the fill color we just set:
     * var path = new Path.Circle(new Point(75, 50), 30);
     * var path2 = new Path.Circle(new Point(175, 50), 20);
     */
    getCurrentStyle: function() {
        return this._currentStyle;
    },

    setCurrentStyle: function(style) {
        // TODO: Style selected items with the style:
        this._currentStyle.set(style);
    },

    /**
     * The index of the project in the {@link PaperScope#projects} list.
     *
     * @bean
     * @type Number
     */
    getIndex: function() {
        return this._index;
    },

    /**
     * Gives access to the project's configurable options.
     *
     * @bean
     * @type Object
     * @deprecated use {@link PaperScope#settings} instead.
     */
    getOptions: function() {
        return this._scope.settings;
    },

    /**
     * {@grouptitle Project Content}
     *
     * The layers contained within the project.
     *
     * @bean
     * @type Layer[]
     */
    getLayers: function() {
        return this._children;
    },

    // TODO: Define #setLayers()?

    /**
     * The layer which is currently active. New items will be created on this
     * layer by default.
     *
     * @bean
     * @type Layer
     */
    getActiveLayer: function() {
        return this._activeLayer || new Layer({ project: this, insert: true });
    },

    /**
     * The symbol definitions shared by all symbol items contained place ind
     * project.
     *
     * @bean
     * @type SymbolDefinition[]
     */
    getSymbolDefinitions: function() {
        var definitions = [],
            ids = {};
        this.getItems({
            class: SymbolItem,
            match: function(item) {
                var definition = item._definition,
                    id = definition._id;
                if (!ids[id]) {
                    ids[id] = true;
                    definitions.push(definition);
                }
                return false; // No need to collect them.
            }
        });
        return definitions;
    },

    /**
     * @bean
     * @deprecated use {@link #symbolDefinitions} instead.
     */
    getSymbols: 'getSymbolDefinitions',

    /**
     * The selected items contained within the project.
     *
     * @bean
     * @type Item[]
     */
    getSelectedItems: function() {
        // TODO: Return groups if their children are all selected, and filter
        // out their children from the list.
        // TODO: The order of these items should be that of their drawing order.
        var selectionItems = this._selectionItems,
            items = [];
        for (var id in selectionItems) {
            var item = selectionItems[id],
                selection = item._selection;
            if ((selection & /*#=*/ItemSelection.ITEM) && item.isInserted()) {
                items.push(item);
            } else if (!selection) {
                this._updateSelection(item);
            }
        }
        return items;
    },
    // TODO: Implement setSelectedItems?

    _updateSelection: function(item) {
        var id = item._id,
            selectionItems = this._selectionItems;
        if (item._selection) {
            if (selectionItems[id] !== item) {
                this._selectionCount++;
                selectionItems[id] = item;
            }
        } else if (selectionItems[id] === item) {
            this._selectionCount--;
            delete selectionItems[id];
        }
    },

    /**
     * Selects all items in the project.
     */
    selectAll: function() {
        var children = this._children;
        for (var i = 0, l = children.length; i < l; i++)
            children[i].setFullySelected(true);
    },

    /**
     * Deselects all selected items in the project.
     */
    deselectAll: function() {
        var selectionItems = this._selectionItems;
        for (var i in selectionItems)
            selectionItems[i].setFullySelected(false);
    },

    /**
     * {@grouptitle Hierarchy Operations}
     *
     * Adds the specified layer at the end of the this project's {@link #layers}
     * list.
     *
     * @param {Layer} layer the layer to be added to the project
     * @return {Layer} the added layer, or `null` if adding was not possible
     */
    addLayer: function(layer) {
        return this.insertLayer(undefined, layer);
    },

    /**
     * Inserts the specified layer at the specified index in this project's
     * {@link #layers} list.
     *
     * @param {Number} index the index at which to insert the layer
     * @param {Layer} layer the layer to be inserted in the project
     * @return {Layer} the added layer, or `null` if adding was not possible
     */
    insertLayer: function(index, layer) {
        if (layer instanceof Layer) {
            // Notify parent of change. Don't notify item itself yet,
            // as we're doing so when adding it to the new owner below.
            layer._remove(false, true);
            Base.splice(this._children, [layer], index, 0);
            layer._setProject(this, true);
            // Set the name again to make sure all name lookup structures
            // are kept in sync.
            var name = layer._name;
            if (name)
                layer.setName(name);
            // See Item#_remove() for an explanation of this:
            if (this._changes)
                layer._changed(/*#=*/Change.INSERTION);
            // TODO: this._changed(/*#=*/Change.LAYERS);
            // Also activate this layer if there was none before
            if (!this._activeLayer)
                this._activeLayer = layer;
        } else {
            layer = null;
        }
        return layer;
    },

    // Project#_insertItem() and Item#_insertItem() are helper functions called
    // in Item#copyTo(), and through _getOwner() in the various Item#insert*()
    // methods. They are called the same to facilitate so duck-typing.
    _insertItem: function(index, item, _created) {
        item = this.insertLayer(index, item)
                // Anything else than layers needs to be added to a layer first.
                // If none exists yet, create one now, then add the item to it.
                || (this._activeLayer || this._insertItem(undefined,
                        new Layer(Item.NO_INSERT), true)) // _created = true
                        .insertChild(index, item);
        // If a layer was newly created, also activate it.
        if (_created && item.activate)
            item.activate();
        return item;
    },

    /**
     * {@grouptitle Hit-testing, Fetching and Matching Items}
     *
     * Performs a hit-test on the items contained within the project at the
     * location of the specified point.
     *
     * The options object allows you to control the specifics of the hit-test
     * and may contain a combination of the following values:
     *
     * @name Project#hitTest
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
     * @option options.position {Boolean} hit-test the {@link Item#position} of
     *     of items, which depends on the setting of {@link Item#pivot}
     * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.bounds {Boolean} hit-test the corners and side-centers of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.guides {Boolean} hit-test items that have {@link
     *     Item#guide} set to `true`
     * @option options.selected {Boolean} only hit selected items
     *
     * @param {Point} point the point where the hit-test should be performed
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     *     tolerance: settings.hitTolerance }]
     * @return {HitResult} a hit result object that contains more information
     *     about what exactly was hit or `null` if nothing was hit
     */
    // NOTE: Implementation is in Item#hitTest()

    /**
     * Performs a hit-test on the item and its children (if it is a {@link
     * Group} or {@link Layer}) at the location of the specified point,
     * returning all found hits.
     *
     * The options object allows you to control the specifics of the hit-
     * test. See {@link #hitTest(point[, options])} for a list of all options.
     *
     * @name Project#hitTestAll
     * @function
     * @param {Point} point the point where the hit-test should be performed
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     *     tolerance: settings.hitTolerance }]
     * @return {HitResult[]} hit result objects for all hits, describing what
     *     exactly was hit or `null` if nothing was hit
     * @see #hitTest(point[, options]);
     */
    // NOTE: Implementation is in Item#hitTestAll()

    /**
     *
     * Fetch items contained within the project whose properties match the
     * criteria in the specified object.
     *
     * Extended matching of properties is possible by providing a comparator
     * function or regular expression. Matching points, colors only work as a
     * comparison of the full object, not partial matching (e.g. only providing
     * the x- coordinate to match all points with that x-value). Partial
     * matching does work for {@link Item#data}.
     *
     * Matching items against a rectangular area is also possible, by setting
     * either `options.inside` or `options.overlapping` to a rectangle
     * describing the area in which the items either have to be fully or partly
     * contained.
     *
     * @option [options.recursive=true] {Boolean} whether to loop recursively
     *     through all children, or stop at the current level
     * @option options.match {Function} a match function to be called for each
     *     item, allowing the definition of more flexible item checks that are
     *     not bound to properties. If no other match properties are defined,
     *     this function can also be passed instead of the `match` object
     * @option options.class {Function} the constructor function of the item
     *     type to match against
     * @option options.inside {Rectangle} the rectangle in which the items need
     *     to be fully contained
     * @option options.overlapping {Rectangle} the rectangle with which the
     *     items need to at least partly overlap
     *
     * @see Item#matches(options)
     * @see Item#getItems(options)
     * @param {Object|Function} options the criteria to match against
     * @return {Item[]} the list of matching items contained in the project
     *
     * @example {@paperscript} // Fetch all selected path items:
     * var path1 = new Path.Circle({
     *     center: [50, 50],
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * var path2 = new Path.Circle({
     *     center: [150, 50],
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // Select path2:
     * path2.selected = true;
     *
     * // Fetch all selected path items:
     * var items = project.getItems({
     *     selected: true,
     *     class: Path
     * });
     *
     * // Change the fill color of the selected path to red:
     * items[0].fillColor = 'red';
     *
     * @example {@paperscript} // Fetch all items with a specific fill color:
     * var path1 = new Path.Circle({
     *     center: [50, 50],
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * var path2 = new Path.Circle({
     *     center: [150, 50],
     *     radius: 25,
     *     fillColor: 'purple'
     * });
     *
     * // Fetch all items with a purple fill color:
     * var items = project.getItems({
     *     fillColor: 'purple'
     * });
     *
     * // Select the fetched item:
     * items[0].selected = true;
     *
     * @example {@paperscript} // Fetch items at a specific position:
     * var path1 = new Path.Circle({
     *     center: [50, 50],
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * var path2 = new Path.Circle({
     *     center: [150, 50],
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // Fetch all path items positioned at {x: 150, y: 150}:
     * var items = project.getItems({
     *     position: [150, 50]
     * });
     *
     * // Select the fetched path:
     * items[0].selected = true;
     *
     * @example {@paperscript} // Fetch items using a comparator function:
     *
     * // Create a circle shaped path:
     * var path1 = new Path.Circle({
     *     center: [50, 50],
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // Create a circle shaped path with 50% opacity:
     * var path2 = new Path.Circle({
     *     center: [150, 50],
     *     radius: 25,
     *     fillColor: 'black',
     *     opacity: 0.5
     * });
     *
     * // Fetch all items whose opacity is smaller than 1
     * var items = paper.project.getItems({
     *     opacity: function(value) {
     *         return value < 1;
     *     }
     * });
     *
     * // Select the fetched item:
     * items[0].selected = true;
     *
     * @example {@paperscript} // Fetch items using a comparator function (2):
     *
     * // Create a rectangle shaped path (4 segments):
     * var path1 = new Path.Rectangle({
     *     from: [25, 25],
     *     to: [75, 75],
     *     strokeColor: 'black',
     *     strokeWidth: 10
     * });
     *
     * // Create a line shaped path (2 segments):
     * var path2 = new Path.Line({
     *     from: [125, 50],
     *     to: [175, 50],
     *     strokeColor: 'black',
     *     strokeWidth: 10
     * });
     *
     * // Fetch all paths with 2 segments:
     * var items = project.getItems({
     *     class: Path,
     *  segments: function(segments) {
     *         return segments.length == 2;
     *  }
     * });
     *
     * // Select the fetched path:
     * items[0].selected = true;
     *
     * @example {@paperscript} // Match (nested) properties of the data property:
     *
     * // Create a black circle shaped path:
     * var path1 = new Path.Circle({
     *     center: [50, 50],
     *     radius: 25,
     *     fillColor: 'black',
     *     data: {
     *         person: {
     *             name: 'john',
     *             length: 200,
     *             hair: true
     *         }
     *     }
     * });
     *
     * // Create a red circle shaped path:
     * var path2 = new Path.Circle({
     *     center: [150, 50],
     *     radius: 25,
     *     fillColor: 'red',
     *     data: {
     *         person: {
     *             name: 'john',
     *             length: 180,
     *             hair: false
     *         }
     *     }
     * });
     *
     * // Fetch all items whose data object contains a person
     * // object whose name is john and length is 180:
     * var items = paper.project.getItems({
     *     data: {
     *         person: {
     *             name: 'john',
     *             length: 180
     *         }
     *     }
     * });
     *
     * // Select the fetched item:
     * items[0].selected = true;
     *
     * @example {@paperscript} // Match strings using regular expressions:
     *
     * // Create a path named 'aardvark':
     * var path1 = new Path.Circle({
     *     center: [50, 50],
     *     radius: 25,
     *     fillColor: 'black',
     *     name: 'aardvark'
     * });
     *
     * // Create a path named 'apple':
     * var path2 = new Path.Circle({
     *     center: [150, 50],
     *     radius: 25,
     *     fillColor: 'black',
     *     name: 'apple'
     * });
     *
     * // Create a path named 'banana':
     * var path2 = new Path.Circle({
     *     center: [250, 50],
     *     radius: 25,
     *     fillColor: 'black',
     *     name: 'banana'
     * });
     *
     * // Fetch all items that have a name starting with 'a':
     * var items = project.getItems({
     *     name: /^a/
     * });
     *
     * // Change the fill color of the matched items:
     * for (var i = 0; i < items.length; i++) {
     *  items[i].fillColor = 'red';
     * }
     */
    getItems: function(options) {
        return Item._getItems(this, options);
    },

    /**
     * Fetch the first item contained within the project whose properties
     * match the criteria in the specified object.
     * Extended matching is possible by providing a compare function or
     * regular expression. Matching points, colors only work as a comparison
     * of the full object, not partial matching (e.g. only providing the x-
     * coordinate to match all points with that x-value). Partial matching
     * does work for {@link Item#data}.
     *
     * See {@link #getItems(options)} for a selection of illustrated examples.
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Item} the first item in the project matching the given criteria
     */
    getItem: function(options) {
        return Item._getItems(this, options, null, null, true)[0] || null;
    },

    /**
     * {@grouptitle Importing / Exporting JSON and SVG}
     *
     * Exports (serializes) the project with all its layers and child items to a
     * JSON data object or string.
     *
     * @name Project#exportJSON
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
     * Imports (deserializes) the stored JSON data into the project.
     * Note that the project is not cleared first. You can call
     * {@link Project#clear()} to do so.
     *
     * @param {String} json the JSON data to import from
     * @return {Item} the imported item
     */
    importJSON: function(json) {
        this.activate();
        // Provide the activeLayer as a possible target for layers, but only if
        // it's empty.
        var layer = this._activeLayer;
        return Base.importJSON(json, layer && layer.isEmpty() && layer);
    },

    /**
     * Exports the project with all its layers and child items as an SVG DOM,
     * all contained in one top level SVG group node.
     *
     * @name Project#exportSVG
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
     * @option [options.reduceAttributes=true] {Boolean} wether to only include
     *     style attributes in the SVG output that differ from their parents,
     *     or to always include them (much faster but leading to redundancies).
     *
     * @param {Object} [options] the export options
     * @return {SVGElement|String} the project converted to an SVG node or a
     * `String` depending on `option.asString` value
     */

    /**
     * Converts the provided SVG content into Paper.js items and adds them to
     * the active layer of this project.
     * Note that the project is not cleared first. You can call
     * {@link Project#clear()} to do so.
     *
     * @name Project#importSVG
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
     *     be added to the project that `importSVG()` is called on
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
     * and adds them to the active layer of this project.
     * Note that the project is not cleared first. You can call
     * {@link Project#clear()} to do so.
     *
     * @name Project#importSVG
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

    removeOn: function(type) {
        var sets = this._removeSets;
        if (sets) {
            // Always clear the drag set on mouseup
            if (type === 'mouseup')
                sets.mousedrag = null;
            var set = sets[type];
            if (set) {
                for (var id in set) {
                    var item = set[id];
                    // If we remove this item, we also need to erase it from all
                    // other sets.
                    for (var key in sets) {
                        var other = sets[key];
                        if (other && other != set)
                            delete other[item._id];
                    }
                    item.remove();
                }
                sets[type] = null;
            }
        }
    },

    draw: function(ctx, matrix, pixelRatio) {
        // Increase the _updateVersion before the draw-loop. After that, items
        // that are visible will have their _updateVersion set to the new value.
        this._updateVersion++;
        ctx.save();
        matrix.applyToContext(ctx);
        // Use new Base() so we can use param.extend() to easily override values
        var children = this._children,
            param = new Base({
                offset: new Point(0, 0),
                pixelRatio: pixelRatio,
                viewMatrix: matrix.isIdentity() ? null : matrix,
                matrices: [new Matrix()], // Start with the identity matrix.
                // Tell the drawing routine that we want to keep _globalMatrix
                // up to date. Item#rasterize() and Raster#getAverageColor()
                // should not set this.
                updateMatrix: true
            });
        for (var i = 0, l = children.length; i < l; i++) {
            children[i].draw(ctx, param);
        }
        ctx.restore();

        // Draw the selection of the selected items in the project:
        if (this._selectionCount > 0) {
            ctx.save();
            ctx.strokeWidth = 1;
            var items = this._selectionItems,
                size = this._scope.settings.handleSize,
                version = this._updateVersion;
            for (var id in items) {
                items[id]._drawSelection(ctx, matrix, size, items, version);
            }
            ctx.restore();
        }
    }
});
