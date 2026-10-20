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
 * @name TextRange
 *
 * @class A part of a {@link TextStory}'s content, from its {@link #start}
 *     to its {@link #end}, whose style is that of its letters and paragraphs:
 *     read, a property is the one they share, or `undefined`; set, it changes
 *     them. It has the same style properties as items, e.g.
 *     `text.words[0].fontSize = 24`. A range is a snapshot of two indices:
 *     changing styles never moves it, but changing the content leaves ranges
 *     taken before out of date, as indices into any string.
 *
 * @example {@paperscript}
 * var text = new PointText({
 *     point: [20, 50],
 *     content: 'Every word its size',
 *     fillColor: 'black'
 * });
 * text.words.forEach(function(word) {
 *     word.fontSize = 8 + word.content.length * 3;
 * });
 */
var TextRange = Base.extend(/** @lends TextRange# */{
    _class: 'TextRange',
    beans: true,

    initialize: function TextRange(story, start, end) {
        var length = story._content.length;
        this._story = story;
        this._start = Math.max(0, Math.min(start, length));
        this._end = Math.max(this._start, Math.min(end, length));
        this._style = new Style(null, this);
    },

    /**
     * The story the range is part of.
     *
     * @bean
     * @type TextStory
     */
    getStory: function() {
        return this._story;
    },

    /**
     * The index of the range's first character.
     *
     * @bean
     * @type Number
     */
    getStart: function() {
        return this._start;
    },

    /**
     * The index after the range's last character.
     *
     * @bean
     * @type Number
     */
    getEnd: function() {
        return this._end;
    },

    /**
     * The content of the range.
     *
     * @bean
     * @type String
     */
    getContent: function() {
        return this._story._content.slice(this._start, this._end);
    },

    /**
     * The style of the range: of its characters, and of the paragraphs it
     * touches.
     *
     * @bean
     * @type Style
     */
    getStyle: function() {
        return this._style;
    },

    setStyle: function(style) {
        this._style.set(style);
    },

    // The range's style stands for those of the text's runs and paragraphs
    // that it covers, see Style.merge() and Style.apply():
    _getStyles: function(style, key, setting) {
        return this._story._getRangeStyles(key, this._start, this._end,
                setting);
    },

    _changed: function(flags) {
        this._story._changed(flags);
    },

    // The range's content and its style properties that differ from the
    // defaults, and that it has throughout:
    toJSON: function() {
        var style = this._style,
            defaults = style._defaults,
            json = {
                start: this._start,
                end: this._end,
                content: this.getContent()
            };
        for (var key in defaults) {
            var value = style[key];
            if (value !== undefined && !Base.equals(value, defaults[key]))
                json[key] = Base.serialize(value);
        }
        return json;
    },

    toString: function() {
        return this.getContent();
    }
}, Base.each(['Runs', 'Paragraphs', 'Words', 'Letters'], function(name) {
    var get = 'get' + name;
    // The story's runs, paragraphs, words or letters within the range, clipped
    // to it. An empty paragraph is within it where the range holds its place:
    this[get] = function() {
        var story = this._story,
            start = this._start,
            end = this._end;
        return story[get]().filter(function(range) {
            return range._start < end && range._end > start
                    || range._start === range._end
                        && range._start >= start && range._start <= end;
        }).map(function(range) {
            return new TextRange(story, Math.max(range._start, start),
                    Math.min(range._end, end));
        });
    };
}, {
    beans: true
}));
