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
 * @name PathItem
 *
 * @class The PathItem class is the base for any items that describe paths
 * and offer standardised methods for drawing and path manipulation, such as
 * {@link Path} and {@link CompoundPath}.
 *
 * @extends Item
 */
var PathItem = this.PathItem = Item.extend(/** @lends PathItem# */{
	// All PathItems directly apply transformations by default.
	applyMatrix: true,

	/**
	 * Returns all intersections between two {@link PathItem} items as an array
	 * of {@link CurveLocation} objects. {@link CompoundPath} items are also
	 * supported.
	 *
	 * @param {PathItem} path the other item to find the intersections to.
	 * @return {CurveLocation[]} the locations of all intersection between the
	 * paths
	 * @example {@paperscript}
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * var secondPath = path.clone();
	 * var intersectionGroup = new Group();
	 *
	 * function onFrame(event) {
	 * 	secondPath.rotate(3);
	 *
	 * 	var intersections = path.getIntersections(secondPath);
	 * 	intersectionGroup.removeChildren();
	 *
	 * 	for (var i = 0; i < intersections.length; i++) {
	 * 		var intersectionPath = new Path.Circle({
	 * 			center: intersections[i].point,
	 * 			radius: 4,
	 * 			fillColor: 'red'
	 * 		});
	 * 		intersectionGroup.addChild(intersectionPath);
	 * 	}
	 * }
	 */
	getIntersections: function(path) {
		// First check the bounds of the two paths. If they don't intersect,
		// we don't need to iterate through their curves.
		if (!this.getBounds().touches(path.getBounds()))
			return [];
		var locations = [],
			curves1 = this.getCurves(),
			curves2 = path.getCurves(),
			length2 = curves2.length,
			values2 = [];
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues();
		for (var i = 0, l = curves1.length; i < l; i++) {
			var curve1 = curves1[i],
				values1 = curve1.getValues();
			for (var j = 0; j < length2; j++)
				Curve.getIntersections(values1, values2[j], curve1, curves2[j],
						locations);
		}
		return locations;
	},

	setPathData: function(data) {
		// This is a very compact SVG Path Data parser that works both for Path
		// and CompoundPath.

		var parts = data.match(/[a-z][^a-z]*/ig),
			coords,
			relative = false,
			control,
			current = new Point(); // the current position

		function getCoord(index, coord, update) {
			var val = parseFloat(coords[index]);
			if (relative)
				val += current[coord];
			if (update)
				current[coord] = val;
			return val;
		}

		function getPoint(index, update) {
			return new Point(
				getCoord(index, 'x', update),
				getCoord(index + 1, 'y', update)
			);
		}

		// First clear the previous content
		if (this._type === 'path')
			this.removeSegments();
		else
			this.removeChildren();

		for (var i = 0, l = parts.length; i < l; i++) {
			var part = parts[i];
				cmd = part[0],
				lower = cmd.toLowerCase();
			// Split at white-space, commas but also before signs.
			// Use positive lookahead to include signs.
			coords = part.slice(1).trim().split(/[\s,]+|(?=[+-])/);
			relative = cmd === lower;
			var length = coords.length;
			switch (lower) {
			case 'm':
			case 'l':
				for (var j = 0; j < length; j += 2)
					this[j === 0 && lower === 'm' ? 'moveTo' : 'lineTo'](
							getPoint(j, true));
				break;
			case 'h':
			case 'v':
				var coord = lower == 'h' ? 'x' : 'y';
				for (var j = 0; j < length; j++) {
					getCoord(j, coord, true);
					this.lineTo(current);
				}
				break;
			case 'c':
				for (var j = 0; j < length; j += 6) {
					this.cubicCurveTo(
							getPoint(j),
							control = getPoint(j + 2),
							getPoint(j + 4, true));
				}
				break;
			case 's':
				// Shorthand cubic bezierCurveTo, absolute
				for (var j = 0; j < length; j += 4) {
					this.cubicCurveTo(
							// Calculate reflection of previous control points
							current.multiply(2).subtract(control),
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 'q':
				for (var j = 0; j < length; j += 4) {
					this.quadraticCurveTo(
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 't':
				for (var j = 0; j < length; j += 2) {
					this.quadraticCurveTo(
							// Calculate reflection of previous control points
							control = current.multiply(2).subtract(control),
							getPoint(j, true));
				}
				break;
			case 'a':
				// TODO: Implement Arcs!
				break;
			case 'z':
				this.closePath();
				break;
			}
		}
	},


	/**
	 * A boolean operator is a binary operator function of the form
	 * f( isPath1:boolean, isInsidePath1:Boolean, isInsidePath2:Boolean ) :Boolean
	 *
	 * Boolean operator determines whether a curve segment in the operands is part
	 * of the boolean result, and will be called for each curve segment in the graph after
	 * all the intersections between the operands are calculated and curves in the operands
	 * are split at intersections.
	 *
	 * These functions should have a name ( "union", "subtraction" etc. below ), if we need to
	 * do operator specific operations on paths inside the computeBoolean function.
	 *  for example: if the name of the operator is "subtraction" then we need to reverse the second
	 *                  operand. Subtraction is neither associative nor commutative.
	 *
	 *  The boolean operator should return a Boolean value indicating whether to keep the curve or not.
	 *  return true - keep the curve
	 *  return false - discard the curve
	*/
	unite: function( path, _cache ){
	    var unionOp = function union( isPath1, isInsidePath1, isInsidePath2 ){
	        return ( isInsidePath1 || isInsidePath2 )? false : true;
	    };
	    return computeBoolean( this, path, unionOp, _cache );
	},

	intersect: function( path, _cache ){
	    var intersectionOp = function intersection( isPath1, isInsidePath1, isInsidePath2 ){
	        return ( !isInsidePath1 && !isInsidePath2 )? false : true;
	    };
	    return computeBoolean( this, path, intersectionOp, _cache );
	},

	subtract: function( path, _cache ){
	    var subtractionOp = function subtraction( isPath1, isInsidePath1, isInsidePath2 ){
	        return ( (isPath1 && isInsidePath2) || (!isPath1 && !isInsidePath1) )? false : true;
	    };
	    return computeBoolean( this, path, subtractionOp, _cache );
	},

	/*
	 * Compound boolean operators combine the basic boolean operations such as union, intersection,
	 * subtract etc.
	 *
	 * TODO: cache the split objects and find a way to properly clone them!
	 */
	// a.k.a. eXclusiveOR
	exclude: function( path ){
	    var res1 = this.subtract( path );
	    var res2 = path.subtract( this );
	    var res = new Group( [res1, res2] );
	    return res;
	},

	// Divide path1 by path2
	divide: function( path ){
	    var res1 = this.subtract( path );
	    var res2 = this.intersect( path );
	    var res = new Group( [res1, res2] );
	    return res;
	},

	_splitPath: function( _ixs, other ) {
	    // Sort function for sorting intersections in the descending order
	    function sortIx( a, b ) { return b.parameter - a.parameter; }
	    other = other || false;
	    var i, j, k, l, len, ixs, ix, path, crv, vals;
	    var ixPoint, nuSeg;
	    var paths = {}, lastPathId = null;
	    for (i = 0, l = _ixs.length; i < l; i++) {
	        ix = ( other )? _ixs[i].getIntersection() : _ixs[i];
	        if( !paths[ix.path.id] ){
	            paths[ix.path.id] = ix.path;
	        }
	        if( !ix.curve._ixParams ){ix.curve._ixParams = []; }
	        ix.curve._ixParams.push( { parameter: ix.parameter, pair: ix.getIntersection() } );
	    }
	    for (k in paths) {
	        if( !paths.hasOwnProperty( k ) ){ continue; }
	        path = paths[k];
	        var lastNode = path.lastSegment, firstNode = path.firstSegment;
	        var nextNode = null, left = null, right = null, parts = null, isLinear;
	        var handleIn, handleOut;
	        while( nextNode !== firstNode){
	            nextNode = ( nextNode )? nextNode.previous: lastNode;
	            if( nextNode.curve._ixParams ){
	                ixs = nextNode.curve._ixParams;
	                ixs.sort( sortIx );
	                crv = nextNode.getCurve();
	                isLinear = crv.isLinear();
	                crv = vals = null;
	                for (i = 0, l = ixs.length; i < l; i++) {
	                    ix = ixs[i];
	                    crv = nextNode.getCurve();
	                    if( !vals ) vals = crv.getValues();
	                    if( ix.parameter === 0.0 || ix.parameter === 1.0 ){
	                        // Intersection is on an existing node
	                        // no need to create a new segment,
	                        // we just link the corresponding intersections together
	                        nuSeg = ( ix.parameter === 0.0 )? crv.segment1 : crv.segment2;
	                        nuSeg._ixPair = ix.pair;
	                        nuSeg._ixPair._segment = nuSeg;
	                    } else {
	                        parts = Curve.subdivide( vals, ix.parameter );
	                        left = parts[0];
	                        right = parts[1];
	                        handleIn = handleOut = null;
	                        ixPoint = new Point( right[0], right[1] );
	                        if( !isLinear ){
	                            crv.segment1.handleOut = new Point( left[2] - left[0], left[3] - left[1] );
	                            crv.segment2.handleIn = new Point( right[4] - right[6], right[5] - right[7] );
	                            handleIn = new Point( left[4] - ixPoint.x, left[5] - ixPoint.y );
	                            handleOut = new Point( right[2] - ixPoint.x, right[3] - ixPoint.y );
	                        }
	                        nuSeg = new Segment( ixPoint, handleIn, handleOut );
	                        nuSeg._ixPair = ix.pair;
	                        nuSeg._ixPair._segment = nuSeg;
	                        path.insert( nextNode.index + 1,  nuSeg );
	                    }
	                    for (j = i + 1; j < l; j++) {
	                        ixs[j].parameter = ixs[j].parameter / ix.parameter;
	                    }
	                    vals = left;
	                }
	            }
	        }
	    }
	},

	/**
	 * To deal with a HTML canvas requirement where CompoundPaths' child contours
	 * has to be of different winding direction for correctly filling holes.
	 * But if some individual countours are disjoint, i.e. islands, we have to
	 * reorient them so that
	 *   the holes have opposit winding direction ( already handled by paperjs )
	 *   islands has to have same winding direction ( as the first child of the path )
	 *
	 * Does NOT handle selfIntersecting CompoundPaths.
	 *
	 * @param  {CompoundPath} path - Input CompoundPath, Note: This path could be modified if need be.
	 * @return {boolean}      the winding direction of the base contour( true if clockwise )
	 */
	_reorientCompoundPath: function( path ){
	    if( !(path instanceof CompoundPath) ){
	        path.closed = true;
	        return path.clockwise;
	    }
	    var children = path.children, len = children.length, baseWinding;
	    var bounds = new Array( len );
	    var tmparray = new Array( len );
	    baseWinding = children[0].clockwise;
	    // Omit the first path
	    for (i = 0; i < len; i++) {
	        children[i].closed = true;
	        bounds[i] = children[i].bounds;
	        tmparray[i] = 0;
	    }
	    for (i = 0; i < len; i++) {
	        var p1 = children[i];
	        for (j = 0; j < len; j++) {
	            var p2 = children[j];
	            if( i !== j && bounds[i].contains( bounds[j] ) ){
	                tmparray[j]++;
	            }
	        }
	    }
	    for (i = 1; i < len; i++) {
	        if ( tmparray[i] % 2 === 0 ) {
	            children[i].clockwise = baseWinding;
	        }
	    }
	    return baseWinding;
	},

	reversePath: function( path ){
	    var baseWinding;
	    if( path instanceof CompoundPath ){
	        var children = path.children, i, len;
	        for (i = 0, len = children.length; i < len; i++) {
	            children[i].reverse();
	            children[i]._curves = null;
	        }
	        baseWinding = children[0].clockwise;
	    } else {
	        path.reverse();
	        baseWinding = path.clockwise;
	        path._curves = null;
	    }
	    return baseWinding;
	},

	_computeBoolean: function( path1, path2, operator, _splitCache ){
	    var _path1, _path2, path1Clockwise, path2Clockwise;
	    var ixs, path1Id, path2Id;
	    // We do not modify the operands themselves
	    // The result might not belong to the same type
	    // i.e. subtraction( A:Path, B:Path ):CompoundPath etc.
	    _path1 = path1.clone();
	    _path2 = path2.clone();
	    _path1.style = _path2.style = null;
	    _path1.selected = _path2.selected = false;
	    path1Clockwise = _reorientCompoundPath( _path1 );
	    path2Clockwise = _reorientCompoundPath( _path2 );
	    path1Id = _path1.id;
	    path2Id = _path2.id;
	    // Calculate all the intersections
	    ixs = ( _splitCache && _splitCache.intersections )?
	    _splitCache.intersections : _path1.getIntersections( _path2 );
	    // if we have a empty _splitCache object as an operand,
	    // skip calculating boolean and cache the intersections
	    if( _splitCache && !_splitCache.intersections ){
	        _splitCache.intersections = ixs;
	        return;
	    }
	    _splitPath( ixs );
	    _splitPath( ixs, true );
	    path1Id = _path1.id;
	    path2Id = _path2.id;
	    // Do operator specific calculations before we begin
	    if( operator.name === "subtraction" ) {
	        path2Clockwise = _reversePath( _path2 );
	    }

	    var i, j, len, path, crv;
	    var paths = [];
	    if( _path1 instanceof CompoundPath ){
	        paths = paths.concat( _path1.children );
	    } else {
	        paths = [ _path1 ];
	    }
	    if( _path2 instanceof CompoundPath ){
	        paths = paths.concat( _path2.children );
	    } else {
	        paths.push( _path2 );
	    }
	    // step 1: discard invalid links according to the boolean operator
	    var lastNode, firstNode, nextNode, midPoint, insidePath1, insidePath2;
	    var thisId, thisWinding, contains, subtractionOp = (operator.name === 'subtraction');
	    for (i = 0, len = paths.length; i < len; i++) {
	        insidePath1 = insidePath2 = false;
	        path = paths[i];
	        thisId = ( path.parent instanceof CompoundPath )? path.parent.id : path.id;
	        thisWinding = path.clockwise;
	        lastNode = path.lastSegment;
	        firstNode = path.firstSegment;
	        nextNode = null;
	        while( nextNode !== firstNode){
	            nextNode = ( nextNode )? nextNode.previous: lastNode;
	            crv = nextNode.curve;
	            midPoint = crv.getPoint( 0.5 );
	            if( thisId !== path1Id ){
	                contains = _path1.contains( midPoint );
	                insidePath1 = (thisWinding === path1Clockwise || subtractionOp )? contains :
	                contains && !_testOnCurve( _path1, midPoint );
	            }
	            if( thisId !== path2Id ){
	                contains = _path2.contains( midPoint );
	                insidePath2 = (thisWinding === path2Clockwise )? contains :
	                contains && !_testOnCurve( _path2, midPoint );
	            }
	            if( !operator( thisId === path1Id, insidePath1, insidePath2 ) ){
	                crv._INVALID = true;
	                // markPoint( midPoint, '+' );
	            }
	        }
	    }

	    // Final step: Retrieve the resulting paths from the graph
	    var boolResult = new CompoundPath();
	    var node, nuNode, nuPath, nodeList = [], handle;
	    for (i = 0, len = paths.length; i < len; i++) {
	        nodeList = nodeList.concat( paths[i].segments );
	    }
	    for (i = 0, len = nodeList.length; i < len; i++) {
	        node = nodeList[i];
	        if( node.curve._INVALID || node._visited ){ continue; }
	        path = node.path;
	        thisId = ( path.parent instanceof CompoundPath )? path.parent.id : path.id;
	        thisWinding = path.clockwise;
	        nuPath = new Path();
	        firstNode = null;
	        firstNode_ix = null;
	        if( node.previous.curve._INVALID ) {
	            node.handleIn = ( node._ixPair )?
	            node._ixPair.getIntersection()._segment.handleIn : [ 0, 0 ];
	        }
	        while( node && !node._visited && ( node !== firstNode && node !== firstNode_ix ) ){
	            node._visited = true;
	            firstNode = ( firstNode )? firstNode: node;
	            firstNode_ix = ( !firstNode_ix && firstNode._ixPair )?
	            firstNode._ixPair.getIntersection()._segment: firstNode_ix;
	            // node._ixPair is this node's intersection CurveLocation object
	            // node._ixPair.getIntersection() is the other CurveLocation object this node intersects with
	            nextNode = ( node._ixPair && node.curve._INVALID )? node._ixPair.getIntersection()._segment : node;
	            if( node._ixPair ) {
	                nextNode._visited = true;
	                nuNode = new Segment( node.point, node.handleIn, nextNode.handleOut );
	                nuPath.add( nuNode );
	                node = nextNode;
	                path = node.path;
	                thisWinding = path.clockwise;
	            } else {
	                nuPath.add( node );
	            }
	            node = node.next;
	        }
	        if( nuPath.segments.length > 1 ) {
	            // avoid stray segments and incomplete paths
	            if( nuPath.segments.length > 2 || !nuPath.curves[0].isLinear() ){
	                nuPath.closed = true;
	                boolResult.addChild( nuPath, true );
	            }
	        }
	    }
	    // Delete the proxies
	    _path1.remove();
	    _path2.remove();
	    // And then, we are done.
	    return boolResult.reduce();
	},

	_testOnCurve: function( path, point ){
	    var res = 0;
	    var crv = path.getCurves();
	    var i = 0;
	    var bounds = path.bounds;
	    if( bounds && bounds.contains( point ) ){
	        for( i = 0; i < crv.length && !res; i++ ){
	            var crvi = crv[i];
	            if( crvi.bounds.contains( point ) && crvi.getParameterOf( point ) ){
	                res = 1;
	            }
	        }
	    }
	    return res;
	}


	/**
	 * Smooth bezier curves without changing the amount of segments or their
	 * points, by only smoothing and adjusting their handle points, for both
	 * open ended and closed paths.
	 *
	 * @name PathItem#smooth
	 * @function
	 *
	 * @example {@paperscript}
	 * // Smoothing a closed shape:
	 *
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * // Select the path, so we can see its handles:
	 * path.fullySelected = true;
	 *
	 * // Create a copy of the path and move it 100pt to the right:
	 * var copy = path.clone();
	 * copy.position.x += 100;
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 *
	 * @example {@paperscript height=220}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 50));
	 *
	 * var y = 5;
	 * var x = 3;
	 *
	 * for (var i = 0; i < 28; i++) {
	 *     y *= -1.1;
	 *     x *= 1.1;
	 *     path.lineBy(x, y);
	 * }
	 *
	 * // Create a copy of the path and move it 100pt down:
	 * var copy = path.clone();
	 * copy.position.y += 120;
	 *
	 * // Set its stroke color to red:
	 * copy.strokeColor = 'red';
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 */

	/**
	 * {@grouptitle Postscript Style Drawing Commands}
	 *
	 * On a normal empty {@link Path}, the point is simply added as the path's
	 * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
	 * created as a child and the point is added as its first segment.
	 *
	 * @name PathItem#moveTo
	 * @function
	 * @param {Point} point
	 */

	// DOCS: Document #lineTo()
	/**
	 * @name PathItem#lineTo
	 * @function
	 * @param {Point} point
	 */

	/**
	 * Adds a cubic bezier curve to the path, defined by two handles and a to
	 * point.
	 *
	 * @name PathItem#cubicCurveTo
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	/**
	 * Adds a quadratic bezier curve to the path, defined by a handle and a to
	 * point.
	 *
	 * @name PathItem#quadraticCurveTo
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: Document PathItem#curveTo() 'paramater' param.
	/**
	 * Draws a curve from the position of the last segment point in the path
	 * that goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one segment to the path.
	 *
	 * @name PathItem#curveTo
	 * @function
	 * @param {Point} through the point through which the curve should go
	 * @param {Point} to the point where the curve should end
	 * @param {Number} [parameter=0.5]
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Move your mouse around the view below:
	 *
	 * var myPath;
	 * function onMouseMove(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 		myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw a curve through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.curveTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
	 */

	/**
	 * Draws an arc from the position of the last segment point in the path that
	 * goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} through the point where the arc should pass through
	 * @param {Point} to the point where the arc should end
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * var firstPoint = new Point(30, 75);
	 * path.add(firstPoint);
	 *
	 * // The point through which we will create the arc:
	 * var throughPoint = new Point(40, 40);
	 *
	 * // The point at which the arc will end:
	 * var toPoint = new Point(130, 75);
	 *
	 * // Draw an arc through 'throughPoint' to 'toPoint'
	 * path.arcTo(throughPoint, toPoint);
	 *
	 * // Add a red circle shaped path at the position of 'throughPoint':
	 * var circle = new Path.Circle(throughPoint, 3);
	 * circle.fillColor = 'red';
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 *
	 * var myPath;
	 * function onMouseDrag(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 	    myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw an arc through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.arcTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
	 *
	 * // When the mouse is released, deselect the path
	 * // and fill it with black.
	 * function onMouseUp(event) {
	 * 	myPath.selected = false;
	 * 	myPath.fillColor = 'black';
	 * }
	 */
	/**
	 * Draws an arc from the position of the last segment point in the path to
	 * the specified point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} to the point where the arc should end
	 * @param {Boolean} [clockwise=true] specifies whether the arc should be
	 *        drawn in clockwise direction.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 75));
	 * path.arcTo(new Point(130, 75));
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 * path2.add(new Point(180, 25));
	 *
	 * // To draw an arc in anticlockwise direction,
	 * // we pass 'false' as the second argument to arcTo:
	 * path2.arcTo(new Point(280, 25), false);
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 * var myPath;
	 *
	 * // The mouse has to move at least 20 points before
	 * // the next mouse drag event is fired:
	 * tool.minDistance = 20;
	 *
	 * // When the user clicks, create a new path and add
	 * // the current mouse position to it as its first segment:
	 * function onMouseDown(event) {
	 * 	myPath = new Path();
	 * 	myPath.strokeColor = 'black';
	 * 	myPath.add(event.point);
	 * }
	 *
	 * // On each mouse drag event, draw an arc to the current
	 * // position of the mouse:
	 * function onMouseDrag(event) {
	 * 	myPath.arcTo(event.point);
	 * }
	 */

	/**
	 * Closes the path. When closed, Paper.js connects the first and last
	 * segments.
	 *
	 * @name PathItem#closePath
	 * @function
	 * @see Path#closed
	 */

	/**
	 * {@grouptitle Relative Drawing Commands}
	 *
	 * If called on a {@link CompoundPath}, a new {@link Path} is created as a
	 * child and a point is added as its first segment relative to the
	 * position of the last segment of the current path.
	 *
	 * @name PathItem#moveBy
	 * @function
	 * @param {Point} vector
	 */

	/**
	 * Adds a segment relative to the last segment point of the path.
	 *
	 * @name PathItem#lineBy
	 * @function
	 * @param {Point} vector The vector which is added to the position of the
	 *        last segment of the path, to become the new segment.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 50, y: 50}
	 * path.add(25, 25);
	 *
	 * // Add a segment relative to the last segment of the path.
	 * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
	 * path.lineBy(50, 0);
	 *
	 * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
	 * path.lineBy(0, 50);
	 *
	 * @example {@paperscript height=300}
	 * // Drawing a spiral using lineBy:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add the first segment at {x: 50, y: 50}
	 * path.add(view.center);
	 *
	 * // Loop 500 times:
	 * for (var i = 0; i < 500; i++) {
	 * 	// Create a vector with an ever increasing length
	 * 	// and an angle in increments of 45 degrees
	 * 	var vector = new Point({
	 * 	    angle: i * 45,
	 * 	    length: i / 2
	 * 	});
	 * 	// Add the vector relatively to the last segment point:
	 * 	path.lineBy(vector);
	 * }
	 *
	 * // Smooth the handles of the path:
	 * path.smooth();
	 *
	 * // Uncomment the following line and click on 'run' to see
	 * // the construction of the path:
	 * // path.selected = true;
	 */

	// DOCS: Document Path#curveBy()
	/**
	 * @name PathItem#curveBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 * @param {Number} [parameter=0.5]
	 */

	// DOCS: Document Path#arcBy()
	/**
	 * @name PathItem#arcBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 */
});
