/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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

	function getValue(node, name, isString, allowNull) {
		var namespace = SVGNamespaces[name],
			value = namespace
				? node.getAttributeNS(namespace, name)
				: node.getAttribute(name);
		if (value === 'null')
			value = null;
		// Interpret value as number. Never return NaN, but 0 instead.
		// If the value is a sequence of numbers, parseFloat will
		// return the first occuring number, which is enough for now.
		return value == null
				? allowNull
					? null
					: isString
						? ''
						: 0
				: isString
					? value
					: parseFloat(value);
	}

	function getPoint(node, x, y, allowNull) {
		x = getValue(node, x, false, allowNull);
		y = getValue(node, y, false, allowNull);
		return allowNull && (x == null || y == null) ? null
				: new Point(x, y);
	}

	function getSize(node, w, h, allowNull) {
		w = getValue(node, w, false, allowNull);
		h = getValue(node, h, false, allowNull);
		return allowNull && (w == null || h == null) ? null
				: new Size(w, h);
	}

	// Converts a string attribute value to the specified type
	function convertValue(value, type, lookup) {
		return value === 'none'
				? null
				: type === 'number'
					? parseFloat(value)
					: type === 'array'
						? value ? value.split(/[\s,]+/g).map(parseFloat) : []
						: type === 'color'
							? getDefinition(value) || value
							: type === 'lookup'
								? lookup[value]
								: value;
	}

	// Importer functions for various SVG node types

	function importGroup(node, type, isRoot, options) {
		var nodes = node.childNodes,
			isClip = type === 'clippath',
			item = new Group(),
			project = item._project,
			currentStyle = project._currentStyle,
			children = [];
		if (!isClip) {
			// Have the group not pass on all transformations to its children,
			// as this is how SVG works too.
			item._applyMatrix = false;
			item = applyAttributes(item, node, isRoot);
			// Style on items needs to be handled differently than all other
			// items: We first apply the style to the item, then use it as the
			// project's currentStyle, so it is used as a default for the
			// creation of all nested items. importSVG then needs to check for
			// items and avoid calling applyAttributes() again.
			project._currentStyle = item._style.clone();
		}
		// Collect the children in an array and apply them all at once.
		for (var i = 0, l = nodes.length; i < l; i++) {
			var childNode = nodes[i],
				child;
			if (childNode.nodeType === 1
					&& (child = importSVG(childNode, false, options))
					&& !(child instanceof Symbol))
				children.push(child);
		}
		item.addChildren(children);
		// Clip paths are reduced (unboxed) and their attributes applied at the
		// end.
		if (isClip)
			item = applyAttributes(item.reduce(), node, isRoot);
		// Restore currentStyle
		project._currentStyle = currentStyle;
		if (isClip || type === 'defs') {
			// We don't want the defs in the DOM. But we might want to use
			// Symbols for them to save memory?
			item.remove();
			item = null;
		}
		return item;
	}

	function importPoly(node, type) {
		var coords = node.getAttribute('points').match(
					/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g),
			points = [];
		for (var i = 0, l = coords.length; i < l; i += 2)
			points.push(new Point(
					parseFloat(coords[i]),
					parseFloat(coords[i + 1])));
		var path = new Path(points);
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(node) {
		return new CompoundPath({
			pathData: node.getAttribute('d'),
			insert: false
		}).reduce();
	}

	function importGradient(node, type) {
		var nodes = node.childNodes,
			stops = [];
		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i];
			if (child.nodeType === 1)
				stops.push(applyAttributes(new GradientStop(), child));
		}
		var isRadial = type === 'radialgradient',
			gradient = new Gradient(stops, isRadial),
			origin, destination, highlight;
		if (isRadial) {
			origin = getPoint(node, 'cx', 'cy');
			destination = origin.add(getValue(node, 'r'), 0);
			highlight = getPoint(node, 'fx', 'fy', true);
		} else {
			origin = getPoint(node, 'x1', 'y1');
			destination = getPoint(node, 'x2', 'y2');
		}
		applyAttributes(
			new Color(gradient, origin, destination, highlight), node);
		// We don't return the gradient, since we only need a reference to it in
		// definitions, which is created in applyAttributes()
		return null;
	}

	// NOTE: All importers are lowercase, since jsdom is using uppercase
	// nodeNames still.
	var importers = {
		'#document': function (node, type, isRoot, options) {
			var nodes = node.childNodes;
			for (var i = 0, l = nodes.length; i < l; i++) {
				var child = nodes[i];
				if (child.nodeType === 1) {
					// NOTE: We need to move the svg node into our current
					// document, so default styles apply!
					var next = child.nextSibling;
					document.body.appendChild(child);
					var item = importSVG(child, isRoot, options);
					//  After import, we move it back to where it was:
					if (next) {
						node.insertBefore(child, next);
					} else {
						node.appendChild(child);
					}
					return item;
				}
			}
		},
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
			var raster = new Raster(getValue(node, 'href', true));
			raster.attach('load', function() {
				var size = getSize(node, 'width', 'height');
				this.setSize(size);
				// Since x and y start from the top left of an image, add
				// half of its size. We also need to take the raster's matrix
				// into account, which will be defined by the time the load
				// event is called.
				var center = this._matrix._transformPoint(
						getPoint(node, 'x', 'y').add(size.divide(2)));
				this.translate(center);
			});
			return raster;
		},

		// http://www.w3.org/TR/SVG/struct.html#SymbolElement
		symbol: function(node, type, isRoot, options) {
			// Pass true for dontCenter:
			return new Symbol(importGroup(node, type, isRoot, options), true);
		},

		// http://www.w3.org/TR/SVG/struct.html#DefsElement
		defs: importGroup,

		// http://www.w3.org/TR/SVG/struct.html#UseElement
		use: function(node) {
			// Note the namespaced xlink:href attribute is just called href
			// as a property on node.
			// TODO: Support overflow and width, height, in combination with
			// overflow: hidden. Paper.js currently does not suport PlacedSymbol
			// clipping, but perhaps it should?
			var id = (getValue(node, 'href', true) || '').substring(1),
				definition = definitions[id],
				point = getPoint(node, 'x', 'y');
			// Use place if we're dealing with a symbol:
			return definition
					? definition instanceof Symbol
						// When placing symbols, we nee to take both point and
						// matrix into account. This just does the right thing:
						? definition.place(point)
						: definition.clone().translate(point)
					: null;
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGCircleElement
		circle: function(node) {
			return new Shape.Circle(getPoint(node, 'cx', 'cy'),
					getValue(node, 'r'));
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGEllipseElement
		ellipse: function(node) {
			// We only use object literal notation where the default one is not
			// supported (e.g. center / radius fo Shape.Ellipse).
			return new Shape.Ellipse({
				center: getPoint(node, 'cx', 'cy'),
				radius: getSize(node, 'rx', 'ry')
			});
		},

		// http://www.w3.org/TR/SVG/shapes.html#RectElement
		rect: function(node) {
			var point = getPoint(node, 'x', 'y'),
				size = getSize(node, 'width', 'height'),
				radius = getSize(node, 'rx', 'ry');
			return new Shape.Rectangle(new Rectangle(point, size), radius);
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
			var text = new PointText(getPoint(node, 'x', 'y')
					.add(getPoint(node, 'dx', 'dy')));
			text.setContent(node.textContent.trim() || '');
			return text;
		}
	};

	// Attributes and Styles

	// NOTE: Parmeter sequence for all apply*() functions is: 
	// (item, value, name, node) rather than (item, node, name, value),
	// so we can ommit the less likely parameters from right to left.

	function applyTransform(item, value, name, node) {
		// http://www.w3.org/TR/SVG/types.html#DataTypeTransformList
		// Parse SVG transform string. First we split at /)\s*/, to separate
		// commands
		var transforms = (node.getAttribute(name) || '').split(/\)\s*/g),
			matrix = new Matrix();
		for (var i = 0, l = transforms.length; i < l; i++) {
			var transform = transforms[i];
			if (!transform)
				break;
			// Command come before the '(', values after
			var parts = transform.split('('),
				command = parts[0],
				v = parts[1].split(/[\s,]+/g);
			// Convert values to floats
			for (var j = 0, m = v.length; j < m; j++)
				v[j] = parseFloat(v[j]);
			switch (command) {
			case 'matrix':
				matrix.concatenate(
						new Matrix(v[0], v[1], v[2], v[3], v[4], v[5]));
				break;
			case 'rotate':
				matrix.rotate(v[0], v[1], v[2]);
				break;
			case 'translate':
				matrix.translate(v[0], v[1]);
				break;
			case 'scale':
				matrix.scale(v);
				break;
			case 'skewX':
				matrix.skew(v[0], 0);
				break;
			case 'skewY':
				matrix.skew(0, v[0]);
				break;
			}
		}
		item.transform(matrix);
	}

	function applyOpacity(item, value, name) {
		// http://www.w3.org/TR/SVG/painting.html#FillOpacityProperty
		// http://www.w3.org/TR/SVG/painting.html#StrokeOpacityProperty
		var color = item[name === 'fill-opacity' ? 'getFillColor'
				: 'getStrokeColor']();
		if (color)
			color.setAlpha(parseFloat(value));
	}

	// Create apply-functions for attributes, and merge in those for SVGStlyes.
	// We need to define style attributes first, and merge in all others after,
	// since transform needs to be applied after fill color, as transformations
	// can affect gradient fills.
	var attributes = Base.each(SVGStyles, function(entry) {
		this[entry.attribute] = function(item, value) {
			item[entry.set](convertValue(value, entry.type, entry.fromSVG));
			// When applying gradient colors to shapes, we need to offset
			// the shape's initial position to get the same results as SVG.
			if (entry.type === 'color' && item instanceof Shape) {
				// Do not use result of convertValue() above, since calling
				// the setter will produce a new cloned color.
				var color = item[entry.get]();
				if (color)
					color.transform(new Matrix().translate(
							item.getPosition(true).negate()));
			}
		};
	}, {
		id: function(item, value) {
			definitions[value] = item;
			if (item.setName)
				item.setName(value);
		},

		'clip-path': function(item, value) {
			// http://www.w3.org/TR/SVG/masking.html#ClipPathProperty
			var clip = getDefinition(value);
			if (clip) {
				clip = clip.clone();
				clip.setClipMask(true);
				// If item is already a group, move the clip-path inside
				if (item instanceof Group) {
					item.insertChild(0, clip);
				} else {
					return new Group(clip, item);
				}
			}
		},

		gradientTransform: applyTransform,
		transform: applyTransform,

		'fill-opacity': applyOpacity,
		'stroke-opacity': applyOpacity,

		visibility: function(item, value) {
			item.setVisible(value === 'visible');
		},

		'stop-color': function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopColorProperty
			if (item.setColor)
				item.setColor(value);
		},

		'stop-opacity': function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopOpacityProperty
			// NOTE: It is important that this is applied after stop-color!
			if (item._color)
				item._color.setAlpha(parseFloat(value));
		},

		offset: function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopElementOffsetAttribute
			var percentage = value.match(/(.*)%$/);
			item.setRampPoint(percentage
					? percentage[1] / 100
					: parseFloat(value));
		},

		viewBox: function(item, value, name, node, styles) {
			// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
			// TODO: implement preserveAspectRatio attribute
			// viewBox will be applied both to the group that's created for the
			// content in Symbol.definition, and the Symbol itself.
			var rect = new Rectangle(convertValue(value, 'array')),
				size = getSize(node, 'width', 'height', true);
			if (item instanceof Group) {
				// This is either a top-level svg node, or the container for a
				// symbol.
				var scale = size ? rect.getSize().divide(size) : 1,
					matrix = new Matrix().translate(rect.getPoint()).scale(scale);
				item.transform(matrix.inverted());
			} else if (item instanceof Symbol) {
				// The symbol is wrapping a group. Note that viewBox was already
				// applied to the group, and above code was executed for it.
				// All that is left to handle here on the Symbol level is
				// clipping. We can't do it at group level because
				// applyAttributes() gets called for groups before their
				// children are added, for styling reasons. See importGroup()
				if (size)
					rect.setSize(size);
				var clip = getAttribute(node, 'overflow', styles) != 'visible',
					group = item._definition;
				if (clip && !rect.contains(group.getBounds())) {
					// Add a clip path at the top of this symbol's group
					clip = new Shape.Rectangle(rect).transform(group._matrix);
					clip.setClipMask(true);
					group.addChild(clip);
				}
			}
		}
	});

	function getAttribute(node, name, styles) {
		// First see if the given attribute is defined.
		var attr = node.attributes[name],
			value = attr && attr.value;
		if (!value) {
			// Fallback to using styles. See if there is a style, either set
			// directly on the object or applied to it through CSS rules.
			// We also need to filter out inheritance from their parents.
			var style = Base.camelize(name);
			value = node.style[style];
			if (!value && styles.node[style] !== styles.parent[style])
				value = styles.node[style];
		}
		// Return undefined if attribute is not defined, but null if it's
		// defined as not set (e.g. fill / stroke).
		return !value
				? undefined
				: value === 'none'
					? null
					: value;
	}

	/**
	 * Converts various SVG styles and attributes into Paper.js styles and
	 * attributes and applies them to the passed item.
	 *
	 * @param {SVGSVGElement} node an SVG node to read style and attributes from.
	 * @param {Item} item the item to apply the style and attributes to.
	 */
	function applyAttributes(item, node, isRoot) {
		// SVG attributes can be set both as styles and direct node attributes,
		// so we need to handle both.
		var styles = {
			node: DomElement.getStyles(node) || {},
			// Do not check for inheritance if this is the root, since we want
			// the default SVG settings to stick.
			parent: !isRoot && DomElement.getStyles(node.parentNode) || {}
		};
		Base.each(attributes, function(apply, name) {
			var value = getAttribute(node, name, styles);
			if (value !== undefined)
				item = Base.pick(apply(item, value, name, node, styles), item);
		});
		return item;
	}

	var definitions = {};
	function getDefinition(value) {
		// When url() comes from a style property, '#'' seems to be missing on 
		// WebKit, so let's make it optional here:
		var match = value && value.match(/\((?:#|)([^)']+)/);
		return match && definitions[match[1]];
	}

	function importSVG(source, isRoot, options) {
		if (!source)
			return null;
		if (!options) {
			options = {};
		} else if (typeof options === 'function') {
			options = { onLoad: options };
		}

		var node = source,
			// Remember current scope so we can restore it in onLoad.
			scope = paper;

		function onLoadCallback(svg) {
			paper = scope;
			var item = importSVG(svg, isRoot, options),
				onLoad = options.onLoad,
				view = scope.project && scope.project.view;
			if (onLoad)
				onLoad.call(this, item);
			view.update();
		}

		if (isRoot) {
			// See if it's a string but handle markup separately
			if (typeof source === 'string' && !/^.*</.test(source)) {
/*#*/ if (__options.environment == 'browser') {
				// First see if we're meant to import an element with the given
				// id.
				node = document.getElementById(source);
				// Check if the string does not represent SVG data, in which
				// case it must be the URL of a SVG to be loaded.
				if (node) {
					source = null;
				} else {
					return Http.request('get', source, onLoadCallback);
				}
/*#*/ } else if (__options.environment == 'node') {
			// TODO: Implement!
/*#*/ } // __options.environment == 'node'
			} else if (typeof File !== 'undefined' && source instanceof File) {
				// Load local file through FileReader
				var reader = new FileReader();
				reader.onload = function() {
					onLoadCallback(reader.result);
				};
				return reader.readAsText(source);
			}
		}

		if (typeof source === 'string')
			node = new DOMParser().parseFromString(source, 'image/svg+xml');
		if (!node.nodeName)
			throw new Error('Unsupported SVG source: ' + source);
		// jsdom in Node.js uses uppercase values for nodeName...
		var type = node.nodeName.toLowerCase(),
			importer = importers[type],
			item = importer && importer(node, type, isRoot, options) || null,
			data = node.getAttribute && node.getAttribute('data-paper-data');
		if (item) {
			// See importGroup() for an explanation of this filtering:
			if (!(item instanceof Group))
				item = applyAttributes(item, node, isRoot);
			if (options.expandShapes && item instanceof Shape) {
				item.remove();
				item = item.toPath();
			}
			if (data)
				item._data = JSON.parse(data);
		}
		// Clear definitions at the end of import?
		if (isRoot)
			definitions = {};
		return item;
	}

	// NOTE: Documentation is in Item.js
	Item.inject({
		importSVG: function(node, options) {
			return this.addChild(importSVG(node, true, options));
		}
	});

	// NOTE: Documentation is in Project.js
	Project.inject({
		importSVG: function(node, options) {
			this.activate();
			return importSVG(node, true, options);
		}
	});
};
