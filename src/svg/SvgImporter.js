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
 * @author Stetson-Team-Alpha
 */

/**
 * @name SvgImporter
 * @class The SvgImporter object represents an object created using the SVG
 * Canvas that will be converted into a Paper.js object.
 * The SVG object is imported into Paper.js by converting it into items
 * within groups.
 *
 */
var SvgImporter = this.SvgImporter = new function() {

	// Define a couple of helper functions to easily read values from SVG
	// objects, dealing with baseVal, and item lists.
	// index is option, and if passed, causes a lookup in a list.

	function getValue(svg, key, index) {
		var base = svg[key].baseVal;
		return index !== undefined
				? index < base.numberOfItems ? base.getItem(index).value || 0 : 0
				: base.value || 0;
	}

	function getPoint(svg, x, y, index) {
		return Point.create(getValue(svg, x, index), getValue(svg, y, index));
	}

	function getSize(svg, w, h, index) {
		return Size.create(getValue(svg, w, index), getValue(svg, h, index));
	}

	// Define importer functions for various SVG node types

	function importGroup(svg) {
		var group = new Group(),
			nodes = svg.childNodes;
		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i];
			if (child.nodeType == 1) {
				var item = SvgImporter.importSvg(child);
				if (item)
					group.addChild(item);
			}
		}
		return group;
	}

	function importPoly(svg) {
		var poly = new Path(),
			points = svg.points,
			start = points.getItem(0);
		poly.moveTo(start);
		for (var i = 1, l = points.numberOfItems; i < l; i++)
			poly.lineTo(points.getItem(i));
		if (svg.nodeName.toLowerCase() == 'polygon')
			poly.closePath();
		return poly;
	}

	var importers = {
		g: importGroup,
		svg: importGroup,
		polygon: importPoly,
		polyline: importPoly,

		circle: function(svg) {
			return new Path.Circle(getPoint(svg, 'cx', 'cy'),
					getValue(svg, 'r'));
		},

		ellipse: function(svg) {
			var center = getPoint(svg, 'cx', 'cy'),
				radius = getSize(svg, 'rx', 'ry');
			return new Path.Oval(new Rectangle(center.subtract(radius),
					center.add(radius)));
		},

		rect: function(svg) {
			var point = getPoint(svg, 'x', 'y'),
				size = getSize(svg, 'width', 'height'),
				radius = getSize(svg, 'rx', 'ry');
			return new Path.RoundRectangle(new Rectangle(point, size), radius);
		},

		line: function(svg) {
			return new Path.Line(getPoint(svg, 'x1', 'y1'),
					getPoint(svg, 'x2', 'y2'));
		},

		text: function(svg) {
			var bottomLeft = getPoint(svg, 'x', 'y', 0),
				textLength = getValue(svg, 'textLength'),
				delta = getPoint(svg, 'dx', 'dy', 0);
			// Not supported by Paper.js
			// x: multiple values for x
			// y: multiple values for y
			// dx: multiple values for x
			// dy: multiple values for y
			// rotate: character rotation
			// lengthAdjust:
			var point = bottomLeft.add(delta).subtract(textLength / 2, 0);
			var text = new PointText(point);
			text.content = svg.textContent || '';
			return text;
		},

		path: function(svg) {
			var path = new Path();
			var segments = svg.pathSegList;
			var segment;
			var j;
			var relativeToPoint;
			var controlPoint;
			var prevCommand;
			var segmentTo;
			for (var i = 0, l = segments.numberOfItems; i < l; i++) {
				segment = segments.getItem(i);
				if (segment.pathSegType == SVGPathSeg.PATHSEG_UNKNOWN) {
					continue;
				}
				if (segment.pathSegType % 2 == 1 && path.segments.length > 0) {
					relativeToPoint = path.lastSegment.point;
				} else {
					relativeToPoint = new Point(0, 0);
				}
				segmentTo = new Point(segment.x, segment.y);
				segmentTo = segmentTo.add(relativeToPoint);
				switch (segment.pathSegType) {
				case SVGPathSeg.PATHSEG_CLOSEPATH:
					path.closePath();
					break;
				case SVGPathSeg.PATHSEG_MOVETO_ABS:
				case SVGPathSeg.PATHSEG_MOVETO_REL:
					path.moveTo(segmentTo);
					break;
				case SVGPathSeg.PATHSEG_LINETO_ABS:
				case SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
				case SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
				case SVGPathSeg.PATHSEG_LINETO_REL:
				case SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
				case SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
					path.lineTo(segmentTo);
					break;
				case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
				case SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL:
					path.cubicCurveTo(
						relativeToPoint.add([segment.x1, segment.y1]),
						relativeToPoint.add([segment.x2, segment.y2]),
						segmentTo
					);
					break;
				case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
				case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL:
					path.quadraticCurveTo(
						relativeToPoint.add([segment.x1, segment.y1]),
						segmentTo
					);
					break;
				case SVGPathSeg.PATHSEG_ARC_ABS:
				case SVGPathSeg.PATHSEG_ARC_REL:
					//TODO: Implement Arcs.
					//TODO: Requires changes in Paper.js's Path to do.
					//TODO: http://www.w3.org/TR/SVG/implnote.html
					break;
				case SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
				case SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_REL:
					prevCommand = segments.getItem(i - 1);
					controlPoint = new Point(prevCommand.x2, prevCommand.y2);
					controlPoint = controlPoint.subtract([prevCommand.x, prevCommand.y]);
					controlPoint = controlPoint.add(path.lastSegment.point);
					controlPoint = path.lastSegment.point.subtract(controlPoint);
					controlPoint = path.lastSegment.point.add(controlPoint);
					path.cubicCurveTo(
						controlPoint,
						relativeToPoint.add([segment.x2, segment.y2]),
						segmentTo
					);
					break;
				case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
				case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL:
					for (j = i; j >= 0; --j) {
						prevCommand = segments.getItem(j);
						if (prevCommand.pathSegType == SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS ||
							prevCommand.pathSegType == SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL
						) {
							controlPoint = new Point(prevCommand.x1, prevCommand.y1);
							controlPoint = controlPoint.subtract([prevCommand.x, prevCommand.y]);
							controlPoint = controlPoint.add(path.segments[j].point);
							break;
						}
					}
					for (j; j < i; ++j) {
						controlPoint = path.segments[j].point.subtract(controlPoint);
						controlPoint = path.segments[j].point.add(controlPoint);
					}
					path.quadraticCurveTo(controlPoint, segmentTo);
					break;
				}
			}

			return path;
		},

		symbol: function(svg) {
			var item = importGroup(svg);
			applyAttributesAndStyles(svg, item);
			// TODO: We're returning a symbol. How to handle this?
			return new Symbol(item);
		}
	};

	/**
	 * Converts various SVG styles and attributes into Paper.js styles and
	 * attributes and applies them to the passed item.
	 *
	 * @param {SVGSVGElement} svg an SVG node to read style and attributes from.
	 * @param {Item} item the item to apply the style and attributes to.
	 */
	function applyAttributesAndStyles(svg, item) {
		for (var i = 0, l = svg.style.length; i < l; i++) {
			var name = svg.style[i];
			var cssName = name.replace(/-(.)/g, function(match, p) {
				return p.toUpperCase();
			});
			applyAttributeOrStyle(svg, item, name, svg.style[cssName]);
		}
		for (var i = 0, l = svg.attributes.length; i < l; i++) {
			var attr = svg.attributes[i];
			applyAttributeOrStyle(svg, item, attr.name, attr.value);
		}
	}

	/**
	 * Parses an SVG style attibute and applies it to a Paper.js item.
	 *
	 * @param {SVGSVGElement} svg an SVG node
	 * @param {Item} item the item to apply the style or attribute to.
	 * @param {String} name an SVG style name
	 * @param value the value of the SVG style
	 */
	 function applyAttributeOrStyle(svg, item, name, value) {
		if (!value) {
			return;
		}
		switch (name) {
		case 'id':
			item.name = value;
			break;
		case 'fill':
			if (value != 'none') {
				item.fillColor = value;
			}
			break;
		case 'stroke':
			if (value != 'none') {
				item.strokeColor = value;
			}
			break;
		case 'stroke-width':
			item.strokeWidth = parseFloat(value, 10);
			break;
		case 'stroke-linecap':
			item.strokeCap = value;
			break;
		case 'stroke-linejoin':
			item.strokeJoin = value;
			break;
		case 'stroke-dasharray':
			value = value.replace(/px/g, '');
			value = value.replace(/, /g, ',');
			value = value.replace(/ /g, ',');
			value = value.split(',');
			for (var i in value) {
				value[i] = parseFloat(value[i], 10);
			}
			item.dashArray = value;
			break;
		case 'stroke-dashoffset':
			item.dashOffset = parseFloat(value, 10);
			break;
		case 'stroke-miterlimit':
			item.miterLimit = parseFloat(value, 10);
			break;
		case 'transform':
			applyTransform(svg, item);
			break;
		case 'opacity':
			item.opacity = parseFloat(value, 10);
			break;
		case 'visibility':
			item.visibility = (value == 'visible') ? true : false;
			break;
		case 'font':
		case 'font-family':
		case 'font-size':
			//Implemented in characterStyle below.
			break;
		default:
			// Not supported yet.
			break;
		}
		if (item.characterStyle) {
			switch (name) {
			case 'font':
				var text = document.createElement('span');
				text.style.font = value;
				for (var i = 0; i < text.style.length; i++) {
					var n = text.style[i];
					applyAttributeOrStyle(svg, item, n, text.style[n]);
				}
				break;
			case 'font-family':
				var fonts = value.split(',');
				fonts[0] = fonts[0].replace(/^\s+|\s+$/g, "");
				item.characterStyle.font = fonts[0];
				break;
			case 'font-size':
				item.characterStyle.fontSize = parseFloat(value, 10);
				break;
			}
		}
	}

	/**
	 * Applies the transformations specified on the SVG node to a Paper.js item
	 *
	 * @param {SVGSVGElement} svg an SVG node
	 * @param {Item} item a Paper.js item
	 */
	function applyTransform(svg, item) {
		var transforms = svg.transform.baseVal;
		var transform;
		var matrix = new Matrix();

		for (var i = 0, l = transforms.numberOfItems; i < l; i++) {
			transform = transforms.getItem(i);
			if (transform.type == SVGTransform.SVG_TRANSFORM_UNKNOWN) {
				continue;
			}
			var transformMatrix = new Matrix(
				transform.matrix.a,
				transform.matrix.c,
				transform.matrix.b,
				transform.matrix.d,
				transform.matrix.e,
				transform.matrix.f
			);
			switch (transform.type) {
			case SVGTransform.SVG_TRANSFORM_TRANSLATE:
				break;
			case SVGTransform.SVG_TRANSFORM_SCALE:
				break;
			//Compensate for SVG's theta rotation going the opposite direction
			case SVGTransform.SVG_TRANSFORM_MATRIX:
				var temp = transformMatrix.getShearX();
				transformMatrix.setShearX(transformMatrix.getShearY());
				transformMatrix.setShearY(temp);
				break;
			case SVGTransform.SVG_TRANSFORM_SKEWX:
				transformMatrix.setShearX(transformMatrix.getShearY());
				transformMatrix.setShearY(0);
				break;
			case SVGTransform.SVG_TRANSFORM_SKEWY:
				transformMatrix.setShearY(transformMatrix.getShearX());
				transformMatrix.setShearX(0);
				break;
			case SVGTransform.SVG_TRANSFORM_ROTATE:
				transformMatrix.setShearX(-transformMatrix.getShearX());
				transformMatrix.setShearY(-transformMatrix.getShearY());
				break;
			}
			matrix.concatenate(transformMatrix);
		}
		item.transform(matrix);
	}

	return /** @Lends SvgImporter */{
		/**
		 * Creates a Paper.js item using data parsed from the selected
		 * SVG DOM node.
		 *
		 * @param {SVGSVGElement} svg the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSvg: function(svg) {
			var importer = importers[svg.nodeName.toLowerCase()];
			// TODO: importer == null: Not supported yet.
			var item = importer && importer(svg);
			if (item)
				applyAttributesAndStyles(svg, item);
			return item;
		}
	};
};
