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
 * A function scope holding all the functionality needed to convert a
 * Paper.js DOM to a SVG DOM.
 */
new function() {
    // TODO: Consider moving formatter into options object, and pass it along.
    var formatter;

    function getTransform(matrix, coordinates, center) {
        // Use new Base() so we can use Base#set() on it.
        var attrs = new Base(),
            trans = matrix.getTranslation();
        if (coordinates) {
            // If the item supports x- and y- coordinates, we're taking out the
            // translation part of the matrix and move it to x, y attributes, to
            // produce more readable markup, and not have to use center points
            // in rotate(). To do so, SVG requires us to inverse transform the
            // translation point by the matrix itself, since they are provided
            // in local coordinates.
            var point;
            if (matrix.isInvertible()) {
                matrix = matrix._shiftless();
                point = matrix._inverseTransform(trans);
                trans = null;
            } else {
                point = new Point();
            }
            attrs[center ? 'cx' : 'x'] = point.x;
            attrs[center ? 'cy' : 'y'] = point.y;
        }
        if (!matrix.isIdentity()) {
            // See if we can decompose the matrix and can formulate it as a
            // simple translate/scale/rotate command sequence.
            var decomposed = matrix.decompose();
            if (decomposed) {
                var parts = [],
                    angle = decomposed.rotation,
                    scale = decomposed.scaling,
                    skew = decomposed.skewing;
                if (trans && !trans.isZero())
                    parts.push('translate(' + formatter.point(trans) + ')');
                if (angle)
                    parts.push('rotate(' + formatter.number(angle) + ')');
                if (!Numerical.isZero(scale.x - 1)
                        || !Numerical.isZero(scale.y - 1))
                    parts.push('scale(' + formatter.point(scale) +')');
                if (skew.x)
                    parts.push('skewX(' + formatter.number(skew.x) + ')');
                if (skew.y)
                    parts.push('skewY(' + formatter.number(skew.y) + ')');
                attrs.transform = parts.join(' ');
            } else {
                attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
            }
        }
        return attrs;
    }

    function exportGroup(item, options) {
        var attrs = getTransform(item._matrix),
            children = item._children;
        var node = SvgElement.create('g', attrs, formatter);
        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i];
            var childNode = exportSVG(child, options);
            if (childNode) {
                if (child.isClipMask()) {
                    var clip = SvgElement.create('clipPath');
                    clip.appendChild(childNode);
                    setDefinition(child, clip, 'clip');
                    SvgElement.set(node, {
                        'clip-path': 'url(#' + clip.id + ')'
                    });
                } else {
                    node.appendChild(childNode);
                }
            }
        }
        return node;
    }

    function exportRaster(item, options) {
        var attrs = getTransform(item._matrix, true),
            size = item.getSize(),
            image = item.getImage();
        // Take into account that rasters are centered:
        attrs.x -= size.width / 2;
        attrs.y -= size.height / 2;
        attrs.width = size.width;
        attrs.height = size.height;
        attrs.href = options.embedImages == false && image && image.src
                || item.toDataURL();
        return SvgElement.create('image', attrs, formatter);
    }

    function exportPath(item, options) {
        var matchShapes = options.matchShapes;
        if (matchShapes) {
            var shape = item.toShape(false);
            if (shape)
                return exportShape(shape, options);
        }
        var segments = item._segments,
            length = segments.length,
            type,
            attrs = getTransform(item._matrix);
        if (matchShapes && length >= 2 && !item.hasHandles()) {
            if (length > 2) {
                type = item._closed ? 'polygon' : 'polyline';
                var parts = [];
                for (var i = 0; i < length; i++) {
                    parts.push(formatter.point(segments[i]._point));
                }
                attrs.points = parts.join(' ');
            } else {
                type = 'line';
                var start = segments[0]._point,
                    end = segments[1]._point;
                attrs.set({
                    x1: start.x,
                    y1: start.y,
                    x2: end.x,
                    y2: end.y
                });
            }
        } else {
            type = 'path';
            attrs.d = item.getPathData(null, options.precision);
        }
        return SvgElement.create(type, attrs, formatter);
    }

    function exportShape(item) {
        var type = item._type,
            radius = item._radius,
            attrs = getTransform(item._matrix, true, type !== 'rectangle');
        if (type === 'rectangle') {
            type = 'rect'; // SVG
            var size = item._size,
                width = size.width,
                height = size.height;
            attrs.x -= width / 2;
            attrs.y -= height / 2;
            attrs.width = width;
            attrs.height = height;
            if (radius.isZero())
                radius = null;
        }
        if (radius) {
            if (type === 'circle') {
                attrs.r = radius;
            } else {
                attrs.rx = radius.width;
                attrs.ry = radius.height;
            }
        }
        return SvgElement.create(type, attrs, formatter);
    }

    function exportCompoundPath(item, options) {
        var attrs = getTransform(item._matrix);
        var data = item.getPathData(null, options.precision);
        if (data)
            attrs.d = data;
        return SvgElement.create('path', attrs, formatter);
    }

    function exportSymbolItem(item, options) {
        var attrs = getTransform(item._matrix, true),
            definition = item._definition,
            node = getDefinition(definition, 'symbol'),
            definitionItem = definition._item,
            bounds = definitionItem.getStrokeBounds();
        if (!node) {
            node = SvgElement.create('symbol', {
                viewBox: formatter.rectangle(bounds)
            });
            node.appendChild(exportSVG(definitionItem, options));
            setDefinition(definition, node, 'symbol');
        }
        attrs.href = '#' + node.id;
        attrs.x += bounds.x;
        attrs.y += bounds.y;
        attrs.width = bounds.width;
        attrs.height = bounds.height;
        attrs.overflow = 'visible';
        return SvgElement.create('use', attrs, formatter);
    }

    function exportGradient(color) {
        // NOTE: As long as the fillTransform attribute is not implemented,
        // we need to create a separate gradient object for each gradient,
        // even when they share the same gradient definition.
        // http://www.svgopen.org/2011/papers/20-Separating_gradients_from_geometry/
        // TODO: Implement gradient merging in SvgImport
        var gradientNode = getDefinition(color, 'color');
        if (!gradientNode) {
            var gradient = color.getGradient(),
                radial = gradient._radial,
                origin = color.getOrigin(),
                destination = color.getDestination(),
                attrs;
            if (radial) {
                attrs = {
                    cx: origin.x,
                    cy: origin.y,
                    r: origin.getDistance(destination)
                };
                var highlight = color.getHighlight();
                if (highlight) {
                    attrs.fx = highlight.x;
                    attrs.fy = highlight.y;
                }
            } else {
                attrs = {
                    x1: origin.x,
                    y1: origin.y,
                    x2: destination.x,
                    y2: destination.y
                };
            }
            attrs.gradientUnits = 'userSpaceOnUse';
            gradientNode = SvgElement.create((radial ? 'radial' : 'linear')
                    + 'Gradient', attrs, formatter);
            var stops = gradient._stops;
            for (var i = 0, l = stops.length; i < l; i++) {
                var stop = stops[i],
                    stopColor = stop._color,
                    alpha = stopColor.getAlpha(),
                    offset = stop._offset;
                attrs = {
                    offset: offset == null ? i / (l - 1) : offset
                };
                if (stopColor)
                    attrs['stop-color'] = stopColor.toCSS(true);
                // See applyStyle for an explanation of why there are separated
                // opacity / color attributes.
                if (alpha < 1)
                    attrs['stop-opacity'] = alpha;
                gradientNode.appendChild(
                        SvgElement.create('stop', attrs, formatter));
            }
            setDefinition(color, gradientNode, 'color');
        }
        return 'url(#' + gradientNode.id + ')';
    }

    function exportText(item) {
        var node = SvgElement.create('text', getTransform(item._matrix, true),
                formatter);
        node.textContent = item._content;
        return node;
    }

    var exporters = {
        Group: exportGroup,
        Layer: exportGroup,
        Raster: exportRaster,
        Path: exportPath,
        Shape: exportShape,
        CompoundPath: exportCompoundPath,
        SymbolItem: exportSymbolItem,
        PointText: exportText
    };

    function applyStyle(item, node, options, isRoot) {
        var attrs = {},
            parent = !isRoot && item.getParent(),
            style = [];

        if (item._name != null)
            attrs.id = item._name;

        Base.each(SvgStyles, function(entry) {
            // Get a given style only if it differs from the value on the parent
            // (A layer or group which can have style values in SVG).
            var get = entry.get,
                type = entry.type,
                value = item[get]();
            if (entry.exportFilter
                    ? entry.exportFilter(item, value)
                    : options.reduceAttributes == false
                        || !parent || !Base.equals(parent[get](), value)) {
                if (type === 'color' && value != null) {
                    // Support for css-style rgba() values is not in SVG 1.1, so
                    // separate the alpha value of colors with alpha into the
                    // separate fill- / stroke-opacity attribute:
                    var alpha = value.getAlpha();
                    if (alpha < 1)
                        attrs[entry.attribute + '-opacity'] = alpha;
                }
                if (type === 'style') {
                    style.push(entry.attribute + ': ' + value);
                } else {
                    attrs[entry.attribute] = value == null ? 'none'
                            : type === 'color' ? value.gradient
                                // true for noAlpha, see above
                                ? exportGradient(value, item)
                                : value.toCSS(true)
                            : type === 'array' ? value.join(',')
                            : type === 'lookup' ? entry.toSVG[value]
                            : value;
                }
            }
        });

        if (style.length)
            attrs.style = style.join(';');

        if (attrs.opacity === 1)
            delete attrs.opacity;

        if (!item._visible)
            attrs.visibility = 'hidden';

        return SvgElement.set(node, attrs, formatter);
    }

    var definitions;
    function getDefinition(item, type) {
        if (!definitions)
            definitions = { ids: {}, svgs: {} };
        // Use #__id for items that don't have internal #_id properties (Color),
        // and give them ids from their own private id pool named 'svg'.
        return item && definitions.svgs[type + '-'
                + (item._id || item.__id || (item.__id = UID.get('svg')))];
    }

    function setDefinition(item, node, type) {
        // Make sure the definitions lookup is created before we use it.
        // This is required by 'clip', where getDefinition() is not called.
        if (!definitions)
            getDefinition();
        // Have different id ranges per type
        var typeId = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
        // Give the svg node an id, and link to it from the item id.
        node.id = type + '-' + typeId;
        // See getDefinition() for an explanation of #__id:
        definitions.svgs[type + '-' + (item._id || item.__id)] = node;
    }

    function exportDefinitions(node, options) {
        var svg = node,
            defs = null;
        if (definitions) {
            // We can only use svg nodes as definition containers. Have the loop
            // produce one if it's a single item of another type (when calling
            // #exportSVG() on an item rather than a whole project)
            // jsdom in Node.js uses uppercase values for nodeName...
            svg = node.nodeName.toLowerCase() === 'svg' && node;
            for (var i in definitions.svgs) {
                // This code is inside the loop so we only create a container if
                // we actually have svgs.
                if (!defs) {
                    if (!svg) {
                        svg = SvgElement.create('svg');
                        svg.appendChild(node);
                    }
                    defs = svg.insertBefore(SvgElement.create('defs'),
                            svg.firstChild);
                }
                defs.appendChild(definitions.svgs[i]);
            }
            // Clear definitions at the end of export
            definitions = null;
        }
        return options.asString
                ? new self.XMLSerializer().serializeToString(svg)
                : svg;
    }

    function exportSVG(item, options, isRoot) {
        var exporter = exporters[item._class],
            node = exporter && exporter(item, options);
        if (node) {
            // Support onExportItem callback, to provide mechanism to handle
            // special attributes (e.g. inkscape:transform-center)
            var onExport = options.onExport;
            if (onExport)
                node = onExport(item, node, options) || node;
            var data = JSON.stringify(item._data);
            if (data && data !== '{}' && data !== 'null')
                node.setAttribute('data-paper-data', data);
        }
        return node && applyStyle(item, node, options, isRoot);
    }

    function setOptions(options) {
        if (!options)
            options = {};
        formatter = new Formatter(options.precision);
        return options;
    }

    Item.inject({
        exportSVG: function(options) {
            options = setOptions(options);
            return exportDefinitions(exportSVG(this, options, true), options);
        }
    });

    Project.inject({
        exportSVG: function(options) {
            options = setOptions(options);
            var children = this._children,
                view = this.getView(),
                bounds = Base.pick(options.bounds, 'view'),
                mx = options.matrix || bounds === 'view' && view._matrix,
                matrix = mx && Matrix.read([mx]),
                rect = bounds === 'view'
                    ? new Rectangle([0, 0], view.getViewSize())
                    : bounds === 'content'
                        ? Item._getBounds(children, matrix, { stroke: true })
                            .rect
                        : Rectangle.read([bounds], 0, { readNull: true }),
                attrs = {
                    version: '1.1',
                    xmlns: SvgElement.svg,
                    'xmlns:xlink': SvgElement.xlink,
                };
            if (rect) {
                attrs.width = rect.width;
                attrs.height = rect.height;
                if (rect.x || rect.x === 0 || rect.y || rect.y === 0)
                    attrs.viewBox = formatter.rectangle(rect);
            }
            var node = SvgElement.create('svg', attrs, formatter),
                parent = node;
            // If the view has a transformation, wrap all layers in a group with
            // that transformation applied to.
            if (matrix && !matrix.isIdentity()) {
                parent = node.appendChild(SvgElement.create('g',
                        getTransform(matrix), formatter));
            }
            for (var i = 0, l = children.length; i < l; i++) {
                parent.appendChild(exportSVG(children[i], options, true));
            }
            return exportDefinitions(node, options);
        }
    });
};
