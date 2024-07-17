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
 * A function scope holding all the functionality needed to convert a SVG DOM
 * to a Paper.js DOM.
 */
new function() {
    // Define a couple of helper functions to easily read values from SVG
    // objects, dealing with baseVal, and item lists.
    // index is option, and if passed, causes a lookup in a list.

    var definitions = {},
        rootSize;

    function getValue(node, name, isString, allowNull, allowPercent,
            defaultValue) {
        // Interpret value as number. Never return NaN, but 0 instead.
        // If the value is a sequence of numbers, parseFloat will
        // return the first occurring number, which is enough for now.
        var value = SvgElement.get(node, name) || defaultValue,
            res = value == null
                ? allowNull
                    ? null
                    : isString ? '' : 0
                : isString
                    ? value
                    : parseFloat(value);
        // Support for dimensions in percentage of the root size. If root-size
        // is not set (e.g. during <defs>), just scale the percentage value to
        // 0..1, as required by gradients with gradientUnits="objectBoundingBox"
        return /%\s*$/.test(value)
            ? (res / 100) * (allowPercent ? 1
                : rootSize[/x|^width/.test(name) ? 'width' : 'height'])
            : res;
    }

    function getPoint(node, x, y, allowNull, allowPercent, defaultX, defaultY) {
        x = getValue(node, x || 'x', false, allowNull, allowPercent, defaultX);
        y = getValue(node, y || 'y', false, allowNull, allowPercent, defaultY);
        return allowNull && (x == null || y == null) ? null
                : new Point(x, y);
    }

    function getSize(node, w, h, allowNull, allowPercent) {
        w = getValue(node, w || 'width', false, allowNull, allowPercent);
        h = getValue(node, h || 'height', false, allowNull, allowPercent);
        return allowNull && (w == null || h == null) ? null
                : new Size(w, h);
    }

    // Converts a string attribute value to the specified type
    function convertValue(value, type, lookup) {
        return value === 'none' ? null
                : type === 'number' ? parseFloat(value)
                : type === 'array' ?
                    value ? value.split(/[\s,]+/g).map(parseFloat) : []
                : type === 'color' ? getDefinition(value) || value
                : type === 'lookup' ? lookup[value]
                : value;
    }

    // Importer functions for various SVG node types

    function importGroup(node, type, options, isRoot) {
        var nodes = node.childNodes,
            isClip = type === 'clippath',
            isDefs = type === 'defs',
            item = new Group(),
            project = item._project,
            currentStyle = project._currentStyle,
            children = [];
        if (!isClip && !isDefs) {
            item = applyAttributes(item, node, isRoot);
            // Style on items needs to be handled differently than all other
            // items: We first apply the style to the item, then use it as the
            // project's currentStyle, so it is used as a default for the
            // creation of all nested items. importSVG then needs to check for
            // items and avoid calling applyAttributes() again.
            project._currentStyle = item._style.clone();
        }
        if (isRoot) {
            // Import all defs first, since in SVG they can be in any location.
            // e.g. Affinity Designer exports defs as last.
            var defs = node.querySelectorAll('defs');
            for (var i = 0, l = defs.length; i < l; i++) {
                importNode(defs[i], options, false);
            }
        }
        // Collect the children in an array and apply them all at once.
        for (var i = 0, l = nodes.length; i < l; i++) {
            var childNode = nodes[i],
                child;
            if (childNode.nodeType === 1
                    && !/^defs$/i.test(childNode.nodeName)
                    && (child = importNode(childNode, options, false))
                    && !(child instanceof SymbolDefinition))
                children.push(child);
        }
        item.addChildren(children);
        // Clip paths are reduced (unboxed) and their attributes applied at the
        // end.
        if (isClip)
            item = applyAttributes(item.reduce(), node, isRoot);
        // Restore currentStyle
        project._currentStyle = currentStyle;
        if (isClip || isDefs) {
            // We don't want the defs in the DOM. But we might want to use
            // Symbols for them to save memory?
            item.remove();
            item = null;
        }
        return item;
    }

    function importPoly(node, type) {
        var coords = node.getAttribute('points').match(
                    /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g),
            points = [];
        for (var i = 0, l = coords.length; i < l; i += 2)
            points.push(new Point(
                    parseFloat(coords[i]),
                    parseFloat(coords[i + 1])));
        var path = new Path(points);
        if (type === 'polygon')
            path.closePath();
        return path;
    }

    function importPath(node) {
        return PathItem.create(node.getAttribute('d'));
    }

    function importGradient(node, type) {
        var id = (getValue(node, 'href', true) || '').substring(1),
            radial = type === 'radialgradient',
            gradient;
        if (id) {
            // Gradients are always wrapped in a Color object, so get the
            // gradient object from there.
            // TODO: Handle exception if there is no definition for this id.
            gradient = definitions[id].getGradient();
            // Create a clone if radial setting is different:
            if (gradient._radial ^ radial) {
                gradient = gradient.clone();
                gradient._radial = radial;
            }
        } else {
            var nodes = node.childNodes,
                stops = [];
            for (var i = 0, l = nodes.length; i < l; i++) {
                var child = nodes[i];
                if (child.nodeType === 1)
                    stops.push(applyAttributes(new GradientStop(), child));
            }
            gradient = new Gradient(stops, radial);
        }
        var origin, destination, highlight,
            scaleToBounds = getValue(node, 'gradientUnits', true) !==
                'userSpaceOnUse';
        // Allow percentages in all values if scaleToBounds is true:
        if (radial) {
            origin = getPoint(node, 'cx', 'cy', false, scaleToBounds,
                '50%', '50%');
            destination = origin.add(
                getValue(node, 'r', false, false, scaleToBounds, '50%'), 0);
            highlight = getPoint(node, 'fx', 'fy', true, scaleToBounds);
        } else {
            origin = getPoint(node, 'x1', 'y1', false, scaleToBounds,
                '0%', '0%');
            destination = getPoint(node, 'x2', 'y2', false, scaleToBounds,
                '100%', '0%');
        }
        var color = applyAttributes(
                new Color(gradient, origin, destination, highlight), node);
        // TODO: Consider adding support for _scaleToBounds to Color instead?
        color._scaleToBounds = scaleToBounds;
        // We don't return the gradient, since we only need a reference to it in
        // definitions, which is created in applyAttributes()
        return null;
    }

    // NOTE: All importers are lowercase, since jsdom is using uppercase
    // nodeNames still.
    var importers = {
        '#document': function (node, type, options, isRoot) {
            var nodes = node.childNodes;
            for (var i = 0, l = nodes.length; i < l; i++) {
                var child = nodes[i];
                if (child.nodeType === 1)
                    return importNode(child, options, isRoot);
            }
        },
        // https://www.w3.org/TR/SVG/struct.html#Groups
        g: importGroup,
        // https://www.w3.org/TR/SVG/struct.html#NewDocument
        svg: importGroup,
        clippath: importGroup,
        // https://www.w3.org/TR/SVG/shapes.html#PolygonElement
        polygon: importPoly,
        // https://www.w3.org/TR/SVG/shapes.html#PolylineElement
        polyline: importPoly,
        // https://www.w3.org/TR/SVG/paths.html
        path: importPath,
        // https://www.w3.org/TR/SVG/pservers.html#LinearGradients
        lineargradient: importGradient,
        // https://www.w3.org/TR/SVG/pservers.html#RadialGradients
        radialgradient: importGradient,

        // https://www.w3.org/TR/SVG/struct.html#ImageElement
        image: function (node) {
            var raster = new Raster(getValue(node, 'href', true));
            raster.on('load', function() {
                var size = getSize(node);
                this.setSize(size);
                // Since x and y start from the top left of an image, add
                // half of its size. We also need to take the raster's matrix
                // into account, which will be defined by the time the load
                // event is called.
                var center = getPoint(node).add(size.divide(2));
                this._matrix.append(new Matrix().translate(center));
            });
            return raster;
        },

        // https://www.w3.org/TR/SVG/struct.html#SymbolElement
        symbol: function(node, type, options, isRoot) {
            return new SymbolDefinition(
                    // Pass true for dontCenter:
                    importGroup(node, type, options, isRoot), true);
        },

        // https://www.w3.org/TR/SVG/struct.html#DefsElement
        defs: importGroup,

        // https://www.w3.org/TR/SVG/struct.html#UseElement
        use: function(node) {
            // Note the namespaced xlink:href attribute is just called href
            // as a property on node.
            // TODO: Support overflow and width, height, in combination with
            // overflow: hidden. Paper.js currently does not support
            // SymbolItem clipping, but perhaps it should?
            var id = (getValue(node, 'href', true) || '').substring(1),
                definition = definitions[id],
                point = getPoint(node);
            return definition
                    ? definition instanceof SymbolDefinition
                        // When placing symbols, we need to take both point and
                        // matrix into account. place() does the right thing:
                        ? definition.place(point)
                        // A normal item: Clone and translate it.
                        : definition.clone().translate(point)
                    : null;
        },

        // https://www.w3.org/TR/SVG/shapes.html#InterfaceSVGCircleElement
        circle: function(node) {
            return new Shape.Circle(
                    getPoint(node, 'cx', 'cy'),
                    getValue(node, 'r'));
        },

        // https://www.w3.org/TR/SVG/shapes.html#InterfaceSVGEllipseElement
        ellipse: function(node) {
            // We only use object literal notation where the default one is not
            // supported (e.g. center / radius fo Shape.Ellipse).
            return new Shape.Ellipse({
                center: getPoint(node, 'cx', 'cy'),
                radius: getSize(node, 'rx', 'ry')
            });
        },

        // https://www.w3.org/TR/SVG/shapes.html#RectElement
        rect: function(node) {
            return new Shape.Rectangle(new Rectangle(
                        getPoint(node),
                        getSize(node)
                    ), getSize(node, 'rx', 'ry'));
            },

        // https://www.w3.org/TR/SVG/shapes.html#LineElement
        line: function(node) {
            return new Path.Line(
                    getPoint(node, 'x1', 'y1'),
                    getPoint(node, 'x2', 'y2'));
        },

        text: function(node) {
            // Not supported by Paper.js
            // x: multiple values for x
            // y: multiple values for y
            // dx: multiple values for x
            // dy: multiple values for y
            // TODO: Support for these is missing in Paper.js right now
            // rotate: character rotation
            // lengthAdjust:
            var text = new PointText(getPoint(node).add(
                    getPoint(node, 'dx', 'dy')));
            text.setContent(node.textContent.trim() || '');
            return text;
        },

        // https://www.w3.org/TR/SVG/struct.html#SwitchElement
        // Conditional attributes are ignored and all children are rendered.
        switch: importGroup
    };

    // Attributes and Styles

    // NOTE: Parameter sequence for all apply*() functions is:
    // (item, value, name, node) rather than (item, node, name, value),
    // so we can omit the less likely parameters from right to left.

    function applyTransform(item, value, name, node) {
        if (item.transform) {
            // https://www.w3.org/TR/SVG/types.html#DataTypeTransformList
            // Parse SVG transform string. First we split at /)\s*/, to separate
            // commands
            var transforms = (node.getAttribute(name) || '').split(/\)\s*/g),
                matrix = new Matrix();
            for (var i = 0, l = transforms.length; i < l; i++) {
                var transform = transforms[i];
                if (!transform)
                    break;
                // Command come before the '(', values after
                var parts = transform.split(/\(\s*/),
                    command = parts[0].trim(),
                    v = parts[1].split(/[\s,]+/g);
                // Convert values to floats
                for (var j = 0, m = v.length; j < m; j++)
                    v[j] = parseFloat(v[j]);
                switch (command) {
                case 'matrix':
                    matrix.append(
                            new Matrix(v[0], v[1], v[2], v[3], v[4], v[5]));
                    break;
                case 'rotate':
                    matrix.rotate(v[0], v[1] || 0, v[2] || 0);
                    break;
                case 'translate':
                    matrix.translate(v[0], v[1] || 0);
                    break;
                case 'scale':
                    matrix.scale(v);
                    break;
                case 'skewX':
                    matrix.skew(v[0], 0);
                    break;
                case 'skewY':
                    matrix.skew(0, v[0]);
                    break;
                }
            }
            item.transform(matrix);
        }
    }

    function applyOpacity(item, value, name) {
        // https://www.w3.org/TR/SVG/painting.html#FillOpacityProperty
        // https://www.w3.org/TR/SVG/painting.html#StrokeOpacityProperty
        var key = name === 'fill-opacity' ? 'getFillColor' : 'getStrokeColor',
            color = item[key] && item[key]();
        if (color)
            color.setAlpha(parseFloat(value));
    }

    // Create apply-functions for attributes, and merge in those for SVGStyles.
    // We need to define style attributes first, and merge in all others after,
    // since transform needs to be applied after fill color, as transformations
    // can affect gradient fills.
    // Use Base.set() to control sequence of attributes and have all entries in
    // SvgStyles (e.g. 'stroke') before the additional attributes below (e.g.
    // 'stroke-opacity'). See issue #694.
    var attributes = Base.set(Base.each(SvgStyles, function(entry) {
        this[entry.attribute] = function(item, value) {
            if (item[entry.set]) {
                item[entry.set](convertValue(value, entry.type, entry.fromSVG));
                if (entry.type === 'color') {
                    // Do not use result of convertValue() above, since calling
                    // the setter will convert a color and clone it if necessary
                    var color = item[entry.get]();
                    if (color) {
                        // Emulate SVG's gradientUnits="objectBoundingBox"
                        if (color._scaleToBounds) {
                            var bounds = item.getBounds();
                            color.transform(new Matrix()
                                .translate(bounds.getPoint())
                                .scale(bounds.getSize()));
                        }
                    }
                }
            }
        };
    }, {}), {
        id: function(item, value) {
            definitions[value] = item;
            if (item.setName)
                item.setName(value);
        },

        'clip-path': function(item, value) {
            // https://www.w3.org/TR/SVG/masking.html#ClipPathProperty
            var clip = getDefinition(value);
            if (clip) {
                clip = clip.clone();
                clip.setClipMask(true);
                // If item is already a group, move the clip-path inside
                if (item instanceof Group) {
                    item.insertChild(0, clip);
                } else {
                    return new Group(clip, item);
                }
            }
        },

        gradientTransform: applyTransform,
        transform: applyTransform,

        'fill-opacity': applyOpacity,
        'stroke-opacity': applyOpacity,

        visibility: function(item, value) {
            if (item.setVisible)
                item.setVisible(value === 'visible');
        },

        display: function(item, value) {
            // NOTE: 'none' gets translated to null in getAttribute()
            if (item.setVisible)
                item.setVisible(value !== null);
        },

        'stop-color': function(item, value) {
            // https://www.w3.org/TR/SVG/pservers.html#StopColorProperty
            if (item.setColor)
                item.setColor(value);
        },

        'stop-opacity': function(item, value) {
            // https://www.w3.org/TR/SVG/pservers.html#StopOpacityProperty
            // NOTE: It is important that this is applied after stop-color!
            if (item._color)
                item._color.setAlpha(parseFloat(value));
        },

        offset: function(item, value) {
            // https://www.w3.org/TR/SVG/pservers.html#StopElementOffsetAttribute
            if (item.setOffset) {
                var percent = value.match(/(.*)%$/);
                item.setOffset(percent ? percent[1] / 100 : parseFloat(value));
            }
        },

        viewBox: function(item, value, name, node, styles) {
            // https://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
            // TODO: implement preserveAspectRatio attribute
            // viewBox will be applied both to the group that's created for the
            // content in SymbolDefinition#item, and the SymbolItem itself.
            var rect = new Rectangle(convertValue(value, 'array')),
                size = getSize(node, null, null, true),
                group,
                matrix;
            if (item instanceof Group) {
                // This is either a top-level svg node, or the container for a
                // symbol.
                var scale = size ? size.divide(rect.getSize()) : 1,
                matrix = new Matrix().scale(scale)
                        .translate(rect.getPoint().negate());
                group = item;
            } else if (item instanceof SymbolDefinition) {
                // The symbol is wrapping a group. Note that viewBox was already
                // applied to the group, and the above code was executed for it.
                // All that is left to handle here for SymbolDefinition is
                // clipping. We can't do it at group level because
                // applyAttributes() gets called for groups before their
                // children are added, for styling reasons. See importGroup()
                if (size)
                    rect.setSize(size);
                group = item._item;
            }
            if (group)  {
                if (getAttribute(node, 'overflow', styles) !== 'visible') {
                    // Add a clip path at the top of this symbol's group
                    var clip = new Shape.Rectangle(rect);
                    clip.setClipMask(true);
                    group.addChild(clip);
                }
                if (matrix)
                    group.transform(matrix);
            }
        }
    });

    function getAttribute(node, name, styles) {
        // First see if the given attribute is defined.
        var attr = node.attributes[name],
            value = attr && attr.value;
        if (!value && node.style) {
            // Fallback to using styles. See if there is a style, either set
            // directly on the object or applied to it through CSS rules.
            // We also need to filter out inheritance from their parents.
            var style = Base.camelize(name);
            value = node.style[style];
            if (!value && styles.node[style] !== styles.parent[style])
                value = styles.node[style];
        }
        // Return undefined if attribute is not defined, but null if it's
        // defined as not set (e.g. fill / stroke).
        return !value ? undefined
                : value === 'none' ? null
                : value;
    }

    /**
     * Converts various SVG styles and attributes into Paper.js styles and
     * attributes and applies them to the passed item.
     *
     * @param {SVGElement} node an SVG node to read style and attributes from
     * @param {Item} item the item to apply the style and attributes to
     */
    function applyAttributes(item, node, isRoot) {
        // SVG attributes can be set both as styles and direct node
        // attributes, so we need to handle both.
        var parent = node.parentNode,
            styles = {
                node: DomElement.getStyles(node) || {},
                // Do not check for inheritance if this is root, to make the
                // default SVG settings stick. Also detect defs parents, of
                // which children need to explicitly inherit their styles.
                parent: !isRoot && !/^defs$/i.test(parent.tagName)
                        && DomElement.getStyles(parent) || {}
            };
        Base.each(attributes, function(apply, name) {
            var value = getAttribute(node, name, styles);
            // 'clip-path' attribute returns a new item, support it here:
            item = value !== undefined
                    && apply(item, value, name, node, styles) || item;
        });
        return item;
    }

    function getDefinition(value) {
        // When url() comes from a style property, '#'' seems to be missing on
        // WebKit. We also get variations of quotes or no quotes, single or
        // double, so handle it all with one regular expression:
        var match = value && value.match(/\((?:["'#]*)([^"')]+)/),
            name = match && match[1],
            res = name && definitions[window
                    // This is required by Firefox, which can produce absolute
                    // urls for local gradients, see #1001:
                    ? name.replace(window.location.href.split('#')[0] + '#', '')
                    : name];
        // Patch in support for SVG's gradientUnits="objectBoundingBox" through
        // Color#_scaleToBounds
        if (res && res._scaleToBounds) {
            // Always create a clone, so it can be transformed when used.
            res = res.clone();
            res._scaleToBounds = true;
        }
        return res;
    }

    function importNode(node, options, isRoot) {
        // jsdom in Node.js uses uppercase values for nodeName...
        var type = node.nodeName.toLowerCase(),
            isElement = type !== '#document',
            body = document.body,
            container,
            parent,
            next;
        if (isRoot && isElement) {
            // Set rootSize to view size, as getSize() may refer to it (#1242).
            rootSize = paper.getView().getSize();
            // Now set rootSize to the root element size, and fall-back to view.
            rootSize = getSize(node, null, null, true) || rootSize;
            // We need to move the SVG node to the current document, so default
            // styles are correctly inherited! For this we create and insert a
            // temporary SVG container which is removed again at the end. This
            // container also helps fix a bug on IE.
            container = SvgElement.create('svg', {
                // If no stroke-width is set, IE/Edge appears to have a
                // default of 0.01px. We can set a default style on the
                // parent container as a more sensible fall-back. Also, browsers
                // have a default miter-limit of 4, while Paper.js has 10
                style: 'stroke-width: 1px; stroke-miterlimit: 10'
            });
            parent = node.parentNode;
            next = node.nextSibling;
            container.appendChild(node);
            body.appendChild(container);
        }
        // Have items imported from SVG not bake in all transformations to their
        // content and children, as this is how SVG works too, but preserve the
        // current setting so we can restore it after. Also don't insert them
        // into the scene graph automatically, as we do so by hand.
        var settings = paper.settings,
            applyMatrix = settings.applyMatrix,
            insertItems = settings.insertItems;
        settings.applyMatrix = false;
        settings.insertItems = false;
        var importer = importers[type],
            item = importer && importer(node, type, options, isRoot) || null;
        settings.insertItems = insertItems;
        settings.applyMatrix = applyMatrix;
        if (item) {
            // Do not apply attributes if this is a #document node.
            // See importGroup() for an explanation of filtering for Group:
            if (isElement && !(item instanceof Group))
                item = applyAttributes(item, node, isRoot);
            // Support onImportItem callback, to provide mechanism to handle
            // special attributes (e.g. inkscape:transform-center)
            var onImport = options.onImport,
                data = isElement && node.getAttribute('data-paper-data');
            if (onImport)
                item = onImport(node, item, options) || item;
            if (options.expandShapes && item instanceof Shape) {
                item.remove();
                item = item.toPath();
            }
            if (data)
                item._data = JSON.parse(data);
        }
        if (container) {
            //  After import, move things back to how they were:
            body.removeChild(container);
            if (parent) {
                if (next) {
                    parent.insertBefore(node, next);
                } else {
                    parent.appendChild(node);
                }
            }
        }
        // Clear definitions at the end of import?
        if (isRoot) {
            definitions = {};
            // Now if settings.applyMatrix was set, apply recursively and set
            // #applyMatrix = true on the item and all children.
            if (item && Base.pick(options.applyMatrix, applyMatrix))
                item.matrix.apply(true, true);
        }
        return item;
    }

    function importSVG(source, options, owner) {
        if (!source)
            return null;
        options = typeof options === 'function' ? { onLoad: options }
                : options || {};
        // Remember current scope so we can restore it in onLoad.
        var scope = paper,
            item = null;

        function onLoad(svg) {
            try {
                var node = typeof svg === 'object'
                    ? svg
                    : new self.DOMParser().parseFromString(
                        svg.trim(),
                        'image/svg+xml'
                    );
                if (!node.nodeName) {
                    node = null;
                    throw new Error('Unsupported SVG source: ' + source);
                }
                paper = scope;
                item = importNode(node, options, true);
                if (!options || options.insert !== false) {
                    // TODO: Implement support for multiple Layers on Project.
                    owner._insertItem(undefined, item);
                }
                var onLoad = options.onLoad;
                if (onLoad)
                    onLoad(item, svg);
            } catch (e) {
                onError(e);
            }
        }

        function onError(message, status) {
            var onError = options.onError;
            if (onError) {
                onError(message, status);
            } else {
                throw new Error(message);
            }
        }

        // Have the group not pass on all transformations to its children,
        // as this is how SVG works too.
        // See if it's a string but handle markup separately, using `[\s\S]` to
        // also match the first tag if it only starts on the second line in a
        // multi-line string.
        if (typeof source === 'string' && !/^[\s\S]*</.test(source)) {
            // First see if we're meant to import an element with the given
            // id.
            var node = document.getElementById(source);
            // Check if the string does not represent SVG data, in which
            // case it must be the URL of a SVG to be loaded.
            if (node) {
                onLoad(node);
            } else {
                Http.request({
                    url: source,
                    async: true,
                    onLoad: onLoad,
                    onError: onError
                });
            }
        } else if (typeof File !== 'undefined' && source instanceof File) {
            // Load local file through FileReader
            var reader = new FileReader();
            reader.onload = function() {
                onLoad(reader.result);
            };
            reader.onerror = function() {
                onError(reader.error);
            };
            return reader.readAsText(source);
        } else {
            onLoad(source);
        }

        return item;
    }

    // NOTE: Documentation is in Item#importSVG()
    Item.inject({
        importSVG: function(node, options) {
            return importSVG(node, options, this);
        }
    });

    // NOTE: Documentation is in Project#importSVG()
    Project.inject({
        importSVG: function(node, options) {
            this.activate();
            return importSVG(node, options, this);
        }
    });
};
