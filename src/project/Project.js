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

    // TODO: Add arguments to define pages
    /**
     * Creates a Paper.js project containing one empty {@link Layer}, referenced
     * by {@link Project#activeLayer}.
     *
     * Note that when working with PaperScript, a project is automatically
     * created for us and the {@link PaperScope#project} variable points to it.
     *
     * @param {HTMLCanvasElement|String} element the HTML canvas element that
     * should be used as the element for the view, or an ID string by which to
     * find the element.
     */
    initialize: function Project(element) {
        // Activate straight away by passing true to PaperScopeItem constructor,
        // so paper.project is set, as required by Layer and DoumentView
        // constructors.
        PaperScopeItem.call(this, true);
        this.layers = [];
        this._activeLayer = null;
        this.symbols = [];
        this._currentStyle = new Style(null, null, this);
        // If no view is provided, we create a 1x1 px canvas view just so we
        // have something to do size calculations with.
        // (e.g. PointText#_getBounds)
        this._view = View.create(this,
                element || CanvasProvider.getCanvas(1, 1));
        this._selectedItems = {};
        this._selectedItemCount = 0;
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
        // Pass true for compact, so 'Project' does not get added as the class
        return Base.serialize(this.layers, options, true, dictionary);
    },

    /**
     * Activates this project, so all newly created items will be placed
     * in it.
     *
     * @name Project#activate
     * @function
     */

    /**
     * Clears the project by removing all {@link Project#layers} and
     * {@link Project#symbols}.
     */
    clear: function() {
        for (var i = this.layers.length - 1; i >= 0; i--)
            this.layers[i].remove();
        this.symbols = [];
    },

    /**
     * Checks whether the project has any content or not.
     *
     * @return Boolean
     */
    isEmpty: function() {
        return this.layers.length === 0;
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
     * @type View
     * @bean
     */
    getView: function() {
        return this._view;
    },

    /**
     * The currently active path style. All selected items and newly
     * created items will be styled with this style.
     *
     * @type Style
     * @bean
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
        this._currentStyle.initialize(style);
    },

    /**
     * The index of the project in the {@link PaperScope#projects} list.
     *
     * @type Number
     * @bean
     */
    getIndex: function() {
        return this._index;
    },

    /**
     * Gives access to the project's configurable options.
     *
     * @type Object
     * @bean
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
     * @name Project#layers
     * @type Layer[]
     */

    /**
     * The layer which is currently active. New items will be created on this
     * layer by default.
     *
     * @type Layer
     * @bean
     */
    getActiveLayer: function() {
        return this._activeLayer || new Layer({ project: this });
    },

    /**
     * The symbols contained within the project.
     *
     * @name Project#symbols
     * @type Symbol[]
     */

    /**
     * The selected items contained within the project.
     *
     * @type Item[]
     * @bean
     */
    getSelectedItems: function() {
        // TODO: Return groups if their children are all selected,
        // and filter out their children from the list.
        // TODO: The order of these items should be that of their
        // drawing order.
        var items = [];
        for (var id in this._selectedItems) {
            var item = this._selectedItems[id];
            if (item.isInserted())
                items.push(item);
        }
        return items;
    },

    // Helper function used in Item#copyTo and Layer#initialize
    // It's called the same as Item#addChild so Item#copyTo does not need to
    // make the distinction.
    // TODO: Consider private function with alias in Item?
    addChild: function(child) {
        if (child instanceof Layer) {
            Base.splice(this.layers, [child]);
            // Also activate this layer if there was none before
            if (!this._activeLayer)
                this._activeLayer = child;
        } else if (child instanceof Item) {
            // Anything else than layers needs to be added to a layer first
            (this._activeLayer
                // NOTE: If there is no layer and this project is not the active
                // one, passing insert: false and calling addChild on the
                // project will handle it correctly.
                || this.addChild(new Layer(Item.NO_INSERT))).addChild(child);
        } else {
            child = null;
        }
        return child;
    },

    // TODO: Implement setSelectedItems?
    _updateSelection: function(item) {
        var id = item._id,
            selectedItems = this._selectedItems;
        if (item._selected) {
            if (selectedItems[id] !== item) {
                this._selectedItemCount++;
                selectedItems[id] = item;
            }
        } else if (selectedItems[id] === item) {
            this._selectedItemCount--;
            delete selectedItems[id];
        }
    },

    /**
     * Selects all items in the project.
     */
    selectAll: function() {
        var layers = this.layers;
        for (var i = 0, l = layers.length; i < l; i++)
            layers[i].setFullySelected(true);
    },

    /**
     * Deselects all selected items in the project.
     */
    deselectAll: function() {
        var selectedItems = this._selectedItems;
        for (var i in selectedItems)
            selectedItems[i].setFullySelected(false);
    },

    /**
     * Perform a hit-test on the items contained within the project at the
     * location of the specified point.
     *
     * The options object allows you to control the specifics of the hit-test
     * and may contain a combination of the following values:
     *
     * @option options.tolerance {Number} the tolerance of the hit-test in
     * points. Can also be controlled through
     * {@link PaperScope#settings}{@code .hitTolerance}.
     * @option options.class {Function} only hit-test again a certain item class
     * and its sub-classes: {@code Group, Layer, Path, CompoundPath,
     * Shape, Raster, PlacedSymbol, PointText}, etc.
     * @option options.fill {Boolean} hit-test the fill of items.
     * @option options.stroke {Boolean} hit-test the stroke of path items,
     * taking into account the setting of stroke color and width.
     * @option options.segments {Boolean} hit-test for {@link Segment#point} of
     * {@link Path} items.
     * @option options.curves {Boolean} hit-test the curves of path items,
     * without taking the stroke color or width into account.
     * @option options.handles {Boolean} hit-test for the handles.
     * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
     * @option options.ends {Boolean} only hit-test for the first or last
     * segment points of open path items.
     * @option options.bounds {Boolean} hit-test the corners and side-centers of
     * the bounding rectangle of items ({@link Item#bounds}).
     * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
     * the bounding rectangle of items ({@link Item#bounds}).
     * @option options.guides {Boolean} hit-test items that have
     * {@link Item#guide} set to {@code true}.
     * @option options.selected {Boolean} only hit selected items.
     *
     * @param {Point} point the point where the hit-test should be performed
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     * tolerance: true }]
     * @return {HitResult} a hit result object that contains more
     * information about what exactly was hit or {@code null} if nothing was
     * hit
     */
    hitTest: function(/* point, options */) {
        // We don't need to do this here, but it speeds up things since we won't
        // repeatedly convert in Item#hitTest() then.
        var point = Point.read(arguments),
            options = HitResult.getOptions(Base.read(arguments));
        // Loop backwards, so layers that get drawn last are tested first
        for (var i = this.layers.length - 1; i >= 0; i--) {
            var res = this.layers[i]._hitTest(point, options);
            if (res) return res;
        }
        return null;
    },

    /**
     * {@grouptitle Fetching and matching items}
     *
     * Fetch items contained within the project whose properties match the
     * criteria in the specified object.
     * Extended matching is possible by providing a compare function or
     * regular expression. Matching points, colors only work as a comparison
     * of the full object, not partial matching (e.g. only providing the x-
     * coordinate to match all points with that x-value). Partial matching
     * does work for {@link Item#data}.
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
     * @example {@paperscript} // Fetch items using a comparing function:
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
     * @example {@paperscript} // Fetch items using a comparing function (2):
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
     *
     * @see Item#matches(match)
     * @see Item#getItems(match)
     * @param {Object} match the criteria to match against.
     * @return {Item[]} the list of matching items contained in the project.
     */
    getItems: function(match) {
        return Item._getItems(this.layers, match);
    },

    /**
     * Fetch the first item contained within the project whose properties
     * match the criteria in the specified object.
     * Extended matching is possible by providing a compare function or
     * regular expression. Matching points, colors only work as a comparison
     * of the full object, not partial matching (e.g. only providing the x-
     * coordinate to match all points with that x-value). Partial matching
     * does work for {@link Item#data}.
     * See {@link #getItems(match)} for a selection of illustrated examples.
     *
     * @param {Object} match the criteria to match against.
     * @return {Item} the first item in the project matching the given criteria.
     */
    getItem: function(match) {
        return Item._getItems(this.layers, match, null, null, true)[0] || null;
    },

    /**
     * {@grouptitle Importing / Exporting JSON and SVG}
     *
     * Exports (serializes) the project with all its layers and child items to
     * a JSON data string.
     *
     * The options object offers control over some aspects of the JSON export:
     *
     * @option options.asString {Boolean} whether the JSON is returned as a
     * {@code Object} or a {@code String}.
     * @option options.precision {Number} the amount of fractional digits in
     * numbers used in JSON data.
     *
     * @name Project#exportJSON
     * @function
     * @param {Object} [options={ asString: true, precision: 5 }] the
     * serialization options
     * @return {String} the exported JSON data
     */

    /**
     * Imports (deserializes) the stored JSON data into the project.
     * Note that the project is not cleared first. You can call
     * {@link Project#clear()} to do so.
     *
     * @param {String} json the JSON data to import from.
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
     * The options object offers control over some aspects of the SVG export:
     *
     * @option options.asString {Boolean} whether a SVG node or a {@code String}
     * is to be returned.
     * @option options.precision {Number} the amount of fractional digits in
     * numbers used in SVG data.
     * @option options.matchShapes {Boolean} whether path items should tried to
     * be converted to shape items, if their geometries can be made to match.
     *
     * @name Project#exportSVG
     * @function
     * @param {Object} [options={ asString: false, precision: 5,
     * matchShapes: false }] the export options.
     * @return {SVGElement} the project converted to an SVG node
     */

    // DOCS: Document importSVG('file.svg', callback);
    /**
     * Converts the provided SVG content into Paper.js items and adds them to
     * the active layer of this project.
     * Note that the project is not cleared first. You can call
     * {@link Project#clear()} to do so.
     *
     * The options object offers control over some aspects of the SVG import:
     *
     * @option options.expandShapes {Boolean} whether imported shape items
     * should be expanded to path items.
     *
     * @name Project#importSVG
     * @function
     * @param {SVGElement|String} svg the SVG content to import
     * @param {Object} [options={ expandShapes: false }] the import options
     * @return {Item} the imported Paper.js parent item
     */

    draw: function(ctx, matrix, pixelRatio) {
        // Increase the _updateVersion before the draw-loop. After that, items
        // that are visible will have their _updateVersion set to the new value.
        this._updateVersion++;
        ctx.save();
        matrix.applyToContext(ctx);
        // Use new Base() so we can use param.extend() to easily override
        // values
        var param = new Base({
            offset: new Point(0, 0),
            pixelRatio: pixelRatio,
            viewMatrix: matrix.isIdentity() ? null : matrix,
            matrices: [new Matrix()], // Start with the identity matrix.
            // Tell the drawing routine that we want to keep _globalMatrix up to
            // date. Item#rasterize() and Raster#getAverageColor() should not
            // set this.
            updateMatrix: true
        });
        for (var i = 0, layers = this.layers, l = layers.length; i < l; i++)
            layers[i].draw(ctx, param);
        ctx.restore();

        // Draw the selection of the selected items in the project:
        if (this._selectedItemCount > 0) {
            ctx.save();
            ctx.strokeWidth = 1;
            var items = this._selectedItems,
                size = this._scope.settings.handleSize,
                version = this._updateVersion;
            for (var id in items)
                items[id]._drawSelection(ctx, matrix, size, items, version);
            ctx.restore();
        }
    }
});
