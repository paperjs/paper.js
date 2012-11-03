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
  * @name SvgExporter
  *
  * @class The SvgExporter object holds all the functionality to convert a
  * Paper.js DOM to a SVG DOM.
  */

var SvgExporter = this.SvgExporter = /** @Lends SvgExporter */{

	create: function(tag) {
		return document.createElementNS('http://www.w3.org/2000/svg', tag);
	},

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
		var svg = this.create('svg'),
			layers = project.layers;
		for (var i = 0, l = layers.length; i < l; i++) {
			svg.appendChild(this.exportLayer(layers[i]));
		}
		return svg;
	},

	/**
	 * 
	 * Takes the selected Paper.js layer and parses all groups
	 * and items on the layer into one SVG
	 * 
	 * @name SvgExporter#exportLayer
	 * @function
	 * @param {Layer} layer a Paper.js layer
	 * @return {SVGSVGElement} the layer converted into an SVG group
	 */
	exportLayer: function(layer) {
		return this.exportGroup(layer);
	},

	/**
	 * 
	 * Takes a Paper.js group and puts its items in a SVG file.
	 * 
	 * @name SvgExporter#exportGroup
	 * @function
	 * @param {Group} group a Paper.js group
	 * @return {SVGSVGElement} an SVG object
	 */
	exportGroup: function(group) {
		var svg = this.create('g'),
			children = group._children;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			if (child._children) {
				svg.appendChild(this.exportGroup(child));
			} else {
				svg.appendChild(this.exportPath(child));
			}
		}
		return svg;
	},
	
	/**
	 * 
	 * Takes the path and puts it in
	 * a svg file.
	 * 
	 * @name SvgExporter#exportPath
	 * @function
	 * @param {Path} path a Paper.js path object
	 * @return {SVGSVGElement} an SVG object of the imported path
	 */
	exportPath: function(path) {
		var svg;
		//Getting all of the segments(a point, a HandleIn and a HandleOut) in the path
		var segArray;
		var pointArray;
		var handleInArray;
		var handleOutArray;
		var type;
		//finding the type of path to export
		if (path.content) {
			type = 'text';
		} else {
			//Values are only defined if the path is not text because
			// text does not have these values
			segArray = path.getSegments();
			pointArray = [];
			handleInArray = [];
			handleOutArray = [];
			for (i = 0; i < segArray.length; i++) {
				pointArray[i] = segArray[i].getPoint();
				handleInArray[i] = segArray[i].getHandleIn();
				handleOutArray[i] = segArray[i].getHandleOut();
			}
			var exp = this;
			type = exp._determineType(path, segArray, pointArray, handleInArray, handleOutArray);
		}
		//switch statement that determines what type of SVG element to add to the SVG Object
		switch (type) {
		case 'rect':
			var width = pointArray[0].getDistance(pointArray[3]);
			var height = pointArray[0].getDistance(pointArray[1]);
			svg = this.create('rect');
			svg.setAttribute('x', path.bounds.topLeft.getX());
			svg.setAttribute('y', path.bounds.topLeft.getY());
			svg.setAttribute('width', width);
			svg.setAttribute('height', height);
			break;
		case 'roundRect':
			//d variables and point are used to determine the rounded corners for the rounded rectangle
			var dx1 = pointArray[1].getDistance(pointArray[6]);
			var dx2 = pointArray[0].getDistance(pointArray[7]);
			var dx3 = (dx1 - dx2) / 2;
			var dy1 = pointArray[0].getDistance(pointArray[3]);
			var dy2 = pointArray[1].getDistance(pointArray[2]);
			var dy3 = (dy1 - dy2) / 2;
			var point = new Point((pointArray[3].getX() - dx3), (pointArray[2].getY() - dy3)); 
			var width = Math.round(dx1);
			var height = Math.round(dy1);
			var rx = pointArray[3].getX() - point.x;
			var ry = pointArray[2].getY() - point.y;
			svg = this.create('rect');
			svg.setAttribute('x', path.bounds.topLeft.getX());
			svg.setAttribute('y', path.bounds.topLeft.getY());
			svg.setAttribute('rx', rx);
			svg.setAttribute('ry', ry);
			svg.setAttribute('width', width);
			svg.setAttribute('height', height);
			break;
		case'line':
			svg = this.create('line');
			svg.setAttribute('x1', pointArray[0].getX());
			svg.setAttribute('y1', pointArray[0].getY());
			svg.setAttribute('x2', pointArray[pointArray.length - 1].getX());
			svg.setAttribute('y2', pointArray[pointArray.length - 1].getY());
			break;
		case 'circle':
			svg = this.create('circle');
			var radius = (pointArray[0].getDistance(pointArray[2], false)) /2;
			svg.setAttribute('cx', path.bounds.center.x);
			svg.setAttribute('cy', path.bounds.center.y);
			svg.setAttribute('r', radius);
			break;
		case 'ellipse':
			svg = this.create('ellipse');
			var radiusX = (pointArray[2].getDistance(pointArray[0], false)) / 2;
			var radiusY = (pointArray[3].getDistance(pointArray[1], false)) /2;
			svg.setAttribute('cx', path.bounds.center.x);
			svg.setAttribute('cy', path.bounds.center.y);
			svg.setAttribute('rx', radiusX);
			svg.setAttribute('ry', radiusY);
			break;
		case 'polyline':
			svg = this.create('polyline');
			var pointString = '';
			for(i = 0; i < pointArray.length; ++i) {
				pointString += pointArray[i].getX() + ','  + pointArray[i].getY() + ' ';
			}
			svg.setAttribute('points', pointString);
			break;
		case 'polygon':
			svg = this.create('polygon');
			var pointString = '';
			for(i = 0; i < pointArray.length; ++i) {
				pointString += pointArray[i].getX() + ',' + pointArray[i].getY() + ' ';
			}
			svg.setAttribute('points', pointString);
			break;
		case 'text':
			svg = this.create('text');
			svg.setAttribute('x', path.getPoint().getX());
			svg.setAttribute('y', path.getPoint().getY());
			if (path.style.font != undefined) {
				svg.setAttribute('font', path.style.font);
			}
			if (path.characterStyle.font != undefined) {
				svg.setAttribute('font-family', path.characterStyle.font);
			}
			if (path.characterStyle.fontSize != undefined) {
				svg.setAttribute('font-size',path.characterStyle.fontSize);
			}
			svg.textContent = path.getContent();
			break;
		default:
			svg = this.create('path');
			svg = this.pathSetup(path, pointArray, handleInArray, handleOutArray);
			break;
		}
		//If the object is a circle, ellipse, rectangle, or rounded rectangle, it will find the angle 
		//found by the determineIfTransformed method and make a path that accommodates for the transformed object
		if (type != 'text' && type != undefined && type != 'polygon' &&  type != 'polyline' && type != 'line') {
			//TODO: Need to implement exported transforms for circle, ellipse, and rectangles instead of 
			//making them paths
			var angle = this._determineIfTransformed(path, pointArray, type) + 90;
			if (angle != 0) {
				if (type == 'rect' || type == 'roundRect') {
					svg = this.create('path');
					svg = this.pathSetup(path, pointArray, handleInArray, handleOutArray);
				} else {
					svg = this.create('path');
					svg = this.pathSetup(path, pointArray, handleInArray, handleOutArray);
				}
			} 
		}
		if (type == 'text') {
			svg.setAttribute('transform','rotate(' + path.matrix.getRotation() + ',' + path.getPoint().getX() + ',' +path.getPoint().getY() +')');
		}
		if (path.id != undefined) {
			svg.setAttribute('id', path.id);
		}
		//checks if there is a stroke color in the passed in path
		//adds an SVG element attribute with the defined stroke color
		if (path.strokeColor != undefined) {
			svg.setAttribute('stroke', path.strokeColor.toCssString());
		}
		//same thing as above except checking for a fill color
		if (path.fillColor != undefined) {
			svg.setAttribute('fill', path.fillColor.toCssString());
		} else {
			svg.setAttribute('fill', 'rgba(0,0,0,0)');
		}
		//same thing as stroke color except with stroke width
		if (path.strokeWidth != undefined) {
			svg.setAttribute('stroke-width', path.strokeWidth);
		}
		//same thing as stroke color except with the path name
		if (path.name != undefined) {
			svg.setAttribute('name', path.name);
		}
		//same thing as stroke color except with the strokeCap
		if (path.strokeCap != undefined) {
			svg.setAttribute('stroke-linecap', path.strokeCap);
		}
		//same thing as stroke color except with the strokeJoin
		if (path.strokeJoin != undefined) {
			svg.setAttribute('stroke-linejoin', path.strokeJoin);
		}
		//same thing as stroke color except with the opacity
		if (path.opacity != undefined) {
			svg.setAttribute('opacity', path.opacity);
		}
		//checks to see if there the dashArray is set, then adds the attribute if there is.
		if (path.dashArray[0] != undefined) {
			var dashVals = '';
			for (var i = 0, l = path.dashArray.length; i < l; i++) {
				if (i != path.dashArray.length -1) {
					dashVals += path.dashArray[i] + ", ";
				} else {
					dashVals += path.dashArray[i];
				}
			}
			svg.setAttribute('stroke-dasharray', dashVals);
		}
		//same thing as stroke color except with the dash offset
		if (path.dashOffset != undefined) {
			svg.setAttribute('stroke-dashoffset', path.dashOffset);
		}
		//same thing as stroke color except with the miter limit
		if (path.miterLimit != undefined) {
			svg.setAttribute('stroke-miterlimit', path.miterLimit);
		}
		//same thing as stroke color except with the visibility
		if (path.visibility != undefined) {
			var visString = '';
			if (path.visibility) {
				visString = 'visible';
			} else {
				visString = 'hidden';
			}
			svg.setAttribute('visibility', visString);
		}
		return svg;
	},

	//Determines whether the object has been transformed or not through finding the angle
	_determineIfTransformed: function(path, pointArray, type) {
		var topMidBoundx = (path.bounds.topRight.getX() + path.bounds.topLeft.getX() )/2;
		var topMidBoundy = (path.bounds.topRight.getY() + path.bounds.topLeft.getY() )/2;
		var topMidBound = new Point(topMidBoundx, topMidBoundy);
		var centerPoint = path.getPosition();
		var topMidPathx;
		var topMidPathy;
		var topMidPath;
		switch (type) {
		case 'rect':
			topMidPathx = (pointArray[1].getX() + pointArray[2].getX() )/2;
			topMidPathy = (pointArray[1].getY() + pointArray[2].getY() )/2;
			topMidPath = new Point(topMidPathx, topMidPathy);
			break;
		case 'ellipse':
			topMidPath = new Point(pointArray[1].getX(), pointArray[1].getY());
			break;
		case 'circle':
			topMidPath = new Point(pointArray[1].getX(), pointArray[1].getY());
			break;
		case 'roundRect':
			topMidPathx = (pointArray[3].getX() + pointArray[4].getX())/2;
			topMidPathy = (pointArray[3].getY() + pointArray[4].getY())/2;
			topMidPath = new Point(topMidPathx, topMidPathy);
			break;	
		default:
			//Nothing happens here
			break;
		}
		var deltaY = topMidPath.y - centerPoint.getY();
		var deltaX = topMidPath.x - centerPoint.getX();
		var angleInDegrees = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
		return angleInDegrees;
	},
	
	//pointstring is formatted in the way the SVG XML will be reading
	//Namely, a point and the way to traverse to that point
	pathSetup: function(path, pointArray, hIArray, hOArray) {
		var svgPath = this.create('path');
		var pointString = '';
		var x1;
		var x2;
		var y1;
		var y2;
		var handleOut1;
		var handleIn2;
		pointString += 'M' + pointArray[0].getX() + ',' + pointArray[0].getY() + ' ';
		//Checks 2 points and the angles in between the 2 points
		for (i = 0; i < pointArray.length-1; i++) {
			x1 = pointArray[i].getX();
			y1 = pointArray[i].getY();
			x2 = pointArray[i + 1].getX();
			y2 = pointArray[i + 1].getY();
			handleOut1 = hOArray[i];
			handleIn2 = hIArray[i+1];
			if (handleOut1.getX() == 0 && handleOut1.getY() == 0 && handleIn2.getX() == 0 && handleIn2.getY() == 0) {
					//L is lineto, moving to a point with drawing
					pointString+= 'L' + x2 + ',' + y2 + ' ';
			} else {
				//c is curveto, relative: handleOut, handleIn - endpoint, endpoint - startpoint
				pointString+= 'c' + (handleOut1.getX())  + ',' + (handleOut1.getY()) + ' ';
				pointString+= (x2 - x1 + handleIn2.getX()) + ',' + (y2 - y1 + handleIn2.getY()) + ' ';
				pointString+= (x2 - x1) + ',' + (y2-y1) +  ' ';
			}
		}
		if (!hOArray[hOArray.length - 1].equals([0, 0]) && !hIArray[0].equals([0, 0])) {
			handleOut1 = hOArray[hOArray.length - 1];
			handleIn2 = hIArray[0];
			// Bezier curve from last point to first
			x1 = pointArray[pointArray.length - 1].getX();
			y1 = pointArray[pointArray.length - 1].getY();
			x2 = pointArray[0].getX();
			y2 = pointArray[0].getY();
			pointString+= 'c' + (handleOut1.getX())  + ',' + (handleOut1.getY()) + ' ';
			pointString+= (x2 - x1 + handleIn2.getX()) + ',' + (y2 - y1 + handleIn2.getY()) + ' ';
			pointString+= (x2 - x1) + ',' + (y2-y1) +  ' ';
		}
		if (path.getClosed())
		{
			//Z implies a closed path, connecting the first and last points
			pointString += 'z';
		}
		svgPath.setAttribute('d',pointString);
		return svgPath;
	},	

	/**
	* Checks the type SVG object created by converting from Paper.js
	*
	* @name SvgExporter#checkType
	* @function
	* @param {Array} segArray An array of objects for the newly
	* converted SVG object
	* @return {String} type A string labeling which type of object the 
	* passed in object is
	*/
	_determineType: function(path, segArray, pointArray, handleInArray, handleOutArray) {
		var type;
		var dPoint12;
		var dPoint34;
		var curves = false;	
		var segHandleIn;
		var segHandleOut;
		for( var i = 0, l = segArray.length; i < l; i++) {
			//Checks for any curves (if the handles have values). Differentiates between straight objects(line, polyline, rect, and polygon) and
			//and objects with curves(circle, ellipse, roundedRectangle).
			segHandleIn = segArray[i].getHandleIn();
			segHandleOut = segArray[i].getHandleOut();
			curves = segHandleIn.getX() != 0 || segHandleIn.getY() != 0 ? true : curves;
			curves = segHandleOut.getX() != 0 || segHandleOut.getY() != 0 ? true : curves;			
		}
		//Checks for curves in the passed in segments
		//Checks if the type of the passed in path is a rounded rectangle, an ellipse, a circle, or if it's simply a path
		//If there aren't any curves (if curves = false), then it checks if the type is a rectangle, a polygon, a polyline, or simply a line.
		if (curves) {
			if (segArray.length == 8) {
				//if the distance between (point0 and point3) and (point7 and point4) are equal then it is a roundedRectangle
				dPoint12 = Math.round(pointArray[0].getDistance(pointArray[3], false));
				dPoint34 = Math.round(pointArray[7].getDistance(pointArray[4], false));
				if (dPoint12 == dPoint34) {
					type = 'roundRect';
				}
			} else if (segArray.length == 4) {
				//checks if the values of the point have values similar to circles and ellipses
				var checkPointValues = true;
				for(i = 0; i < pointArray.length && checkPointValues == true; i++) {
					if (handleInArray[i].getX() != 0 || handleInArray[i].getY() != 0 && Math.round(Math.abs(handleInArray[i].getX())) === Math.round(Math.abs(handleOutArray[i].getX())) && Math.round(Math.abs(handleInArray[i].getY())) === Math.round(Math.abs(handleOutArray[i].getY()))) {
						checkPointValues = true;
					} else {
						checkPointValues = false;
					}	
				}	
				if (checkPointValues == true) {
					//if the distance between (point0 and point2) and (point1 and point3) are equal, then it is a circle
					var d1 = Math.round(pointArray[0].getDistance(pointArray[2], false));
					var d2 = Math.round(pointArray[1].getDistance(pointArray[3], false));
					if (d1 == d2) {
						type = 'circle';
					} else {
						type = 'ellipse';
					}
				}
			} 
		} else if (!curves) {
			if (segArray.length == 4) {
				//if the distance between (point0 and point1) and (point2 and point3) are equal, then it is a rectangle
				dPoint12 = Math.round(pointArray[0].getDistance(pointArray[1], false));
				dPoint34 = Math.round(pointArray[3].getDistance(pointArray[2], false));
				if (dPoint12 == dPoint34) {
					type = 'rect';
				}
			} else if (segArray.length >= 3) {
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
			type = null;
		}
		return type;
	}
};
