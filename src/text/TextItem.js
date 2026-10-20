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
 * @name TextItem
 *
 * @class The TextItem type allows you to create typography. Its functionality
 *     is inherited by different text item types such as {@link PointText}, and
 *     {@link AreaText} (coming soon). They each add a layer of functionality
 *     that is unique to their type, but share the underlying properties and
 *     functions that they inherit from TextItem.
 *
 * @extends Item
 */
var TextItem = Item.extend(/** @lends TextItem# */{
    _class: 'TextItem',
    _applyMatrix: false,
    _canApplyMatrix: false,
    _serializeFields: {
        content: null
    },
    // TextItem has no handles, so share the cache of #handleBounds and #bounds:
    _boundsOptions: { handle: false },
    initialize: function TextItem(arg) {
        // The story that the text item shows. The text's own style stands for its runs' and paragraphs' styles,
        // see #_getStyles():
        this._story = new TextStory([this]);
        // Support two forms of item initialization: Passing one object literal
        // describing all the different properties to be set, or a point where
        // it should be placed (arg).
        // See if a point is passed, and if so, pass it on to _initialize().
        // If not, it might be a properties object literal.
        var hasProps = arg && Base.isPlainObject(arg)
                && arg.x === undefined && arg.y === undefined;
        this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
    },

    // Styles that differ within the text are kept by run and by paragraph:
    _serialize: function _serialize(options, dictionary) {
        var json = _serialize.base.call(this, options, dictionary),
            props = json[1],
            story = this._story,
            runs = story.getRuns(),
            paragraphs = story._paragraphs,
            keys = story._paragraphKeys;
        if (runs.length > 1) {
            props.runs = runs.map(function(run) {
                var json = run.toJSON();
                delete json.start;
                delete json.end;
                for (var key in keys)
                    delete json[key];
                return json;
            });
            delete props.content;
        }
        if (paragraphs.some(function(style) {
            return !style.equals(paragraphs[0]);
        })) {
            props.paragraphs = paragraphs.map(function(style) {
                var json = {};
                for (var key in keys) {
                    var value = style[key];
                    if (!Base.equals(value, style._defaults[key]))
                        json[key] = Base.serialize(value);
                }
                return json;
            });
        }
        return json;
    },

    _equals: function(item) {
        var story1 = this._story,
            story2 = item._story,
            runs1 = story1._getRuns(),
            runs2 = story2._getRuns(),
            paragraphs1 = story1._paragraphs,
            paragraphs2 = story2._paragraphs;
        return story1._content === story2._content
                && runs1.length === runs2.length
                && runs1.every(function(run, i) {
                    var other = runs2[i];
                    return run.end === other.end
                            && run.style.equals(other.style);
                })
                && paragraphs1.length === paragraphs2.length
                && paragraphs1.every(function(style, i) {
                    return style.equals(paragraphs2[i]);
                });
    },

    _changed: function _changed(flags) {
        _changed.base.call(this, flags);
        // The layout follows the content and the styles of the runs:
        if (flags & (/*#=*/ChangeFlag.GEOMETRY | /*#=*/ChangeFlag.STYLE))
            this._layout = this._fontMetrics = null;
    },

    // A copy shows a copy of the story, on its own:
    copyContent: function(source) {
        this._story = source._story._clone([this]);
        this._changed(/*#=*/Change.CONTENT);
    },

    // The text's own style stands for its story's runs' and paragraphs'
    // styles, and keeps only the properties of the text item itself:
    // @override
    _getStyles: function(style, key) {
        var story = this._story;
        return !(key in story._itemKeys)
                ? key in story._paragraphKeys
                    ? story._paragraphs
                    : story._runs.map(function(run) {
                        return run.style;
                    })
                : null;
    },

    /**
     * The story the text item shows: its content, kept in runs of characters
     * that share a style, and the styles of its paragraphs.
     *
     * @bean
     * @type TextStory
     */
    getStory: function() {
        return this._story;
    },

    isEmpty: function() {
        return !this._story._content;
    },

    // Lays the story out from `start` to `end` along a straight baseline from
    // x = 0: the pieces of its runs, each with its style, place and extent,
    // the width, and the line height, the largest of the runs'. Neighbouring
    // pieces of one font are measured as one string, so each advance holds the
    // font's kerning with the letter before it. In runs with manual kerning or
    // rotated letters, each letter is a piece:
    _measure: function(start, end) {
        var view = this.getView(),
            story = this._story,
            content = story._content,
            runs = story._runs,
            letters = null,
            index = 0,
            pieces = [],
            total = 0,
            lineHeight = 0,
            ascent = 0,
            descent = 0,
            group = '',
            groupWidth = 0,
            previous = null;

        // The advance of `text` after the group measured so far:
        function advance(piece, text) {
            if (!(previous && previous.font === piece.font
                    && previous.tracking === piece.tracking
                    && previous.scale.equals(piece.scale)
                    && previous.y === piece.y)) {
                group = '';
                groupWidth = 0;
            }
            var before = groupWidth;
            group += text;
            groupWidth = view.getTextWidth(piece.font, [group], piece.tracking)
                    * piece.scale.x;
            return groupWidth - before;
        }

        // Adds the piece of `text`, from `from` to `to` in the story, with
        // `extra` space after it:
        function add(piece, text, from, to, extra) {
            var shown = piece.capitals ? text.toUpperCase() : text,
                width = advance(piece, shown) + extra;
            pieces.push(previous = Base.set({}, piece, {
                content: shown,
                start: from,
                end: to,
                x: total,
                width: width
            }));
            total += width;
        }

        for (var i = 0, l = runs.length, pos = 0; i < l; i++) {
            var run = runs[i],
                next = pos + run.length,
                from = Math.max(pos, start),
                to = Math.min(next, end);
            // An empty line takes its line height from the run it's in:
            if (from < to || start === end && from === to && !lineHeight) {
                var style = run.style,
                    piece = this._getPiece(style),
                    kerning = style.getLetterKerning();
                if (kerning != null || piece.rotation) {
                    // Walk the letters once, through all the runs:
                    letters = letters || story._getLetters();
                    while (index < letters.length
                            && letters[index]._start < to) {
                        var letter = letters[index++];
                        if (letter._start >= from) {
                            if (kerning != null) {
                                // Manual kerning replaces the font's pair:
                                previous = null;
                            }
                            add(piece, letter.getContent(), letter._start,
                                    letter._end,
                                    (kerning || 0) / 1000 * piece.size);
                        }
                    }
                } else {
                    add(piece, content.slice(from, to), from, to, 0);
                }
                lineHeight = Math.max(lineHeight, piece.lineHeight);
                ascent = Math.max(ascent, piece.ascent - piece.y);
                descent = Math.max(descent, piece.descent + piece.y);
            }
            pos = next;
        }
        return {
            pieces: pieces,
            start: start,
            end: end,
            x: 0,
            y: 0,
            width: total,
            lineHeight: lineHeight,
            ascent: ascent,
            descent: descent
        };
    },

    /**
     * The lines of the text, as its layout breaks them: each a range of its
     * story, with its `baseline`, a {@link Line} along it, and its `bounds`,
     * in the text item's own coordinates.
     *
     * @bean
     * @type TextRange[]
     */
    getLines: function() {
        var that = this,
            story = this._story;
        return this._getLayout().map(function(line) {
            var range = new TextRange(story, line.start, line.end);
            range.baseline = new Line(new Point(line.x, line.y),
                    new Point(line.x + line.width, line.y));
            range.bounds = that._getBox(line, line.x, line.y);
            return range;
        });
    },

    // How a style sets its letters: its canvas font and tracking, its size,
    // the font's ascent and descent and the line height, how far it moves them
    // from the baseline, its scaling and rotation:
    _getPiece: function(style) {
        var size = style._getFontSize(),
            font = style._getCanvasFont(),
            position = style.getBaselinePosition(),
            scale = Point.read([style.getLetterScaling()]),
            // The font's metrics, kept until the text changes, as its layout,
            // or guessed from its size without them:
            cache = this._fontMetrics || (this._fontMetrics = {}),
            metrics = cache[font] || (cache[font] =
                    this.getView().getFontMetrics(font)
                    || { ascent: 0.75 * size, descent: 0.25 * size });
        return {
            style: style,
            font: font,
            tracking: style._getCanvasLetterSpacing(),
            size: size,
            ascent: metrics.ascent * scale.y,
            descent: metrics.descent * scale.y,
            lineHeight: style._getLineHeight(),
            y: -style.getBaselineShift() - (
                    position === 'superscript' ? 1
                    : position === 'subscript' ? -1 : 0
                ) * size * style._scriptShift,
            scale: scale,
            rotation: style.getLetterRotation(),
            capitals: style.getCapitals() === 'all'
        };
    },

    // The box of a line or a piece with its baseline at `x`, `y`: as high as
    // its line height, which leaves the same leading above its ascent as
    // below its descent:
    _getBox: function(entry, x, y) {
        var leading = (entry.lineHeight - entry.ascent - entry.descent) / 2;
        return new Rectangle(x, y - entry.ascent - leading, entry.width,
                entry.lineHeight);
    },

    // The room between `left` and `right` that the paragraph's indents leave
    // a line, with the first line's indent on its first:
    _indent: function(paragraph, isFirst, left, right) {
        var isRightToLeft = paragraph.getDirection() === 'rtl',
            start = paragraph.getStartIndent()
                    + (isFirst ? paragraph.getFirstLineIndent() : 0),
            end = paragraph.getEndIndent();
        return [left + (isRightToLeft ? end : start),
                right - (isRightToLeft ? start : end)];
    },

    // Places the line in the room by the paragraph's justification, by its
    // justifyLast on the last line of a justified paragraph:
    _place: function(line, paragraph, isLast, room) {
        var justification = paragraph.getJustification(),
            justifyLast = paragraph.getJustifyLast(),
            side = this._getSide(justification === 'justify' && isLast
                    && justifyLast !== 'all' ? justifyLast : justification,
                    paragraph.getDirection()),
            left = room[0],
            right = room[1];
        if (side === 'justify' || side === 'all') {
            this._justify(line, right - left);
            this._shift(line, left, 0);
        } else {
            this._shift(line, side === 'right' ? right - line.width
                    : side === 'center' ? (left + right - line.width) / 2
                    : left, 0);
        }
    },

    // Spreads the line's extra width between its words, by moving each piece
    // by the spaces before it:
    _justify: function(line, width) {
        var pieces = line.pieces,
            content = this._story._content,
            spaces = (content.slice(pieces.length ? pieces[0].start : 0,
                    pieces.length ? pieces[pieces.length - 1].end : 0)
                    .match(/\s+/g) || []).length;
        if (spaces && width > line.width) {
            var extra = (width - line.width) / spaces,
                moved = 0,
                result = [];
            for (var i = 0, l = pieces.length; i < l; i++) {
                // Split pieces at their spaces, so each word can move. Pieces
                // without any move whole:
                var piece = pieces[i],
                    parts = piece.content.split(/(\s+)/),
                    from = piece.start,
                    x = piece.x;
                if (parts.length === 1) {
                    result.push(Base.set({}, piece, { x: x + moved }));
                } else {
                    for (var j = 0, m = parts.length; j < m; j++) {
                        var part = parts[j];
                        if (part) {
                            var advance = this._measure(from,
                                    from + part.length).width;
                            if (/^\s+$/.test(part)) {
                                moved += extra;
                            } else {
                                result.push(Base.set({}, piece, {
                                    content: part,
                                    start: from,
                                    end: from + part.length,
                                    x: x + moved,
                                    width: advance
                                }));
                            }
                            x += advance;
                            from += part.length;
                        }
                    }
                }
            }
            line.pieces = result;
            line.width = width;
        }
    },

    // Moves the line, and its pieces, by `x` and `y`:
    _shift: function(line, x, y) {
        var pieces = line.pieces;
        line.x = (line.x || 0) + x;
        line.y += y;
        for (var i = 0, l = pieces.length; i < l; i++)
            pieces[i].x += x;
    },

    // Where lines align by `justification`, 'start' and 'end' resolved by the
    // paragraph's `direction`:
    _getSide: function(justification, direction) {
        var isRightToLeft = direction === 'rtl';
        return justification === 'start'
                ? isRightToLeft ? 'right' : 'left'
                : justification === 'end'
                    ? isRightToLeft ? 'left' : 'right'
                    : justification;
    },

    // Draw the pieces of the text's layout, see #_getLayout(), each in its
    // style, at its place and angle:
    _draw: function(ctx, param, viewMatrix) {
        if (param.dontFinish || param.clip) {
            // The glyph outlines aren't known, so clip with the bounds (#1845):
            var rect = this.getInternalBounds();
            if (!param.dontStart)
                ctx.beginPath();
            ctx.rect(rect.x, rect.y, rect.width, rect.height);
        } else if (this._story._content) {
            var lines = this._getLayout(),
                shadowColor = ctx.shadowColor,
                // Glyphs can only be stroked through the transformation,
                // unlike paths, so approximate non-scaling strokes by dividing
                // the width and the dashes by the scale (#1703):
                scale = !this._style.getStrokeScaling()
                        && viewMatrix._getMeanScale();
            ctx.textAlign = 'left';
            for (var i = 0, l = lines.length; i < l; i++) {
                var line = lines[i],
                    pieces = line.pieces;
                for (var j = 0, m = pieces.length; j < m; j++) {
                    var piece = pieces[j],
                        style = piece.style,
                        hasFill = style.hasFill(),
                        hasStroke = style.hasStroke(),
                        size = piece.size,
                        x = 0;
                    this._setStyles(ctx, param, viewMatrix, null, style);
                    if (hasStroke && scale) {
                        ctx.lineWidth /= scale;
                        if ('setLineDash' in ctx) {
                            ctx.setLineDash(ctx.getLineDash().map(
                                function(dash) {
                                    return dash / scale;
                                }));
                            ctx.lineDashOffset /= scale;
                        }
                    }
                    ctx.save();
                    ctx.translate(piece.x, line.y + piece.y);
                    if (piece.rotation)
                        ctx.rotate(piece.rotation * Math.PI / 180);
                    // Underlines and strikethroughs, in the fill color:
                    if (hasFill) {
                        var thickness = size / 15;
                        if (style.getUnderline())
                            ctx.fillRect(x, size / 8, piece.width, thickness);
                        if (style.getStrikethrough()) {
                            ctx.fillRect(x, -size * 0.3, piece.width,
                                    thickness);
                        }
                    }
                    ctx.scale(piece.scale.x, piece.scale.y);
                    x /= piece.scale.x;
                    ctx.font = piece.font;
                    ctx.letterSpacing = piece.tracking;
                    // See Path._draw() for explanation about ctx.shadowColor
                    ctx.shadowColor = shadowColor;
                    if (hasFill) {
                        ctx.fillText(piece.content, x, 0);
                        ctx.shadowColor = 'rgba(0,0,0,0)';
                    }
                    if (hasStroke)
                        ctx.strokeText(piece.content, x, 0);
                    ctx.restore();
                }
            }
        }
    },

    _hitTestSelf: function(point, options) {
        if (options.fill) {
            // The glyph outlines aren't known, so hit the letters' boxes, also
            // within the tolerance around them (#632):
            var lines = this._getLayout();
            for (var i = 0, l = lines.length; i < l; i++) {
                var line = lines[i],
                    pieces = line.pieces;
                for (var j = 0, m = pieces.length; j < m; j++) {
                    var piece = pieces[j],
                        local = point.subtract(piece.x, line.y + piece.y)
                                .rotate(-piece.rotation),
                        rect = this._getBox(piece, 0, 0),
                        closest = local.clamp(rect.getTopLeft(true),
                                rect.getBottomRight(true));
                    // Transparent fills are hit too, see Path#_hitTestSelf():
                    if (piece.style.getFillColor() && local.subtract(closest)
                            .divide(options._tolerancePadding)
                            .getLength() <= 1)
                        return new HitResult('fill', this);
                }
            }
        }
    },

    /**
     * {@grouptitle Character Style}
     *
     * The font-family to be used in text content.
     *
     * @name TextItem#fontFamily
     * @type String
     * @default 'sans-serif'
     */

    /**
     *
     * The font-weight to be used in text content.
     *
     * @name TextItem#fontWeight
     * @type String|Number
     * @default 'normal'
     */

    /**
     * The font size of text content, as a number in pixels, or as a string with
     * optional units `'px'`, `'pt'` and `'em'`.
     *
     * @name TextItem#fontSize
     * @type Number|String
     * @default 10
     */

    /**
     *
     * The font-family to be used in text content, as one string.
     * @deprecated use {@link #fontFamily} instead.
     *
     * @name TextItem#font
     * @type String
     * @default 'sans-serif'
     */

    /**
     * The line height of text content: the distance from one line's baseline
     * to the next. Automatic, as `'auto'` (1.2) or another factor of the
     * letters' font size, each line moving down by its largest letters'; or
     * fixed, as a length with units as the font size takes them (`'18px'`,
     * `'12pt'`). `leading`, as Paper.js had it before, sets and reads it as a
     * fixed length in pixels.
     *
     * @name TextItem#lineHeight
     * @type Number|String
     * @default 'auto'
     */

    /**
     * The letter tracking of text content: the space added after each letter,
     * along the line, in thousandths of an em, as in Adobe Illustrator and
     * InDesign. A tracking of 100 adds a tenth of the font size. Also
     * `tracking`, its former name.
     *
     * @name TextItem#letterTracking
     * @type Number
     * @default 0
     */

    /**
     * The letter kerning of text content: the space added after a letter,
     * along the line, in thousandths of an em, in place of the font's own
     * kerning pair; `null` for the font's kerning.
     *
     * @name TextItem#letterKerning
     * @type Number
     * @default null
     */

    /**
     * The font style of text content, as in CSS: upright or slanted. Together
     * with the {@link #fontWeight}, it says what a font's style name says, e.g.
     * `'Bold Italic'`.
     *
     * @name TextItem#fontStyle
     * @type String
     * @values 'normal', 'italic', 'oblique'
     * @default 'normal'
     */

    /**
     * The settings of a variable font's axes, by their tags: `{ wght: 600,
     * wdth: 80 }`. Kept for hosts that lay text out with its fonts; canvas
     * doesn't draw them.
     *
     * @name TextItem#fontVariations
     * @type Object
     * @default null
     */

    /**
     * How far the letters move up from the baseline, in pixels.
     *
     * @name TextItem#baselineShift
     * @type Number
     * @default 0
     */

    /**
     * Whether the letters are set as superscripts or subscripts: smaller, and
     * above or below the baseline.
     *
     * @name TextItem#baselinePosition
     * @type String
     * @values 'normal', 'superscript', 'subscript'
     * @default 'normal'
     */

    /**
     * How much the letters are scaled, as {@link Item#scaling}: one factor for
     * both directions, or a point with the horizontal and vertical ones.
     *
     * @name TextItem#letterScaling
     * @type Number|Point
     * @default 1
     */

    /**
     * The rotation of each letter about its origin on the baseline, in degrees.
     *
     * @name TextItem#letterRotation
     * @type Number
     * @default 0
     */

    /**
     * Whether the letters are set as capitals, or as small capitals.
     *
     * @name TextItem#capitals
     * @type String
     * @values 'normal', 'all', 'small'
     * @default 'normal'
     */

    /**
     * Whether the letters are underlined.
     *
     * @name TextItem#underline
     * @type Boolean
     * @default false
     */

    /**
     * Whether the letters are struck through.
     *
     * @name TextItem#strikethrough
     * @type Boolean
     * @default false
     */

    /**
     * The OpenType features to turn on (`'dlig'`) or off (`'-liga'`). Kept for
     * hosts that lay text out with its fonts; canvas doesn't draw them.
     *
     * @name TextItem#features
     * @type String[]
     * @default null
     */

    /**
     * {@grouptitle Paragraph Style}
     *
     * The justification of text paragraphs.
     *
     * @name TextItem#justification
     * @type String
     * @values 'left', 'right', 'center', 'start', 'end', 'justify'
     * @default 'left'
     */

    /**
     * How the last line of a justified paragraph is aligned; `'all'` justifies
     * it too.
     *
     * @name TextItem#justifyLast
     * @type String
     * @values 'left', 'right', 'center', 'start', 'end', 'all'
     * @default 'left'
     */

    /**
     * How far justification may change the spacing, each as `[minimum, desired,
     * maximum]` in percent: `{ word: [80, 100, 133], letter: [0, 0, 0], glyph:
     * [100, 100, 100] }`; `null` for those. Kept for hosts: canvas text
     * justifies by the word spacing alone.
     *
     * @name TextItem#justifySpacing
     * @type Object
     * @default null
     */

    /**
     * The indent where the paragraph's lines start: left in left-to-right text,
     * right in right-to-left text.
     *
     * @name TextItem#startIndent
     * @type Number
     * @default 0
     */

    /**
     * The indent where the paragraph's lines end.
     *
     * @name TextItem#endIndent
     * @type Number
     * @default 0
     */

    /**
     * The indent of the paragraph's first line, added to its start indent.
     *
     * @name TextItem#firstLineIndent
     * @type Number
     * @default 0
     */

    /**
     * The space above the paragraph. Between two paragraphs, the larger of this
     * one's and the space after the one before it is used.
     *
     * @name TextItem#spaceBefore
     * @type Number
     * @default 0
     */

    /**
     * The space below the paragraph.
     *
     * @name TextItem#spaceAfter
     * @type Number
     * @default 0
     */

    /**
     * Whether words are hyphenated at the ends of lines, and how: `true`, or `{
     * wordsLongerThan, afterFirst, beforeLast, limit, zone, capitalized }`.
     * Kept for hosts.
     *
     * @name TextItem#hyphenation
     * @type Boolean|Object
     * @default false
     */

    /**
     * How lines are broken: one line at a time, or all of the paragraph's lines
     * together, for the most even spacing. Kept for hosts: canvas text breaks
     * one line at a time.
     *
     * @name TextItem#composer
     * @type String
     * @values 'line', 'paragraph'
     * @default 'paragraph'
     */

    /**
     * The paragraph's tab stops: `[{ position, align, leader }]`, with `align`
     * one of `'left'`, `'center'`, `'right'` and `'decimal'`. Kept for hosts:
     * canvas text doesn't set tabs yet.
     *
     * @name TextItem#tabs
     * @type Object[]
     * @default null
     */

    /**
     * The direction the paragraph's lines run in, which `'start'` and `'end'`
     * follow; `null` for left to right.
     *
     * @name TextItem#direction
     * @type String
     * @values 'ltr', 'rtl'
     * @default null
     */

    /**
     * The line height as a fixed length, in pixels: setting a number makes it
     * fixed, as `'18px'`.
     *
     * @name TextItem#leading
     * @type Number
     * @deprecated use {@link #lineHeight} instead.
     */

    /**
     * @name TextItem#tracking
     * @type Number
     * @deprecated use {@link #letterTracking} instead.
     */

    /**
     * {@grouptitle Content}
     *
     * The text of the item's story, see {@link TextStory#content}.
     *
     * @name TextItem#content
     * @type String
     */

    /**
     * Replaces the content from `start` to `end` of the item's story, see
     * {@link TextStory#replace(content, start, end)}.
     *
     * @name TextItem#replace
     * @function
     * @param {String} content the new content
     * @param {Number} start the index of the first character to replace
     * @param {Number} end the index after the last character to replace
     */

    /**
     * The range of the item's story from `start` to `end`.
     *
     * @name TextItem#range
     * @function
     * @param {Number} start the index of its first character
     * @param {Number} end the index after its last character
     * @return {TextRange}
     */

    /**
     * The runs of the item's story, see {@link TextStory#runs}.
     *
     * @name TextItem#runs
     * @type TextRange[]
     */

    /**
     * The paragraphs of the item's story, see {@link TextStory#paragraphs}.
     *
     * @name TextItem#paragraphs
     * @type TextRange[]
     */

    /**
     * The words of the item's story, see {@link TextStory#words}.
     *
     * @name TextItem#words
     * @type TextRange[]
     */

    /**
     * The letters of the item's story, see {@link TextStory#letters}.
     *
     * @name TextItem#letters
     * @type TextRange[]
     */

    /**
     * @bean
     * @type Style
     * @deprecated use {@link #style} instead.
     */
    getCharacterStyle: '#getStyle',
    setCharacterStyle: '#setStyle',

    /**
     * @bean
     * @type Style
     * @deprecated use {@link #style} instead.
     */
    getParagraphStyle: '#getStyle',
    setParagraphStyle: '#setStyle'
});

// The text items' content is their story's:
TextItem.inject(Base.each(['getContent', 'setContent', 'replace', 'range',
        'getRuns', 'setRuns', 'getParagraphs', 'setParagraphs', 'getWords',
        'getLetters'],
    function(name) {
        this[name] = function() {
            var story = this._story;
            return story[name].apply(story, arguments);
        };
    }, { beans: true }
));
