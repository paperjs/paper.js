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

	function exportGroup(group) {
		var svg = createElement('g'),
			children = group._children;
		for (var i = 0, l = children.length; i < l; i++)
			svg.appendChild(SvgExporter.exportItem(children[i]));
		// Override default SVG style on groups, then apply style.
		setAttributes(svg, {
			fill: 'none'
		});
		applyStyle(group, svg);
		return svg;
	}

	function getDistance(segments, index1, index2) {
		return segments[index1]._point.getDistance(segments[index2]._point);
	}

	function exportItem(path) {
		var svg;
		//Getting all of the segments(a point, a HandleIn and a HandleOut) in the path
		var segments;
		var type;
		//finding the type of path to export
		if (path.content) {
			type = 'text';
		} else {
			//Values are only defined if the path is not text because
			// text does not have these values
			segments = path.getSegments();
			type = determineType(path, segments);
		}

		//switch statement that determines what type of SVG element to add to the SVG Object
		switch (type) {
		case 'rect':
			var width = getDistance(segments, 0, 3),
				height = getDistance(segments, 0, 1),
				point = path.getBounds().getTopLeft();
			svg = createElement('rect', {
				x: point._x,
				y: point._y,
				width: width,
				height: height
			});
			break;
		case 'roundrect':
			//d variables and point are used to determine the rounded corners for the rounded rectangle
			var dx1 = getDistance(segments, 1, 6);
			var dx2 = getDistance(segments, 0, 7);
			var dx3 = (dx1 - dx2) / 2;
			var dy1 = getDistance(segments, 0, 3);
			var dy2 = getDistance(segments, 1, 2);
			var dy3 = (dy1 - dy2) / 2;
			var point = new Point((segments[3]._point._x - dx3), (segments[2]._point._y - dy3)); 
			var width = Math.round(dx1);
			var height = Math.round(dy1);
			var rx = segments[3]._point._x - point.x;
			var ry = segments[2]._point._y - point.y;
			svg = createElement('rect', {
				x: path.bounds.topLeft._x,
				y: path.bounds.topLeft._y,
				rx: rx,
				ry: ry,
				width: width,
				height: height
			});
			break;
		case'line':
			var first = segments[0]._point,
				last = segments[segments.length - 1]._point;
			svg = createElement('line', {
				x1: first._x,
				y1: first._y,
				x2: last._x,
				y2: last._y
			});
			break;
		case 'circle':
			var radius = getDistance(segments, 0, 2) / 2,
				center = path.getPosition();
			svg = createElement('circle', {
				cx: center._x,
				cy: center._y,
				r: radius
			});
			break;
		case 'ellipse':
			var radiusX = getDistance(segments, 2, 0) / 2,
				radiusY = getDistance(segments, 3, 1) / 2,
				center = path.getPosition();
			svg = createElement('ellipse', {
				cx: center._x,
				cy: center._y,
				rx: radiusX,
				ry: radiusY
			});
			break;
		case 'polyline':
		case 'polygon':
			var parts = [];
			for(i = 0; i < segments.length; i++) {
				var point = segments[i]._point;
				parts.push(point._x + ',' + point._y);
			}
			svg = createElement(type, {
				points: parts.join(' ')
			});
			break;
		case 'text':
			var point = path.getPoint(),
				attrs = {
					x: point._x,
					y: point._y
				},
				style = path.characterStyle;
			if (style._font != null)
				attrs['font-family'] = style._font;
			if (style._fontSize != null)
				attrs['font-size'] = style._fontSize;
			svg = createElement('text', attrs);
			svg.textContent = path.getContent();
			break;
		default:
			svg = pathSetup(path, segments);
			break;
		}
		//If the object is a circle, ellipse, rectangle, or rounded rectangle, it will find the angle 
		//found by the determineIfTransformed method and make a path that accommodates for the transformed object
		if (type != 'text' && type != undefined && type != 'polygon' &&  type != 'polyline' && type != 'line') {
			//TODO: Need to implement exported transforms for circle, ellipse, and rectangles instead of 
			//making them paths
			var angle = determineIfTransformed(path, segments, type) + 90;
			if (angle != 0) {
				if (type == 'rect' || type == 'roundrect') {
					svg = pathSetup(path, segments);
				} else {
					svg = pathSetup(path, segments);
				}
			} 
		}
		if (type == 'text') {
			svg.setAttribute('transform','rotate(' + path.matrix.getRotation() + ',' + path.getPoint()._x + ',' +path.getPoint()._y +')');
		}
		applyStyle(path, svg);
		return svg;
	}
	var exporters = {
		group: exportGroup,
		layer: exportGroup,
		path: exportItem,
		pointtext: exportItem
		// TODO:
		// raster: 
		// placedsymbol:
		// compoundpath:
	};

	// Determines whether the object has been transformed or not through finding the angle
	function determineIfTransformed(path, segments, type) {
		var centerPoint = path.getPosition();
		var topMidPath = centerPoint;
		switch (type) {
		case 'rect':
			topMidPath = segments[1]._point.add(segments[2]._point).divide(2);
			break;
		case 'circle':
		case 'ellipse':
			topMidPath = segments[1]._point;
			break;
		case 'roundrect':
			topMidPath = segments[3]._point.add(segments[4]._point).divide(2);
			break;	
		}
		return topMidPath.subtract(centerPoint).getAngle();
	}
	
	function pathSetup(path, segments) {
		var svgPath = createElement('path');
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
		svgPath.setAttribute('d', parts.join(' '));
		return svgPath;
	}

	/**
	* Checks the type SVG object created by converting from Paper.js
	*/
	function determineType(path, segments) {
		var type;
		var dPoint12;
		var dPoint34;
		// See if actually have any curves in the path. Differentiate
		// between straight objects (line, polyline, rect, and  polygon) and
		// objects with curves(circle, ellipse, roundedRectangle).
		if (path.isPolygon()) {
			if (segments.length == 4) {
				// If the distance between (point0 and point1) and (point2 and
				// point3) are equal, then it is a rectangle
				dPoint12 = Math.round(getDistance(segments, 0, 1));
				dPoint34 = Math.round(getDistance(segments, 3, 2));
				if (dPoint12 == dPoint34) {
					type = 'rect';
				}
			} else if (segments.length >= 3) {
				//If it is an object with more than 3 segments and the path is closed, it is a polygon
				if (path.getClosed()) {
					type = 'polygon';
				} else {
					type = 'polyline';
				}
			} else {
				//if all of the handle values are == 0 and there are only 2 segments, it is a line
				type = 'line';
			}	
		} else {
			if (segments.length == 8) {
				// If the distance between (point0 and point3) and (point7 and 
				// point4) are equal then it is a roundedRectangle
				dPoint12 = Math.round(getDistance(segments, 0, 3));
				dPoint34 = Math.round(getDistance(segments, 7, 4));
				if (dPoint12 == dPoint34) {
					type = 'roundrect';
				}
			} else if (segments.length == 4) {
				// Check if the values of the point have values similar to 
				// circles and ellipses.
				var checkPointValues = true;
				for (i = 0; i < segments.length && checkPointValues; i++) {
					if (segments[i]._handleIn._x != 0 || segments[i]._handleIn._y != 0
							&& Math.round(Math.abs(segments[i]._handleIn._x)) === Math.round(Math.abs(segments[i]._handleOut._x))
							&& Math.round(Math.abs(segments[i]._handleIn._y)) === Math.round(Math.abs(segments[i]._handleOut._y))) {
						checkPointValues = true;
					} else {
						checkPointValues = false;
					}	
				}	
				if (checkPointValues) {
					// If the distance between (point0 and point2) and (point1
					// and point3) are equal, then it is a circle
					var d1 = Math.round(getDistance(segments, 0, 2));
					var d2 = Math.round(getDistance(segments, 1, 3));
					if (d1 == d2) {
						type = 'circle';
					} else {
						type = 'ellipse';
					}
				}
			} 
		}
		return type;
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

		setAttributes(svg, attrs);
	}

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
			var svg = exporter && exporter(item);
			return svg;
		}
	};
};
