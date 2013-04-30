

function sortIx( a, b ) {
	// First sort along countours (if instanceof CompoundPath),
	// then curves in decending order,
	// then sort in t (paramter) in ascending order
	// if( a.path.id === b.path.id ){
	// 	if( a.curve.index === b.curve.index ){
			return b.parameter - a.parameter;
	// 	} else {
	// 		return b.index - a.index;
	// 	}
	// } else {
	// 	return a.path.id - b.path.id;
	// }
}

function splitPath( _ixs, other ) {
	other = other || false;
	var i, j, k, l, left, right, ixs, ix, path, crv, vals, parts;
	var ixPoint, nuSeg;
	var paths = [], lastPathId = null;
	for (i = 0, l = _ixs.length; i < l; i++) {
		ix = _ixs[i];
		if( ix.path.id !== lastPathId ){
			paths.push( ix.path );
			lastPathId = ix.path.id;
		}
		if( !ix.curve._ixParams ){ix.curve._ixParams = []; }
		ix = ( other )? ix._ixPair : ix;
		ix.curve._ixParams.push( { parameter: ix.parameter, pair: ix._ixPair } );
	}

	path = paths[0];
	var lastNode = path.lastSegment, firstNode = path.firstSegment;
	var nextNode = null, len = path.segments.length * 2, count = 0;
	while( nextNode !== firstNode && count < len ){
		nextNode = ( nextNode )? nextNode.previous: lastNode;
		if( nextNode.curve._ixParams ){
			ixs = nextNode.curve._ixParams;
			ixs.sort( sortIx );
			crv = nextNode.curve;
			vals = crv.getValues();
			for (i = 0, l = ixs.length; i < l; i++) {
				ix = ixs[i];
				parts = Curve.subdivide( vals, ix.parameter );
				left = parts[0];
				right = parts[1];

				crv.segment1.handleOut = new Point( left[2] - left[0], left[3] - left[1] );
				ixPoint = new Point( right[0], right[1] );
				nuSeg = new Segment( ixPoint,
					new Point( left[4] - right[0], left[5] - right[1] ),
					new Point( right[2] - right[0], right[3] - right[1] ) );
				nuSeg._ixPair = ix.pair;
				crv.segment2.handleIn = new Point( right[4] - right[6], right[5] - right[7] );

				path.insert( nextNode.index + 1,  nuSeg );
				// nextNode = nuSeg;
				for (j = i + 1; j < l; j++) {
					ixs[j].parameter = ixs[j].parameter / ix.parameter;
				}
				vals = left;
			}
		}
		count++;
	}
}

