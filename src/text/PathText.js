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
 * @name PathText
 *
 * @class A PathText item represents text that runs along a path, its
 *     {@link #textPath}, each letter turned to the path's direction where it
 *     sits. On a compound path, the text runs along one of its paths after the
 *     other. What doesn't fit between {@link #startOffset} and
 *     {@link #endOffset} flows on into the next linked text item.
 *
 * @extends TextItem
 */
var PathText = TextItem.extend(new function() {
    // The fields that change the layout, with their defaults:
    var fields = {
        startOffset: 0,
        endOffset: null,
        alignment: 'baseline',
        spacing: 0
    };

    return Base.each(fields, function(value, name) {
        var part = Base.capitalize(name),
            key = '_' + name;
        this[key] = value;
        this['get' + part] = function() {
            return this[key];
        };
        this['set' + part] = function(value) {
            this[key] = value;
            this._changed(/*#=*/Change.GEOMETRY);
        };
    }, {
        _class: 'PathText',
        _serializeFields: Base.set({ textPath: null }, fields),

        copyContent: function copyContent(source) {
            copyContent.base.call(this, source);
            for (var name in fields) {
                var key = '_' + name;
                this[key] = source[key];
            }
        }
    });
}, /** @lends PathText# */{
    /**
     * Creates a text item that runs along a path.
     *
     * @name PathText#initialize
     * @param {PathItem} path the path that the text runs along
     * @param {String} [orientation='horizontal'] the orientation of the text
     * @return {PathText} the newly created path text
     *
     * @example {@paperscript}
     * var path = new Path.Circle({ center: [80, 80], radius: 60 });
     * var text = new PathText(path);
     * text.content = 'Around and around and around';
     * text.fontSize = 16;
     */
    /**
     * Creates a text item that runs along a path, from the properties
     * described by an object literal.
     *
     * @name PathText#initialize
     * @param {Object} object an object containing properties describing the
     *     text's attributes
     * @return {PathText} the newly created path text
     */
    initialize: function PathText(path, orientation) {
        var hasProps = Base.isPlainObject(path);
        this._children = [];
        TextItem.call(this, hasProps ? path : null);
        if (!hasProps) {
            this.setTextPath(path);
            if (orientation)
                this.setOrientation(orientation);
        }
    },

    // NOTE: These properties have their getter / setters produced in the
    // injection scope above.

    /**
     * The length along the path where the text starts.
     *
     * @name PathText#startOffset
     * @type Number
     * @default 0
     */

    /**
     * The length along the path where the text ends, or `null` for its end.
     *
     * @name PathText#endOffset
     * @type Number
     * @default null
     */

    /**
     * Which part of the letters sits on the path.
     *
     * @name PathText#alignment
     * @type String
     * @values 'baseline', 'ascender', 'descender', 'center'
     * @default 'baseline'
     */

    /**
     * Space added between the letters, where the path bends tightly.
     *
     * @name PathText#spacing
     * @type Number
     * @default 0
     */

    // The layout of the story's part that fits along the path, see
    // #_measure(): one line of letters, each turned to the path where its
    // middle sits, found by flatteners that walk the paths one after the
    // other:
    // @override
    _layOut: function() {
        var path = this.getTextPath(),
            story = this._story,
            start = this._getStart(),
            flatteners = (path ? path._children || [path] : []).map(
                function(child) {
                    // In the text's coordinates, through the compound
                    // path's matrix too:
                    return new PathFlattener(child, 0.25, 32, false,
                            child === path ? path._matrix
                                : path._matrix.appended(child._matrix));
                }),
            lengths = flatteners.map(function(flattener) {
                return flattener.length;
            }),
            length = lengths.reduce(function(sum, length) {
                return sum + length;
            }, 0),
            from = Math.max(0, Math.min(this._startOffset, length)),
            to = this._endOffset == null ? length
                    : Math.max(from, Math.min(this._endOffset, length)),
            spacing = this._spacing,
            measured = this._measure(start, story._content.length, true),
            letters = measured.pieces,
            pieces = [],
            width = 0;
        // 1. The letters that fit, each spaced on from the one before:
        for (var i = 0, l = letters.length; i < l; i++) {
            var piece = letters[i];
            if (width + piece.width > to - from)
                break;
            piece.x = width;
            pieces.push(piece);
            width += piece.width + spacing;
        }
        width -= pieces.length ? spacing : 0;
        // 2. Placed along the paths by the first paragraph's
        // justification, with the part of the letters that sits on them:
        var paragraph = story._getParagraph(start).style,
            side = this._getSide(paragraph.getJustification(),
                paragraph.getDirection()),
            offset = side === 'right' ? to - width
                    : side === 'center' ? from + (to - from - width) / 2
                    : from,
            alignment = this._alignment,
            below = alignment === 'ascender' ? measured.ascent
                    : alignment === 'descender' ? -measured.descent
                    : alignment === 'center'
                        ? (measured.ascent - measured.descent) / 2
                    : 0;
        for (var i = 0, l = pieces.length; i < l; i++) {
            var piece = pieces[i],
                middle = offset + piece.x + piece.width / 2,
                index = 0;
            while (index < lengths.length - 1 && middle > lengths[index]) {
                middle -= lengths[index];
                index++;
            }
            var flattener = flatteners[index],
                tangent = flattener.getTangentAt(middle).normalize(),
                point = flattener.getPointAt(middle).add(
                        tangent.rotate(90).multiply(below + piece.y));
            piece.x = point.x;
            piece.y = point.y;
            piece.dx = -piece.width / 2;
            piece.rotation += tangent.getAngle();
        }
        var last = pieces[pieces.length - 1];
        this._visibleEnd = last ? last.end : start;
        return [Base.set(measured, {
            pieces: pieces,
            end: this._visibleEnd,
            width: width
        })];
    },

    // The letters' boxes, turned with them:
    _getBounds: function(matrix, options) {
        var pieces = this._getLayout()[0].pieces,
            bounds = null;
        for (var i = 0, l = pieces.length; i < l; i++) {
            var piece = pieces[i],
                rect = this._getBox(piece, piece.dx, 0),
                local = new Matrix().translate(piece.x, piece.y)
                        .rotate(piece.rotation);
            if (matrix)
                local.prepend(matrix);
            rect = local._transformBounds(rect, rect);
            bounds = bounds ? bounds.unite(rect) : rect;
        }
        return bounds || new Rectangle();
    }
});
