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
 * @name AreaText
 *
 * @class An AreaText item represents text that flows inside an area, its
 *     {@link #textPath}: any path, with holes too, divided into
 *     {@link #columns} and {@link #rows}. Its lines break between words to fit
 *     the area's width where they sit. What doesn't fit flows on into the next
 *     linked text item.
 *
 * @extends TextItem
 */
var AreaText = TextItem.extend(/** @lends AreaText# */{
    _class: 'AreaText',
    _serializeFields: {
        textPath: null,
        columns: 1,
        rows: 1,
        gutter: 18,
        inset: 0,
        verticalAlign: 'top'
    },
    _columns: 1,
    _rows: 1,
    _gutter: 18,
    _inset: 0,
    _verticalAlign: 'top',

    /**
     * Creates a text item that flows inside an area.
     *
     * @name AreaText#initialize
     * @param {PathItem} area the path that the text flows inside
     * @param {String} [orientation='horizontal'] the orientation of the text
     * @return {AreaText} the newly created area text
     */
    /**
     * Creates a text item that flows inside a rectangle.
     *
     * @name AreaText#initialize
     * @param {Rectangle} rectangle the rectangle that the text flows inside
     * @param {String} [orientation='horizontal'] the orientation of the text
     * @return {AreaText} the newly created area text
     *
     * @example {@paperscript}
     * var text = new AreaText(new Rectangle(20, 20, 160, 100));
     * text.content = 'Text in an area breaks into lines that fit it.';
     */
    /**
     * Creates a text item that flows inside an area, from the properties
     * described by an object literal.
     *
     * @name AreaText#initialize
     * @param {Object} object an object containing properties describing the
     *     text's attributes
     * @return {AreaText} the newly created area text
     */
    initialize: function AreaText(area, orientation) {
        var hasProps = Base.isPlainObject(area) && area.width === undefined;
        this._children = [];
        TextItem.call(this, hasProps ? area : null);
        if (!hasProps) {
            this.setTextPath(area instanceof PathItem ? area
                    : new Path.Rectangle({
                        rectangle: Rectangle.read([area]),
                        insert: false
                    }));
            if (orientation)
                this.setOrientation(orientation);
        }
    },

    copyContent: function copyContent(source) {
        copyContent.base.call(this, source);
        this._columns = source._columns;
        this._rows = source._rows;
        this._gutter = source._gutter;
        this._inset = source._inset;
        this._verticalAlign = source._verticalAlign;
    },

    // Its place among its layer's text wraps changes when it moves:
    _installEvents: function _installEvents(install) {
        _installEvents.base.call(this, install);
        this._layout = null;
    },

    /**
     * The number of columns that the area is divided into, from left to
     * right, which the text fills one after the other.
     *
     * @bean
     * @type Number
     * @default 1
     */
    getColumns: function() {
        return this._columns;
    },

    setColumns: function(columns) {
        this._columns = columns;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    /**
     * The number of rows that the area is divided into, from top to bottom,
     * each with its columns.
     *
     * @bean
     * @type Number
     * @default 1
     */
    getRows: function() {
        return this._rows;
    },

    setRows: function(rows) {
        this._rows = rows;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    /**
     * The space between the columns and between the rows.
     *
     * @bean
     * @type Number
     * @default 18
     */
    getGutter: function() {
        return this._gutter;
    },

    setGutter: function(gutter) {
        this._gutter = gutter;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    /**
     * The space between the area's edges and the text.
     *
     * @bean
     * @type Number
     * @default 0
     */
    getInset: function() {
        return this._inset;
    },

    setInset: function(inset) {
        this._inset = inset;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    /**
     * Where the lines sit in each column, from top to bottom.
     *
     * @bean
     * @type String
     * @values 'top', 'center', 'bottom'
     * @default 'top'
     */
    getVerticalAlign: function() {
        return this._verticalAlign;
    },

    setVerticalAlign: function(align) {
        this._verticalAlign = align;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    /**
     * Sets the area's height to the smallest that holds all of its text,
     * scaling its {@link #textPath} vertically from its top. An area without
     * a height, which holds nothing, becomes a rectangle as wide as it.
     *
     * @return {AreaText} this area text
     *
     * @example {@paperscript}
     * var text = new AreaText(new Rectangle(20, 20, 160, 0));
     * text.content = 'The area grows to hold all of its text.';
     * text.fitHeight();
     */
    fitHeight: function() {
        var that = this,
            path = this.getTextPath();
        if (path) {
            var bounds = path.getBounds();
            if (!bounds.height) {
                path = new Path.Rectangle({
                    rectangle: new Rectangle(bounds.x, bounds.y, bounds.width,
                            1),
                    insert: false
                });
                this.setTextPath(path);
            }
            var top = bounds.getTopCenter(),
                fits = function(height) {
                    path.scale(1, height / path.getBounds().height, top);
                    return that._getVisibleRange()[1]
                            === that._story._content.length;
                },
                low = 0,
                high = path.getBounds().height,
                count = 0;
            // Double the height until all fits, then search between:
            while (!fits(high) && count++ < 32) {
                low = high;
                high *= 2;
            }
            if (count <= 32) {
                while (high - low > 0.01) {
                    var height = (low + high) / 2;
                    if (fits(height)) {
                        high = height;
                    } else {
                        low = height;
                    }
                }
                fits(high);
            } else {
                // It never fits, as an area without a width:
                fits(bounds.height || 1);
            }
        }
        return this;
    },

    // Lay out again when the layer's text wraps change:
    // @override
    _getLayout: function _getLayout() {
        var layer = this.getLayer(),
            version = layer && layer._textWrapVersion;
        if (this._textWrapVersion !== version) {
            this._textWrapVersion = version;
            this._layout = null;
        }
        return _getLayout.base.call(this);
    },

    // The layout of the story's part that fits the area, see #_measure(): its
    // lines, broken between words to fit the area's width where each sits,
    // filling the regions of its rows and columns one after the other, each
    // line moving down by its own line height and the space between
    // paragraphs, aligned by its paragraph's justification and indents, and
    // evened out by its lineWrap:
    // @override
    _layOut: function() {
        var that = this,
            story = this._story,
            content = story._content,
            regions = this._getRegions(),
            wraps = this._getTextWraps(),
            // How far each region's first line moves down, to align its
            // lines vertically:
            offsets = regions.map(function() {
                return 0;
            }),
            state;

        // Lays out the paragraph from `state`, each line's room narrowed
        // by `getCut(index)` to break it, see #_breakLine():
        var lay = function(getCut) {
            var pos = state.pos,
                region = state.region,
                y = state.y,
                paragraph = story._getParagraph(pos),
                style = paragraph.style,
                // The space between paragraphs, once, unless at the top:
                space = pos === paragraph.start && y !== null
                    ? Math.max(state.spaceAfter, style.getSpaceBefore())
                    : 0,
                result = [],
                isComplete = false;
            while (regions[region]) {
                var bounds = regions[region],
                    // The extent of what comes next, to find room:
                    next = that._measure(pos, Math.min(pos + 1,
                            paragraph.end)),
                    baseline = y === null
                        ? bounds.top + offsets[region] + next.ascent
                        : y + next.lineHeight + space;
                // Nothing without a height fits anywhere:
                if (!next.lineHeight || next.lineHeight < 0)
                    break;
                if (baseline + next.descent > bounds.bottom) {
                    // The region is full: on to the next one.
                    region++;
                    y = null;
                    continue;
                }
                // Fill the spans at this height in reading order, each as
                // far as it goes, then go on further down:
                var spans = that._getSpans(bounds, baseline, next, wraps);
                if (style.getDirection() === 'rtl')
                    spans.reverse();
                for (var i = 0, l = spans.length; i < l && !isComplete;
                        i++) {
                    var span = spans[i],
                        line = that._breakLine(pos, paragraph,
                            pos === paragraph.start, span,
                            getCut ? getCut(result.length) : 0,
                            // A word too wide for any line takes one of
                            // its own where nothing narrows the region:
                            span[1] - span[0] >= bounds.width
                                - /*#=*/Numerical.GEOMETRIC_EPSILON);
                    if (line) {
                        line.y = baseline;
                        line.region = region;
                        result.push(line);
                        pos = line.end;
                        isComplete = pos === paragraph.end;
                    }
                }
                y = baseline;
                space = 0;
                if (isComplete)
                    break;
            }
            return {
                lines: result,
                paragraph: style,
                isComplete: isComplete,
                state: {
                    pos: pos,
                    region: region,
                    y: y,
                    spaceAfter: style.getSpaceAfter()
                }
            };
        };

        // Finds where `isAbove(value)` turns true for values from 0 to
        // `high`, as the values on either side of it, to `precision`:
        var search = function(high, precision, isAbove) {
            var low = 0;
            while (high - low > precision) {
                var value = (low + high) / 2;
                if (isAbove(value)) {
                    high = value;
                } else {
                    low = value;
                }
            }
            return [low, high];
        };

        // Narrower lines change nothing as long as they keep the paragraph
        // whole, and its number of lines:
        var keeps = function(attempt, count) {
            return attempt.isComplete && attempt.lines.length === count;
        };

        // Narrows the lines from index `from` on as far as they keep the
        // paragraph, which evens them out:
        var balance = function(count, from) {
            var cutFrom = function(cut) {
                    return function(index) {
                        return index >= from ? cut : 0;
                    };
                },
                widest = regions.reduce(function(width, bounds) {
                    return Math.max(width, bounds.width);
                }, 0),
                cut = search(widest, 0.5, function(cut) {
                    return !keeps(lay(cutFrom(cut)), count);
                })[0];
            return cut > 0 && lay(cutFrom(cut));
        };

        // Lays out all the paragraphs, one after the other, from where the
        // text starts:
        var layAll = function() {
            var layout = [],
                result,
                match;
            state = {
                pos: that._getStart(),
                region: 0,
                y: null,
                spaceAfter: 0
            };
            do {
                result = lay();
                var lines = result.lines,
                    count = lines.length,
                    wrap = result.paragraph.getLineWrap();
                if (result.isComplete && count > 1) {
                    if (wrap === 'balance') {
                        result = balance(count, 0) || result;
                    } else if (wrap === 'pretty' && lines[count - 1].width
                            < lines[count - 2].width / 3) {
                        // Balance the last four lines, if the last one is
                        // short:
                        result = balance(count, Math.max(0, count - 4))
                                || result;
                    }
                }
                layout.push.apply(layout, result.lines);
                state = result.state;
                // On to the next paragraph, after its line break:
                match = result.isComplete
                        && /^(\r\n|\n|\r)/.exec(content.slice(state.pos));
                if (match)
                    state.pos += match[0].length;
            } while (match);
            return layout;
        };

        // The region's last line, and the room below it:
        var getLast = function(layout, region) {
            for (var i = layout.length - 1; i >= 0; i--) {
                var line = layout[i];
                if (line.region === region) {
                    return {
                        line: line,
                        free: regions[region].bottom - line.y
                                - line.descent
                    };
                }
            }
            return null;
        };

        var layout = layAll(),
            align = this._verticalAlign;
        if (align !== 'top') {
            // Align each region's lines by laying them out again from
            // lower down, as far as they keep what the region shows, and,
            // to center them, as much room above them as below:
            for (var r = 0, l = regions.length; r < l; r++) {
                var last = getLast(layout, r);
                if (last && last.free > 0) {
                    var end = last.line.end,
                        // The room below the lines laid out from `offset`
                        // down, beyond what's wanted, or null if the region
                        // then shows less:
                        getExcess = function(offset) {
                            offsets[r] = offset;
                            var moved = getLast(layAll(), r);
                            return moved && moved.line.end === end
                                    ? moved.free - (align === 'center'
                                        ? offset : 0)
                                    : null;
                        },
                        // A rectangle aligns in one step, other shapes by
                        // searching:
                        excess = getExcess(align === 'center'
                                ? last.free / 2 : last.free);
                    if (excess === null || Math.abs(excess) > 0.01) {
                        offsets[r] = search(last.free, 0.01,
                            function(offset) {
                                var excess = getExcess(offset);
                                return excess === null || excess < 0;
                            })[0];
                    }
                    layout = layAll();
                }
            }
        }
        this._visibleEnd = state.pos;
        return layout;
    },

    // The regions that the area is divided into by its inset, rows and
    // columns, in the order the text fills them:
    _getRegions: function() {
        var path = this.getTextPath(),
            regions = [];
        if (path) {
            var bounds = path.getBounds().expand(-2 * this._inset),
                gutter = this._gutter,
                rows = Math.max(1, this._rows),
                columns = Math.max(1, this._columns),
                width = (bounds.width - gutter * (columns - 1)) / columns,
                height = (bounds.height - gutter * (rows - 1)) / rows;
            for (var row = 0; row < rows; row++) {
                for (var column = 0; column < columns; column++) {
                    regions.push(new Rectangle(
                            bounds.x + column * (width + gutter),
                            bounds.y + row * (height + gutter),
                            width, height));
                }
            }
        }
        return regions;
    },

    // The spans of the line at `baseline` in the region, from left to right:
    // where the area holds all of the line's band, from its ascent to its
    // descent, without the text wraps, or only within them when inverted:
    _getSpans: function(region, baseline, line, wraps) {
        var that = this,
            top = baseline - line.ascent,
            bottom = baseline + line.descent,
            middle = (top + bottom) / 2,
            unite = function(stretches1, stretches2) {
                var all = stretches1.concat(stretches2).sort(function(a, b) {
                        return a[0] - b[0];
                    }),
                    result = [];
                for (var i = 0, l = all.length; i < l; i++) {
                    var last = result[result.length - 1],
                        stretch = all[i];
                    if (last && stretch[0] <= last[1]) {
                        last[1] = Math.max(last[1], stretch[1]);
                    } else {
                        result.push(stretch.slice());
                    }
                }
                return result;
            },
            intersect = function(stretches1, stretches2) {
                var result = [];
                for (var i = 0, l = stretches1.length; i < l; i++) {
                    for (var j = 0, m = stretches2.length; j < m; j++) {
                        var left = Math.max(stretches1[i][0], stretches2[j][0]),
                            right = Math.min(stretches1[i][1], stretches2[j][1]);
                        if (right > left)
                            result.push([left, right]);
                    }
                }
                return result;
            },
            subtract = function(stretches1, stretches2) {
                return intersect(stretches1, stretches2.reduce(
                    // What's outside the stretches, from left to right:
                    function(outside, stretch) {
                        var last = outside.pop();
                        return outside.concat([[last[0], stretch[0]],
                                [stretch[1], last[1]]]);
                    }, [[-Infinity, Infinity]]));
            },
            // The stretches inside the paths along the horizontal at `y`,
            // pairing the crossings of each:
            inside = function(paths, y) {
                var stretches = [];
                for (var i = 0, l = paths.length; i < l; i++) {
                    var path = paths[i],
                        bounds = path.getBounds(),
                        xs = path.getIntersections(new Path.Line({
                            from: [bounds.left - 1, y],
                            to: [bounds.right + 1, y],
                            insert: false
                        })).map(function(location) {
                            return location.point.x;
                        }).sort(function(a, b) {
                            return a - b;
                        });
                    for (var j = 0; j + 1 < xs.length; j += 2)
                        stretches.push([xs[j], xs[j + 1]]);
                }
                return unite(stretches, []);
            },
            // The area must hold all of the band:
            spans = [top, middle, bottom].reduce(function(spans, y) {
                return intersect(spans, inside([that.getTextPath()], y));
            }, [[region.left, region.right]]);
        for (var i = 0, l = wraps.length; i < l; i++) {
            // A text wrap keeps its offset all around, so look at it from as
            // far above and below the band, and widen or narrow it as much:
            var wrap = wraps[i],
                offset = wrap.offset,
                invert = wrap.invert,
                ys = [top - offset, top, middle, bottom, bottom + offset],
                covered = ys.reduce(function(covered, y) {
                    var stretches = inside(wrap.paths, y);
                    return covered ? invert
                            ? intersect(covered, stretches)
                            : unite(covered, stretches)
                        : stretches;
                }, null).map(function(stretch) {
                    return invert
                            ? [stretch[0] + offset, stretch[1] - offset]
                            : [stretch[0] - offset, stretch[1] + offset];
                });
            spans = invert ? intersect(spans, covered)
                    : subtract(spans, unite(covered, []));
        }
        return spans;
    },

    // The items above the text in its layer that push it aside, see
    // Item#textWrap, each with its options and its outline as paths in the
    // text's coordinates: a path's own, a group's children's, or a clip
    // group's clip path, and the bounds of anything else:
    _getTextWraps: function() {
        var layer = this.getLayer(),
            items = layer && layer._textWrapItems,
            toText = this.getGlobalMatrix(true).inverted(),
            wraps = [];

        var isShown = function(item) {
            for (; item !== layer; item = item._parent) {
                if (!item._visible)
                    return false;
            }
            return true;
        };

        var getOutline = function(item, paths) {
            var matrix = toText.appended(item._parent.getGlobalMatrix(true));
            if (item instanceof PathItem) {
                var path = item.clone({ insert: false, deep: true });
                path.transform(matrix);
                paths.push(path);
            } else if (item instanceof Group) {
                var clipItem = item._getClipItem(),
                    children = clipItem ? [clipItem] : item._children;
                for (var i = 0, l = children.length; i < l; i++) {
                    if (children[i]._visible)
                        getOutline(children[i], paths);
                }
            } else {
                paths.push(new Path.Rectangle({
                    rectangle: item.getBounds(matrix),
                    insert: false
                }));
            }
            return paths;
        };

        for (var id in items) {
            var item = items[id];
            if (item !== this && item.isAbove(this) && isShown(item)) {
                wraps.push(Base.set({ paths: getOutline(item, []) },
                        item._textWrap));
            }
        }
        return wraps;
    },

    // Breaks the line from `start` at the last word, or soft hyphen, that fits
    // the room, and places it by the paragraph's justification and indents.
    // Spaces at its end hang outside the room. If not even the first word
    // fits, it takes the line alone if `canForce`, else there's no line:
    _breakLine: function(start, paragraph, isFirst, room, cut, canForce) {
        var that = this,
            content = this._story._content,
            style = paragraph.style,
            indented = this._indent(style, isFirst, room[0], room[1]),
            words = /[^\s\u00ad]*\u00ad|\S+\s*|\s+/g,
            text = content.slice(start, paragraph.end),
            ends = [],
            match;

        // The line up to `end` without its trailing spaces, with a hyphen
        // where it ends at a soft hyphen, in the font of the letter before:
        var measure = function(end) {
            var line = that._measure(start, start + content.slice(start, end)
                    .replace(/\s+$/, '').length);
            if (content[end - 1] === '\u00ad') {
                var last = line.pieces[line.pieces.length - 1],
                    width = that.getView().getTextWidth(last.font, ['-'],
                        last.tracking) * last.scale.x;
                line.pieces.push(Base.set({}, last, {
                    content: '-',
                    start: end,
                    end: end,
                    x: last.x + last.width,
                    width: width
                }));
                line.width += width;
            }
            return line;
        };

        while (match = words.exec(text))
            ends.push(start + match.index + match[0].length);
        // Search for the last end that fits, as the lines only get wider:
        // first by doubling steps, so nothing much longer than the line is
        // measured, then by halving them between the last two:
        var width = indented[1] - indented[0] - cut,
            fits = function(index) {
                return measure(ends[index]).width <= width;
            },
            low = -1,
            high = 0;
        while (high < ends.length && fits(high)) {
            low = high;
            high = 2 * high + 1;
        }
        high = Math.min(high, ends.length);
        while (high - low > 1) {
            var middle = (low + high) >> 1;
            if (fits(middle)) {
                low = middle;
            } else {
                high = middle;
            }
        }
        var end = low >= 0 ? ends[low] : start;
        if (end === start && ends.length) {
            if (!canForce)
                return null;
            end = ends[0];
        }
        var line = measure(end);
        this._place(line, style, end === paragraph.end, indented);
        line.end = end;
        return line;
    }
});
