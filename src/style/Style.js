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
 * @name Style
 *
 * @class Style is used for changing the visual styles of items
 * contained within a Paper.js project and is returned by
 * {@link Item#style} and {@link Project#currentStyle}.
 *
 * All properties of Style are also reflected directly in {@link Item},
 * i.e.: {@link Item#fillColor}.
 *
 * Styles set on a {@link Group} or {@link Layer} are applied to the children
 * that it contains at that moment. Items added to it later do not receive them.
 *
 * To set multiple style properties in one go, you can pass an object to
 * {@link Item#style}. This is a convenient way to define a style once and
 * apply it to a series of items:
 *
 * @classexample {@paperscript} // Styling paths
 *
 * var path = new Path.Circle(new Point(80, 50), 30);
 * path.style = {
 *     fillColor: new Color(1, 0, 0),
 *     strokeColor: 'black',
 *     strokeWidth: 5
 * };
 *
 * @classexample {@paperscript} // Styling text items
 * var text = new PointText(view.center);
 * text.content = 'Hello world.';
 * text.style = {
 *     fontFamily: 'Courier New',
 *     fontWeight: 'bold',
 *     fontSize: 20,
 *     fillColor: 'red',
 *     justification: 'center'
 * };
 *
 * @classexample {@paperscript} // Styling groups
 * var path1 = new Path.Circle({
 *     center: [100, 50],
 *     radius: 30
 * });
 *
 * var path2 = new Path.Rectangle({
 *     from: [170, 20],
 *     to: [230, 80]
 * });
 *
 * var group = new Group(path1, path2);
 *
 * // All styles set on a group are automatically
 * // set on the current children of the group:
 * group.style = {
 *     strokeColor: 'black',
 *     dashArray: [4, 10],
 *     strokeWidth: 4,
 *     strokeCap: 'round'
 * };
 *
 */
var Style = Base.extend(new function() {
    // Defaults for items without text-styles (PathItem, Shape, Raster, ...):
    var itemDefaults = {
        // Paths
        fillColor: null,
        fillRule: 'nonzero',
        strokeColor: null,
        strokeWidth: 1,
        strokeCap: 'butt',
        strokeJoin: 'miter',
        strokeScaling: true,
        miterLimit: 10,
        dashOffset: 0,
        dashArray: [],
        // Shadows
        shadowColor: null,
        shadowBlur: 0,
        shadowOffset: new Point(),
        // Selection
        selectedColor: null
    },
    // Defaults for Group, Layer and Project (anything item that allows nesting
    // needs to be able to pass down text styles as well):
    groupDefaults = Base.set({}, itemDefaults, {
        // Characters
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
        fontStyle: 'normal',
        fontSize: 12,
        fontVariations: null,
        lineHeight: 'auto',
        letterTracking: 0,
        letterKerning: null,
        baselineShift: 0,
        baselinePosition: 'normal',
        letterScaling: 1,
        letterRotation: 0,
        capitals: 'normal',
        underline: false,
        strikethrough: false,
        features: null,
        // Paragraphs
        justification: 'left',
        justifyLast: 'left',
        justifySpacing: null,
        startIndent: 0,
        endIndent: 0,
        firstLineIndent: 0,
        spaceBefore: 0,
        spaceAfter: 0,
        hyphenation: false,
        composer: 'paragraph',
        lineWrap: 'normal',
        tabs: null,
        direction: null
    }),
    // Defaults for TextItem (override default fillColor to black):
    textDefaults = Base.set({}, groupDefaults, {
        fillColor: new Color() // black
    }),
    flags = {
        strokeWidth: /*#=*/Change.STROKE,
        strokeCap: /*#=*/Change.STROKE,
        strokeJoin: /*#=*/Change.STROKE,
        // strokeScaling can change the coordinates of cached path items
        strokeScaling: /*#=*/(Change.STROKE | Change.GEOMETRY),
        miterLimit: /*#=*/Change.STROKE,
        // All text properties but colors and decorations change the layout:
        fontFamily: /*#=*/Change.GEOMETRY,
        fontWeight: /*#=*/Change.GEOMETRY,
        fontStyle: /*#=*/Change.GEOMETRY,
        fontSize: /*#=*/Change.GEOMETRY,
        font: /*#=*/Change.GEOMETRY, // deprecated, links to fontFamily
        fontVariations: /*#=*/Change.GEOMETRY,
        lineHeight: /*#=*/Change.GEOMETRY,
        letterTracking: /*#=*/Change.GEOMETRY,
        letterKerning: /*#=*/Change.GEOMETRY,
        baselineShift: /*#=*/Change.GEOMETRY,
        baselinePosition: /*#=*/Change.GEOMETRY,
        letterScaling: /*#=*/Change.GEOMETRY,
        letterRotation: /*#=*/Change.GEOMETRY,
        capitals: /*#=*/Change.GEOMETRY,
        features: /*#=*/Change.GEOMETRY,
        justification: /*#=*/Change.GEOMETRY,
        justifyLast: /*#=*/Change.GEOMETRY,
        justifySpacing: /*#=*/Change.GEOMETRY,
        startIndent: /*#=*/Change.GEOMETRY,
        endIndent: /*#=*/Change.GEOMETRY,
        firstLineIndent: /*#=*/Change.GEOMETRY,
        spaceBefore: /*#=*/Change.GEOMETRY,
        spaceAfter: /*#=*/Change.GEOMETRY,
        hyphenation: /*#=*/Change.GEOMETRY,
        composer: /*#=*/Change.GEOMETRY,
        lineWrap: /*#=*/Change.GEOMETRY,
        tabs: /*#=*/Change.GEOMETRY,
        direction: /*#=*/Change.GEOMETRY
    },
    item = {
        // Enforce creation of beans, as bean getters have hidden parameters,
        // see _dontMerge argument below.
        beans: true
    },
    fields = /** @lends Style# */{
        _class: 'Style',
        beans: true,

        initialize: function Style(style, _owner, _project) {
            // We keep values in a separate object that we can iterate over.
            this._values = {};
            this._owner = _owner;
            this._project = _owner && _owner._project || _project
                    || paper.project;
            // Use different defaults based on the owner
            this._defaults = !_owner || _owner instanceof Group ? groupDefaults
                    : _owner instanceof TextItem || _owner instanceof TextStory
                        || _owner instanceof TextRange
                        ? textDefaults
                        : itemDefaults;
            if (style)
                this.set(style);
        }
    };

    // Iterate over groupDefaults to inject getters / setters, to cover all
    // properties
    Base.each(groupDefaults, function(value, key) {
        var isColor = /Color$/.test(key),
            isPoint = key === 'shadowOffset',
            part = Base.capitalize(key),
            flag = flags[key],
            set = 'set' + part,
            get = 'get' + part;

        // Define getters and setters to be injected into this class.
        // This is how style values are handled:
        // - Style values are all stored in this._values
        // - The style object starts with an empty _values object, with fallback
        //   on _defaults through code in the getter below.
        // - Only the styles that are explicitly set on the object get defined
        //   in _values.
        // - Color values are not stored as converted colors immediately. The
        //   raw value is stored, and conversion only happens in the getter.
        fields[set] = function(value) {
            var owner = this._owner,
                // The styles the owner stands for, as a Group its children's:
                styles = owner && owner._getStyles(this, key, true);
            if (styles)
                Style.apply(styles, key, value);
            // Always store selectedColor in item _values to make sure that
            // group selected bounds and position color is coherent whether it
            // has children or not when the value is set.
            if ((key === 'selectedColor' || !styles)
                    && key in this._defaults) {
                var old = this._values[key];
                if (old !== value) {
                    if (isColor) {
                        // The old value may be a native string or other color
                        // description that wasn't coerced to a color object yet
                        if (old && old.constructor === Color) {
                            Color._setOwner(old, null);
                            old._canvasStyle = null;
                        }
                        if (value && value.constructor === Color) {
                            // NOTE: If value is not a Color, it is only
                            // converted and cloned in the getter further down.
                            value = Color._setOwner(value, owner,
                                    // Only provide a color-setter if the style
                                    // is to be applied to the children:
                                    styles && set);
                        }
                    }
                    // NOTE: We do not convert the values to Colors in the
                    // setter. This only happens once the getter is called.
                    this._values[key] = value;
                    // Notify the owner of the style change STYLE is always set,
                    // additional flags come from flags, as used for STROKE:
                    if (owner)
                        owner._changed(flag || /*#=*/Change.STYLE);
                }
            }
        };

        fields[get] = function(_dontMerge) {
            var owner = this._owner,
                styles = owner && owner._getStyles(this, key),
                value;
            // If true is passed for _dontMerge, don't merge children styles.
            if (styles && !_dontMerge) {
                value = Style.merge(styles, key);
            } else if (key in this._defaults) {
                var value = this._values[key];
                if (value === undefined) {
                    value = this._defaults[key];
                    // Clone defaults if available:
                    if (value && value.clone) {
                        value = value.clone();
                    }
                } else {
                    var ctor = isColor ? Color : isPoint ? Point : null;
                    if (ctor && !(value && value.constructor === ctor)) {
                        // Convert to a Color / Point, and stored result of the
                        // conversion.
                        this._values[key] = value = ctor.read([value], 0,
                                { readNull: true, clone: true });
                    }
                }
            }
            if (value && isColor) {
                // Color._setOwner() may clone the color if it already has a
                // different owner (e.g. resulting from `childValue` above).
                // Only provide a color-setter if the style is to be applied to
                // the children:
                value = Color._setOwner(value, owner, styles && set);
            }
            return value;
        };

        // Inject style getters and setters into the Item class, which redirect
        // calls to the linked style object.
        item[get] = function(_dontMerge) {
            return this._style[get](_dontMerge);
        };

        item[set] = function(value) {
            this._style[set](value);
        };
    });

    // Create aliases for deprecated properties. The lookup table contains the
    // part after 'get' / 'set':
    // TODO: Remove once deprecated long enough, after December 2016.
    Base.each({
        Font: 'FontFamily',
        WindingRule: 'FillRule'
    }, function(value, key) {
        var get = 'get' + key,
            set = 'set' + key;
        fields[get] = item[get] = '#get' + value;
        fields[set] = item[set] = '#set' + value;
    });

    // The properties as they were named before: tracking is letterTracking,
    // and leading a fixed lineHeight, see Style#getLeading():
    fields.getTracking = item.getTracking = '#getLetterTracking';
    fields.setTracking = item.setTracking = '#setLetterTracking';
    item.getLeading = function() {
        return this._style.getLeading();
    };
    item.setLeading = function(leading) {
        this._style.setLeading(leading);
    };

    Item.inject(item);
    // Text ranges have the same style accessors as items:
    TextRange.inject(item);
    return fields;
}, /** @lends Style# */{
    statics: {
        // The value that all styles share for key, or undefined if they differ:
        merge: function(styles, key) {
            var get = 'get' + Base.capitalize(key),
                value;
            for (var i = 0, l = styles.length; i < l; i++) {
                var other = styles[i][get]();
                if (!i) {
                    value = other;
                } else if (!Base.equals(value, other)) {
                    return undefined;
                }
            }
            return value;
        },

        apply: function(styles, key, value) {
            var set = 'set' + Base.capitalize(key);
            for (var i = 0, l = styles.length; i < l; i++)
                styles[i][set](value);
        }
    },

    set: function(style) {
        // If the passed style object is also a Style, clone its cloneable
        // fields rather than simply copying them.
        var isStyle = style instanceof Style,
            // Use the other stlyle's _values object for iteration
            values = isStyle ? style._values : style;
        if (values) {
            for (var key in values) {
                if (key in this._defaults || key in this._formerNames) {
                    var value = values[key];
                    // Delegate to setter, so Group styles work too.
                    this[key] = value && isStyle && value.clone
                            ? value.clone() : value;
                }
            }
        }
    },

    equals: function(style) {
        // Since we're dealing with defaults, loop through style values in both
        // objects and compare with default fall-back. But in the secondary pass
        // only check against keys that weren't already in the first object:
        function compare(style1, style2, secondary) {
            var values1 = style1._values,
                values2 = style2._values,
                defaults2 = style2._defaults;
            for (var key in values1) {
                var value1 = values1[key],
                    value2 = values2[key];
                if (!(secondary && key in values2) && !Base.equals(value1,
                        value2 === undefined ? defaults2[key] : value2))
                    return false;
            }
            return true;
        }

        return style === this || style && this._class === style._class
                && compare(this, style)
                && compare(style, this, true)
                || false;
    },

    _dispose: function() {
        var color;
        color = this.getFillColor();
        if (color) color._canvasStyle = null;
        color = this.getStrokeColor();
        if (color) color._canvasStyle = null;
        color = this.getShadowColor();
        if (color) color._canvasStyle = null;
    },

    // DOCS: Style#hasFill()
    hasFill: function() {
        var color = this.getFillColor();
        return !!color && color.alpha > 0;
    },

    // DOCS: Style#hasStroke()
    hasStroke: function() {
        var color = this.getStrokeColor();
        return !!color && color.alpha > 0 && this.getStrokeWidth() > 0;
    },

    // DOCS: Style#hasShadow()
    hasShadow: function() {
        var color = this.getShadowColor();
        // In order to draw a shadow, we need either a shadow blur or an
        // offset, or both.
        return !!color && color.alpha > 0 && (this.getShadowBlur() > 0
                || !this.getShadowOffset().isZero());
    },

    /**
     * The view that this style belongs to.
     *
     * @bean
     * @type View
     */
    getView: function() {
        return this._project._view;
    },

    // Overrides

    // The font as canvas takes it:
    _getCanvasFont: function() {
        var fontSize = this.getFontSize(),
            fontStyle = this.getFontStyle(),
            // CSS reads unquoted families only as identifiers, which can't
            // start with digits, so quote all but single words and the ones
            // that are quoted already:
            families = this.getFontFamily().split(',').map(function(family) {
                family = family.trim();
                return /^(["'].*|[a-z-]+)$/i.test(family) ? family
                        : '"' + family.replace(/["\\]/g, '\\$&') + '"';
            });
        // Superscripts and subscripts are set smaller:
        if (this.getBaselinePosition() !== 'normal' && !isNaN(fontSize))
            fontSize *= this._scriptSize;
        // To prevent an obscure iOS 7 crash, we have to convert the size to a
        // string first before passing it to the regular expression.
        // The following nonsensical statement would also prevent the bug,
        // proving that the issue is not the regular expression itself, but
        // something deeper down in the optimizer:
        // `if (size === 0) size = 0;`
        return (fontStyle !== 'normal' ? fontStyle + ' ' : '')
                + (this.getCapitals() === 'small' ? 'small-caps ' : '')
                + this.getFontWeight()
                + ' ' + fontSize + (/[a-z]/i.test(fontSize + '') ? ' ' : 'px ')
                + families.join(', ');
    },

    // The size of superscripts and subscripts, and how far they move, of the
    // font size:
    _scriptSize: 0.583,
    _scriptShift: 0.333,

    // The properties that style objects may still set by their former names:
    _formerNames: { tracking: true, leading: true },

    // The letter tracking as canvas takes it: in thousandths of an em, which
    // canvas resolves through the font of the context:
    _getCanvasLetterSpacing: function() {
        return this.getLetterTracking() / 1000 + 'em';
    },

    // The font size in pixels, which it can be given in other units:
    _getFontSize: function() {
        var fontSize = this.getFontSize();
        return /pt|em|%|px/.test(fontSize)
                ? this.getView().getPixelSize(fontSize)
                : fontSize;
    },

    // The line height in pixels: automatic ('auto', 1.2, or another factor)
    // of the font size, or fixed, with units as the font size takes them:
    _getLineHeight: function() {
        var lineHeight = this.getLineHeight();
        return lineHeight === 'auto' ? 1.2 * this._getFontSize()
                : typeof lineHeight === 'string'
                    ? this.getView().getPixelSize(lineHeight)
                    : lineHeight * this._getFontSize();
    },

    /**
     * The line height as a fixed length, in pixels, as Paper.js had it before
     * #lineHeight: setting a number makes it fixed, as `'18px'`.
     *
     * @bean
     * @type Number
     * @deprecated use {@link #lineHeight} instead.
     */
    getLeading: function() {
        return this.getLineHeight() === undefined ? undefined
                : this._getLineHeight();
    },

    setLeading: function(leading) {
        this.setLineHeight(leading == null ? 'auto'
                : typeof leading === 'number' ? leading + 'px'
                : leading);
    },

    /**
     * @bean
     * @type String
     * @deprecated use {@link #fontFamily} instead.
     */
    getFont: '#getFontFamily',
    setFont: '#setFontFamily',

    // DOCS: why isn't the example code showing up?
    /**
     * Style objects don't need to be created directly. Just pass an object to
     * {@link Item#style} or {@link Project#currentStyle}, it will be converted
     * to a Style object internally.
     *
     * @name Style#initialize
     * @param {Object} style
     */

    /**
     * {@grouptitle Stroke Style}
     *
     * The color of the stroke.
     *
     * @name Style#strokeColor
     * @property
     * @type ?Color
     *
     * @example {@paperscript}
     * // Setting the stroke color of a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle(new Point(80, 50), 35);
     *
     * // Set its stroke color to RGB red:
     * circle.strokeColor = new Color(1, 0, 0);
     */

    /**
     * The width of the stroke.
     *
     * @name Style#strokeWidth
     * @property
     * @type Number
     * @default 1
     *
     * @example {@paperscript}
     * // Setting an item's stroke width:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle(new Point(80, 50), 35);
     *
     * // Set its stroke color to black:
     * circle.strokeColor = 'black';
     *
     * // Set its stroke width to 10:
     * circle.strokeWidth = 10;
     */

    /**
     * The shape to be used at the beginning and end of open {@link Path} items,
     * when they have a stroke.
     *
     * @name Style#strokeCap
     * @property
     * @type String
     * @values 'round', 'square', 'butt'
     * @default 'butt'
     *
     * @example {@paperscript height=200}
     * // A look at the different stroke caps:
     *
     * var line = new Path(new Point(80, 50), new Point(420, 50));
     * line.strokeColor = 'black';
     * line.strokeWidth = 20;
     *
     * // Select the path, so we can see where the stroke is formed:
     * line.selected = true;
     *
     * // Set the stroke cap of the line to be round:
     * line.strokeCap = 'round';
     *
     * // Copy the path and set its stroke cap to be square:
     * var line2 = line.clone();
     * line2.position.y += 50;
     * line2.strokeCap = 'square';
     *
     * // Make another copy and set its stroke cap to be butt:
     * var line2 = line.clone();
     * line2.position.y += 100;
     * line2.strokeCap = 'butt';
     */

    /**
     * The shape to be used at the segments and corners of {@link Path} items
     * when they have a stroke.
     *
     * @name Style#strokeJoin
     * @property
     * @type String
     * @values 'miter', 'round', 'bevel'
     * @default 'miter'
     *
     * @example {@paperscript height=120}
     * // A look at the different stroke joins:
     * var path = new Path();
     * path.add(new Point(80, 100));
     * path.add(new Point(120, 40));
     * path.add(new Point(160, 100));
     * path.strokeColor = 'black';
     * path.strokeWidth = 20;
     *
     * // Select the path, so we can see where the stroke is formed:
     * path.selected = true;
     *
     * var path2 = path.clone();
     * path2.position.x += path2.bounds.width * 1.5;
     * path2.strokeJoin = 'round';
     *
     * var path3 = path2.clone();
     * path3.position.x += path3.bounds.width * 1.5;
     * path3.strokeJoin = 'bevel';
     */

    /**
     * Specifies whether the stroke is to be drawn taking the current affine
     * transformation into account (the default behavior), or whether it should
     * appear as a non-scaling stroke. On text, non-scaling strokes are exact for
     * uniform scaling only, as the glyphs are always stroked through the
     * transformation.
     *
     * @name Style#strokeScaling
     * @property
     * @type Boolean
     * @default true
     */

    /**
     * The dash offset of the stroke.
     *
     * @name Style#dashOffset
     * @property
     * @type Number
     * @default 0
     */

    /**
     * Specifies an array containing the dash and gap lengths of the stroke.
     *
     * @example {@paperscript}
     * var path = new Path.Circle(new Point(80, 50), 40);
     * path.strokeWidth = 2;
     * path.strokeColor = 'black';
     *
     * // Set the dashed stroke to [10pt dash, 4pt gap]:
     * path.dashArray = [10, 4];
     *
     * @name Style#dashArray
     * @property
     * @type Number[]
     * @default []
     */

    /**
     * The miter limit of the stroke. When two line segments meet at a sharp
     * angle and miter joins have been specified for {@link #strokeJoin}, it is
     * possible for the miter to extend far beyond the {@link #strokeWidth} of
     * the path. The miterLimit imposes a limit on the ratio of the miter length
     * to the {@link #strokeWidth}.
     *
     * @name Style#miterLimit
     * @property
     * @default 10
     * @type Number
     */

    /**
     * {@grouptitle Fill Style}
     *
     * The fill color.
     *
     * @name Style#fillColor
     * @property
     * @type ?Color
     *
     * @example {@paperscript}
     * // Setting the fill color of a path to red:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle(new Point(80, 50), 35);
     *
     * // Set the fill color of the circle to RGB red:
     * circle.fillColor = new Color(1, 0, 0);
     */

    /**
     * The fill-rule with which the shape gets filled. Please note that only
     * modern browsers support fill-rules other than `'nonzero'`.
     *
     * @name Style#fillRule
     * @property
     * @type String
     * @values 'nonzero', 'evenodd'
     * @default 'nonzero'
     */

    /**
     * {@grouptitle Shadow Style}
     *
     * The shadow color.
     *
     * @property
     * @name Style#shadowColor
     * @type ?Color
     *
     * @example {@paperscript}
     * // Creating a circle with a black shadow:
     *
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35,
     *     fillColor: 'white',
     *     // Set the shadow color of the circle to RGB black:
     *     shadowColor: new Color(0, 0, 0),
     *     // Set the shadow blur radius to 12:
     *     shadowBlur: 12,
     *     // Offset the shadow by { x: 5, y: 5 }
     *     shadowOffset: new Point(5, 5)
     * });
     */

    /**
     * The shadow's blur radius.
     *
     * @property
     * @name Style#shadowBlur
     * @type Number
     * @default 0
     */

    /**
     * The shadow's offset.
     *
     * @property
     * @name Style#shadowOffset
     * @type Point
     * @default 0
     */

    /**
     * {@grouptitle Selection Style}
     *
     * The color the item is highlighted with when selected. If the item does
     * not specify its own color, the color defined by its layer is used instead.
     *
     * @name Style#selectedColor
     * @property
     * @type ?Color
     */

    /**
     * {@grouptitle Character Style}
     *
     * The font-family to be used in text content.
     *
     * @name Style#fontFamily
     * @type String
     * @default 'sans-serif'
     */

    /**
     *
     * The font-weight to be used in text content.
     *
     * @name Style#fontWeight
     * @type String|Number
     * @default 'normal'
     */

    /**
     * The font size of text content, as a number in pixels, or as a string with
     * optional units `'px'`, `'pt'` and `'em'`.
     *
     * @name Style#fontSize
     * @type Number|String
     * @default 10
     */

    /**
     *
     * The font-family to be used in text content, as one string.
     *
     * @name Style#font
     * @type String
     * @default 'sans-serif'
     * @deprecated use {@link #fontFamily} instead.
     */

    /**
     * The line height of text content: the distance from one line's baseline
     * to the next. Automatic, as `'auto'` (1.2) or another factor of the
     * letters' font size, each line moving down by its largest letters'; or
     * fixed, as a length with units as the font size takes them (`'18px'`,
     * `'12pt'`).
     *
     * @name Style#lineHeight
     * @type Number|String
     * @default 'auto'
     */

    /**
     * The letter tracking of text content: the space added after each letter,
     * along the line, in thousandths of an em, as in Adobe Illustrator and
     * InDesign. A tracking of 100 adds a tenth of the font size. Also
     * `tracking`, its former name.
     *
     * @name Style#letterTracking
     * @type Number
     * @default 0
     */

    /**
     * @name Style#tracking
     * @type Number
     * @deprecated use {@link #letterTracking} instead.
     */

    /**
     * The letter kerning of text content: the space added after a letter,
     * along the line, in thousandths of an em, in place of the font's own
     * kerning pair; `null` for the font's kerning.
     *
     * @name Style#letterKerning
     * @type Number
     * @default null
     */

    /**
     * The font style of text content, as in CSS: upright or slanted. Together
     * with the {@link #fontWeight}, it says what a font's style name says, e.g.
     * `'Bold Italic'`.
     *
     * @name Style#fontStyle
     * @type String
     * @values 'normal', 'italic', 'oblique'
     * @default 'normal'
     */

    /**
     * The settings of a variable font's axes, by their tags: `{ wght: 600,
     * wdth: 80 }`. Kept for hosts that lay text out with its fonts; canvas
     * doesn't draw them.
     *
     * @name Style#fontVariations
     * @type Object
     * @default null
     */

    /**
     * How far the letters move up from the baseline, in pixels.
     *
     * @name Style#baselineShift
     * @type Number
     * @default 0
     */

    /**
     * Whether the letters are set as superscripts or subscripts: smaller, and
     * above or below the baseline.
     *
     * @name Style#baselinePosition
     * @type String
     * @values 'normal', 'superscript', 'subscript'
     * @default 'normal'
     */

    /**
     * How much the letters are scaled, as {@link Item#scaling}: one factor for
     * both directions, or a point with the horizontal and vertical ones.
     *
     * @name Style#letterScaling
     * @type Number|Point
     * @default 1
     */

    /**
     * The rotation of each letter about its origin on the baseline, in degrees.
     *
     * @name Style#letterRotation
     * @type Number
     * @default 0
     */

    /**
     * Whether the letters are set as capitals, or as small capitals.
     *
     * @name Style#capitals
     * @type String
     * @values 'normal', 'all', 'small'
     * @default 'normal'
     */

    /**
     * Whether the letters are underlined.
     *
     * @name Style#underline
     * @type Boolean
     * @default false
     */

    /**
     * Whether the letters are struck through.
     *
     * @name Style#strikethrough
     * @type Boolean
     * @default false
     */

    /**
     * The OpenType features to turn on (`'dlig'`) or off (`'-liga'`). Kept for
     * hosts that lay text out with its fonts; canvas doesn't draw them.
     *
     * @name Style#features
     * @type String[]
     * @default null
     */

    /**
     * {@grouptitle Paragraph Style}
     *
     * The justification of text paragraphs.
     *
     * @name Style#justification
     * @type String
     * @values 'left', 'right', 'center', 'start', 'end', 'justify'
     * @default 'left'
     */

    /**
     * How the last line of a justified paragraph is aligned; `'all'` justifies
     * it too.
     *
     * @name Style#justifyLast
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
     * @name Style#justifySpacing
     * @type Object
     * @default null
     */

    /**
     * The indent where the paragraph's lines start: left in left-to-right text,
     * right in right-to-left text.
     *
     * @name Style#startIndent
     * @type Number
     * @default 0
     */

    /**
     * The indent where the paragraph's lines end.
     *
     * @name Style#endIndent
     * @type Number
     * @default 0
     */

    /**
     * The indent of the paragraph's first line, added to its start indent.
     *
     * @name Style#firstLineIndent
     * @type Number
     * @default 0
     */

    /**
     * The space above the paragraph. Between two paragraphs, the larger of this
     * one's and the space after the one before it is used.
     *
     * @name Style#spaceBefore
     * @type Number
     * @default 0
     */

    /**
     * The space below the paragraph.
     *
     * @name Style#spaceAfter
     * @type Number
     * @default 0
     */

    /**
     * Whether words are hyphenated at the ends of lines, and how: `true`, or `{
     * wordsLongerThan, afterFirst, beforeLast, limit, zone, capitalized }`.
     * Kept for hosts: canvas text breaks only at soft hyphens.
     *
     * @name Style#hyphenation
     * @type Boolean|Object
     * @default false
     */

    /**
     * How lines are broken: one line at a time, or all of the paragraph's lines
     * together, for the most even spacing. Kept for hosts: canvas text breaks
     * one line at a time.
     *
     * @name Style#composer
     * @type String
     * @values 'line', 'paragraph'
     * @default 'paragraph'
     */

    /**
     * How the lines of a paragraph in an area are evened out: `'normal'`
     * fills each line as far as it goes, `'balance'` makes them all about as
     * long, and `'pretty'` balances the last four lines when the last one is
     * shorter than a third of the one before. Both keep the paragraph's number
     * of lines.
     *
     * @name Style#lineWrap
     * @type String
     * @values 'normal', 'balance', 'pretty'
     * @default 'normal'
     */

    /**
     * The paragraph's tab stops: `[{ position, align, leader }]`, with `align`
     * one of `'left'`, `'center'`, `'right'` and `'decimal'`. Kept for hosts:
     * canvas text doesn't set tabs yet.
     *
     * @name Style#tabs
     * @type Object[]
     * @default null
     */

    /**
     * The direction the paragraph's lines run in, which `'start'` and `'end'`
     * follow; `null` for left to right.
     *
     * @name Style#direction
     * @type String
     * @values 'ltr', 'rtl'
     * @default null
     */
});
