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
 * @name PointText
 *
 * @class A PointText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */
var PointText = TextItem.extend(/** @lends PointText# */{
    _class: 'PointText',

    /**
     * Creates a point text item
     *
     * @name PointText#initialize
     * @param {Point} point the position where the text will start
     * @return {PointText} the newly created point text
     *
     * @example {@paperscript}
     * var text = new PointText(new Point(200, 50));
     * text.justification = 'center';
     * text.fillColor = 'black';
     * text.content = 'The contents of the point text';
     */
    /**
     * Creates a point text item from the properties described by an object
     * literal.
     *
     * @name PointText#initialize
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {PointText} the newly created point text
     *
     * @example {@paperscript}
     * var text = new PointText({
     *     point: [50, 50],
     *     content: 'The contents of the point text',
     *     fillColor: 'black',
     *     fontFamily: 'Courier New',
     *     fontWeight: 'bold',
     *     fontSize: 25
     * });
     */
    initialize: function PointText() {
        TextItem.apply(this, arguments);
    },

    /**
     * The PointText's anchor point
     *
     * @bean
     * @type Point
     */
    getPoint: function() {
        // Se Item#getPosition for an explanation why we create new LinkedPoint
        // objects each time.
        var point = this._matrix.getTranslation();
        return new LinkedPoint(point.x, point.y, this, 'setPoint');
    },

    setPoint: function(/* point */) {
        var point = Point.read(arguments);
        this.translate(point.subtract(this._matrix.getTranslation()));
    },

    // The lines of the text as canvas lays them out, see #_measure(): one per
    // paragraph, each moving down by its own line height from the first
    // baseline at 0, and by the space between its paragraph and the one
    // before, aligned by its paragraph's justification and indents:
    // @override
    _layOut: function() {
        var story = this._story,
            length = story._content.length,
            paragraphs = new TextRange(story, this._getStart(), length)
                    .getParagraphs(),
            lines = [],
            y = 0,
            spaceAfter = 0;
        for (var i = 0, l = paragraphs.length; i < l; i++) {
            var range = paragraphs[i],
                paragraph = story._getParagraph(range._start).style,
                line = this._measure(range._start, range._end,
                        paragraph.getDirection());
            if (i > 0) {
                y += line.lineHeight + Math.max(spaceAfter,
                        paragraph.getSpaceBefore());
            }
            spaceAfter = paragraph.getSpaceAfter();
            line.y = y;
            this._place(line, paragraph, true,
                    this._indent(paragraph, true, 0, 0));
            lines.push(line);
        }
        this._visibleEnd = length;
        return lines;
    },

    _getBounds: function(matrix, options) {
        var lines = this._getLayout(),
            rect = new Rectangle(),
            strokeWidth = 0;
        for (var i = 0, l = lines.length; i < l; i++) {
            var line = lines[i],
                box = this._getBox(line, line.x, line.y);
            rect = i ? rect.unite(box) : box;
            for (var j = 0, m = line.pieces.length; j < m; j++) {
                var style = line.pieces[j].style;
                if (style.hasStroke())
                    strokeWidth = Math.max(strokeWidth, style.getStrokeWidth());
            }
        }
        // The glyph outlines aren't known, so add half the stroke width all
        // around, before transforming as strokes of text always scale. Sharp
        // miter joins can stick out further.
        if (options.stroke && strokeWidth)
            rect = rect.expand(strokeWidth);
        return matrix ? matrix._transformBounds(rect, rect) : rect;
    }
});
