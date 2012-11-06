/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 * 
 * The base for this code was donated by Stetson-Team-Alpha.
 */

/**
 * @name SvgExporter
 *
 * @class The SvgExporter object holds all the functionality to convert a
 * Paper.js DOM to a SVG DOM.
 */

var SvgExporter = this.SvgExporter = new function() {

	// Shortcut to Base.formatNumber
	var formatNumber = Base.formatNumber;

	function formatPoint(x, y) {
		if (arguments.length == 1) {
			y = x._y;
			x = x._x;
		}
		return formatNumber(x) + ',' + formatNumber(y);
	}

	function setAttributes(svg, attrs) {
		for (var key in attrs) {
			var val = attrs[key];
			if (typeof val === 'number')
				val = formatNumber(val);
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

	function exportGroup(group) {
		var svg = createElement('g'),
			children = group._children;
		for (var i = 0, l = children.length; i < l; i++)
			svg.appendChild(SvgExporter.exportItem(children[i]));
		// Override default SVG style on groups, then apply style.
		return setAttributes(svg, {
			fill: 'none'
		});
	}

	function exportText(item) {
		var point = item.getPoint(),
			style = item._style,
			attrs = {
				x: point._x,
				y: point._y
			};
		if (style._font != null)
			attrs['font-family'] = style._font;
		if (style._fontSize != null)
			attrs['font-size'] = style._fontSize;
		var svg = createElement('text', attrs);
		svg.textContent = item.getContent();
		svg.setAttribute('transform','rotate(' + item.matrix.getRotation() + ',' + item.getPoint()._x + ',' + item.getPoint()._y +')');
		return svg;
	}

	function exportPath(path) {
		var segments = path._segments,
			type = determineType(path, segments),
			angle = determineAngle(path, segments, type),
			attrs;
		switch (type) {
		case 'path':
			attrs = {
				d: drawPath(path, segments)
			};
			break;
		case 'polyline':
		case 'polygon':
			var parts = [];
			for(i = 0; i < segments.length; i++) {
				var point = segments[i]._point;
				parts.push(formatPoint(point));
			}
			attrs = {
				points: parts.join(' ')
			};
			break;
		case 'rect':
			var width = getDistance(segments, 0, 3),
				height = getDistance(segments, 0, 1),
				// Counter-compensate the rotation angle
				point = segments[1]._point.rotate(-angle, path.getPosition());
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height
			};
			break;
		case 'roundrect':
			// d-variables and point are used to determine the rounded corners
			// for the rounded rectangle
			var width = getDistance(segments, 1, 6),
				height = getDistance(segments, 0, 3),
				point = path.getBounds().getTopLeft(),
				dx2 = getDistance(segments, 0, 7),
				dy2 = getDistance(segments, 1, 2),
				dx3 = (width - dx2) / 2,
				dy3 = (height - dy2) / 2,
				point = new Point((segments[3]._point._x - dx3), (segments[2]._point._y - dy3)),
				rx = segments[3]._point._x - point.x,
				ry = segments[2]._point._y - point.y;
			attrs = {
				x: point._x,
				y: point._y,
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
			var radius = getDistance(segments, 0, 2) / 2,
				center = path.getPosition();
			attrs = {
				cx: center._x,
				cy: center._y,
				r: radius
			};
			break;
		case 'ellipse':
			var rx = getDistance(segments, 2, 0) / 2,
				ry = getDistance(segments, 3, 1) / 2,
				center = path.getPosition();
			attrs = {
				cx: center._x,
				cy: center._y,
				rx: rx,
				ry: ry
			};
			break;
		}
		var svg = createElement(type, attrs);
		if (angle) {
			var center = path.getPosition();
			svg.setAttribute('transform', 'rotate(' + formatNumber(angle) + ','
						+ formatPoint(center) + ')');
		}
		return svg;
	}

	function drawPath(path, segments) {
		var parts = [],
			style = path._style;
		parts.push('M' + formatPoint(segments[0]._point));
		for (i = 0; i < segments.length - 1; i++)
			drawCurve(parts, segments[i], segments[i + 1], false);
		// We only need to draw the connecting curve if it is not a line, and if
		// the path is cosed and has a stroke color, or if it is filled.
		if (path._closed && style._strokeColor || style._fillColor)
			drawCurve(parts, segments[segments.length - 1], segments[0], true);
		if (path._closed)
			parts.push('z');
		return parts.join(' ');
	}

	function drawCurve(parts, seg1, seg2, skipLine) {
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
			parts.push('c' + formatNumber(handle1),
				formatNumber(end.add(handle2)),
				formatNumber(end));
		}
	}

	function determineAngle(path, segments, type) {
		// If the object is a circle, ellipse, rectangle, or rounded rectangle,
		// see if they are placed at an angle.
		var topCenter = type === 'rect'
				? segments[1]._point.add(segments[2]._point).divide(2)
				: type === 'roundrect'
				? segments[3]._point.add(segments[4]._point).divide(2)
				: type === 'circle' || type === 'ellipse'
				? segments[1]._point
				: null;
		if (topCenter) {
			var angle = topCenter.subtract(path.getPosition()).getAngle() + 90;
			return Numerical.isZero(angle) ? 0 : angle;
		}
		return 0;
	}

	function determineType(path, segments) {

		function isOrthogonal(i) {
			var segment = segments[i],
				point = segment.getPoint();
			return Numerical.isZero(90 - Math.abs(
					segment.getNext().getPoint().subtract(point).getAngle(
					segment.getPrevious().getPoint().subtract(point))));
		}

		// Kappa, see: http://www.whizkidtech.redprince.net/bezier/circle/kappa/
		var kappa = 4 * (Math.sqrt(2) - 1) / 3;

		function isArc(i) {
			var segment = segments[i],
				next = segment.getNext(),
				handle1 = segment.getHandleOut(),
				handle2 = next.getHandleIn();
			if (Numerical.isZero(90 - Math.abs(handle1.getAngle(handle2)))) {
				var from = segment.getPoint(),
					to = next.getPoint(),
					corner = new Line(from, handle1).intersect(new Line(to, handle2));
				return Numerical.isZero(handle1.length / corner.subtract(from).length - kappa)
						&& Numerical.isZero(handle2.length / corner.subtract(to).length - kappa);
			}
		}

		// See if actually have any curves in the path. Differentiate
		// between straight objects (line, polyline, rect, and  polygon) and
		// objects with curves(circle, ellipse, roundedRectangle).
		if (path.isPolygon()) {
			return  segments.length === 4 && path._closed && isOrthogonal(0)
					&& isOrthogonal(1) && isOrthogonal(2) && isOrthogonal(3)
					? 'rect'
					: segments.length >= 3
						? path._closed ? 'polygon' : 'polyline'
						: 'line';
		} else if (path._closed) {
			if (segments.length === 8) {
				// If the distance between (point0 and point3) and (point7 and 
				// point4) are equal then it is a roundedRectangle
				if (Numerical.isZero(
					getDistance(segments, 0, 3) - getDistance(segments, 7, 5)))
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
			if (value != null && (!parentStyle
					|| !Base.equals(parentStyle[entry.get](), value))) {
				attrs[entry.attribute] = entry.type === 'color'
					? value.toCssString()
					: entry.type === 'array'
						? value.join(',')
						: entry.type === 'number'
							? formatNumber(value)
							: value;
			}
		});

		if (item._opacity != null)
			attrs.opacity = item._opacity;

		if (item._visibility != null)
			attrs._visibility = item._visibility ? 'visible' : 'hidden';

		return setAttributes(svg, attrs);
	}

	var exporters = {
		group: exportGroup,
		layer: exportGroup,
		path: exportPath,
		pointtext: exportText
		// TODO:
		// raster: 
		// placedsymbol:
		// compoundpath:
	};

	return /** @Lends SvgExporter */{
		/**
		 * Takes the selected Paper.js project and parses all of its layers and
		 * groups to be placed into SVG groups, converting the project into one
		 * SVG group.
		 *
		 * @function
		 * @param {Project} project a Paper.js project
		 * @return {SVGSVGElement} the imported project converted to an SVG project
		 */
		 // TODO: Implement symbols and Gradients
		exportProject: function(project) {
			var svg = createElement('svg'),
				layers = project.layers;
			for (var i = 0, l = layers.length; i < l; i++) {
				svg.appendChild(this.exportItem(layers[i]));
			}
			return svg;
		},

		exportItem: function(item) {
			var exporter = exporters[item._type];
			// TODO: exporter == null: Not supported yet.
			var svg = exporter && exporter(item, item._type);
			return svg && applyStyle(item, svg);
		}
	};
};
