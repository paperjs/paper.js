

function sortIx( a, b ) { return b.parameter - a.parameter; }

function splitPath( _ixs, other ) {
	other = other || false;
	var i, j, k, l, len, ixs, ix, path, crv, vals;
	var ixPoint, nuSeg;
	var paths = [], lastPathId = null;
	for (i = 0, l = _ixs.length; i < l; i++) {
		ix = ( other )? _ixs[i]._ixPair : _ixs[i];
		if( ix.path.id !== lastPathId ){
			paths.push( ix.path );
			lastPathId = ix.path.id;
		}
		if( !ix.curve._ixParams ){ix.curve._ixParams = []; }
		ix.curve._ixParams.push( { parameter: ix.parameter, pair: ix._ixPair } );
	}
	for (k = 0, len = paths.length; k < len; k++) {
		path = paths[k];
		var lastNode = path.lastSegment, firstNode = path.firstSegment;
		var nextNode = null, left = null, right = null, parts = null, isLinear;
		var handleIn, handleOut;
		while( nextNode !== firstNode){
			nextNode = ( nextNode )? nextNode.previous: lastNode;
			if( nextNode.curve._ixParams ){
				ixs = nextNode.curve._ixParams;
				ixs.sort( sortIx );
				crv = nextNode.curve;
				isLinear = crv.isLinear();
				crv = vals = null;
				for (i = 0, l = ixs.length; i < l; i++) {
					ix = ixs[i];
					crv = nextNode.curve;
					if( !vals ) vals = crv.getValues();
					parts = Curve.subdivide( vals, ix.parameter );
					left = parts[0];
					right = parts[1];
					handleIn = handleOut = null;
					if( !isLinear ){
						crv.segment1.handleOut = new Point( left[2] - left[0], left[3] - left[1] );
						crv.segment2.handleIn = new Point( right[4] - right[6], right[5] - right[7] );
						handleIn = new Point( left[4] - ixPoint.x, left[5] - ixPoint.y );
						handleOut = new Point( right[2] - ixPoint.x, right[3] - ixPoint.y );
					}
					ixPoint = new Point( right[0], right[1] );
					nuSeg = new Segment( ixPoint, handleIn, handleOut );
					nuSeg._ixPair = ix.pair;
					nuSeg._ixPair._segment = nuSeg;

					path.insert( nextNode.index + 1,  nuSeg );
					// nextNode = nuSeg;
					for (j = i + 1; j < l; j++) {
						ixs[j].parameter = ixs[j].parameter / ix.parameter;
					}
					vals = left;
				}
			}
		}
	}
}

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
 function reorientCompoundPath( path ){
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
}

function computeBoolean( _path1, _path2, operator ){
	var path1Clockwise = reorientCompoundPath( _path1 );
	var path2Clockwise = reorientCompoundPath( _path2 );

	var ixs = _path1.getIntersections( _path2 );
	var path1Id = _path1.id;
	var path2Id = _path2.id;
	splitPath( ixs );
	splitPath( ixs, true );

	var i, j, len, path, crv;
	var paths;
	if( _path1 instanceof CompoundPath ){
		paths = _path1.children;
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
	var thisId, thisWinding;
	for (i = 0, len = paths.length; i < len; i++) {
		path = paths[i];
		thisId = ( path.parent instanceof CompoundPath )? path.parent.id : path.id;
		thisWinding = path.clockwise;
		lastNode = path.lastSegment;
		firstNode = path.firstSegment;
		nextNode = null;
		console.log( thisId, path1Id, path2Id )
		while( nextNode !== firstNode){
			nextNode = ( nextNode )? nextNode.previous: lastNode;
			crv = nextNode.curve;
			midPoint = crv.getPoint( 0.5 );
			if( thisId !== path1Id ){
				contains = _path1.contains( midPoint );
				insidePath1 = (thisWinding === path1Clockwise)? contains :
				contains && !testOnCurve( _path1, midPoint );
			}
			if( thisId !== path2Id ){
				contains = _path2.contains( midPoint );
				insidePath2 = (thisWinding === path2Clockwise)? contains :
				contains && !testOnCurve( _path2, midPoint );
			}
			if( !operator( thisId === path1Id, insidePath1, insidePath2 ) ){
				crv._INVALID = true;
			}
		}
	}

	// Final step: Retrieve the resulting paths from the graph
	var boolResult = new CompoundPath();
	boolResult.style = booleanStyle;
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
	// nuPath.selected = true;
		firstNode = null;
		while( node && !node._visited ){
			node._visited = true;
			firstNode = ( firstNode )? firstNode: node;
			if( node._ixPair ) {
				// node._ixPair is this node's intersection CurveLocation object
				// node._ixPair._ixPair is the other CurveLocation object this node intersects with
				nextNode = ( node.curve._INVALID )? node._ixPair._ixPair._segment : node;
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
			view.draw();
		}
		nuPath.closed = true;
		boolResult.addChild( nuPath );
	}

	window.pp = boolResult.reduce();

	return boolResult.reduce();
}

function testOnCurve( path, point ){
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

function unite( path1, path2 ){
	var unionOp = function( isPath1, isInsidePath1, isInsidePath2 ){
		this.type = 1;
		return ( isInsidePath1 || isInsidePath2 )? false : true;
	};
	return computeBoolean( path1, path2, unionOp );
}
