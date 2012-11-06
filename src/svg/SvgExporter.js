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

	function createElement(tag) {
		return document.createElementNS('http://www.w3.org/2000/svg', tag);
	}

	function setAttributes(svg, attrs) {
		for (var key in attrs)
			svg.setAttribute(key, attrs[key]);
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
			var width = getDistance(segments, 0, 3);
			var height = getDistance(segments, 0, 1);
			svg = createElement('rect');
			svg.setAttribute('x', path.bounds.topLeft._x);
			svg.setAttribute('y', path.bounds.topLeft._y);
			svg.setAttribute('width', width);
			svg.setAttribute('height', height);
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
			svg = createElement('rect');
			svg.setAttribute('x', path.bounds.topLeft._x);
			svg.setAttribute('y', path.bounds.topLeft._y);
			svg.setAttribute('rx', rx);
			svg.setAttribute('ry', ry);
			svg.setAttribute('width', width);
			svg.setAttribute('height', height);
			break;
		case'line':
			svg = createElement('line');
			svg.setAttribute('x1', segments[0]._point._x);
			svg.setAttribute('y1', segments[0]._point._y);
			svg.setAttribute('x2', segments[segments.length - 1]._point._x);
			svg.setAttribute('y2', segments[segments.length - 1]._point._y);
			break;
		case 'circle':
			svg = createElement('circle');
			var radius = (getDistance(segments, 0, 2)) /2;
			svg.setAttribute('cx', path.bounds.center.x);
			svg.setAttribute('cy', path.bounds.center.y);
			svg.setAttribute('r', radius);
			break;
		case 'ellipse':
			svg = createElement('ellipse');
			var radiusX = getDistance(segments, 2, 0) / 2;
			var radiusY = getDistance(segments, 3, 1) /2;
			svg.setAttribute('cx', path.bounds.center.x);
			svg.setAttribute('cy', path.bounds.center.y);
			svg.setAttribute('rx', radiusX);
			svg.setAttribute('ry', radiusY);
			break;
		case 'polyline':
		case 'polygon':
			svg = createElement(type);
			var parts = [];
			for(i = 0; i < segments.length; i++) {
				parts.push(segments[i]._point._x + ',' + segments[i]._point._y);
			}
			svg.setAttribute('points', parts.join(' '));
			break;
		case 'text':
			svg = createElement('text');
			svg.setAttribute('x', path.getPoint()._x);
			svg.setAttribute('y', path.getPoint()._y);
			if (path.characterStyle.font != undefined) {
				svg.setAttribute('font-family', path.characterStyle.font);
			}
			if (path.characterStyle.fontSize != undefined) {
				svg.setAttribute('font-size',path.characterStyle.fontSize);
			}
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
		var topMidBoundx = (path.bounds.topRight._x + path.bounds.topLeft._x) / 2;
		var topMidBoundy = (path.bounds.topRight._y + path.bounds.topLeft._y) / 2;
		var topMidBound = new Point(topMidBoundx, topMidBoundy);
		var centerPoint = path.getPosition();
		var topMidPathx;
		var topMidPathy;
		var topMidPath;
		switch (type) {
		case 'rect':
			topMidPathx = (segments[1]._point._x + segments[2]._point._x) / 2;
			topMidPathy = (segments[1]._point._y + segments[2]._point._y) / 2;
			topMidPath = new Point(topMidPathx, topMidPathy);
			break;
		case 'ellipse':
			topMidPath = new Point(segments[1]._point._x, segments[1]._point._y);
			break;
		case 'circle':
			topMidPath = new Point(segments[1]._point._x, segments[1]._point._y);
			break;
		case 'roundrect':
			topMidPathx = (segments[3]._point._x + segments[4]._point._x) / 2;
			topMidPathy = (segments[3]._point._y + segments[4]._point._y) / 2;
			topMidPath = new Point(topMidPathx, topMidPathy);
			break;	
		default:
			//Nothing happens here
			break;
		}
		var deltaY = topMidPath.y - centerPoint._y;
		var deltaX = topMidPath.x - centerPoint._x;
		var angleInDegrees = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
		return angleInDegrees;
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
