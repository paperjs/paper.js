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
		var path = new Path(),
			points = svg.points,
			start = points.getItem(0);
		path.moveTo(start);
		for (var i = 1, l = points.numberOfItems; i < l; i++)
			path.lineTo(points.getItem(i));
		if (svg.nodeName.toLowerCase() == 'polygon')
			path.closePath();
		return path;
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
			// If radius is 0, Path.RoundRectangle automatically produces a
			// normal rectangle for us.
			return new Path.RoundRectangle(new Rectangle(point, size), radius);
		},

		line: function(svg) {
			return new Path.Line(getPoint(svg, 'x1', 'y1'),
					getPoint(svg, 'x2', 'y2'));
		},

		text: function(svg) {
			// Not supported by Paper.js
			// x: multiple values for x
			// y: multiple values for y
			// dx: multiple values for x
			// dy: multiple values for y
			// rotate: character rotation
			// lengthAdjust:
			var text = new PointText(getPoint(svg, 'x', 'y', 0)
					.add(getPoint(svg, 'dx', 'dy', 0)));
			text.content = svg.textContent || '';
			return text;
		},

		path: function(svg) {
			var path = new Path(),
				list = svg.pathSegList,
				compoundPath, lastPoint;
			for (var i = 0, l = list.numberOfItems; i < l; i++) {
				// To shrink code, we replaced the long SVGPathSeg constants
				// with their actual numeric values. The comments keep reference
				// to the original constants. Values were taken from:
				// http://dxr.mozilla.org/mozilla-central/dom/interfaces/svg/nsIDOMSVGPathSeg.idl.html
				var segment = list.getItem(i),
					pathSegType = segment.pathSegType,
					relativeSegType = pathSegType % 2 == 1;
				if (pathSegType === 0) // SVGPathSeg.PATHSEG_UNKNOWN
					continue;
				if (!path.isEmpty())
					lastPoint = path.getLastSegment().getPoint();
				var relative = relativeSegType && !path.isEmpty()
						? lastPoint
						: Point.create(0, 0);
				// Horizontal or vertical lineto:
				if (pathSegType >= 12 && pathSegType <= 15) {
					// Fill in the missing x or y value:
					if (segment.x === undefined)
							segment.x = relativeSegType ? 0 : lastPoint.x;
					if (segment.y === undefined)
							segment.y = relativeSegType ? 0 : lastPoint.y;
				}
				var point = Point.create(segment.x, segment.y).add(relative);
				switch (segment.pathSegType) {
				case 1: // SVGPathSeg.PATHSEG_CLOSEPATH:
					path.closePath();
					break;
				case 2: // SVGPathSeg.PATHSEG_MOVETO_ABS:
				case 3: // SVGPathSeg.PATHSEG_MOVETO_REL:
					if (!path.isEmpty() && !compoundPath) {
						compoundPath = new CompoundPath([path]);
					}
					if (compoundPath) {
						path = new Path();
						compoundPath.addChild(path);
					}
					path.moveTo(point);
					break;
				case 4: // SVGPathSeg.PATHSEG_LINETO_ABS:
				case 5: // SVGPathSeg.PATHSEG_LINETO_REL:
				case 12: // SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
				case 13: // SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
				case 14: // SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
				case 15: // SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
					path.lineTo(point);
					break;
				case 6: // SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
				case 7: // SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL:
					path.cubicCurveTo(
						relative.add(segment.x1, segment.y1),
						relative.add(segment.x2, segment.y2),
						point
					);
					break;
				case 8: // SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
				case 9: // SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL:
					path.quadraticCurveTo(
						relative.add(segment.x1, segment.y1),
						point
					);
					break;
				// TODO: Implement Arcs: ttp://www.w3.org/TR/SVG/implnote.html
				// case 10: // SVGPathSeg.PATHSEG_ARC_ABS:
				// case 11: // SVGPathSeg.PATHSEG_ARC_REL:
				//	break;
				case 16: // SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
				case 17: // SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_REL:
					var prev = list.getItem(i - 1),
						control = lastPoint.add(lastPoint.subtract(
							Point.create(prev.x2, prev.y2)
								.subtract(prev.x, prev.y)
								.add(lastPoint)));
					path.cubicCurveTo(
						control,
						relative.add(segment.x2, segment.y2),
						point);
					break;
				case 18: // SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
				case 19: // SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL:
					var control,
						j = i;
					for (; j >= 0; j--) {
						var prev = list.getItem(j);
						if (prev.pathSegType === 8 || // SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS
								prev.pathSegType === 9) { // SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL
							control = Point.create(prev.x1, prev.y1)
									.subtract(prev.x, prev.y)
									.add(path._segments[j].getPoint());
							break;
						}
					}
					for (; j < i; ++j) {
						var anchor = path._segments[j].getPoint();
						control = anchor.add(anchor.subtract(control));
					}
					path.quadraticCurveTo(control, point);
					break;
				}
			}
			return compoundPath || path;
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
			applyAttributeOrStyle(svg, item, name, svg.style[Base.camelize(name)]);
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
		if (value == null)
			return;
		switch (name) {
		case 'id':
			item.setName(value);
			break;
		case 'fill':
			if (value !== 'none')
				item.setFillColor(value);
			break;
		case 'stroke':
			if (value !== 'none')
				item.setStrokeColor(value);
			break;
		case 'stroke-width':
			item.setStrokeWidth(parseFloat(value, 10));
			break;
		case 'stroke-linecap':
			item.setStrokeCap(value);
			break;
		case 'stroke-linejoin':
			item.setStrokeJoin(value);
			break;
		case 'stroke-dasharray':
			value = value.replace(/px/g, '').replace(/, /g, ',')
					.replace(/ /g, ',').split(',');
			for (var i = 0, l = value.length; i < l; i++)
				value[i] = parseFloat(value[i], 10);
			item.setDashArray(value);
			break;
		case 'stroke-dashoffset':
			item.setDashOffset(parseFloat(value, 10));
			break;
		case 'stroke-miterlimit':
			item.setMiterLimit(parseFloat(value, 10));
			break;
		case 'transform':
			applyTransform(svg, item);
			break;
		case 'opacity':
			item.setOpacity(parseFloat(value, 10));
			break;
		case 'visibility':
			item.setVisibility(value === 'visible');
			break;
		case 'font':
		case 'font-family':
		case 'font-size':
		case 'text-anchor':
			applyTextStyle(svg, item, name, value);
			break;
		default:
			// Not supported yet.
			break;
		}
	}

	function applyTextStyle(svg, item, name, value) {
		if (item instanceof TextItem) {
			switch (name) {
			case 'font':
				// TODO: Verify if there is not another way?
				var text = document.createElement('span');
				text.style.font = value;
				for (var i = 0; i < text.style.length; i++) {
					var n = text.style[i];
					applyAttributeOrStyle(svg, item, n, text.style[n]);
				}
				break;
			case 'font-family':
				item.setFont(value.split(',')[0].replace(/^\s+|\s+$/g, ""));
				break;
			case 'font-size':
				item.setFontSize(parseFloat(value, 10));
				break;
			case 'text-anchor':
				item.setJustification({
					start: 'left',
					middle: 'center',
					end: 'right'
				}[value]);
				break;
			}
		} else if (item instanceof Group) {
			// Text styles need to be recursively passed down to children that
			// might be TextItems explicitely.
			var children = item._children;
			for (var i = 0, l = children.length; i < l; i++) {
				applyTextStyle(svg, children[i], name, value);
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
		var transforms = svg.transform.baseVal,
			matrix = new Matrix();
		for (var i = 0, l = transforms.numberOfItems; i < l; i++) {
			// To shrink code, we replaced the long SVGTransform constants
			// with their actual numeric values. The comments keep reference
			// to the original constants. Values were taken from:
			// http://dxr.mozilla.org/mozilla-central/dom/interfaces/svg/nsIDOMSVGTransform.idl.html
			var transform = transforms.getItem(i);
			if (transform.type === 0) // SVGTransform.SVG_TRANSFORM_UNKNOWN
				continue;
			// Convert SVG Matrix to Paper Matrix.
			// TODO: Should this be moved to our Matrix constructor?
			var mx = transform.matrix,
				a = mx.a,
				b = mx.b,
				c = mx.c,
				d = mx.d;
			switch (transform.type) {
			// Compensate for SVG's theta rotation going the opposite direction
			case 1: // SVGTransform.SVG_TRANSFORM_MATRIX
				var tmp = b;
				b = c;
				c = tmp;
				break;
			case 5: // SVGTransform.SVG_TRANSFORM_SKEWX:
				b = c;
				c = 0;
				break;
			case 6: // SVGTransform.SVG_TRANSFORM_SKEWY:
				c = b;
				b = 0;
				break;
			case 4: // SVGTransform.SVG_TRANSFORM_ROTATE:
				b = -b;
				c = -c;
				break;
			}
			matrix.concatenate(new Matrix(a, c, b, d, mx.e, mx.f));
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
