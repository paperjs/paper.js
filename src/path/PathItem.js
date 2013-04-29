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
			var curve = curves1[i],
				values1 = curve.getValues();
			for (var j = 0; j < length2; j++)
				Curve.getIntersections(values1, values2[j], curve, locations);
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
	 * Calculates the Union of two paths
	 * Boolean API.
	 * @param  {PathItem} path
	 * @return {CompoundPath} union of this & path
	 */
	unite: function( path ){
		function UnionOp( lnk, isInsidePath1, isInsidePath2 ){
			if( isInsidePath1 || isInsidePath2 ){ return false; }
			return true;
		}
		return this._computeBoolean( this, path, UnionOp, 'unite' );
	},

	/**
	 * Calculates the Intersection between two paths
	 * Boolean API.
	 * @param  {PathItem} path
	 * @return {CompoundPath} Intersection of this & path
	 */
	intersect: function( path ){
		function IntersectionOp( lnk, isInsidePath1, isInsidePath2 ){
			if( !isInsidePath1 && !isInsidePath2 ){
				return false;
			}
			return true;
		}
		return this._computeBoolean( this, path, IntersectionOp, 'intersect' );
	},

	/**
	 * Calculates this <minus> path
	 * Boolean API.
	 * @param  {PathItem} path
	 * @return {CompoundPath} this <minus> path
	 */
	subtract: function( path ){
		function SubtractionOp( lnk, isInsidePath1, isInsidePath2 ){
			var lnkid = lnk.id;
			if( lnkid === 1 && isInsidePath2 ){
			 	return false;
			} else if( lnkid === 2 && !isInsidePath1 ){
			 	return false;
			}
			return true;
		}
		return this._computeBoolean( this, path, SubtractionOp, 'subtract' );
	},

	// Some constants
	// Need to find a home for these
	// for _IntersectionID and _UNIQUE_ID, we could use the Base._uid? // tried; doesn't work.
	_NORMAL_NODE: 1,
	_INTERSECTION_NODE: 2,
	_IntersectionID: 1,
	_UNIQUE_ID: 1,

	/**
	 * The datastructure for boolean computation:
	 *  _Node  - Connects 2 Links, represents a Segment
	 *  _Link  - Connects 2 Nodes, represents a Curve
	 *  Graph - List of Links
	 */
	/**
	* Nodes in the graph are analogous to Segment objects
	* with additional linkage information to track intersections etc.
	* (enough to do a complete graph traversal)
	* @param {Point} _point
	* @param {Point} _handleIn
	* @param {Point} _handleOut
	* @param {Any} _id
	*/
	_Node: function( _point, _handleIn, _handleOut, _id, isBaseContour, _uid ){
		var _NORMAL_NODE = 1;
		var _INTERSECTION_NODE = 2;

		this.id = _id;
		this.isBaseContour = isBaseContour;
		this.type = _NORMAL_NODE;
		this.point   = _point;
		this.handleIn = _handleIn;  // handleIn
		this.handleOut = _handleOut;  // handleOut
		this.linkIn = null;  // aka linkIn
		this.linkOut = null;  // linkOut
		this.uniqueID = _uid;

		// In case of an intersection this will be a merged node.
		// And we need space to save the "other _Node's" parameters before merging.
		this.idB = null;
		this.isBaseContourB = false;
		// this.pointB   = this.point; // point should be the same
		this.handleBIn = null;
		this.handleBOut = null;
		this.linkBIn = null;
		this.linkBOut = null;

		this._segment = null;

		this.getSegment = function( recalculate ){
			if( this.type === _INTERSECTION_NODE && recalculate ){
				// point this.linkIn and this.linkOut to those active ones
				// also point this.handleIn and this.handleOut to correct in and out handles
				// If a link is null, make sure the corresponding handle is also null
				this.handleIn = (this.linkIn)? this.handleIn : null;
				this.handleOut = (this.linkOut)? this.handleOut : null;
				this.handleBIn = (this.linkBIn)? this.handleBIn : null;
				this.handleBOut = (this.linkBOut)? this.handleBOut : null;
				// Select the valid links
				this.linkIn = this.linkIn || this.linkBIn; // linkIn
				this.linkOut = this.linkOut || this.linkBOut; // linkOut
				// Also update the references in links to point to "this" _Node
				if( !this.linkIn || !this.linkOut ){
					throw { name: 'Boolean Error', message: 'No matching link found at ixID: ' +
					this._intersectionID + " point: " + this.point.toString() };
				}
				this.linkIn.nodeOut = this;  // linkIn.nodeEnd
				this.linkOut.nodeIn = this;  // linkOut.nodeStart
				this.handleIn = this.handleIn || this.handleBIn;
				this.handleOut = this.handleOut || this.handleBOut;
				this.isBaseContour = this.isBaseContour | this.isBaseContourB;
			}
			this._segment = this._segment || new Segment( this.point, this.handleIn, this.handleOut );
			return this._segment;
		};
	},

	/**
	 * Links in the graph are analogous to CUrve objects
	 * @param {_Node} _nodeIn
	 * @param {_Node} _nodeOut
	 * @param {Any} _id
	 */
	_Link: function( _nodeIn, _nodeOut, _id, isBaseContour, _winding ) {
		this.id = _id;
		this.isBaseContour = isBaseContour;
		this.winding = _winding;
		this.nodeIn = _nodeIn;  // nodeStart
		this.nodeOut = _nodeOut;  // nodeEnd
		this.nodeIn.linkOut = this;  // nodeStart.linkOut
		this.nodeOut.linkIn = this;  // nodeEnd.linkIn
		this._curve = null;
		this.intersections = [];

		// for reusing the paperjs function we need to (temperorily) build a Curve object from this _Link
		// for performance reasons we cache it.
		this.getCurve = function() {
			this._curve = this._curve || new Curve( this.nodeIn.getSegment(), this.nodeOut.getSegment() );
			return this._curve;
		};
	},

	/**
	 * makes a graph. Only works on paths, for compound paths we need to
	 * make graphs for each of the child paths and merge them.
	 * @param  {Path} path
	 * @param  {Integer} id
	 * @return {Array} Links
	 */
	_makeGraph: function( path, id, isBaseContour ){
		var graph = [];
		var segs = path.segments, prevNode = null, firstNode = null, nuLink, nuNode,
		winding = path.clockwise;
		for( i = 0, l = segs.length; i < l; i++ ){
			// var nuSeg = segs[i].clone();
			var nuSeg = segs[i];
			nuNode = new this._Node( nuSeg.point, nuSeg.handleIn, nuSeg.handleOut, id, isBaseContour, ++this._UNIQUE_ID );
			if( prevNode ) {
				nuLink = new this._Link( prevNode, nuNode, id, isBaseContour, winding );
				graph.push( nuLink );
			}
			prevNode = nuNode;
			if( !firstNode ){
				firstNode = nuNode;
			}
		}
		// the path is closed
		nuLink = new this._Link( prevNode, firstNode, id, isBaseContour, winding );
		graph.push( nuLink );
		return graph;
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
		if( !(path instanceof CompoundPath) ){ return path.clockwise; }
		var children = path.children, len = children.length, baseWinding;
		var bounds = new Array( len );
		var tmparray = new Array( len );
		baseWinding = children[0].clockwise;
		// Omit the first path
		for (i = 0; i < len; i++) {
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


	_computeBoolean: function( _path1, _path2, operator, operatorName ){
		this._IntersectionID = 1;
		this._UNIQUE_ID = 1;
		// We work on duplicate paths since the algorithm may modify the original paths
		var path1 = _path1.clone();
		var path2 = _path2.clone();
		var i, j, k, l, lnk, crv, node, nuNode, leftLink, rightLink;
		var path1Clockwise = true, path2Clockwise = true;
		// If one of the operands is empty, resolve self-intersections on the second operand
		var childCount1 = (_path1 instanceof CompoundPath)? _path1.children.length : _path1.curves.length;
		var childCount2 = (_path2 instanceof CompoundPath)? _path2.children.length : _path2.curves.length;
		var resolveSelfIntersections = !childCount1 | !childCount2;
		// Reorient the compound paths, i.e. make all the islands wind in the same direction
		// and holes in the opposit direction.
		// Do this only if we are not resolving selfIntersections:
		//    Resolving self-intersections work on compound paths, but, we might get different results!
		if( !resolveSelfIntersections ){
			path1Clockwise = this._reorientCompoundPath( path1 );
			path2Clockwise = this._reorientCompoundPath( path2 );
		}
		// Cache the bounding rectangle of paths
		// so we can make the test for containment quite a bit faster
		path1._bounds = (childCount1)? path1.bounds : null;
		path2._bounds = (childCount2)? path2.bounds : null;
		// Prepare the graphs. Graphs are list of Links that retains
		// full connectivity information. The order of links in a graph is not important
		// That allows us to sort and merge graphs and 'splice' links with their splits easily.
		// Also, this is the place to resolve self-intersecting paths
		var graph = [], path1Children, path2Children, base;
		if( path1 instanceof CompoundPath ){
			path1Children = path1.children;
			for (i = 0, base = true, l = path1Children.length; i < l; i++, base = false) {
				path1Children[i].closed = true;
				graph = graph.concat( this._makeGraph( path1Children[i], 1, base ));
			}
		} else {
			path1.closed = true;
			path1Clockwise = path1.clockwise;
			graph = graph.concat( this._makeGraph( path1, 1, true ) );
		}

		// if operator is BooleanOps.Subtraction, then reverse path2
		// so that the nodes and links will link correctly
		var reverse = ( operatorName === 'subtract' )? true: false;
		path2Clockwise = (reverse)? !path2Clockwise : path2Clockwise;
		if( path2 instanceof CompoundPath ){
			path2Children = path2.children;
			for (i = 0, base = true, l = path2Children.length; i < l; i++, base = false) {
				path2Children[i].closed = true;
				if( reverse ){ path2Children[i].reverse(); }
				graph = graph.concat( this._makeGraph( path2Children[i], 2, base ));
			}
		} else {
			path2.closed = true;
			if( reverse ){ path2.reverse(); }
			path2Clockwise = path2.clockwise;
			graph = graph.concat( this._makeGraph( path2, 2, true ) );
		}

		// Sort function to sort intersections according to the 'parameter'(t) in a link (curve)
		function ixSort( a, b ){ return a.parameter - b.parameter; }

 		/*
		 * Pass 1:
		 * Calculate the intersections for all graphs
		 */
		var ix, loc, loc2, ixCount = 0;
		for ( i = graph.length - 1; i >= 0; i--) {
			var c1 = graph[i].getCurve();
			var v1 = c1.getValues();
			for ( j = i -1; j >= 0; j-- ) {
				if( !resolveSelfIntersections && graph[j].id === graph[i].id ){ continue; }
				var c2 = graph[j].getCurve();
				var v2 = c2.getValues();
				loc = [];
				Curve.getIntersections( v1, v2, c1, loc );
				if( loc.length ){
					for (k = 0, l=loc.length; k<l; k++) {
						// Ignore segment overlaps if both curve are part of same contour
						// This is a degenerate case while resolving self-intersections,
						// after paperjs rev#8d35d92
						if( graph[j].id === graph[i].id &&
							( loc[k].parameter === 0.0 || loc[k].parameter === 1.0 )) {
							continue;
						}
						graph[i].intersections.push( loc[k] );
						loc2 = new CurveLocation( c2, null, loc[k].point );
						loc2._id = loc[k]._id;
						graph[j].intersections.push( loc2 );
						loc[k]._ixpair = loc2;
						loc2._ixpair = loc[k];
						++ixCount;
					}
				}
			}
		}
		/*
		* Avoid duplicate intersections when a curve that belongs to one contour
		* passes through a segment on another contour
		*/
		len = graph.length;
		while( len-- ){
		ix = graph[len].intersections;
			for (i =0, l=ix.length; i<l; i++) {
				// In case of an over lap over the first segment on a link we
				// look for duplicates and mark them INVALID
				loc = ix[i];
				if ( loc.parameter === 0.0 ){
					j = graph.length;
					while( j-- ) {
						var ix2 = graph[j].intersections;
						k = ix2.length;
						while ( k-- ) {
					  		loc2 = ix2[k];
					  		if( !loc2.INVALID && loc._id !== loc2._id && loc2.parameter !== 1.0 &&
					  			loc2.point.equals( loc.point ) ) {
					  			loc2.INVALID = loc2._ixpair.INVALID = true;
					  		}
						}
					}
				} // if( loc.parameter === 0.0 ) {
			}
		}

		/*
		* Pass 2:
		* Walk the graph, sort the intersections on each individual link.
		* for each link that intersects with another one, replace it with new split links.
		*/
		var ixPoint, ixHandleI, ixHandleOut, param, isLinear, parts, left, right;
		// variable names are (sort of) acronyms of what thay are relative to the link
		// niho - link.NodeInHandleOut, for example.
		var values, nix, niy,nox, noy, niho, nohi, nihox, nihoy, nohix, nohiy;
		for ( i = graph.length - 1; i >= 0; i--) {
			if( graph[i].intersections.length ){
			  	ix = graph[i].intersections;
			  	// Sort the intersections if there is more than one
			  	if( graph[i].intersections.length > 1 ){ ix.sort( ixSort ); }
			  	// Remove the graph link, this link has to be split and replaced with the splits
			  	lnk = graph.splice( i, 1 )[0];
			  	nix = lnk.nodeIn.point.x; niy = lnk.nodeIn.point.y;
			  	nox = lnk.nodeOut.point.x; noy = lnk.nodeOut.point.y;
			  	niho = lnk.nodeIn.handleOut; nohi = lnk.nodeOut.handleIn;
			  	nihox = nihoy = nohix = nohiy = 0;
			  	isLinear = true;
			  	if( niho ){ nihox = niho.x; nihoy = niho.y; isLinear = false; }
			  	if( nohi ){ nohix = nohi.x; nohiy = nohi.y; isLinear = false; }
			  	values = [ nix, niy, nihox + nix, nihoy + niy,
			  		nohix + nox, nohiy + noy, nox, noy ];
			  	for (j =0, l=ix.length; j<l && lnk; j++) {
			  	  	if( ix[j].INVALID ){ continue; }
			  	  	param = ix[j].parameter;
			  	  	if( param === 0.0 || param === 1.0) {
		  	  	  		// Intersection falls on an existing node
		  	  	  		// there is no need to split the link
		  	  	  		nuNode = ( param === 0.0 )? lnk.nodeIn : lnk.nodeOut;
		  	  	  		nuNode.type = this._INTERSECTION_NODE;
		  	  	  		nuNode._intersectionID = ix[j]._id;
		  	  	  		if( param === 1.0 ){
		  	  	  			leftLink = null;
		  	  	  			rightLink = lnk;
		  	  	  		} else {
		  	  	  			leftLink = lnk;
		  	  	  			rightLink = null;
		  	  	  		}
			  	  	} else {
			  	  		parts = Curve.subdivide(values, param);
			  	  		left = parts[0];
			  	  		right = parts[1];
			  	  		// Make new link and convert handles from absolute to relative
			  	  		ixPoint = new Point( left[6], left[7] );
			  	  		if( !isLinear ){
			  	  			ixHandleIn = new Point(left[4] - ixPoint.x, left[5] - ixPoint.y);
			  	  			ixHandleOut = new Point(right[2] - ixPoint.x, right[3] - ixPoint.y);
			  	  		} else {
			  	  			ixHandleIn = ixHandleOut = null;
			  	  			right[2] = right[0];
			  	  			right[3] = right[1];
			  	  		}
			  	  		nuNode = new this._Node( ixPoint, ixHandleIn, ixHandleOut, lnk.id, lnk.isBaseContour, ++this._UNIQUE_ID );
			  	  		nuNode.type = this._INTERSECTION_NODE;
			  	  		nuNode._intersectionID = ix[j]._id;
			  	  		// clear the cached Segment on original end nodes and Update their handles
			  	  		lnk.nodeIn._segment = null;
			  	  		lnk.nodeOut._segment = null;
			  	  		if( !isLinear ){
			  	  			var tmppnt = lnk.nodeIn.point;
			  	  			lnk.nodeIn.handleOut = new Point( left[2] - tmppnt.x, left[3] - tmppnt.y );
			  	  			tmppnt = lnk.nodeOut.point;
			  	  			lnk.nodeOut.handleIn = new Point( right[4] - tmppnt.x, right[5] - tmppnt.y );
			  	  		}
			  	  		// Make new links after the split
			  	  		leftLink = new this._Link( lnk.nodeIn, nuNode, lnk.id, lnk.isBaseContour, lnk.winding );
			  	  		rightLink = new this._Link( nuNode, lnk.nodeOut, lnk.id, lnk.isBaseContour, lnk.winding );
			  	  		values = right;
			  		}
			  		// Add the first split link back to the graph, since we sorted the intersections
			  		// already, this link should contain no more intersections to the left.
			  		if( leftLink ){
			  			graph.splice( i, 0, leftLink );
			  		}
			  		// continue with the second split link, to see if
			  		// there are more intersections to deal with
			  		lnk = rightLink;
			  		// Interpolate the rest of the parameters
			  		if( lnk ) {
			  		  	var one_minus_param = (1.0 - param);
			  		  	for (k =j + 1, l=ix.length; k<l; k++) {
			  		  		ix[k]._parameter = ( ix[k].parameter - param ) / one_minus_param;
			  		  	}
			  		}
			  	}
			  	// Add the last split link back to the graph
				if( lnk ){
				  	graph.splice( i, 0, lnk );
			  	}
			}
		}
		/**
		* Pass 3:
		* Merge matching intersection _Node Pairs (type is _INTERSECTION_NODE &&
		*  a._intersectionID == b._intersectionID )
		*
		* Mark each _Link(Curve) according to whether it is
		*  case 1. inside Path1 ( and only Path1 )
		*       2. inside Path2 ( and only Path2 )
		*       3. outside (normal case)
		*
		* Take a test function "operator" which will discard links
		* according to the above
		*  * Union         -> discard cases 1 and 2
		*  * Intersection  -> discard case 3
		*  * Path1-Path2   -> discard cases 2, 3[Path2]
		*/
		// step 1: discard invalid links according to the boolean operator
		for ( i = graph.length - 1; i >= 0; i-- ) {
			var insidePath1 = false, insidePath2 = false, contains;
			lnk = graph[i];
			// if( lnk.SKIP_OPERATOR ) { continue; }
			if( !lnk.INVALID ) {
				crv = lnk.getCurve();
				// var midPoint = new Point(lnk.nodeIn.point);
				var midPoint = crv.getPoint( 0.5 );
				// If on a base curve, consider points on the curve and inside,
				// if not —for example a hole, points on the curve falls outside
				if( lnk.id !== 1 ){
					contains = path1.contains( midPoint );
					insidePath1 = (lnk.winding === path1Clockwise)? contains :
						contains && !this._testOnContour( path1, midPoint );
				}
				if( lnk.id !== 2 ){
					contains = path2.contains( midPoint );
					insidePath2 = (lnk.winding === path2Clockwise)? contains :
						contains && !this._testOnContour( path2, midPoint );
				}
			}
			if( lnk.INVALID || !operator( lnk, insidePath1, insidePath2 ) ){
				// lnk = graph.splice( i, 1 )[0];
				lnk.INVALID = true;
				lnk.nodeIn.linkOut = null;
				lnk.nodeOut.linkIn = null;
			}
		}

		// step 2: Match nodes according to their _intersectionID and merge them together
		var len = graph.length;
		while( len-- ){
			node = graph[len].nodeIn;
			if( node.type === this._INTERSECTION_NODE ){
				var otherNode = null;
				for (i = len - 1; i >= 0; i--) {
					var tmpnode = graph[i].nodeIn;
					if( tmpnode._intersectionID === node._intersectionID &&
						tmpnode.uniqueID !== node.uniqueID ) {
						otherNode = tmpnode;
						break;
					}
				}
				if( otherNode ) {
					//Check if it is a self-intersecting _Node
					if( node.id === otherNode.id ){
						// Swap the outgoing links, this will resolve a knot and create two paths,
						// the portion of the original path on one side of a self crossing is counter-clockwise,
						// so one of the resulting paths will also be counter-clockwise
						var tmp = otherNode.linkOut;
						otherNode.linkOut = node.linkOut;
						node.linkOut = tmp;
						tmp = otherNode.handleOut;
						otherNode.handleOut = node.handleOut;
						node.handleOut = tmp;
						node.type = otherNode.type = this._NORMAL_NODE;
						node._intersectionID = null;
						node._segment = otherNode._segment = null;
					} else {
						// Merge the nodes together, by adding this node's information to the other node
						// this node becomes a four-way node, i.e. this node will have two sets of linkIns and linkOuts each.
						// In this sense this is a multi-graph!
						otherNode.idB = node.id;
						otherNode.isBaseContourB = node.isBaseContour;
						otherNode.handleBIn = node.handleIn;
						otherNode.handleBOut = node.handleOut;
						otherNode.linkBIn = node.linkIn;
						otherNode.linkBOut = node.linkOut;
						otherNode._segment = null;
						if( node.linkIn ){ node.linkIn.nodeOut = otherNode; }
						if( node.linkOut ){ node.linkOut.nodeIn = otherNode; }
						// Clear this node's intersectionID, so that we won't iterate over it again
						node._intersectionID = null;
					}
				}
			}
		}

		window.g = graph;

		// Final step: Retrieve the resulting paths from the graph
		var boolResult = new CompoundPath();
		var firstNode = true, nextNode, foundBasePath = false;
		while( firstNode ){
			firstNode = nextNode = null;
			len = graph.length;
			while( len-- ){
				lnk = graph[len];
				if( !lnk.INVALID && !lnk.nodeIn.visited && !firstNode ){
					if( !foundBasePath && lnk.isBaseContour ){
						firstNode = lnk.nodeIn;
						foundBasePath = true;
						break;
					} else if(foundBasePath){
						firstNode = lnk.nodeIn;
						break;
					}
				}
			}
			if( firstNode ){
				var path = new Path();
				path.add( firstNode.getSegment( true ) );
				firstNode.visited = true;
				nextNode = firstNode.linkOut.nodeOut;
				var linkCount = graph.length + 1;
				while( firstNode.uniqueID !== nextNode.uniqueID && linkCount-- ){
					path.add( nextNode.getSegment( true ) );
					nextNode.visited = true;
					if( !nextNode.linkOut ){
						throw { name: 'Boolean Error', message: 'No link found at node id: ' + nextNode.id };
					}
					nextNode = nextNode.linkOut.nodeOut;
				}
				path.closed = true;
				if( path.segments.length > 1 && linkCount >= 0 ){ // avoid stray segments and incomplete paths
					if( path.segments.length > 2 || !path.curves[0].isLinear() ){
						boolResult.addChild( path );
					}
				}
			}
		}
		boolResult = boolResult.reduce();
		// Remove the paths we duplicated
		path1.remove();
		path2.remove();

		// I think, we're done.
		return boolResult;
	},


	/**
	 *	_testOnContour
	 *	Tests if the point lies on the countour of a path
	 */
	_testOnContour: function( path, point ){
		var res = 0;
		var crv = path.getCurves();
		var i = 0;
		var bounds = path._bounds;
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
