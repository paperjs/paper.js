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

	function setAttributes(svg, attrs) {
		for (var key in attrs)
			svg.setAttribute(key, attrs[key]);
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
			attrs;
		// If the object is a circle, ellipse, rectangle, or rounded rectangle,
		// see if they are placed at an angle.
		var angle = 0,
			topCenter = type === 'rect'
				? segments[1]._point.add(segments[2]._point).divide(2)
				: type === 'roundrect'
				? segments[3]._point.add(segments[4]._point).divide(2)
				: type === 'circle' || type === 'ellipse'
				? segments[1]._point
				: null;
		if (topCenter) {
			angle = topCenter.subtract(path.getPosition()).getAngle() + 90;
			if (Numerical.isZero(angle))
				angle = 0;
		}
		switch (type) {
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
		case 'polyline':
		case 'polygon':
			var parts = [];
			for(i = 0; i < segments.length; i++) {
				var point = segments[i]._point;
				parts.push(point._x + ',' + point._y);
			}
			attrs = {
				points: parts.join(' ')
			};
			break;
		}
		if (attrs) {
			var svg = createElement(type, attrs),
				center = path.getPosition();
			if (angle) {
				svg.setAttribute('transform', 'rotate(' + angle + ','
							+ center._x + ',' + center._y + ')');
			}
			return svg;
		}
		return pathSetup(path, segments);
	}

	function pathSetup(path, segments) {
		var svg = createElement('path');
		var parts = [];
		parts.push('M' + segments[0]._point._x + ',' + segments[0]._point._y);
		function drawCurve(seg1, seg2, skipLine) {
			var point1 = seg1._point,
				point2 = seg2._point,
				x1 = point1._x,
				y1 = point1._y,
				x2 = point2._x,
				y2 = point2._y,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn;
			if (handle1.isZero() && handle2.isZero()) {
				if (!skipLine) {
					// L is lineto, moving to a point with drawing
					parts.push('L' + x2 + ',' + y2 + ' ');
				}
			} else {
				// c is curveto, relative: handle1, handle2 + end - start, end - start
				x2 -= x1;
				y2 -= y1;
				parts.push(
					'c' + handle1._x  + ',' + handle1._y,
					(x2 + handle2._x) + ',' + (y2 + handle2._y),
					x2 + ',' + y2
				);
			}
		}
		for (i = 0; i < segments.length - 1; i++)
			drawCurve(segments[i], segments[i + 1], false);
		// We only need to draw the connecting curve if the path is cosed and
		// has a stroke color, or if it's filled.
		if (path._closed && path._style._strokeColor || path._style._fillColor)
			drawCurve(segments[segments.length - 1], segments[0], true);
		if (path._closed)
			parts.push('z');
		svg.setAttribute('d', parts.join(' '));
		return svg;
	}

	/**
	* Checks the type SVG object created by converting from Paper.js
	*/
	function determineType(path, segments) {
		// See if actually have any curves in the path. Differentiate
		// between straight objects (line, polyline, rect, and  polygon) and
		// objects with curves(circle, ellipse, roundedRectangle).
		if (path.isPolygon()) {
			// If the distance between (point0 and point1) and (point2 and
			// point3) are equal, then it is a rectangle
			return segments.length == 4 && Numerical.isZero(
					getDistance(segments, 0, 1) - getDistance(segments, 3, 2))
					? 'rect'
					: segments.length >= 3
						? path._closed ? 'polygon' : 'polyline'
						: 'line';
		} else {
			if (segments.length == 8) {
				// If the distance between (point0 and point3) and (point7 and 
				// point4) are equal then it is a roundedRectangle
				if (Numerical.isZero(
					getDistance(segments, 0, 3) - getDistance(segments, 7, 5)))
					return 'roundrect';
			} else if (segments.length == 4) {
				// Check if the values of the point have values similar to 
				// circles and ellipses.
				var checkPointValues = true;
				for (var i = 0; i < segments.length && checkPointValues; i++) {
					var handleIn = segments[i]._handleIn,
						handleOut = segments[i]._handleOut;
					checkPointValues = !handleIn.isZero()
							&& Numerical.isZero(Math.abs(handleIn._x) - Math.abs(handleOut._x))
							&& Numerical.isZero(Math.abs(handleIn._y) - Math.abs(handleOut._y));
				}	
				if (checkPointValues) {
					// If the distance between (point0 and point2) and (point1
					// and point3) are equal, then it is a circle
					return Numerical.isZero(getDistance(segments, 0, 2)
							- getDistance(segments, 1, 3))
							? 'circle'
							: 'ellipse';
				}
			} 
		}
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
