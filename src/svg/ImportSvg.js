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
*
*
* This class and all methods therein designed by Stetson-Team-Alpha
* @author Stetson-Team-Alpha
*/

/**
* @name ImportSvg
* @class The ImportSvg object represents an object created using the SVG
* Canvas that will be converted into a Paper.js object.
* The SVG object is imported into Paper.js by converting it into items
* within groups.
*
*/

var ImportSvg = this.ImportSvg = Base.extend(/** @Lends ImportSvg# */{
		/**
		* Creates a Paper.js object using data parsed from the selected
		* SVG Document Object Model (DOM). The SVG object is imported, 
		* than a layer is created (with groups for the items if needed).
		*
		* Supports nested groups
		*
		* @param {SVG DOM} svg An SVG DOM object with parameters
		* @return {item} A Paper.js layer
		*/
	importSvg: function(svg) {
		var item;
		var symbol;
		switch (svg.nodeName.toLowerCase()) {
		case 'line':
			item = this._importLine(svg);
			break;
		case 'rect':
			item = this._importRectangle(svg);
			break;
		case 'circle':
			item = this._importCircle(svg);
			break;
		case 'ellipse':
			item = this._importOval(svg);
			break;
		case 'g':
		case 'svg':
			item = this._importGroup(svg);
			break;
		case 'text':
			item = this._importText(svg);
			break;
		case 'path':
			item = this._importPath(svg);
			break;
		case 'polygon':
		case 'polyline':
			item = this._importPoly(svg);
			break;
		case 'symbol':
			item = this._importGroup(svg);
			this._importAttributesAndStyles(svg, item);
			symbol = new Symbol(item);
			item = null;
			break;
		default:
			// Not supported yet.
		}

		if (item)
			this._importAttributesAndStyles(svg, item);

		return item;
	},

		/**
		* Creates a Paper.js group by parsing a specific GNode of the 
		* imported SVG DOM
		*
		* @name ImportSvg#importGroup
		* @function
		* @param {XML DOM} svg A node passed in by the imported SVG
		* @return {Group} group A Paper.js group
		*
		*
		*/
	_importGroup: function(svg) {
		var group = new Group();
		var child;
		for (var i in svg.childNodes) {
			child = svg.childNodes[i];
			if (child.nodeType != 1)
				continue;
			item = this.importSvg(child);
			if (item)
				group.addChild(item);
		}

		return group;
	},

		/**
		* Creates a Path.Circle item in Paper.js using an imported 
		* Circle from SVG
		*
		* @name ImportSvg#importCircle
		* @function
		* @param {XML DOM} svgCircle An SVG circle node
		* @return {Path.Circle} circle A Path.Circle item for Paper.js
		*/
	_importCircle: function(svgCircle) {
		var cx = svgCircle.cx.baseVal.value || 0;
		var cy = svgCircle.cy.baseVal.value || 0;
		var r = svgCircle.r.baseVal.value || 0;
		var center = new Point(cx, cy);
		var circle = new Path.Circle(center, r);

		return circle;
	},

	
	/**
	* Creates a Path.Oval item in Paper.js using an imported Oval from SVG
	*
	* @name ImportSvg#importOval
	* @function
	* @param {XML DOM} svgOval An SVG ellipse node
	* @return {Path.Oval} oval A Path.Oval item for Paper.js
	*/
	_importOval: function(svgOval) {
		var cx = svgOval.cx.baseVal.value || 0;
		var cy = svgOval.cy.baseVal.value || 0;
		var rx = svgOval.rx.baseVal.value || 0;
		var ry = svgOval.ry.baseVal.value || 0;

		var center = new Point(cx, cy);
		var offset = new Point(rx, ry);
		var topLeft = center.subtract(offset);
		var bottomRight = center.add(offset);

		var rect = new Rectangle(topLeft, bottomRight);
		var oval = new Path.Oval(rect);

		return oval;
	},

		/**
		* Creates a Path.Rectangle item from an imported SVG rectangle
		*
		* @name ImportSvg#importRectangle
		* @function
		* @param {XML DOM} svgRectangle An SVG rectangle node
		* @return {Path.Rectangle} rectangle A Path.Rectangle item for 
		* Paper.js
		*/
		/**
		* Creates a Path.RoundRectangle item from an imported SVG 
		* rectangle with rounded corners
		*
		* @name ImportSvg#importRectangle
		* @function
		* @param {XML DOM} svgRectangle An SVG rectangle node with 
		* rounded corners
		* @return {Path.RoundRectangle} rectangle A Path.Rectangle item
		* for Paper.js
		*/
	_importRectangle: function(svgRectangle) {
		var x = svgRectangle.x.baseVal.value || 0;
		var y = svgRectangle.y.baseVal.value || 0;
		var rx = svgRectangle.rx.baseVal.value || 0;
		var ry = svgRectangle.ry.baseVal.value || 0;
		var width = svgRectangle.width.baseVal.value || 0;
		var height = svgRectangle.height.baseVal.value || 0;

		var topLeft = new Point(x, y);
		var size = new Size(width, height);
		var rectangle = new Rectangle(topLeft, size);

		if (rx && ry) {
			var cornerSize = new Size(rx, ry);
			rectangle = new Path.RoundRectangle(rectangle, cornerSize);
		} else {
			rectangle = new Path.Rectangle(rectangle);
		}

		return rectangle;
	},

	/**
	* Creates a Path.Line item in Paper.js from an imported SVG line
	*
	* @name ImportSvg#importLine
	* @function
	* @param {XML DOM} svgLine An SVG line node
	* @return {Path.Line} line A Path.Line item for Paper.js
	*/
	_importLine: function(svgLine) {
		var x1 = svgLine.x1.baseVal.value || 0;
		var y1 = svgLine.y1.baseVal.value || 0;
		var x2 = svgLine.x2.baseVal.value || 0;
		var y2 = svgLine.y2.baseVal.value || 0;

		var from = new Point(x1, y1);
		var to = new Point(x2, y2);
		var line = new Path.Line(from, to);

		return line;
	},

	/**
	* Creates a PointText item in Paper.js from an imported SVG text node
	*
	* @name ImportSvg#importText
	* @function
	* @param {XML DOM} svgText An SVG text node
	* @return {Path.Text} text A PointText item for Paper.js
	*/
	_importText: function(svgText) {
		var x = svgText.x.baseVal.getItem(0).value || 0;
		var y = svgText.y.baseVal.getItem(0).value || 0;

		var dx = 0;
		var dy = 0;
		if (svgText.dx.baseVal.numberOfItems) {
			dx = svgText.dx.baseVal.getItem(0).value || 0;
		}
		if (svgText.dy.baseVal.numberOfItems) {
			dy = svgText.dy.baseVal.getItem(0).value || 0;
		}
		
		var textLength = svgText.textLength.baseVal.value || 0;
		
		/* Not supported by Paper.js
		x; //multiple values for x
		y; //multiple values for y
		dx; //multiple values for x
		dy; //multiple values for y
		var rotate; //character rotation
		var lengthAdjust;
		*/
		var textContent = svgText.textContent || "";
		var bottomLeft = new Point(x, y);
		
		bottomLeft = bottomLeft.add([dx, dy]);
		bottomLeft = bottomLeft.subtract([textLength / 2, 0]);
		var text = new PointText(bottomLeft);
		text.content = textContent;

		return text;
	},

	/**
	* Creates a Paper.js Path by parsing
	* a specific SVG node (rectangle, path, circle, polygon, etc.)
	* and creating the right Path object based on the SVG type.
	*
	* @name ImportSvg#importPath
	* @function
	* @param {XML DOM} svg An SVG object
	* @return {Item} item A Paper.js item
	*/
	_importPath: function(svgPath) {
		var path = new Path();
		var segments = svgPath.pathSegList;
		var segment;
		var j;
		var relativeToPoint;
		var controlPoint;
		var prevCommand;
		var segmentTo;
		for (var i = 0; i < segments.numberOfItems; ++i) {
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

	/**
	 * Creates a Path.Poly item in Paper.js using an imported Polygon or
	 * Polyline SVG node
	 *
	 * @name ImportSvg#importPoly
	 * @function
	 * @param {XML DOM} svgPoly An SVG polygon or polyline node
	 * @return {Path.Poly} poly A Path.Poly item for Paper.js
	 *   - svg polyline node (xml dom)
	 *   - svg polygon node (xml dom)
	 * returns a Path item
	 */
	_importPoly: function(svgPoly) {
		var poly = new Path();
		var points = svgPoly.points;
		var start = points.getItem(0);
		var point;
		poly.moveTo([start.x, start.y]);

		for (var i = 1; i < points.length; ++i) {
			point = points.getItem(i);
			poly.lineTo([point.x, point.y]);
		}
		if (svgPoly.nodeName.toLowerCase() == 'polygon') {
			poly.closePath();
		}

		return poly;
	},

	/**
	 * Converts various SVG styles and attributes into Paper.js styles and
	 * attributes
	 * This method is destructive to item (changes happen to it)
	 *
	 * @name ImportSvg#importAttributesAndStyles
	 * @function
	 * @param {XML DOM} svg An SVG node
	 * @param {Item} item A Paper.js item
	 */
	_importAttributesAndStyles: function(svg, item) {
		var name,
			value,
			cssName;
		for (var i = 0; i < svg.style.length; ++i) {
			name = svg.style[i];
			cssName = name.replace(/-(.)/g, function(match, p) {
				return p.toUpperCase();
			});
			value = svg.style[cssName];
			this._applyAttributeOrStyle(name, value, item, svg);
		}
		for (var i = 0; i < svg.attributes.length; ++i) {
			name = svg.attributes[i].name;
			value = svg.attributes[i].value;
			this._applyAttributeOrStyle(name, value, item, svg);
		}
	},

	/**
	 * Parses an SVG style attibute and applies it to a Paper.js item
	 * This method is destructive to item (changes happen to it)
	 *
	 * @name ImportSvg#applyAttributeOrStyle
	 * @function
	 * @param {Style Name} name An SVG style name
	 * @param {Style Value} value The value of an SVG style
	 * @param {Item} item A Paper.js item
	 * @param {XML DOM} svg An SVG node
	 */
	 _applyAttributeOrStyle: function(name, value, item, svg) {
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
			this._applyTransform(item, svg);
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
				for (var i = 0; i < text.style.length; ++i) {
					var n = text.style[i];
					this._applyAttributeOrStyle(n, text.style[n], item, svg);
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
	},

	/**
	 * Applies the transformations specified on the SVG node to the newly
	 * made Paper.js item
	 * This method is destructive to item
	 *
	 * @name ImportSvg#applyTransform
	 * @function
	 * @param {XML DOM} An SVG node
	 * @param {Item} A Paper.js item
	 */
	_applyTransform: function(item, svg) {
		var transforms = svg.transform.baseVal;
		var transform;
		var matrix = new Matrix();

		for (var i = 0; i < transforms.numberOfItems; ++i) {
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
});
