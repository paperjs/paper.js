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

// The live effects of items, see Item#effects. Their output is computed when
// it's first needed, and kept until the item, its content or its effects
// change, see Item#_changed().
Item.inject(new function() {
    // Returns whether the item or its content have visible effects:
    function hasEffects(item) {
        var children = item._children;
        if (item._hasEffects())
            return true;
        for (var i = 0, l = children ? children.length : 0; i < l; i++) {
            if (hasEffects(children[i]))
                return true;
        }
        return false;
    }

    return /** @lends Item# */{
        _effects: null,

        /**
         * The live effects of the item, in the order in which they apply, see
         * {@link Effect}. They derive what is drawn from the item without
         * changing it: drawing draws their output, and {@link #previewBounds}
         * measures it, while hit testing, {@link #bounds} and
         * {@link #strokeBounds} stay with the item itself. It can be set to
         * effects or plain objects describing them, `{ type, ...params,
         * visible }`. Changing the returned array directly isn't tracked, as
         * with {@link Path#segments}.
         *
         * Paper.js has these types of effects, and {@link Effect.extend(src)}
         * creates more:
         *
         * - `offset`: offsets the paths, see {@link PathItem#offset()}, by
         *   `distance` (`0`), with corners of the `join` (`'miter'`) and
         *   `miterLimit` (`10`).
         * - `outline`: outlines the strokes of the paths as filled areas next
         *   to their fills, see {@link PathItem#outline()}, following their
         *   {@link Path#strokeProfile}.
         *
         * @bean
         * @type Effect[]
         *
         * @example {@paperscript}
         * var path = new Path.Star({
         *     center: view.center,
         *     points: 5,
         *     radius1: 20,
         *     radius2: 40,
         *     strokeColor: 'black',
         *     strokeWidth: 8
         * });
         * path.effects = [
         *     { type: 'offset', distance: 10, join: 'round' },
         *     { type: 'outline' }
         * ];
         */
        getEffects: function() {
            return this._effects || [];
        },

        setEffects: function(effects) {
            this.removeEffects();
            if (effects && effects.length)
                this.insertEffects(0, effects);
        },

        /**
         * Adds an effect at the end of the item's effects.
         *
         * @param {Effect|Object} effect the effect, or a plain object describing
         *     it
         * @return {Effect} the added effect
         */
        addEffect: function(effect) {
            return this.insertEffect(this.getEffects().length, effect);
        },

        /**
         * Inserts an effect into the item's effects at the given index.
         *
         * @param {Number} index the index at which to insert the effect
         * @param {Effect|Object} effect the effect, or a plain object describing
         *     it
         * @return {Effect} the inserted effect
         */
        insertEffect: function(index, effect) {
            return this.insertEffects(index, [effect])[0];
        },

        /**
         * Inserts effects into the item's effects at the given index. Effects
         * that are part of another item are copied.
         *
         * @param {Number} index the index at which to insert the effects
         * @param {Effect[]|Object[]} effects the effects, or plain objects
         *     describing them
         * @return {Effect[]} the inserted effects
         */
        insertEffects: function(index, effects) {
            var list = this._effects || (this._effects = []),
                inserted = [];
            for (var i = 0, l = effects.length; i < l; i++) {
                var effect = Effect.create(effects[i]);
                if (effect._item)
                    effect = effect.clone();
                effect._item = this;
                inserted.push(effect);
            }
            // Keeps the indices of the effects up to date:
            Base.splice(list, inserted, index, 0);
            this._changed(/*#=*/Change.ATTRIBUTE);
            return inserted;
        },

        /**
         * Removes the effect at the given index from the item's effects.
         *
         * @param {Number} index the index of the effect to remove
         * @return {Effect} the removed effect, or `null`
         */
        removeEffect: function(index) {
            return this.removeEffects(index, index + 1)[0] || null;
        },

        /**
         * Removes the effects from the start index to the end index from the
         * item's effects, or all of them.
         *
         * @param {Number} [start=0] the index of the first effect to remove
         * @param {Number} [end=effects.length] the index after the last one
         * @return {Effect[]} the removed effects
         */
        removeEffects: function(start, end) {
            var list = this._effects,
                removed = [];
            if (list) {
                start = start || 0;
                end = Base.pick(end, list.length);
                removed = Base.splice(list, null, start, end - start);
                for (var i = 0, l = removed.length; i < l; i++) {
                    var effect = removed[i];
                    effect._item = effect._index = null;
                }
                if (removed.length)
                    this._changed(/*#=*/Change.ATTRIBUTE);
                if (!list.length)
                    this._effects = null;
            }
            return removed;
        },

        // Returns whether any of the item's effects are visible:
        _hasEffects: function() {
            var list = this._effects;
            for (var i = 0, l = list ? list.length : 0; i < l; i++) {
                if (list[i]._visible)
                    return true;
            }
            return false;
        },

        /**
         * Returns what the item's visible effects make of it, in the item's own
         * coordinates, outside of the scene graph, or `null` if it has none. It
         * is kept until the item, its content or its effects change, so changing
         * it isn't tracked.
         *
         * @return {?Item} the output of the effects
         */
        getEffectOutput: function() {
            var output = this._effectOutput;
            if (output === undefined) {
                output = null;
                if (this._hasEffects()) {
                    output = this._getEffectArt();
                    for (var i = 0, l = this._effects.length; i < l; i++) {
                        var effect = this._effects[i];
                        if (effect._visible)
                            output = effect.apply(output) || output;
                    }
                }
                this._effectOutput = output;
            }
            return output;
        },

        // Returns a copy of the item for its effects to apply to, in its own
        // coordinates, with the effects of its content expanded and without its
        // own:
        _getEffectArt: function() {
            var art = this.clone({ insert: false });
            art.setEffects(null);
            art.setMatrix(new Matrix());

            function expand(source, copy) {
                var children = source._children;
                for (var i = 0, l = children ? children.length : 0; i < l; i++) {
                    var child = children[i],
                        output = child.getEffectOutput();
                    if (output) {
                        output = output.clone({ insert: false });
                        output.transform(child._matrix);
                        copy._children[i].replaceWith(output);
                    } else {
                        expand(child, copy._children[i]);
                    }
                }
            }

            expand(this, art);
            return art;
        },

        /**
         * The bounds of what the item looks like with its effects, in the
         * coordinate space of its parent: of their output with its strokes, or of
         * its children's with their effects, and its {@link #strokeBounds}
         * without them, as Illustrator's "Use Preview Bounds".
         *
         * @bean
         * @type Rectangle
         */
        getPreviewBounds: function() {
            var output = this.getEffectOutput(),
                children = this._children;
            // Without effects in it, it's the item's own:
            if (output || children && hasEffects(this)) {
                var bounds = null;
                if (output) {
                    bounds = output.getStrokeBounds();
                } else {
                    for (var i = 0, l = children.length; i < l; i++) {
                        var child = children[i];
                        if (child._visible) {
                            var rect = child.getPreviewBounds();
                            bounds = bounds ? bounds.unite(rect) : rect;
                        }
                    }
                }
                if (bounds)
                    return this._matrix._transformBounds(bounds);
            }
            return this.getStrokeBounds();
        }
    };
});
