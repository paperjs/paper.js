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
 * A function scope holding all the functionality needed to convert a
 * Paper.js DOM to a SVG DOM.
 */
new function() {
	// TODO: Consider moving formatter into options object, and pass it along.
	var formatter;

	function setAttributes(node, attrs) {
		for (var key in attrs) {
			var val = attrs[key],
				namespace = SVGNamespaces[key];
			if (typeof val === 'number')
				val = formatter.number(val);
			if (namespace) {
				node.setAttributeNS(namespace, key, val);
			} else {
				node.setAttribute(key, val);
			}
		}
		return node;
	}

	function createElement(tag, attrs) {
		return setAttributes(
			document.createElementNS('http://www.w3.org/2000/svg', tag), attrs);
	}

	function getTransform(matrix, coordinates, center) {
		// Use new Base() so we can use Base#set() on it.
		var attrs = new Base(),
			trans = matrix.getTranslation();
		if (coordinates) {
			// If the item suppports x- and y- coordinates, we're taking out the
			// translation part of the matrix and move it to x, y attributes, to
			// produce more readable markup, and not have to use center points
			// in rotate(). To do so, SVG requries us to inverse transform the
			// translation point by the matrix itself, since they are provided
			// in local coordinates.
			matrix = matrix.shiftless();
			var point = matrix._inverseTransform(trans);
			attrs[center ? 'cx' : 'x'] = point.x;
			attrs[center ? 'cy' : 'y'] = point.y;
			trans = null;
		}
		if (!matrix.isIdentity()) {
			// See if we can decompose the matrix and can formulate it as a
			// simple translate/scale/rotate command sequence.
			var decomposed = matrix.decompose();
			if (decomposed && !decomposed.shearing) {
				var parts = [],
					angle = decomposed.rotation,
					scale = decomposed.scaling;
				if (trans && !trans.isZero())
					parts.push('translate(' + formatter.point(trans) + ')');
				if (angle)
					parts.push('rotate(' + formatter.number(angle) + ')');
				if (!Numerical.isZero(scale.x - 1)
						|| !Numerical.isZero(scale.y - 1))
					parts.push('scale(' + formatter.point(scale) +')');
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
		var node = createElement('g', attrs);
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			var childNode = exportSVG(child, options);
			if (childNode) {
				if (child.isClipMask()) {
					var clip = createElement('clipPath');
					clip.appendChild(childNode);
					setDefinition(child, clip, 'clip');
					setAttributes(node, {
						'clip-path': 'url(#' + clip.id + ')'
					});
				} else {
					node.appendChild(childNode);
				}
			}
		}
		return node;
	}

	function exportRaster(item) {
		var attrs = getTransform(item._matrix, true),
			size = item.getSize();
		// Take into account that rasters are centered:
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		attrs.width = size.width;
		attrs.height = size.height;
		attrs.href = item.toDataURL();
		return createElement('image', attrs);
	}

	function exportPath(item, options) {
		if (options.matchShapes) {
			var shape = item.toShape(false);
			if (shape)
				return exportShape(shape, options);
		}
		var segments = item._segments,
			type,
			attrs = getTransform(item._matrix);
		if (segments.length === 0)
			return null;
		if (item.isPolygon()) {
			if (segments.length >= 3) {
				type = item._closed ? 'polygon' : 'polyline';
				var parts = [];
				for(i = 0, l = segments.length; i < l; i++)
					parts.push(formatter.point(segments[i]._point));
				attrs.points = parts.join(' ');
			} else {
				type = 'line';
				var first = segments[0]._point,
					last = segments[segments.length - 1]._point;
				attrs.set({
					x1: first.x,
					y1: first.y,
					x2: last.x,
					y2: last.y
				});
			}
		} else {
			type = 'path';
			attrs.d = item.getPathData(null, options.precision);
		}
		return createElement(type, attrs);
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
		return createElement(type, attrs);
	}

	function exportCompoundPath(item, options) {
		var attrs = getTransform(item._matrix);
		var data = item.getPathData(null, options.precision);
		if (data)
			attrs.d = data;
		return createElement('path', attrs);
	}

	function exportPlacedSymbol(item, options) {
		var attrs = getTransform(item._matrix, true),
			symbol = item.getSymbol(),
			symbolNode = getDefinition(symbol, 'symbol'),
			definition = symbol.getDefinition(),
			bounds = definition.getBounds();
		if (!symbolNode) {
			symbolNode = createElement('symbol', {
				viewBox: formatter.rectangle(bounds)
			});
			symbolNode.appendChild(exportSVG(definition, options));
			setDefinition(symbol, symbolNode, 'symbol');
		}
		attrs.href = '#' + symbolNode.id;
		attrs.x += bounds.x;
		attrs.y += bounds.y;
		attrs.width = formatter.number(bounds.width);
		attrs.height = formatter.number(bounds.height);
		return createElement('use', attrs);
	}

	function exportGradient(color) {
		// NOTE: As long as the fillTransform attribute is not implemented,
		// we need to create a separate gradient object for each gradient,
		// even when they share the same gradient defintion.
		// http://www.svgopen.org/2011/papers/20-Separating_gradients_from_geometry/
		// TODO: Implement gradient merging in SVGImport
		var gradientNode = getDefinition(color, 'color');
		if (!gradientNode) {
			var gradient = color.getGradient(),
				radial = gradient._radial,
				origin = color.getOrigin().transform(),
				destination = color.getDestination().transform(),
				attrs;
			if (radial) {
				attrs = {
					cx: origin.x,
					cy: origin.y,
					r: origin.getDistance(destination)
				};
				var highlight = color.getHighlight();
				if (highlight) {
					highlight = highlight.transform();
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
			gradientNode = createElement(
					(radial ? 'radial' : 'linear') + 'Gradient', attrs);
			var stops = gradient._stops;
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i],
					stopColor = stop._color,
					alpha = stopColor.getAlpha();
				attrs = {
					offset: stop._rampPoint,
					'stop-color': stopColor.toCSS(true)
				};
				// See applyStyle for an explanation of why there are separated
				// opacity / color attributes.
				if (alpha < 1)
					attrs['stop-opacity'] = alpha;
				gradientNode.appendChild(createElement('stop', attrs));
			}
			setDefinition(color, gradientNode, 'color');
		}
		return 'url(#' + gradientNode.id + ')';
	}

	function exportText(item) {
		var node = createElement('text', getTransform(item._matrix, true));
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
		PlacedSymbol: exportPlacedSymbol,
		PointText: exportText
	};

	function applyStyle(item, node) {
		var attrs = {},
			parent = item.getParent();

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SVGStyles, function(entry) {
			// Get a given style only if it differs from the value on the parent
			// (A layer or group which can have style values in SVG).
			var get = entry.get,
				type = entry.type,
				value = item[get]();
			if (entry.exportFilter
					? entry.exportFilter(item, value)
					: !parent || !Base.equals(parent[get](), value)) {
				if (type === 'color' && value != null) {
					// Support for css-style rgba() values is not in SVG 1.1, so
					// separate the alpha value of colors with alpha into the
					// separate fill- / stroke-opacity attribute:
					var alpha = value.getAlpha();
					if (alpha < 1)
						attrs[entry.attribute + '-opacity'] = alpha;
				}
				attrs[entry.attribute] = value == null
					? 'none'
					: type === 'number'
						? formatter.number(value)
						: type === 'color'
							? value.gradient
								? exportGradient(value, item)
								// true for noAlpha, see above
								: value.toCSS(true)
							: type === 'array'
								? value.join(',')
								: type === 'lookup'
									? entry.toSVG[value]
									: value;
			}
		});

		if (attrs.opacity === 1)
			delete attrs.opacity;

		if (!item._visible)
			attrs.visibility = 'hidden';

		return setAttributes(node, attrs);
	}

	var definitions;
	function getDefinition(item, type) {
		if (!definitions)
			definitions = { ids: {}, svgs: {} };
		return item && definitions.svgs[type + '-' + item._id];
	}

	function setDefinition(item, node, type) {
		// Make sure the definitions lookup is created before we use it.
		// This is required by 'clip', where getDefinition() is not called.
		if (!definitions)
			getDefinition();
		// Have different id ranges per type
		var id = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
		// Give the svg node an id, and link to it from the item id.
		node.id = type + '-' + id;
		definitions.svgs[type + '-' + item._id] = node;
	}

	function exportDefinitions(node, options) {
		var svg = node,
			defs = null;
		if (definitions) {
			// We can only use svg nodes as defintion containers. Have the loop
			// produce one if it's a single item of another type (when calling
			// #exportSVG() on an item rather than a whole project)
			// jsdom in Node.js uses uppercase values for nodeName...
			svg = node.nodeName.toLowerCase() === 'svg' && node;
			for (var i in definitions.svgs) {
				// This code is inside the loop so we only create a container if
				// we actually have svgs.
				if (!defs) {
					if (!svg) {
						svg = createElement('svg');
						svg.appendChild(node);
					}
					defs = svg.insertBefore(createElement('defs'),
							svg.firstChild);
				}
				defs.appendChild(definitions.svgs[i]);
			}
			// Clear definitions at the end of export
			definitions = null;
		}
		return options.asString
				? new XMLSerializer().serializeToString(svg)
				: svg;
	}

	function exportSVG(item, options) {
		var exporter = exporters[item._class],
			node = exporter && exporter(item, options);
		if (node) {
			// Support onExportItem callback, to provide mechanism to handle
			// special attributes (e.g. inkscape:transform-center)
			var onExport = options.onExport;
			if (onExport)
				node = onExport(item, node, options) || node;
			var data = JSON.stringify(item._data);
			if (data && data  !== '{}')
				node.setAttribute('data-paper-data', data);
		}
		return node && applyStyle(item, node);
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
			return exportDefinitions(exportSVG(this, options), options);
		}
	});

	Project.inject({
		exportSVG: function(options) {
			options = setOptions(options);
			var layers = this.layers,
				view = this.getView(),
				size = view.getViewSize(),
				node = createElement('svg', {
					x: 0,
					y: 0,
					width: size.width,
					height: size.height,
					version: '1.1',
					xmlns: 'http://www.w3.org/2000/svg',
					'xmlns:xlink': 'http://www.w3.org/1999/xlink'
				}),
				parent = node,
				matrix = view._matrix;
			// If the view has a transformation, wrap all layers in a group with
			// that transformation applied to.
			if (!matrix.isIdentity())
				parent = node.appendChild(
						createElement('g', getTransform(matrix)));
			for (var i = 0, l = layers.length; i < l; i++)
				parent.appendChild(exportSVG(layers[i], options));
			return exportDefinitions(node, options);
		}
	});
};
