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
 * @name TextStory
 *
 * @class The text of one or more linked {@link TextItem}s, which it flows
 *     through in order: its content, kept in runs of characters that share a
 *     style, and the styles of its paragraphs. A text item that isn't linked
 *     has a story of its own.
 */
var TextStory = Base.extend(/** @lends TextStory# */{
    _class: 'TextStory',
    beans: true,
    // The style properties of whole paragraphs, and of the text items
    // themselves. All others are those of the characters, kept in runs:
    _paragraphKeys: {
        justification: true, justifyLast: true, justifySpacing: true,
        startIndent: true, endIndent: true, firstLineIndent: true,
        spaceBefore: true, spaceAfter: true, hyphenation: true,
        composer: true, lineWrap: true, tabs: true, direction: true
    },
    _itemKeys: {
        fillRule: true, strokeScaling: true, shadowColor: true,
        shadowBlur: true, shadowOffset: true, selectedColor: true
    },

    initialize: function TextStory(items) {
        this._content = '';
        this._runs = [{ length: 0, style: new Style(null, this) }];
        this._paragraphs = [new Style(null, this)];
        this._items = items || [];
    },

    /**
     * The text items that the story flows through, in order.
     *
     * @bean
     * @type TextItem[]
     */
    getTextItems: function() {
        return this._items.slice();
    },

    // A copy of the story's content and styles, for the text items `items`:
    _clone: function(items) {
        var story = new TextStory(items);
        story._content = this._content;
        story._runs = this._runs.map(function(run) {
            return { length: run.length, style: new Style(run.style, story) };
        });
        story._paragraphs = this._paragraphs.map(function(style) {
            return new Style(style, story);
        });
        return story;
    },

    // Joins the content and styles of the story `other` onto the end of this
    // one. The paragraph they meet in keeps this one's style:
    _append: function(other) {
        var that = this,
            runs = other._runs.map(function(run) {
                return {
                    length: run.length,
                    style: new Style(run.style, that)
                };
            });
        this._content += other._content;
        this._runs = this._runs.concat(runs).filter(function(run) {
            return run.length > 0;
        });
        if (!this._runs.length)
            this._runs = [runs[0]];
        this._paragraphs = this._paragraphs.concat(
                other._paragraphs.slice(1).map(function(style) {
                    return new Style(style, that);
                }));
    },

    // Takes the content from `start` on out of the story, into a new one for
    // the text items `items`. The paragraph it breaks continues in both:
    _extract: function(start, items) {
        var rest = this._clone(items),
            content = this._content,
            paragraph = this._paragraphs[
                    this._countBreaks(content.slice(0, start))];
        rest.replace('', 0, start);
        rest._paragraphs[0] = new Style(paragraph, rest);
        this.replace('', start, content.length);
        return rest;
    },

    // The styles of the runs and paragraphs are their own:
    _getStyles: function() {
    },

    // Changes to the story change the text items it flows through:
    _changed: function(flags) {
        var items = this._items;
        for (var i = 0, l = items.length; i < l; i++)
            items[i]._changed(flags);
    },

    /**
     * The text of the story, from the first of its text items to the last.
     *
     * @bean
     * @type String
     *
     * @example {@paperscript}
     * // Setting the content of a PointText item:
     *
     * // Create a point-text item at {x: 30, y: 30}:
     * var text = new PointText(new Point(30, 30));
     * text.fillColor = 'black';
     *
     * // Set the content of the text item:
     * text.content = 'Hello world';
     *
     * @example {@paperscript}
     * // Interactive example, move your mouse over the view below:
     *
     * // Create a point-text item at {x: 30, y: 30}:
     * var text = new PointText(new Point(30, 30));
     * text.fillColor = 'black';
     *
     * text.content = 'Move your mouse over the view, to see its position';
     *
     * function onMouseMove(event) {
     *     // Each time the mouse is moved, set the content of
     *     // the point text to describe the position of the mouse:
     *     text.content = 'Your position is: ' + event.point.toString();
     * }
     */
    getContent: function() {
        return this._content;
    },

    setContent: function(content) {
        this.replace(content, 0, this._content.length);
    },

    /**
     * Replaces the content from `start` to `end`, or of a range, with new
     * content, which takes the style of the content it replaces, or of the
     * character before it when it's inserted.
     *
     * @param {String} content the new content
     * @param {Number} start the index of the first character to replace
     * @param {Number} end the index after the last character to replace
     */
    replace: function(content, start, end) {
        if (start && start.start !== undefined) {
            end = start.end;
            start = start.start;
        }
        var old = this._content,
            length = old.length,
            runs = this._runs,
            paragraphs = this._paragraphs;
        content = '' + content;
        start = Math.max(0, Math.min(start, length));
        end = Math.max(start, Math.min(end, length));
        // 1. The runs: the new content becomes one, between the split runs.
        var i = this._split(start),
            j = this._split(end),
            source = (i < j ? runs[i] : runs[i - 1] || runs[i]).style;
        runs.splice(i, j - i, {
            length: content.length,
            style: new Style(source, this)
        });
        this._runs = runs.filter(function(run) {
            return run.length > 0;
        });
        if (!this._runs.length)
            this._runs = [runs[i]];
        // 2. The paragraphs: those whose breaks are replaced merge into the
        // first, and new breaks split it, keeping its style.
        var first = this._countBreaks(old.slice(0, start)),
            removed = this._countBreaks(old.slice(start, end)),
            added = this._countBreaks(content),
            style = paragraphs[first],
            inserted = [];
        for (var k = 0; k < added; k++)
            inserted.push(new Style(style, this));
        paragraphs.splice.apply(paragraphs,
                [first + 1, removed].concat(inserted));
        this._content = old.slice(0, start) + content + old.slice(end);
        this._changed(/*#=*/Change.CONTENT);
    },

    // The paragraph that `pos` is in: its style, and where it starts and ends,
    // before its line break:
    _getParagraph: function(pos) {
        var content = this._content,
            before = content.slice(0, pos),
            start = /(\r\n|\n|\r)[^\r\n]*$/.exec(before),
            end = /\r\n|\n|\r/.exec(content.slice(pos));
        return {
            style: this._paragraphs[this._countBreaks(before)],
            start: start ? start.index + start[1].length : 0,
            end: end ? pos + end.index : content.length
        };
    },

    // The number of line breaks in content, where its paragraphs end:
    _countBreaks: function(content) {
        var matches = content.match(/\r\n|\n|\r/g);
        return matches ? matches.length : 0;
    },

    // Splits the run at `index`, and returns the index of the run that starts
    // there:
    _split: function(index) {
        var runs = this._runs;
        for (var i = 0, l = runs.length, start = 0; i < l; i++) {
            var run = runs[i];
            if (start === index)
                return i;
            if (index < start + run.length) {
                runs.splice(i + 1, 0, {
                    length: start + run.length - index,
                    style: new Style(run.style, this)
                });
                run.length = index - start;
                return i + 1;
            }
            start += run.length;
        }
        return runs.length;
    },

    // The styles that the range from start to end stands for: those of the
    // paragraphs it touches, or of its runs, split at its ends for `setting`.
    _getRangeStyles: function(key, start, end, setting) {
        var runs = this._runs;
        if (key in this._itemKeys) {
            return [];
        } else if (key in this._paragraphKeys) {
            var content = this._content,
                first = this._countBreaks(content.slice(0, start)),
                last = this._countBreaks(
                        content.slice(0, Math.max(start, end - 1)));
            return this._paragraphs.slice(first, last + 1);
        } else if (setting) {
            var i = this._split(start);
            return runs.slice(i, this._split(end)).map(function(run) {
                return run.style;
            });
        } else {
            // An empty range has the style of the character before it, as
            // content typed there would:
            var from = start < end ? start : Math.max(0, start - 1),
                to = start < end ? end : from + 1,
                styles = [];
            for (var i = 0, l = runs.length, pos = 0; i < l; i++) {
                var run = runs[i],
                    next = pos + run.length;
                if (from < next && to > pos)
                    styles.push(run.style);
                pos = next;
            }
            // An empty text has the style of its one empty run:
            return styles.length ? styles : [runs[0].style];
        }
    },

    /**
     * The range of the text from `start` to `end`.
     *
     * @param {Number} start the index of its first character
     * @param {Number} end the index after its last character
     * @return {TextRange}
     */
    range: function(start, end) {
        return new TextRange(this, start, end);
    },

    /**
     * The runs of the text: its ranges that each have one style throughout.
     * Set it to plain objects with a `content` and style properties, which
     * then make the whole text.
     *
     * @bean
     * @type TextRange[]
     */
    getRuns: function() {
        var that = this;
        return this._getRuns().map(function(run) {
            return new TextRange(that, run.start, run.end);
        });
    },

    // The runs, with the neighbours that share a style joined:
    _getRuns: function() {
        var runs = this._runs,
            joined = [];
        for (var i = 0, l = runs.length, start = 0, end = 0; i < l; i++) {
            var run = runs[i],
                next = runs[i + 1];
            end += run.length;
            if (!next || !run.style.equals(next.style)) {
                joined.push({ start: start, end: end, style: run.style });
                start = end;
            }
        }
        return joined;
    },

    setRuns: function(runs) {
        var that = this;
        runs = runs.map(function(run) {
            return run instanceof TextRange ? run.toJSON() : run;
        });
        var content = runs.map(function(run) {
                return run.content || '';
            }).join('');
        this.setContent(content);
        this._runs = runs.map(function(run) {
            var style = new Style(that._runs[0].style, that);
            style.set(Base.set({}, run, { content: undefined }));
            return { length: (run.content || '').length, style: style };
        }).filter(function(run) {
            return run.length > 0;
        });
        if (!this._runs.length)
            this._runs = [{ length: 0, style: new Style(null, this) }];
        this._changed(/*#=*/Change.CONTENT);
    },

    /**
     * The paragraphs of the text, without their line breaks. Set it to plain
     * objects with paragraph style properties, one per paragraph.
     *
     * @bean
     * @type TextRange[]
     */
    getParagraphs: function() {
        var ranges = [],
            breaks = /\r\n|\n|\r/g,
            content = this._content,
            start = 0,
            match;
        while (match = breaks.exec(content)) {
            ranges.push(new TextRange(this, start, match.index));
            start = match.index + match[0].length;
        }
        ranges.push(new TextRange(this, start, content.length));
        return ranges;
    },

    setParagraphs: function(paragraphs) {
        var styles = this._paragraphs,
            keys = this._paragraphKeys;
        for (var i = 0, l = Math.min(paragraphs.length, styles.length); i < l;
                i++) {
            var paragraph = paragraphs[i],
                style = styles[i];
            for (var key in keys) {
                var value = paragraph[key];
                if (value !== undefined)
                    style[key] = value;
            }
        }
    },

    /**
     * The words of the text, as the browser finds them (Intl.Segmenter), or
     * else separated by white space.
     *
     * @bean
     * @type TextRange[]
     */
    getWords: function() {
        return this._segment('word', /\S+/g);
    },

    /**
     * The letters of the text, each as readers see one (a grapheme: an emoji,
     * or a letter with its accents), spaces and punctuation included.
     *
     * @bean
     * @type TextRange[]
     */
    getLetters: function() {
        return this._segment('grapheme', /[\s\S]/g);
    },

    // The letters for laying out, kept until the content changes:
    _getLetters: function() {
        if (this._lettersOf !== this._content) {
            this._letters = this.getLetters();
            this._lettersOf = this._content;
        }
        return this._letters;
    },

    _segment: function(granularity, pattern) {
        var content = this._content,
            ranges = [],
            Segmenter = typeof Intl !== 'undefined' && Intl.Segmenter;
        if (Segmenter) {
            var segments = new Segmenter(undefined, {
                    granularity: granularity
                }).segment(content),
                iterator = segments[Symbol.iterator](),
                step;
            while (!(step = iterator.next()).done) {
                var segment = step.value;
                if (granularity !== 'word' || segment.isWordLike) {
                    ranges.push(new TextRange(this, segment.index,
                            segment.index + segment.segment.length));
                }
            }
        } else {
            var match;
            while (match = pattern.exec(content)) {
                ranges.push(new TextRange(this, match.index,
                        match.index + match[0].length));
            }
        }
        return ranges;
    }
});
