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
 * @name PatternDefinition
 *
 * @class A pattern definition repeats an item as the tile of pattern colors,
 * which fill and stroke items with it, see {@link Color#pattern}: a
 * {@link Raster} for image patterns, or any other item for vector patterns. As
 * with symbol definitions, the item is removed from the scene graph, and all
 * pattern colors that use the pattern share it, so they change along with it.
 *
 * @classexample {@paperscript height=200}
 * // A dotted pattern, filling and stroking a circle:
 * var dot = new Path.Circle({
 *     center: [5, 5],
 *     radius: 3,
 *     fillColor: 'red'
 * });
 *
 * // Repeat the dot every 10 points, with a gap of 2 points between the
 * // tiles of the stroke's pattern:
 * var pattern = new PatternDefinition(dot, {
 *     tile: new Rectangle(0, 0, 10, 10)
 * });
 * var spaced = new PatternDefinition(dot.clone(), {
 *     tile: new Rectangle(0, 0, 10, 10),
 *     spacing: 2
 * });
 *
 * var circle = new Path.Circle({
 *     center: view.center,
 *     radius: 70,
 *     fillColor: { pattern: pattern },
 *     strokeColor: {
 *         pattern: spaced,
 *         matrix: new Matrix().rotate(45)
 *     },
 *     strokeWidth: 20
 * });
 */
var PatternDefinition = ItemDefinition.extend(/** @lends PatternDefinition# */{
    _class: 'PatternDefinition',

    /**
     * Creates a pattern definition.
     *
     * @param {Item} item the item to repeat, which is removed from the scene
     *     graph and becomes the pattern's tile content
     * @param {Object} [options]
     * @option [options.tile] {Rectangle} the rectangle that is repeated,
     *     the bounds of the item by default
     * @option [options.spacing=0] {Size} the gap between the tiles
     */
    initialize: function PatternDefinition(item, options) {
        this._tile = null;
        this._spacing = new Size();
        ItemDefinition.call(this, item);
        if (options)
            this.set(options);
    },

    _serialize: function(options, dictionary) {
        return dictionary.add(this, function() {
            var json = [this._class, this._item];
            // Leave out the options when they're the defaults:
            if (this._tile || !this._spacing.isZero())
                json.push({ tile: this._tile, spacing: this._spacing });
            return Base.serialize(json, options, false, dictionary);
        });
    },

    _changed: function _changed(flags) {
        _changed.base.call(this, flags);
        // Draw the tiles again at each resolution that they're needed in:
        if (flags & /*#=*/ChangeFlag.APPEARANCE)
            this._canvases = {};
    },

    /**
     * The project that this pattern belongs to.
     *
     * @type Project
     * @readonly
     * @name PatternDefinition#project
     */

    /**
     * The item that the pattern repeats. Unlike the items of symbols, it isn't
     * moved to 0, 0, so the tiles are at its own coordinates.
     *
     * @name PatternDefinition#item
     * @property
     * @type Item
     */

    /**
     * The rectangle that is repeated, in the coordinates of the pattern's
     * item.
     *
     * @bean
     * @type Rectangle
     * @default the bounds of the pattern's item
     */
    getTile: function() {
        return this._tile || this._item.getBounds();
    },

    setTile: function(/* tile */) {
        this._tile = Rectangle.read(arguments, 0,
                { readNull: true, clone: true });
        this._changed(/*#=*/Change.STYLE);
    },

    /**
     * The gap between the tiles, horizontally and vertically.
     *
     * @bean
     * @type Size
     * @default 0
     */
    getSpacing: function() {
        return this._spacing;
    },

    setSpacing: function(/* spacing */) {
        this._spacing = Size.read(arguments, 0, { clone: true });
        this._changed(/*#=*/Change.STYLE);
    },

    /**
     * Returns a copy of the pattern, with a copy of its item.
     *
     * @return {PatternDefinition}
     */
    clone: function() {
        return new PatternDefinition(this._item.clone(false), {
            tile: this._tile,
            spacing: this._spacing
        });
    },

    /**
     * Checks whether the pattern is equal to the supplied pattern.
     *
     * @param {PatternDefinition} pattern
     * @return {Boolean} {@true if they are equal}
     */
    equals: function(pattern) {
        return pattern === this
                || pattern && this._class === pattern._class
                    && this._item.equals(pattern._item)
                    && Base.equals(this._tile, pattern._tile)
                    && this._spacing.equals(pattern._spacing)
                || false;
    },

    // Returns a CanvasPattern of the tiles, placed through the matrix from the
    // pattern's coordinates to those of the context. The tiles are drawn at
    // the context's resolution, rounded up to quarter octaves, so that items
    // at nearby scales share them. See Color#toCanvasStyle():
    _toCanvasStyle: function(ctx, matrix) {
        var transform = ctx.getTransform(),
            device = new Matrix(transform.a, transform.b, transform.c,
                    transform.d, 0, 0).append(matrix),
            scale = Math.max(
                    Math.sqrt(device._a * device._a + device._b * device._b),
                    Math.sqrt(device._c * device._c + device._d * device._d)),
            level = Math.ceil(Math.log(scale) / Math.LN2 * 4
                    - /*#=*/Numerical.EPSILON),
            tile = this.getTile(),
            cell = tile.getSize().add(this._spacing),
            size = cell.multiply(Math.pow(2, level / 4)).ceil();
        if (!(size.width > 0 && size.height > 0))
            return 'rgba(0,0,0,0)';
        var canvas = this._canvases[level];
        if (!canvas) {
            // The tiles are kept for as long as the pattern doesn't change, so
            // they're never released to the CanvasProvider's pool, as with the
            // buffers of groups, see Item#draw():
            canvas = this._canvases[level] = self.OffscreenCanvas
                    ? new self.OffscreenCanvas(size.width, size.height)
                    : CanvasProvider.getCanvas(size);
            var tileCtx = canvas.getContext('2d'),
                mx = new Matrix().scale(size.divide(cell))
                    .translate(tile.getPoint().negate());
            mx.applyToContext(tileCtx);
            // Leave the spacing between the tiles empty:
            if (!this._spacing.isZero()) {
                tileCtx.beginPath();
                tileCtx.rect(tile.x, tile.y, tile.width, tile.height);
                tileCtx.clip();
            }
            // The item is shared by all colors of the pattern, so don't let
            // them set its global matrix, as in SymbolItem#_draw():
            this._item.draw(tileCtx, new Base({
                matrices: [mx],
                updateMatrix: false
            }));
        }
        var pattern = ctx.createPattern(canvas, 'repeat'),
            placement = matrix.appended(new Matrix().translate(tile.getPoint())
                    .scale(cell.divide(size)));
        // Reuse the context's DOMMatrix, as node-canvas only takes its own:
        transform.a = placement._a;
        transform.b = placement._b;
        transform.c = placement._c;
        transform.d = placement._d;
        transform.e = placement._tx;
        transform.f = placement._ty;
        pattern.setTransform(transform);
        return pattern;
    }
});
