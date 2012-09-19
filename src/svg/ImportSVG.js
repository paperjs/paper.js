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
 * @name ImportSVG
 * @class The ImportSVG object represents an object created using the SVG
 * Canvas that will be converted into a Paper.js object. 
 * The SVG object is imported into Paper.js by converting it into items 
 * within groups.
 *
 */

var ImportSVG = this.ImportSVG = Base.extend(/** @Lends ImportSVG# */{

	/**
	 * Creates a Paper.js object using data parsed from the selected SVG
	 * Document Object Model (DOM). The SVG object is imported, than a layer
	 * is created (with groups for the items if needed).
	 *
	 * Supports nested groups
	 *
	 * @param {SVG DOM} svg An SVG DOM object with parameters
	 * @return {Layer} A Paper.js layer
	 */

	importSVG: function(svg)
	{
	var layer = new Layer();
	groups = this.importGroup(svg);
	layer.addChild(groups);

	return layer;
	},
	
	/**
	 * Creates a Paper.js group by parsing a specific GNode of the imported
	 * SVG DOM
	 * 
	 * @name ImportSVG#importGroup
	 * @function
	 * @param {XML DOM} svg  A node passed in by the imported SVG
	 * @return {Group} group A Paper.js group
	 *
	 *
	 */
	importGroup: function(svg)
	{
		var group = new Group();
		var child;
		for (var i in svg.childNodes) {
			child = svg.childNodes[i];
			if (child.nodeType != 1) {
				continue;
			}
			item = this.importPath(child);
			group.addChild(item);
		}
		
		return group;
	},

	/**
	 * Creates a Paper.js Path by parsing
	 * a specific SVG node (rectangle, path, circle, polygon, etc.)
	 * and creating the right Path object based on the SVG type.
	 *
	 * @name ImportSVG#importPath
	 * @function
	 * @param {XML DOM} svg An SVG object
	 * @return {Item} item A Paper.js item
	 */
	importPath: function(svg)
	{
		switch (svg.nodeName.toLowerCase()) {
			case 'line':
				item = this._importLine(svg);
				break;
			case 'rect':
				item = this._importRectangle(svg);
				break;
			case 'ellipse':
				item = this._importOval(svg);
				break;
			case 'g':
				item = this.importGroup(svg);
				break;
			case 'text':
				item = this._importText(svg);
				break;
			default:
			break;
		}
		
		return item;
	},

	/**
	 * Creates a Path.Circle item in Paper.js using an imported Circle from
	 * SVG
	 *
	 * @name ImportSVG#importCircle
	 * @function
	 * @param {XML DOM} svgCircle An SVG circle node
	 * @return {Path.Circle} circle A Path.Circle item for Paper.js
	 */
	_importCircle: function(svgCircle)
	{
		var cx		= svgCircle.cx.baseVal.value || 0;
		var cy		= svgCircle.cy.baseVal.value || 0;
		var r		= svgCircle.r.baseVal.value || 0;
		var center	= new Point(cx, cy);
		var circle	= new Path.Circle(center, r);

		return circle;
	},

	/**
	 * Creates a Path.Oval item in Paper.js using an imported Oval from SVG
	 *
	 * @name ImportSVG#importOval
	 * @function
	 * @param {XML DOM} svgOval An SVG ellipse node
	 * @return {Path.Oval} oval A Path.Oval item for Paper.js
	 */
	_importOval: function(svgOval)
	{
		var cx			= svgOval.cx.baseVal.value || 0;
		var cy			= svgOval.cy.baseVal.value || 0;
		var rx			= svgOval.rx.baseVal.value || 0;
		var ry			= svgOval.ry.baseVal.value || 0;

		var center		= new Point(cx, cy);
		var offset		= new Point(rx, ry);
		var topLeft		= center.subtract(offset);
		var bottomRight	= center.add(offset);

		var rect		= new Rectangle(topLeft, bottomRight);
		var oval		= new Path.Oval(rect);

		return oval;
	},

	/**
	 * Creates a Path.Rectangle item from an imported SVG rectangle
	 *
	 * @name ImportSVG#importRectangle
	 * @function
	 * @param {XML DOM} svgRectangle An SVG rectangle node
	 * @return {Path.Rectangle} rectangle A Path.Rectangle item for Paper.js
	 */
	 /**
	 * Creates a Path.RoundRectangle item from an imported SVG rectangle
	 * with rounded corners
	 *
	 * @name ImportSVG#importRectangle
	 * @function
	 * @param {XML DOM} svgRectangle An SVG rectangle node with rounded
	 * corners
	 * @return {Path.RoundRectangle} rectangle A Path.Rectangle item for
	 * Paper.js
	 */
	_importRectangle: function(svgRectangle)
	{
		var x			= svgRectangle.x.baseVal.value || 0;
		var y			= svgRectangle.y.baseVal.value || 0;
		var rx			= svgRectangle.rx.baseVal.value || 0;
		var ry			= svgRectangle.ry.baseVal.value || 0;
		var width		= svgRectangle.width.baseVal.value || 0;
		var height		= svgRectangle.height.baseVal.value || 0;

		var topLeft		= new Point(x, y);
		var size		= new Size(width, height);
		var rectangle	= new Rectangle(topLeft, size);

		if (rx > 0 || ry > 0) {
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
	 * @name ImportSVG#importLine
	 * @function
	 * @param {XML DOM} svgLine An SVG line node
	 * @return {Path.Line} line A Path.Line item for Paper.js
	 */
	_importLine: function(svgLine)
	{
		var x1		= svgLine.x1.baseVal.value || 0;
		var y1		= svgLine.y1.baseVal.value || 0;
		var x2		= svgLine.x2.baseVal.value || 0;
		var y2		= svgLine.y2.baseVal.value || 0;

		var from	= new Point(x1, y1);
		var to		= new Point(x2, y2);
		var line	= new Path.Line(from, to);

		return line;
	},

	/**
	 * Creates a PointText item in Paper.js from an imported SVG text node
	 *
	 * @name ImportSVG#importText
	 * @function
	 * @param {XML DOM} svgText An SVG text node
	 * @return {Path.Text} text A PointText item for Paper.js
	 */
	_importText: function(svgText)
	{
		//TODO: Extend this for multiple values
		var x	= svgText.x.baseVal.getItem(0).value || 0;
		var y	= svgText.y.baseVal.getItem(0).value || 0;
		//END:Todo
		
		var dx; //character kerning
		var dy; //character baseline
		var rotate; //character rotation
		var textLength; //the width of the containing box
		var lengthAdjust; //
		var textContent = svgText.textContent || "";
		
		var topLeft = new Point(x, y);
		var text = new PointText(topLeft);
		text.content = textContent;
		return text;
	}
});
