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
 * @name AreaText
 *
 * @class An AreaText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */

var AreaText = TextItem.extend(/** @lends AreaText **/ {
    _class: 'AreaText',

    /**
     * Creates an area text item
     *
     * @name AreaText#initialize
     * @param {Rectangle} point the position where the text will start
     * @return {AreaText} the newly created point text
     *
     */
    /**
     * Creates an area text item from the properties described by an object
     * literal.
     *
     * @name AreaText#initialize
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {AreaText} the newly created point text
     */
    initialize: function AreaText () {
        this._anchor = [0,0];
        this._needsWrap = false;
        this._rectangle = arguments[0] ? this.setRectangle(arguments[0]) : new Rectangle(0, 0);
        this._editMode = false;
        TextItem.apply(this, arguments);
    },

    /**
     * Determines if the AreaText is in edit mode
     * ( In edit mode input for the current is being active )
     *
     * @bean
     * @type {Boolean}
     */
    getEditMode: function () {
        return this._editMode;
    },

    /**
     * Get current content of AreaText
     *
     * @bean
     * @type {string|string|*}
     */
    getContent: function () {
      return this._content;
    },

    /**
     * Setter for content.
     */
    setContent: function (content) {
        this._content = '' + content;
        this._needsWrap = true;
        this._changed(/*#=*/Change.CONTENT);
    },


    /**
     * Justification
     *
     * @bean
     * @type {String}
     */
    getJustification: function () {
        return this._style.justification;
    },

    setJustification: function () {
        this._style.justification = arguments[0];
        this._updateAnchor();
    },

    /**
     * The AreaText's rectangle for wrapping
     * @bean
     * @type {Rectangle}
     */
    getRectangle: function () {
        return this._rectangle;
    },

    /**
     * Setter for rectangle. Determines the position of the element
     */
    setRectangle: function () {
        var rectangle = Rectangle.read(arguments);
        this._rectangle = rectangle;

        this.translate(rectangle.topLeft.subtract(this._matrix.getTranslation()));
        this._updateAnchor();
        this._needsWrap = true;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    _wrap: function (ctx) {
        this._lines = [];

        var words = this.content.split(' '),
            line = '';

        for (var i = 0; i < words.length; i++) {
            // use metrics width to determine if the word needs
            // to be sent on the next line
            var textLine = line + words[i] + ' ',
                metrics = ctx.measureText(textLine),
                testWidth = metrics.width;
            if (testWidth > this.rectangle.width && i > 0) {
                this._lines.push(line);
                line = words[i] + ' ';
            } else {
                line = textLine;
            }
        }

        this._lines.push(line);
    },

    _updateAnchor: function () {
        var justification = this._style.getJustification(),
            rectangle = this.getRectangle(),
            anchor = new Point(0, this._style.getFontSize());

        if (justification === 'center') {
            anchor = anchor.add([rectangle.width / 2, 0]);
        } else if (justification === 'right') {
            anchor = anchor.add([rectangle.width, 0]);
        }

        this._anchor = anchor;
    },

    _getAnchor: function () {
        return this._anchor;
    },

    _draw: function (ctx, params, viewMatrix) {
        if (!this._content) {
            return;
        }

        this._setStyles(ctx, params, viewMatrix);

        var style = this._style,
            hasFill = style.hasFill(),
            hasStoke = style.hasStroke(),
            rectangle = this.rectangle,
            anchor = this._getAnchor(),
            leading = style.getLeading(),
            shadowColor = ctx.shadowColor;

        ctx.font = style.getFontStyle();
        ctx.textAlign = style.getJustification();

        if (this._needsWrap) {
            this._wrap(ctx);
            this._needsWrap = false;
        }

        var lines = this._lines;


        for (var i = 0, l = lines.length; i < l; i++) {
            if ((i+1) * leading > rectangle.height) {
                return;
            }

            // See Path._draw() for explanation about ctx.shadowColor
            ctx.shadowColor = shadowColor;
            var line = lines[i];

            if (hasFill) {
                ctx.fillText(line, anchor.x, anchor.y);
                ctx.shadowColor = 'rgba(0, 0, 0, 0)';
            }

            if (hasStoke) {
                ctx.strokeText(line, anchor.x, anchor.y);
            }

            ctx.translate(0, leading);
        }
    },

    _getBounds: function (matrix, options) {
        var bounds = new Rectangle(
            0, 0,
            this.rectangle.width,
            this.rectangle.height
        );

        return matrix ? matrix._transformBounds(bounds) : bounds;
    },

    /**
     * {@grouptitle Rectangle}
     *
     * The rectangle text is wrapped around
     *
     * @name AreaText#rectangle
     * @type Rectangle
     * @default 'new paper.Rectangle(0, 0)'
     */

    /**
     * {@grouptitle Justification}
     *
     * Current justification of the TextArea
     *
     * @name AreaText#justification
     * @type String
     * @values 'left', 'right', 'center'
     * @default 'center'
     */

    /**
     * {@grouptitle Editmode}
     *
     * Define the mode of AreaText (can be edit mode or not edit mode).
     * In the edit mode the special input
     * field should open for the editing content
     *
     * @name AreaText#editMode
     * @type Boolean
     * @default false
     */
});
