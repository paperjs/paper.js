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

    _draw: function(ctx, param, viewMatrix) {
        if (!this._content)
            return;
        this._setStyles(ctx, param, viewMatrix);
        var lines = this._lines,
            style = this._style,
            hasFill = style.hasFill(),
            hasStroke = style.hasStroke(),
            leading = style.getLeading(),
            shadowColor = ctx.shadowColor;
        ctx.font = style.getFontStyle();
        ctx.textAlign = style.getJustification();
        for (var i = 0, l = lines.length; i < l; i++) {
            // See Path._draw() for explanation about ctx.shadowColor
            ctx.shadowColor = shadowColor;
            var line = lines[i];
            if (hasFill) {
                ctx.fillText(line, 0, 0);
                ctx.shadowColor = 'rgba(0,0,0,0)';
            }
            if (hasStroke)
                ctx.strokeText(line, 0, 0);
            ctx.translate(0, leading);
        }
    },

    _getBounds: function(matrix, options) {
        var style = this._style,
            lines = this._lines,
            numLines = lines.length,
            justification = style.getJustification(),
            leading = style.getLeading(),
            width = this.getView().getTextWidth(style.getFontStyle(), lines),
            x = 0;
        // Adjust for different justifications.
        if (justification !== 'left')
            x -= width / (justification === 'center' ? 2: 1);
        // Until we don't have baseline measuring, assume 1 / 4 leading as a
        // rough guess:
        var rect = new Rectangle(x,
                    numLines ? - 0.75 * leading : 0,
                    width, numLines * leading);
        return matrix ? matrix._transformBounds(rect, rect) : rect;
    }
});
