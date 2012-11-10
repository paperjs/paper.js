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
 * A function scope holding all the functionality needed to convert a SVG DOM
 * to a Paper.js DOM.
 */
new function() {
	// Define a couple of helper functions to easily read values from SVG
	// objects, dealing with baseVal, and item lists.
	// index is option, and if passed, causes a lookup in a list.

	function getValue(svg, key, allowNull, index) {
		var attribute = svg[key];
		if (!attribute)
			return;
		var base = attribute.baseVal,
			value = index !== undefined
				? index < base.numberOfItems ? base.getItem(index).value : null
				: base.value;
		return !allowNull && value == null ? 0 : value;
	}

	function getPoint(svg, x, y, allowNull, index) {
		x = getValue(svg, x, allowNull, index);
		y = getValue(svg, y, allowNull, index);
		return x == null && y == null ? null : Point.create(x || 0, y || 0);
	}

	function getSize(svg, w, h, allowNull, index) {
		w = getValue(svg, w, allowNull, index);
		h = getValue(svg, h, allowNull, index);
		return w == null && h == null ? null : Size.create(w || 0, h || 0);
	}

	// Converts a string attribute value to the specified type
	function convertValue(value, type) {
		return value === 'none'
				? null
				: type === 'number'
					? parseFloat(value, 10)
					: type === 'array'
						? value.split(/[\s,]+/g).map(parseFloat)
						: type === 'color' && getDefinition(value)
							|| value;
	}

	// Define importer functions for various SVG node types

	function importGroup(svg, type) {
		var nodes = svg.childNodes,
			compound = type === 'clippath',
			group = compound ? new CompoundPath() : new Group();

		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i],
				item;
			if (child.nodeType == 1 && (item = importSvg(child))) {
				// If adding CompoundPaths to other CompoundPaths,
				// we need to "unbox" them first:
				if (compound && item instanceof CompoundPath) {
					group.addChildren(item.removeChildren());
					item.remove();
				} else if (!(item instanceof Symbol)) {
					group.addChild(item);
				}
			}
		}

		if (type == 'defs') {
			// I don't think we need to add defs to the DOM. But we might want
			// to use Symbols for them?
			group.remove();
			group = null;
		}
		return group;
	}

	function importPoly(svg, type) {
		var path = new Path(),
			points = svg.points;
		path.moveTo(points.getItem(0));
		for (var i = 1, l = points.numberOfItems; i < l; i++)
			path.lineTo(points.getItem(i));
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(svg) {
		var path = new Path(),
			list = svg.pathSegList,
			compoundPath, lastPoint;
		for (var i = 0, l = list.numberOfItems; i < l; i++) {
			var segment = list.getItem(i),
				segType = segment.pathSegType,
				isRelative = segType % 2 == 1;
			if (segType === /*#=*/ SVGPathSeg.PATHSEG_UNKNOWN)
				continue;
			if (!path.isEmpty())
				lastPoint = path.getLastSegment().getPoint();
			var relative = isRelative && !path.isEmpty()
					? lastPoint
					: Point.create(0, 0);
			// Horizontal or vertical lineto commands, so fill in the
			// missing x or y value:
			var coord = (segType == /*#=*/ SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS
					|| segType == /*#=*/ SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL) && 'y'
					|| (segType == /*#=*/ SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS
					|| segType == /*#=*/ SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL) && 'x';
			if (coord)
				segment[coord] = isRelative ? 0 : lastPoint[coord];
			var point = Point.create(segment.x, segment.y).add(relative);
			switch (segType) {
			case /*#=*/ SVGPathSeg.PATHSEG_CLOSEPATH:
				path.closePath();
				break;
			case /*#=*/ SVGPathSeg.PATHSEG_MOVETO_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_MOVETO_REL:
				if (!path.isEmpty() && !compoundPath) {
					compoundPath = new CompoundPath([path]);
				}
				if (compoundPath) {
					path = new Path();
					compoundPath.addChild(path);
				}
				path.moveTo(point);
				break;
			case /*#=*/ SVGPathSeg.PATHSEG_LINETO_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_LINETO_REL:
			case /*#=*/ SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
			case /*#=*/ SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
				path.lineTo(point);
				break;
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL:
				path.cubicCurveTo(
					relative.add(segment.x1, segment.y1),
					relative.add(segment.x2, segment.y2),
					point
				);
				break;
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL:
				path.quadraticCurveTo(
					relative.add(segment.x1, segment.y1),
					point
				);
				break;
			// TODO: Implement Arcs: ttp://www.w3.org/TR/SVG/implnote.html
			// case /*#=*/ SVGPathSeg.PATHSEG_ARC_ABS:
			// case /*#=*/ SVGPathSeg.PATHSEG_ARC_REL:
			//	break;
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_REL:
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
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
			case /*#=*/ SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL:
				var control,
					j = i;
				for (; j >= 0; j--) {
					var prev = list.getItem(j);
					if (prev.pathSegType === /*#=*/ SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS ||
							prev.pathSegType === /*#=*/ SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_REL) {
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
	}

	function importGradient(svg, type) {
		var nodes = svg.childNodes,
			stops = [];
		for (var i = 0, l = nodes.length; i < l; i++) {
			var node = nodes[i];
			if (node.nodeType == 1)
				stops.push(applyAttributes(new GradientStop(), node));
		}
		var gradient = new Gradient(stops),
			isRadial = type == 'radialgradient',
			origin, destination, highlight;
		if (isRadial) {
			gradient.type = 'radial';
			origin = getPoint(svg, 'cx', 'cy');
			destination = origin.add(getValue(svg, 'r'), 0);
			highlight = getPoint(svg, 'fx', 'fy', true);
		} else {
			origin = getPoint(svg, 'x1', 'y1');
			destination = getPoint(svg, 'x2', 'y2');
		}
		var gradientColor = new GradientColor(gradient, origin, destination, highlight);
		applyAttributes(gradientColor, svg);
	}

	var definitions = {};
	function getDefinition(value) {
		var match = value.match(/\(#([^)']+)/);
        return match && definitions[match[1]];
	}

	var importers = {
		// http://www.w3.org/TR/SVG/struct.html#Groups
		g: importGroup,
		// http://www.w3.org/TR/SVG/struct.html#NewDocument
		svg: importGroup,
		clippath: importGroup,
		// http://www.w3.org/TR/SVG/shapes.html#PolygonElement
		polygon: importPoly,
		// http://www.w3.org/TR/SVG/shapes.html#PolylineElement
		polyline: importPoly,
		// http://www.w3.org/TR/SVG/paths.html
		path: importPath,
		// http://www.w3.org/TR/SVG/pservers.html#LinearGradients
		lineargradient: importGradient,
		// http://www.w3.org/TR/SVG/pservers.html#RadialGradients
		radialgradient: importGradient,

		// http://www.w3.org/TR/SVG/struct.html#SymbolElement
		symbol: function(svg, type) {
			var item = importGroup(svg, type);
			item = applyAttributes(item, svg);
			// TODO: We're returning a symbol. How to handle this?
			return new Symbol(item);
		},

		// http://www.w3.org/TR/SVG/struct.html#DefsElement
		defs: importGroup,

		// http://www.w3.org/TR/SVG/struct.html#UseElement
		use: function(svg, type) {
			return applyAttributes(null, svg);
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGCircleElement
		circle: function(svg) {
			return new Path.Circle(getPoint(svg, 'cx', 'cy'),
					getValue(svg, 'r'));
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGEllipseElement
		ellipse: function(svg) {
			var center = getPoint(svg, 'cx', 'cy'),
				radius = getSize(svg, 'rx', 'ry');
			return new Path.Ellipse(new Rectangle(center.subtract(radius),
					center.add(radius)));
		},

		// http://www.w3.org/TR/SVG/shapes.html#RectElement
		rect: function(svg) {
			var point = getPoint(svg, 'x', 'y'),
				size = getSize(svg, 'width', 'height'),
				radius = getSize(svg, 'rx', 'ry');
			// If radius is 0, Path.RoundRectangle automatically produces a
			// normal rectangle for us.
			return new Path.RoundRectangle(new Rectangle(point, size), radius);
		},

		// http://www.w3.org/TR/SVG/shapes.html#LineElement
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
			// TODO: Support for these is missing in Paper.js right now
			// rotate: character rotation
			// lengthAdjust:
			var text = new PointText(getPoint(svg, 'x', 'y', false, 0)
					.add(getPoint(svg, 'dx', 'dy', false, 0)));
			text.content = svg.textContent || '';
			return text;
		}
	};

	/**
	 * Converts various SVG styles and attributes into Paper.js styles and
	 * attributes and applies them to the passed item.
	 *
	 * @param {SVGSVGElement} svg an SVG node to read style and attributes from.
	 * @param {Item} item the item to apply the style and attributes to.
	 */
	function applyAttributes(item, svg) {
		// SVG attributes can be set both as styles and direct node attributes,
		// so we need to parse both
		for (var i = 0, l = svg.style.length; i < l; i++) {
			var name = svg.style[i];
			item = applyAttribute(item, svg, name, svg.style[Base.camelize(name)]);
		}
		for (var i = 0, l = svg.attributes.length; i < l; i++) {
			var attr = svg.attributes[i];
			item = applyAttribute(item, svg, attr.name, attr.value);
		}
		return item;
	}

	/**
	 * Parses an SVG style attibute and applies it to a Paper.js item.
	 *
	 * @param {SVGSVGElement} svg an SVG node
	 * @param {Item} item the item to apply the style or attribute to.
	 * @param {String} name an SVG style name
	 * @param value the value of the SVG style
	 */
	 function applyAttribute(item, svg, name, value) {
		if (value == null)
			return item;
		var entry = SvgStyles.attributes[name];
		if (entry) {
			item._style[entry.set](convertValue(value, entry.type));
		} else {
			switch (name) {
			case 'id':
				definitions[value] = item;
				if (item.setName)
					item.setName(value);
				break;
			// http://www.w3.org/TR/SVG/masking.html#ClipPathProperty
			case 'clip-path':
				var clipPath = getDefinition(value).clone().flatten(),
					group = new Group(clipPath);
				group.moveAbove(item);
				group.addChild(item);
				group.setClipped(true);
				// item can be modified, since it gets returned from 
				// applyAttribute(). So let's have this change propagate back up
				item = group; 
				break;
			// http://www.w3.org/TR/SVG/types.html#DataTypeTransformList
			case 'gradientTransform':
			case 'transform':
				applyTransform(item, svg, name);
				break;
			// http://www.w3.org/TR/SVG/pservers.html#StopOpacityProperty
			case 'stop-opacity':
			// http://www.w3.org/TR/SVG/masking.html#OpacityProperty
			case 'opacity':
				var opacity = parseFloat(value, 10);
				if (name === 'stop-opacity') {
					item.color.setAlpha(opacity);
				} else {
					item.setOpacity(opacity);
				}
				break;
			case 'visibility':
				item.setVisible(value === 'visible');
				break;
			case 'font':
			case 'font-family':
			case 'font-size':
			// http://www.w3.org/TR/SVG/text.html#TextAnchorProperty
			case 'text-anchor':
				applyTextAttribute(item, svg, name, value);
				break;
			// http://www.w3.org/TR/SVG/pservers.html#StopColorProperty
			case 'stop-color':
				item.setColor(value);
				break;
			// http://www.w3.org/TR/SVG/pservers.html#StopElementOffsetAttribute
			case 'offset':
				var percentage = value.match(/(.*)%$/);
				item.setRampPoint(percentage ? percentage[1] / 100 : value);
				break;
			case 'xlink:href':
				var definition = definitions[value.substring(1)];
				// Use place if we're dealing with a symbol:
				item = definition.place ? definition.place() : definition.clone();
				break;
			// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
			case 'viewBox':
				var values = convertValue(value, 'array'),
					rectangle = Rectangle.create.apply(this, values);
				// TODO: how to deal with the svg element?
				if (name !== 'svg')
					(item.getDefinition ? item.getDefinition() : item).setBounds(rectangle);
				break;
			}
		}
		return item;
	}

	function applyTextAttribute(item, svg, name, value) {
		if (item instanceof TextItem) {
			switch (name) {
			case 'font':
				// TODO: Verify if there is not another way?
				var text = document.createElement('span');
				text.style.font = value;
				for (var i = 0; i < text.style.length; i++) {
					var name = text.style[i];
					item = applyAttribute(item, svg, name, text.style[name]);
				}
				break;
			case 'font-family':
				item.setFont(value.split(',')[0].replace(/^\s+|\s+$/g, ''));
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
				applyTextAttribute(children[i], svg, name, value);
			}
		}
	}

	/**
	 * Applies the transformations specified on the SVG node to a Paper.js item
	 *
	 * @param {SVGSVGElement} svg an SVG node
	 * @param {Item} item a Paper.js item
	 */
	function applyTransform(item, svg, name) {
		var svgTransform = svg[name],
			transforms = svgTransform.baseVal,
			matrix = new Matrix();
		for (var i = 0, l = transforms.numberOfItems; i < l; i++) {
			var transform = transforms.getItem(i);
			if (transform.type === /*#=*/ SVGTransform.SVG_TRANSFORM_UNKNOWN)
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
			case /*#=*/ SVGTransform.SVG_TRANSFORM_MATRIX:
				var tmp = b;
				b = c;
				c = tmp;
				break;
			case /*#=*/ SVGTransform.SVG_TRANSFORM_SKEWX:
				b = c;
				c = 0;
				break;
			case /*#=*/ SVGTransform.SVG_TRANSFORM_SKEWY:
				c = b;
				b = 0;
				break;
			case /*#=*/ SVGTransform.SVG_TRANSFORM_ROTATE:
				b = -b;
				c = -c;
				break;
			}
			matrix.concatenate(new Matrix(a, c, b, d, mx.e, mx.f));
		}
		item.transform(matrix);
	}

	function importSvg(svg) {
		var type = svg.nodeName.toLowerCase(),
			importer = importers[type],
			item = importer && importer(svg, type);
		return item ? applyAttributes(item, svg) : item;
	}


	Item.inject(/** @lends Item# */{
		/**
		 * Converts the passed svg node into a Paper.js item and adds it to the
		 * children of this item.
		 *
		 * @param {SVGSVGElement} svg the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSvg: function(svg) {
			return this.addChild(importSvg(svg));
		}
	});

	Project.inject(/** @lends Project# */{
		/**
		 * Converts the passed svg node into a Paper.js item and adds it to the
		 * active layer of this project.
		 *
		 * @param {SVGSVGElement} svg the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSvg: function(svg) {
			this.activate();
			return importSvg(svg);
		}
	});
};
