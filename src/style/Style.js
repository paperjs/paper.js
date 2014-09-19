/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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
 * // set on the children of the group:
 * group.style = {
 *     strokeColor: 'black',
 *     dashArray: [4, 10],
 *     strokeWidth: 4,
 *     strokeCap: 'round'
 * };
 *
 */
var Style = Base.extend(new function() {
    // windingRule / resolution / fillOverprint / strokeOverprint are currently
    // not supported.
    var defaults = {
        // Paths
        fillColor: undefined,
        strokeColor: undefined,
        strokeWidth: 1,
        strokeCap: 'butt',
        strokeJoin: 'miter',
        strokeScaling: true,
        miterLimit: 10,
        dashOffset: 0,
        dashArray: [],
        windingRule: 'nonzero',
        // Shadows
        shadowColor: undefined,
        shadowBlur: 0,
        shadowOffset: new Point(),
        // Selection
        selectedColor: undefined,
        // Characters
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
        fontSize: 12,
        font: 'sans-serif', // deprecated, links to fontFamily
        leading: null,
        // Paragraphs
        justification: 'left'
    };

    var flags = {
        strokeWidth: /*#=*/Change.STROKE,
        strokeCap: /*#=*/Change.STROKE,
        strokeJoin: /*#=*/Change.STROKE,
        // strokeScaling can change the coordinates of cached path items
        strokeScaling: /*#=*/(Change.STROKE | Change.GEOMETRY),
        miterLimit: /*#=*/Change.STROKE,
        fontFamily: /*#=*/Change.GEOMETRY,
        fontWeight: /*#=*/Change.GEOMETRY,
        fontSize: /*#=*/Change.GEOMETRY,
        font: /*#=*/Change.GEOMETRY, // deprecated, links to fontFamily
        leading: /*#=*/Change.GEOMETRY,
        justification: /*#=*/Change.GEOMETRY
    };

    // Enforce creation of beans, as bean getters have hidden parameters,
    // see _dontMerge argument below.
    var item = { beans: true },
        fields = {
            _defaults: defaults,
            // Override default fillColor for text items
            _textDefaults: new Base(defaults, {
                fillColor: new Color() // black
            }),
            beans: true
        };

    Base.each(defaults, function(value, key) {
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
                children = owner && owner._children;
            // Only unify styles on children of Groups, excluding CompoundPaths.
            if (children && children.length > 0
                    && !(owner instanceof CompoundPath)) {
                for (var i = 0, l = children.length; i < l; i++)
                    children[i]._style[set](value);
            } else {
                var old = this._values[key];
                if (old != value) {
                    if (isColor) {
                        if (old)
                            old._owner = undefined;
                        if (value && value.constructor === Color) {
                            // Clone color if it already has an owner.
                            // NOTE: If value is not a Color, it is only
                            // converted and cloned in the getter further down.
                            if (value._owner)
                                value = value.clone();
                            value._owner = owner;
                        }
                    }
                    // Note: We do not convert the values to Colors in the
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
                children = owner && owner._children,
                value;
            // If the owner has children, walk through all of them and see if
            // they all have the same style.
            // If true is passed for _dontMerge, don't merge children styles
            if (!children || children.length === 0 || _dontMerge
                    || owner instanceof CompoundPath) {
                var value = this._values[key];
                if (value === undefined) {
                    value = this._defaults[key];
                    if (value && value.clone)
                        value = value.clone();
                    this._values[key] = value;
                } else {
                    var ctor = isColor ? Color : isPoint ? Point : null;
                    if (ctor && !(value && value.constructor === ctor)) {
                        // Convert to a Color / Point, and stored result of the
                        // conversion.
                        this._values[key] = value = ctor.read([value], 0,
                                { readNull: true, clone: true });
                        if (value && isColor)
                            value._owner = owner;
                    }
                }
                return value;
            }
            for (var i = 0, l = children.length; i < l; i++) {
                var childValue = children[i]._style[get]();
                if (i === 0) {
                    value = childValue;
                } else if (!Base.equals(value, childValue)) {
                    // If there is another child with a different
                    // style, the style is not defined:
                    return undefined;
                }
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

    Item.inject(item);
    return fields;
}, /** @lends Style# */{
    _class: 'Style',

    initialize: function Style(style, _owner, _project) {
        // We keep values in a separate object that we can iterate over.
        this._values = {};
        this._owner = _owner;
        this._project = _owner && _owner._project || _project || paper.project;
        if (_owner instanceof TextItem)
            this._defaults = this._textDefaults;
        if (style)
            this.set(style);
    },

    set: function(style) {
        // If the passed style object is also a Style, clone its clonable
        // fields rather than simply copying them.
        var isStyle = style instanceof Style,
            // Use the other stlyle's _values object for iteration
            values = isStyle ? style._values : style;
        if (values) {
            for (var key in values) {
                if (key in this._defaults) {
                    var value = values[key];
                    // Delegate to setter, so Group styles work too.
                    this[key] = value && isStyle && value.clone
                            ? value.clone() : value;
                }
            }
        }
    },

    equals: function(style) {
        return style === this || style && this._class === style._class
                && Base.equals(this._values, style._values)
                || false;
    },

    // DOCS: Style#hasFill()
    hasFill: function() {
        return !!this.getFillColor();
    },

    // DOCS: Style#hasStroke()
    hasStroke: function() {
        return !!this.getStrokeColor() && this.getStrokeWidth() > 0;
    },

    // DOCS: Style#hasShadow()
    hasShadow: function() {
        return !!this.getShadowColor() && this.getShadowBlur() > 0;
    },

    /**
     * The view that this style belongs to.
     * @type View
     * @bean
     */
    getView: function() {
        return this._project.getView();
    },

    // Overrides

    getFontStyle: function() {
        var fontSize = this.getFontSize();
        // To prevent an obscure iOS 7 crash, we have to convert the size to a
        // string first before passing it to the regular expression.
        // The following nonsensical statement would also prevent the bug,
        // proving that the issue is not the regular expression itself, but
        // something deeper down in the optimizer:
        // `if (size === 0) size = 0;`
        return this.getFontWeight()
                + ' ' + fontSize + (/[a-z]/i.test(fontSize + '') ? ' ' : 'px ')
                + this.getFontFamily();
    },

    /**
     * @private
     * @bean
     * @deprecated use {@link #getFontFamily()} instead.
     */
    getFont: '#getFontFamily',
    setFont: '#setFontFamily',

    getLeading: function getLeading() {
        // Override leading to return fontSize * 1.2 by default.
        var leading = getLeading.base.call(this),
            fontSize = this.getFontSize();
        if (/pt|em|%|px/.test(fontSize))
            fontSize = this.getView().getPixelSize(fontSize);
        return leading != null ? leading : fontSize * 1.2;
    }

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
     * @type Color
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
     * @default 1
     * @type Number
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
     * @default 'butt'
     * @type String('round', 'square', 'butt')
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
     * @default 'miter'
     * @type String('miter', 'round', 'bevel')
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
     * appear as a non-scaling stroke.
     *
     * @name Style#strokeScaling
     * @property
     * @default true
     * @type Boolean
     */

    /**
     * The dash offset of the stroke.
     *
     * @name Style#dashOffset
     * @property
     * @default 0
     * @type Number
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
     * @default []
     * @type Array
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
     * @type Color
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
     * {@grouptitle Shadow Style}
     *
     * The shadow color.
     *
     * @property
     * @name Style#shadowColor
     * @type Color
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
     * @default 0
     * @name Style#shadowBlur
     * @type Number
     */

    /**
     * The shadow's offset.
     *
     * @property
     * @default 0
     * @name Style#shadowOffset
     * @type Point
     */

    /**
     * {@grouptitle Selection Style}
     *
     * The color the item is highlighted with when selected. If the item does
     * not specify its own color, the color defined by its layer is used instead.
     *
     * @name Style#selectedColor
     * @property
     * @type Color
     */

    /**
     * {@grouptitle Character Style}
     *
     * The font-family to be used in text content.
     *
     * @name Style#fontFamily
     * @default 'sans-serif'
     * @type String
     */

    /**
     *
     * The font-weight to be used in text content.
     *
     * @name Style#fontWeight
     * @default 'normal'
     * @type String|Number
     */

    /**
     * The font size of text content, as {@Number} in pixels, or as {@String}
     * with optional units {@code 'px'}, {@code 'pt'} and {@code 'em'}.
     *
     * @name Style#fontSize
     * @default 10
     * @type Number|String
     */

    /**
     *
     * The font-family to be used in text content, as one {@String}.
     * @deprecated use {@link #fontFamily} instead.
     *
     * @name Style#font
     * @default 'sans-serif'
     * @type String
     */

    /**
     * The text leading of text content.
     *
     * @name Style#leading
     * @default fontSize * 1.2
     * @type Number|String
     */

    /**
     * {@grouptitle Paragraph Style}
     *
     * The justification of text paragraphs.
     *
     * @name Style#justification
     * @default 'left'
     * @type String('left', 'right', 'center')
     */
});
