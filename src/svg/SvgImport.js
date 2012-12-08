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
		// svg[key].baseVal will even be set if the svg did not define the
		// attribute, so if allowNull is true, we need to also check
		// svg.getAttribute(key) == null
		var base = (!allowNull || svg.getAttribute(key) != null)
				&& svg[key] && svg[key].baseVal;
		// Note: String values are unfortunately not stored in base.value, but
		// in base directly, so we need to check both, also on item lists, using
		// Base.pick(base.value, base)
		return base
				? index !== undefined
					? index < base.numberOfItems
						? Base.pick((base = base.getItem(index)).value, base)
						: null
					: Base.pick(base.value, base)
				: null;
	}

	function getPoint(svg, x, y, allowNull, index) {
		x = getValue(svg, x, allowNull, index);
		y = getValue(svg, y, allowNull, index);
		return allowNull && x == null && y == null ? null
				: Point.create(x || 0, y || 0);
	}

	function getSize(svg, w, h, allowNull, index) {
		w = getValue(svg, w, allowNull, index);
		h = getValue(svg, h, allowNull, index);
		return allowNull && w == null && h == null ? null
				: Size.create(w || 0, h || 0);
	}

	// Converts a string attribute value to the specified type
	function convertValue(value, type) {
		return value === 'none'
				? null
				: type === 'number'
					? Base.toFloat(value)
					: type === 'array'
						? value.split(/[\s,]+/g).map(parseFloat)
						: type === 'color' && getDefinition(value)
							|| value;
	}

	function createClipGroup(item, clip) {
		clip.setClipMask(true);
		return new Group(clip, item);
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
		// We don't return the GradientColor, since we only need a reference to
		// it in definitions, which is created in applyAttributes()
		applyAttributes(
			new GradientColor(gradient, origin, destination, highlight), svg);
		return null;
	}
	
	function isTextGroup(svg) {
	  var res = false;
	  if (svg.nodeName == "text") {
	    for (var i = 0, l = svg.childNodes.length > 0; i < l; i++) {
	      if (svg.childNodes[i].nodeType == 1) {
	        res = true;
	        break;
	      }
	    }
	  }
	  return res;
	}
	
	function importTspan(svg) {
	  var text = new PointText(getPoint(svg, 'x', 'y', false, 0)
				.add(getPoint(svg, 'dx', 'dy', false, 0)));
		text.setContent(svg.textContent || '');
	  return text;
	}
	
	function importText(svg) {
	  var group;
		if (isTextGroup(svg)) {
      var nodes = svg.childNodes;
      group = new Group();
      for (var i = 0, l = nodes.length; i < l; i++) {
       var child = nodes[i],
         item;
       if (child.nodeType == 1 && (item = importSvg(child))) {
         group.addChild(item);
       }
      }
		} else {
		  group = importTspan(svg);
		}
		return group;
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

		// http://www.w3.org/TR/SVG/struct.html#ImageElement
		image: function (svg) {
			var raster = new Raster(getValue(svg, 'href'));
			raster.attach('load', function() {
				var size = getSize(svg, 'width', 'height');
				this.setSize(size);
				// Since x and y start from the top left of an image, add
				// half of its size:
				this.translate(getPoint(svg, 'x', 'y').add(size.divide(2)));
			});
			return raster;
		},

		// http://www.w3.org/TR/SVG/struct.html#SymbolElement
		symbol: function(svg, type) {
			return new Symbol(applyAttributes(importGroup(svg, type), svg));
		},

		// http://www.w3.org/TR/SVG/struct.html#DefsElement
		defs: importGroup,

		// http://www.w3.org/TR/SVG/struct.html#UseElement
		use: function(svg, type) {
			// Note the namespaced xlink:href attribute is just called href
			// as a property on svg.
			// TODO: Should getValue become namespace aware?
			var id = (getValue(svg, 'href') || '').substring(1),
				definition = definitions[id];
			// Use place if we're dealing with a symbol:
			return definition
					? definition instanceof Symbol
						? definition.place()
						: definition.clone()
					: null;
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

		text: importText,
		tspan: importTspan
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
				var clipPath = getDefinition(value).clone().reduce();
				item = createClipGroup(item, clipPath);
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
				var opacity = Base.toFloat(value);
				if (name === 'stop-opacity') {
					item.color.setAlpha(opacity);
				} else {
					item.setOpacity(opacity);
				}
				break;
			// http://www.w3.org/TR/SVG/painting.html#FillOpacityProperty
			case 'fill-opacity':
			// http://www.w3.org/TR/SVG/painting.html#StrokeOpacityProperty
			case 'stroke-opacity':
				var color = item[name == 'fill-opacity'
							? 'getFillColor' : 'getStrokeColor']();
				if (color)
					color.setAlpha(Base.toFloat(value));
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
			// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
			// TODO: implement preserveAspectRatio attribute
			case 'viewBox':
				if (item instanceof Symbol)
					break;
				var values = convertValue(value, 'array'),
					rectangle = Rectangle.create.apply(this, values),
					size = getSize(svg, 'width', 'height', true),
					scale = size ? rectangle.getSize().divide(size) : 1,
					offset = rectangle.getPoint(),
					matrix = new Matrix().translate(offset).scale(scale);
				item.transform(matrix.createInverse());
				if (size)
					rectangle.setSize(size);
				rectangle.setPoint(0);
				// TODO: the viewbox does not always need to be clipped
				item = createClipGroup(item, new Path.Rectangle(rectangle));
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
				item.setFontSize(Base.toFloat(value));
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
