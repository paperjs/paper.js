/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
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
 * Projects allow the manipluation of the styles that are applied to all newly
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
	 * Creates a Paper.js project.
	 *
	 * When working with PaperScript, a project is automatically created for us
	 * and the {@link PaperScope#project} variable points to it.
	 *
	 * @param {View|HTMLCanvasElement} view Either a view object or an HTML
	 * Canvas element that should be wrapped in a newly created view.
	 */
	initialize: function Project(view) {
		// Activate straight away by passing true to PaperScopeItem constructor,
		// so paper.project is set, as required by Layer and DoumentView
		// constructors.
		PaperScopeItem.call(this, true);
		this.layers = [];
		this.symbols = [];
		this._currentStyle = new Style();
		this.activeLayer = new Layer();
		if (view)
			this.view = view instanceof View ? view : View.create(view);
		this._selectedItems = {};
		this._selectedItemCount = 0;
		// See Item#draw() for an explanation of _drawCount
		this._drawCount = 0;
		// Change tracking, not in use for now. Activate once required:
		// this._changes = [];
		// this._changesById = {};
		this.options = {};
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

	// DOCS: Project#clear()

	clear: function() {
		for (var i = this.layers.length - 1; i >= 0; i--)
			this.layers[i].remove();
		this.symbols = [];
	},

	/**
	 * Removes this project from the {@link PaperScope#projects} list, and also
	 * removes its view, if one was defined.
	 */
	remove: function remove() {
		if (!remove.base.call(this))
			return false;
		if (this.view)
			this.view.remove();
		return true;
	},

	/**
	 * The reference to the project's view.
	 * @name Project#view
	 * @type View
	 */

	/**
	 * The currently active path style. All selected items and newly
	 * created items will be styled with this style.
	 *
	 * @type Style
	 * @bean
	 *
	 * @example {@paperscript}
	 * project.currentStyle = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 5
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

	// DOCS: Project#options
	/**
	 * <b>options.handleSize:</b> 
	 * <b>options.hitTolerance:</b>
	 *
	 * @name Project#options
	 * @type Object
	 */

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
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setFullySelected(true);
	},

	/**
	 * Deselects all selected items in the project.
	 */
	deselectAll: function() {
		for (var i in this._selectedItems)
			this._selectedItems[i].setFullySelected(false);
	},

	/**
	 * Perform a hit test on the items contained within the project at the
	 * location of the specified point.
	 * 
	 * The optional options object allows you to control the specifics of the
	 * hit test and may contain a combination of the following values:
	 * <b>options.tolerance:</b> {@code Number} - The tolerance of the hit test
	 * in points.
	 * <b>options.type:</b> Only hit test again a certain item
	 * type: {@link PathItem}, {@link Raster}, {@link TextItem}, etc.
	 * <b>options.fill:</b> {@code Boolean} - Hit test the fill of items.
	 * <b>options.stroke:</b> {@code Boolean} - Hit test the curves of path
	 * items, taking into account stroke width.
	 * <b>options.segments:</b> {@code Boolean} - Hit test for
	 * {@link Segment#point} of {@link Path} items.
	 * <b>options.handles:</b> {@code Boolean} - Hit test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
	 * <b>options.ends:</b> {@code Boolean} - Only hit test for the first or
	 * last segment points of open path items.
	 * <b>options.bounds:</b> {@code Boolean} - Hit test the corners and
	 * side-centers of the bounding rectangle of items ({@link Item#bounds}).
	 * <b>options.center:</b> {@code Boolean} - Hit test the
	 * {@link Rectangle#center} of the bounding rectangle of items
	 * ({@link Item#bounds}).
	 * <b>options.guides:</b> {@code Boolean} - Hit test items that have
	 * {@link Item#guide} set to {@code true}.
	 * <b>options.selected:</b> {@code Boolean} - Only hit selected items.
	 *
	 * @param {Point} point The point where the hit test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: true }]
	 * @return {HitResult} a hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit
	 */
	hitTest: function(point, options) {
		// We don't need to do this here, but it speeds up things since we won't
		// repeatetly convert in Item#hitTest() then.
		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));
		// Loop backwards, so layers that get drawn last are tested first
		for (var i = this.layers.length - 1; i >= 0; i--) {
			var res = this.layers[i].hitTest(point, options);
			if (res) return res;
		}
		return null;
	},

	/**
	 * {@grouptitle Import / Export to JSON & SVG}
	 *
	 * Exports (serializes) the project with all its layers and child items to
	 * a JSON data string.
	 *
	 * @name Project#exportJSON
	 * @function
	 * @param {Object} [options={ precision: 5 }] the serialization options 
	 * @return {String} the exported JSON data
	 */

	/**
	 * Imports (deserializes) the stored JSON data into the project. Note that
	 * the project is not cleared first. You can call {@link Project#clear()} to
	 * do so.
	 *
	 * @param {String} json the JSON data to import from.
	 */
	importJSON: function(json) {
		this.activate();
		return Base.importJSON(json);
	},

	/**
	 * Exports the project with all its layers and child items as an SVG DOM,
	 * all contained in one top level SVG group node.
	 *
	 * @name Project#exportSVG
	 * @function
	 * @param {Object} [options={ asString: false, precision: 5 }] the export
	 *        options.
	 * @return {SVGSVGElement} the project converted to an SVG node
	 */

	/**
	 * Converts the SVG node and all its child nodes into Paper.js items and
	 * adds them to the active layer of this project.
	 *
	 * @name Project#importSVG
	 * @function
	 * @param {SVGSVGElement} node the SVG node to import
	 * @return {Item} the imported Paper.js parent item
	 */

	/**
	 * {@grouptitle Project Hierarchy}
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
	 * @name Project#activeLayer
	 * @type Layer
	 */

	/**
	 * The symbols contained within the project.
	 *
	 * @name Project#symbols
	 * @type Symbol[]
	 */

	draw: function(ctx, matrix) {
		// Increase the drawCount before the draw-loop. After that, items that
		// are visible will have their drawCount set to the new value.
		this._drawCount++;
		ctx.save();
		matrix.applyToContext(ctx);
		// Use Base.merge() so we can use param.extend() to easily override
		// values
		var param = Base.merge({
			offset: new Point(0, 0),
			// A stack of concatenated matrices, to keep track of the current
			// global matrix, since Canvas is not able tell us (yet).
			transforms: [matrix]
		});
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].draw(ctx, param);
		ctx.restore();

		// Draw the selection of the selected items in the project:
		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			for (var id in this._selectedItems) {
				var item = this._selectedItems[id];
				if (item._drawCount === this._drawCount
						&& (item._drawSelected || item._boundsSelected)) {
					// Allow definition of selected color on a per item and per
					// layer level, with a fallback to #009dec
					var color = item.getSelectedColor()
							|| item.getLayer().getSelectedColor();
					ctx.strokeStyle = ctx.fillStyle = color
							? color.toCanvasStyle(ctx) : '#009dec';
					var mx = item._globalMatrix;
					if (item._drawSelected)
						item._drawSelected(ctx, mx);
					if (item._boundsSelected) {
						// We need to call the internal _getBounds, to get non-
						// transformed bounds.
						// TODO: Implement caching for these too!
						var coords = mx._transformCorners(
								item._getBounds('getBounds'));
						// Now draw a rectangle that connects the transformed
						// bounds corners, and draw the corners.
						ctx.beginPath();
						for (var i = 0; i < 8; i++)
							ctx[i === 0 ? 'moveTo' : 'lineTo'](
									coords[i], coords[++i]);
						ctx.closePath();
						ctx.stroke();
						for (var i = 0; i < 8; i++) {
							ctx.beginPath();
							ctx.rect(coords[i] - 2, coords[++i] - 2, 4, 4);
							ctx.fill();
						}
					}
				}
			}
			ctx.restore();
		}
	}
});
