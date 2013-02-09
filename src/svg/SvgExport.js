/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * A function scope holding all the functionality needed to convert a
 * Paper.js DOM to a Paper.js DOM.
 */
new function() {

	// Shortcut to Base.formatFloat
	var formatFloat = Base.formatFloat;

	function formatPoint(point) {
		return formatFloat(point.x) + ',' + formatFloat(point.y);
	}

	function setAttributes(svg, attrs) {
		for (var key in attrs) {
			var val = attrs[key];
			if (typeof val === 'number')
				val = formatFloat(val);
			svg.setAttribute(key, val);
		}
		return svg;
	}

	function createElement(tag, attrs) {
		return setAttributes(
			document.createElementNS('http://www.w3.org/2000/svg', tag), attrs);
	}

	function getDistance(segments, index1, index2) {
		return segments[index1]._point.getDistance(segments[index2]._point);
	}

	function getTransform(item, coordinates) {
		var matrix = item._matrix,
			trans = matrix.getTranslation(),
			attrs = {};
		if (coordinates) {
			// If the item suppports x- and y- coordinates, we're taking out the
			// translation part of the matrix and move it to x, y attributes, to
			// produce more readable markup, and not have to use center points
			// in rotate(). To do so, SVG requries us to inverse transform the
			// translation point by the matrix itself, since they are provided
			// in local coordinates.
			matrix = matrix.shiftless();
			var point = matrix._inverseTransform(trans);
			attrs.x = point.x;
			attrs.y = point.y;
			trans = null;
		}
		if (matrix.isIdentity())
			return attrs;
		// See if we can decompose the matrix and can formulate it as a simple
		// translate/scale/rotate command sequence.
		var decomposed = matrix.decompose();
		if (decomposed && !decomposed.shearing) {
			var parts = [],
				angle = decomposed.rotation,
				scale = decomposed.scaling;
			if (trans && !trans.isZero())
				parts.push('translate(' + formatPoint(trans) + ')');
			if (!Numerical.isZero(scale.x - 1) || !Numerical.isZero(scale.y - 1))
				parts.push('scale(' + formatPoint(scale) +')');
			if (angle)
				parts.push('rotate(' + formatFloat(angle) + ')');
			attrs.transform = parts.join(' ');
		} else {
			attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
		}
		return attrs;
	}

	function getPath(path) {
		var segments = path._segments,
			style = path._style,
			parts = [];

		function addCurve(seg1, seg2, skipLine) {
			var point1 = seg1._point,
				point2 = seg2._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn;
			if (handle1.isZero() && handle2.isZero()) {
				if (!skipLine) {
					// L = lineto: moving to a point with drawing
					parts.push('L' + formatPoint(point2));
				}
			} else {
				// c = relative curveto: handle1, handle2 + end - start, end - start
				var end = point2.subtract(point1);
				parts.push('c' + formatPoint(handle1),
					formatPoint(end.add(handle2)),
					formatPoint(end));
			}
		}

		parts.push('M' + formatPoint(segments[0]._point));
		for (i = 0, l = segments.length  - 1; i < l; i++)
			addCurve(segments[i], segments[i + 1], false);
		// We only need to draw the connecting curve if it is not a line, and if
		// the path is cosed and has a stroke color, or if it is filled.
		if (path._closed && style._strokeColor || style._fillColor)
			addCurve(segments[segments.length - 1], segments[0], true);
		if (path._closed)
			parts.push('z');
		return parts.join(' ');
	}

	function determineAngle(path, segments, type, center) {
		// If the object is a circle, ellipse, rectangle, or rounded rectangle,
		// see if it is placed at an angle, by figuring out its topCenter point
		// and measuring the angle to its center.
		var topCenter = type === 'rect'
				? segments[1]._point.add(segments[2]._point).divide(2)
				: type === 'roundrect'
				? segments[3]._point.add(segments[4]._point).divide(2)
				: type === 'circle' || type === 'ellipse'
				? segments[1]._point
				: null;
		var angle = topCenter && topCenter.subtract(center).getAngle() + 90;
		return Numerical.isZero(angle || 0) ? 0 : angle;
	}

	function determineType(path, segments) {
		// Returns true if the the two segment indices are the beggining of two
		// lines and if the wto lines are parallel.
		function isColinear(i, j) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				seg3 = segments[j],
				seg4 = seg3.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg3._handleOut.isZero() && seg4._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isColinear(
						seg4._point.subtract(seg3._point));
		}

		// Kappa, see: http://www.whizkidtech.redprince.net/bezier/circle/kappa/
		var kappa = 4 * (Math.sqrt(2) - 1) / 3;

		// Returns true if the segment at the given index is the beginning of
		// a orthogonal arc segment. The code is looking at the length of the
		// handles and their relation to the distance to the imaginary corner
		// point. If the relation is kappa (see above), then it's an arc.
		function isArc(i) {
			var segment = segments[i],
				next = segment.getNext(),
				handle1 = segment._handleOut,
				handle2 = next._handleIn;
			if (handle1.isOrthogonal(handle2)) {
				var from = segment._point,
					to = next._point,
					// Find hte corner point by intersecting the lines described
					// by both handles:
					corner = new Line(from, handle1).intersect(
							new Line(to, handle2));
				return corner && Numerical.isZero(handle1.getLength() /
						corner.subtract(from).getLength() - kappa)
					&& Numerical.isZero(handle2.getLength() /
						corner.subtract(to).getLength() - kappa);
			}
		}

		// See if actually have any curves in the path. Differentiate
		// between straight objects (line, polyline, rect, and  polygon) and
		// objects with curves(circle, ellipse, roundedRectangle).
		if (path.isPolygon()) {
			return  segments.length === 4 && path._closed
					&& isColinear(0, 2) && isColinear(1, 3)
					? 'rect'
					: segments.length === 0
						? 'empty'
						: segments.length >= 3
							? path._closed ? 'polygon' : 'polyline'
							: 'line';
		} else if (path._closed) {
			if (segments.length === 8
					&& isArc(0) && isArc(2) && isArc(4) && isArc(6)
					&& isColinear(1, 5) && isColinear(3, 7)) {
				return 'roundrect';
			} else if (segments.length === 4
					&& isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
				// If the distance between (point0 and point2) and (point1
				// and point3) are equal, then it is a circle
				return Numerical.isZero(getDistance(segments, 0, 2)
						- getDistance(segments, 1, 3))
						? 'circle'
						: 'ellipse';
			} 
		}
		return 'path';
	}

	function exportGroup(group) {
		var attrs = getTransform(group),
			children = group._children;
		// Override default SVG style on groups, then apply style.
		attrs.fill = 'none';
		var svg = createElement('g', attrs);
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i].exportSvg();
			if (child)
				svg.appendChild(child);
		}
		return svg;
	}

	function exportRaster(item) {
		var attrs = getTransform(item, true),
			size = item.getSize();
		attrs.width = size.width;
		attrs.height = size.height;
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		var svg = createElement('image', attrs);
		svg.setAttributeNS('http://www.w3.org/1999/xlink','href', item.toDataURL());
		return svg;
	}

	function exportText(item) {
		var attrs = getTransform(item, true),
			style = item._style;
		if (style._font != null)
			attrs['font-family'] = style._font;
		if (style._fontSize != null)
			attrs['font-size'] = style._fontSize;
		var svg = createElement('text', attrs);
		svg.textContent = item._content;
		return svg;
	}

	function exportPath(path) {
		var segments = path._segments,
			center = path.getPosition(true),
			type = determineType(path, segments),
			angle = determineAngle(path, segments, type, center),
			attrs;
		switch (type) {
		case 'empty':
			return null;
		case 'path':
			attrs = {
				d: getPath(path)
			};
			break;
		case 'polyline':
		case 'polygon':
			var parts = [];
			for(i = 0, l = segments.length; i < l; i++)
				parts.push(formatPoint(segments[i]._point));
			attrs = {
				points: parts.join(' ')
			};
			break;
		case 'rect':
			var width = getDistance(segments, 0, 3),
				height = getDistance(segments, 0, 1),
				// Counter-compensate the determined rotation angle
				point = segments[1]._point.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height
			};
			break;
		case 'roundrect':
			type = 'rect';
			// d-variables and point are used to determine the rounded corners
			// for the rounded rectangle
			var width = getDistance(segments, 1, 6),
				height = getDistance(segments, 0, 3),
				// Subtract side lengths from total width and divide by 2 to get
				// corner radius size
				rx = (width - getDistance(segments, 0, 7)) / 2,
				ry = (height - getDistance(segments, 1, 2)) / 2,
				// Calculate topLeft corner point, by using sides vectors and
				// subtracting normalized rx vector to calculate arc corner. 
				left = segments[3]._point, // top-left side point
				right = segments[4]._point, // top-right side point
				point = left.subtract(right.subtract(left).normalize(rx))
						// Counter-compensate the determined rotation angle
						.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height,
				rx: rx,
				ry: ry
			};
			break;
		case'line':
			var first = segments[0]._point,
				last = segments[segments.length - 1]._point;
			attrs = {
				x1: first._x,
				y1: first._y,
				x2: last._x,
				y2: last._y
			};
			break;
		case 'circle':
			var radius = getDistance(segments, 0, 2) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				r: radius
			};
			break;
		case 'ellipse':
			var rx = getDistance(segments, 2, 0) / 2,
				ry = getDistance(segments, 3, 1) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				rx: rx,
				ry: ry
			};
			break;
		}
		if (angle) {
			attrs.transform = 'rotate(' + formatFloat(angle) + ','
					+ formatPoint(center) + ')';
		}
		return createElement(type, attrs);
	}

	function exportCompoundPath(path) {
		var children = path._children,
			paths = [];
		for (var i = 0, l = children.length; i < l; i++)
			paths.push(getPath(children[i]));
		return createElement('path', {
			d: paths.join(' ')
		});
	}

	var exporters = {
		group: exportGroup,
		layer: exportGroup,
		raster: exportRaster,
		pointtext: exportText,
		path: exportPath,
		compoundpath: exportCompoundPath
		// TODO:
		// placedsymbol:
		// gradients
	};

	function applyStyle(item, svg) {
		var attrs = {},
			style = item._style,
			parent = item.getParent(),
			parentStyle = parent && parent._style;

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SvgStyles.properties, function(entry) {
			// Get a given style only if it differs from the value on the parent
			// (A layer or group which can have style values in SVG).
			var value = style[entry.get]();
			if (!parentStyle || !Base.equals(parentStyle[entry.get](), value)) {
				// Support for css-style rgba() values is not in SVG 1.1, so
				// separate the alpha value of colors with alpha into the
				// separate fill- / stroke-opacity attribute:
				if (entry.type === 'color' && value != null && value.getAlpha() < 1)
					attrs[entry.attribute + '-opacity'] = value.getAlpha();
				attrs[entry.attribute] = value == null
					? 'none'
					: entry.type === 'color'
						? value.toCss(true) // false for noAlpha, see above
						: entry.type === 'array'
							? value.join(',')
							: entry.type === 'number'
								? formatFloat(value)
								: value;
			}
		});

		if (item._opacity != null && item._opacity < 1)
			attrs.opacity = item._opacity;

		if (item._visibility != null && !item._visibility)
			attrs.visibility = 'hidden';

		return setAttributes(svg, attrs);
	}

	Item.inject(/** @lends Item# */{
		/**
		 * {@grouptitle SVG Conversion}
		 *
		 * Exports the item and all its child items as an SVG DOM, all contained
		 * in one top level SVG group node.
		 *
		 * @return {SVGSVGElement} the item converted to an SVG node
		 */
		exportSvg: function() {
			var exporter = exporters[this._type],
				svg = exporter && exporter(this, this._type);
			return svg && applyStyle(this, svg);
		}
	});

	Project.inject(/** @lends Project# */{
		/**
		 * {@grouptitle SVG Conversion}
		 *
		 * Exports the project and all its layers and child items as an SVG DOM,
		 * all contained in one top level SVG group node.
		 *
		 * @return {SVGSVGElement} the project converted to an SVG node
		 */
		exportSvg: function() {
			var svg = createElement('svg'),
				layers = this.layers;
			for (var i = 0, l = layers.length; i < l; i++)
				svg.appendChild(layers[i].exportSvg());
			return svg;
		}
	});
};
