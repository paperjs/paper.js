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
 * A function scope holding all the functionality needed to convert a SVG DOM
 * to a Paper.js DOM.
 */
new function() {
	// Define a couple of helper functions to easily read values from SVG
	// objects, dealing with baseVal, and item lists.
	// index is option, and if passed, causes a lookup in a list.

	function getValue(node, key, allowNull, index) {
		// node[key].baseVal will even be set if the node did not define the
		// attribute, so if allowNull is true, we need to also check
		// node.getAttribute(key) == null
		var base = (!allowNull || node.getAttribute(key) != null)
				&& node[key] && node[key].baseVal;
		// Note: String values are unfortunately not stored in base.value, but
		// in base directly, so we need to check both, also on item lists, using
		// Base.pick(base.value, base)
		return base
				? index !== undefined
					// Item list? Look up by index:
					? index < base.numberOfItems
						? Base.pick((base = base.getItem(index)).value, base)
						: null
					: Base.pick(base.value, base)
				: null;
	}

	function getPoint(node, x, y, allowNull, index) {
		x = getValue(node, x, allowNull, index);
		y = getValue(node, y, allowNull, index);
		return allowNull && x == null && y == null ? null
				: Point.create(x || 0, y || 0);
	}

	function getSize(node, w, h, allowNull, index) {
		w = getValue(node, w, allowNull, index);
		h = getValue(node, h, allowNull, index);
		return allowNull && w == null && h == null ? null
				: Size.create(w || 0, h || 0);
	}

	// Converts a string attribute value to the specified type
	function convertValue(value, type) {
		return value === 'none'
				? null
				: type === 'number'
					? parseFloat(value)
					: type === 'array'
						? value ? value.split(/[\s,]+/g).map(parseFloat) : []
						: type === 'color' && getDefinition(value)
							|| value;
	}

	function createClipGroup(item, clip) {
		clip.setClipMask(true);
		return new Group(clip, item);
	}

	// Importer functions for various SVG node types //

	function importGroup(node, type) {
		var nodes = node.childNodes,
			compound = type === 'clippath',
			group = compound ? new CompoundPath() : new Group(),
			project = group._project,
			currentStyle = project._currentStyle;
		// Style on groups needs to be handled differently than all other items:
		// We first apply the style to the group, then use it as the project's
		// currentStyle, so it is used as a default for the creation of all
		// nested items. importSvg then needs to check for groups and avoid
		// calling applyAttributes() again.
		applyAttributes(group, node);
		project._currentStyle = group._style.clone();
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
		// Restore currentStyle
		project._currentStyle = currentStyle;
		if (type == 'defs') {
			// I don't think we need to add defs to the DOM. But we might want
			// to use Symbols for them?
			group.remove();
			group = null;
		}
		return group;
	}

	function importPoly(node, type) {
		var path = new Path(),
			points = node.points;
		path.moveTo(points.getItem(0));
		for (var i = 1, l = points.numberOfItems; i < l; i++)
			path.lineTo(points.getItem(i));
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(node) {
		var path = new Path(),
			list = node.pathSegList,
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

	function importGradient(node, type) {
		var nodes = node.childNodes,
			stops = [];
		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i];
			if (child.nodeType == 1)
				stops.push(applyAttributes(new GradientStop(), child));
		}
		var gradient = new Gradient(stops),
			isRadial = type == 'radialgradient',
			origin, destination, highlight;
		if (isRadial) {
			gradient.type = 'radial';
			origin = getPoint(node, 'cx', 'cy');
			destination = origin.add(getValue(node, 'r'), 0);
			highlight = getPoint(node, 'fx', 'fy', true);
		} else {
			origin = getPoint(node, 'x1', 'y1');
			destination = getPoint(node, 'x2', 'y2');
		}
		// We don't return the GradientColor, since we only need a reference to
		// it in definitions, which is created in applyAttributes()
		applyAttributes(
			new GradientColor(gradient, origin, destination, highlight), node);
		return null;
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

		// http://www.w3.org/TR/SVG/struct.html#ImageElement
		image: function (node) {
			var raster = new Raster(getValue(node, 'href'));
			raster.attach('load', function() {
				var size = getSize(node, 'width', 'height');
				this.setSize(size);
				// Since x and y start from the top left of an image, add
				// half of its size:
				this.translate(getPoint(node, 'x', 'y').add(size.divide(2)));
			});
			return raster;
		},

		// http://www.w3.org/TR/SVG/struct.html#SymbolElement
		symbol: function(node, type) {
			return new Symbol(importGroup(node, type));
		},

		// http://www.w3.org/TR/SVG/struct.html#DefsElement
		defs: importGroup,

		// http://www.w3.org/TR/SVG/struct.html#UseElement
		use: function(node, type) {
			// Note the namespaced xlink:href attribute is just called href
			// as a property on node.
			var id = (getValue(node, 'href') || '').substring(1),
				definition = definitions[id];
			// Use place if we're dealing with a symbol:
			return definition
					? definition instanceof Symbol
						? definition.place()
						: definition.clone()
					: null;
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGCircleElement
		circle: function(node) {
			return new Path.Circle(getPoint(node, 'cx', 'cy'),
					getValue(node, 'r'));
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGEllipseElement
		ellipse: function(node) {
			var center = getPoint(node, 'cx', 'cy'),
				radius = getSize(node, 'rx', 'ry');
			return new Path.Ellipse(new Rectangle(center.subtract(radius),
					center.add(radius)));
		},

		// http://www.w3.org/TR/SVG/shapes.html#RectElement
		rect: function(node) {
			var point = getPoint(node, 'x', 'y'),
				size = getSize(node, 'width', 'height'),
				radius = getSize(node, 'rx', 'ry');
			// If radius is 0, Path.RoundRectangle automatically produces a
			// normal rectangle for us.
			return new Path.RoundRectangle(new Rectangle(point, size), radius);
		},

		// http://www.w3.org/TR/SVG/shapes.html#LineElement
		line: function(node) {
			return new Path.Line(getPoint(node, 'x1', 'y1'),
					getPoint(node, 'x2', 'y2'));
		},

		text: function(node) {
			// Not supported by Paper.js
			// x: multiple values for x
			// y: multiple values for y
			// dx: multiple values for x
			// dy: multiple values for y
			// TODO: Support for these is missing in Paper.js right now
			// rotate: character rotation
			// lengthAdjust:
			var text = new PointText(getPoint(node, 'x', 'y', false, 0)
					.add(getPoint(node, 'dx', 'dy', false, 0)));
			text.setContent(node.textContent || '');
			return text;
		}
	};

	// Attributes & Styles //

	function applyTransform(item, node, name, value) {
		// http://www.w3.org/TR/SVG/types.html#DataTypeTransformList
		var transforms = node[name].baseVal,
			matrix = new Matrix();
		for (var i = 0, l = transforms.numberOfItems; i < l; i++) {
			var mx = transforms.getItem(i).matrix;
			matrix.concatenate(
				new Matrix(mx.a, mx.b, mx.c, mx.d, mx.e, mx.f));
		}
		item.transform(matrix);
	}

	function applyOpacity(item, node, name, value) {
		// http://www.w3.org/TR/SVG/painting.html#FillOpacityProperty
		// http://www.w3.org/TR/SVG/painting.html#StrokeOpacityProperty
		var color = item[name == 'fill-opacity' ? 'getFillColor'
				: 'getStrokeColor']();
		if (color)
			color.setAlpha(parseFloat(value));
	}

	function applyTextAttribute(item, node, name, value) {
		if (item instanceof TextItem) {
			switch (name) {
			case 'font':
				// TODO: Verify if there is not another way?
				var text = document.createElement('span');
				text.style.font = value;
				for (var i = 0; i < text.style.length; i++) {
					var name = text.style[i];
					item = applyAttribute(item, node, name, text.style[name]);
				}
				break;
			case 'font-family':
				item.setFont(value.split(',')[0].replace(/^\s+|\s+$/g, ''));
				break;
			case 'font-size':
				item.setFontSize(parseFloat(value));
				break;
			case 'text-anchor':
				// http://www.w3.org/TR/SVG/text.html#TextAnchorProperty
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
				applyTextAttribute(children[i], node, name, value);
			}
		}
	}

	var attributes = {
		id: function(item, node, name, value) {
			definitions[value] = item;
			if (item.setName)
				item.setName(value);
		},

		'clip-path': function(item, node, name, value) {
			// http://www.w3.org/TR/SVG/masking.html#ClipPathProperty
			return createClipGroup(item, getDefinition(value).clone().reduce());
		},

		gradientTransform: applyTransform,
		transform: applyTransform,

		opacity: function(item, node, name, value) {
			// http://www.w3.org/TR/SVG/masking.html#OpacityProperty
			item.setOpacity(parseFloat(value));
		},

		'fill-opacity': applyOpacity,
		'stroke-opacity': applyOpacity,

		font: applyTextAttribute,
		'font-family': applyTextAttribute,
		'font-size': applyTextAttribute,
		'text-anchor': applyTextAttribute,

		'stop-opacity': function(item, node, name, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopOpacityProperty
			item.color.setAlpha(parseFloat(value));
		},

		visibility: function(item, node, name, value) {
			item.setVisible(value === 'visible');
		},

		'stop-color': function(item, node, name, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopColorProperty
			item.setColor(value);
		},

		offset: function(item, node, name, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopElementOffsetAttribute
			var percentage = value.match(/(.*)%$/);
			item.setRampPoint(percentage ? percentage[1] / 100 : value);
		},

		viewBox: function(item, node, name, value) {
			// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
			// TODO: implement preserveAspectRatio attribute
			if (item instanceof Symbol)
				return;
			var values = convertValue(value, 'array'),
				rectangle = Rectangle.create.apply(this, values),
				size = getSize(node, 'width', 'height', true),
				scale = size ? rectangle.getSize().divide(size) : 1,
				offset = rectangle.getPoint(),
				matrix = new Matrix().translate(offset).scale(scale);
			item.transform(matrix.inverted());
			if (size)
				rectangle.setSize(size);
			rectangle.setPoint(0);
			// TODO: the viewbox does not always need to be clipped
			return createClipGroup(item, new Path.Rectangle(rectangle));
		}
	};

	/**
	 * Converts various SVG styles and attributes into Paper.js styles and
	 * attributes and applies them to the passed item.
	 *
	 * @param {SVGSVGElement} node an SVG node to read style and attributes from.
	 * @param {Item} item the item to apply the style and attributes to.
	 */
	function applyAttributes(item, node) {
		// SVG attributes can be set both as styles and direct node attributes,
		// so we need to parse both
		// TODO: Instead of looping through the styles, we need to loop through
		// a list of styles relevant to SVG, and calculate the computed style,
		// to support style classes too.
		for (var i = 0, l = node.style.length; i < l; i++) {
			var name = node.style[i];
			item = applyAttribute(item, node, name, node.style[Base.camelize(name)]);
		}
		for (var i = 0, l = node.attributes.length; i < l; i++) {
			var attr = node.attributes[i];
			item = applyAttribute(item, node, attr.name, attr.value);
		}
		return item;
	}

	/**
	 * Parses an SVG style attibute and applies it to a Paper.js item.
	 *
	 * @param {SVGSVGElement} node an SVG node
	 * @param {Item} item the item to apply the style or attribute to.
	 * @param {String} name an SVG style name
	 * @param value the value of the SVG style
	 */
	 function applyAttribute(item, node, name, value) {
		if (value == null)
			return item;
		var entry = SvgStyles.attributes[name];
		if (entry) {
			item._style[entry.set](convertValue(value, entry.type));
		} else {
			var attribute = attributes[name];
			if (attribute) {
				var res = attribute(item, node, name, value);
				if (res !== undefined)
					item = res;
			}
		}
		return item;
	}

	var definitions = {};
	function getDefinition(value) {
		var match = value.match(/\(#([^)']+)/);
        return match && definitions[match[1]];
	}

	function importSvg(node, clearDefs) {
		var type = node.nodeName.toLowerCase(),
			importer = importers[type],
			item = importer && importer(node, type);
		// See importGroup() for an explanation of this filtering:
		if (item && item._type !== 'group')
			item = applyAttributes(item, node);
		// Clear definitions at the end of import?
		if (clearDefs)
			definitions = {};
		return item;
	}


	Item.inject(/** @lends Item# */{
		/**
		 * Converts the passed node node into a Paper.js item and adds it to the
		 * children of this item.
		 *
		 * @param {SVGSVGElement} node the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSvg: function(node) {
			return this.addChild(importSvg(node, true));
		}
	});

	Project.inject(/** @lends Project# */{
		/**
		 * Converts the passed node node into a Paper.js item and adds it to the
		 * active layer of this project.
		 *
		 * @param {SVGSVGElement} node the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSvg: function(node) {
			this.activate();
			return importSvg(node, true);
		}
	});
};
