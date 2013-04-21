

/*!
 *
 * Vector boolean operations on paperjs objects
 * This is mostly written for clarity (I hope it is clear) and compatibility,
 * not optimised for performance, and has to be tested heavily for stability.
 * (Looking up to Java's Area path boolean algorithms for stability,
 * but the code is too complex —mainly because the operations are stored and
 * enumerable, such as quadraticCurveTo, cubicCurveTo etc.; and is largely
 * undocumented to directly adapt from)
 *
 * Supported
 *  - paperjs Path and CompoundPath objects
 *  - Boolean Union
 *  - Boolean Intersection
 *  - Boolean Subtraction
 *
 * Not supported yet ( which I would like to see supported )
 *  - Self-intersecting Paths
 *  - Paths are clones of each other that ovelap exactly on top of each other!
 *
 * ------
 * Harikrishnan Gopalakrishnan
 * http://hkrish.com/playground/paperjs/booleanStudy.html
 *
 * ------
 * Paperjs
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://paperjs.org/license/
 *
 */


/**
 * BooleanOps defines the boolean operator functions to use.
 * A boolean operator is a function f( link:Link, isInsidePath1:Boolean, isInsidePath2:Boolean ) :
 *  should return a Boolean value indicating whether to keep the link or not.
 *  return true - keep the path
 *  return false - discard the path
 */
 var BooleanOps = {
  Union: function( lnk, isInsidePath1, isInsidePath2 ){
    if( isInsidePath1 || isInsidePath2 ){
      return false;
    }
    return true;
  },

  Intersection: function( lnk, isInsidePath1, isInsidePath2 ){
    if( !isInsidePath1 && !isInsidePath2 ){
      return false;
    }
    return true;
  },

  // path1 - path2
  Subtraction: function( lnk, isInsidePath1, isInsidePath2 ){
    var lnkid = lnk.id;
    if( lnkid === 1 && isInsidePath2 ){
      return false;
    } else if( lnkid === 2 && !isInsidePath1 ){
      return false;
    }
    return true;
  }
};

/**
 * The datastructure for boolean computation:
 *  Graph - List of Links
 *  Link  - Connects 2 Nodes, represents a Curve
 *  Node  - Connects 2 Links, represents a Segment
 */

 var NORMAL_NODE = 1;
 var INTERSECTION_NODE = 2;
 var IntersectionID = 1;
 var UNIQUE_ID = 1;

/**
 * Nodes in the graph are analogous to Segment objects
 * with additional linkage information to track intersections etc.
 * (enough to do a complete graph traversal)
 * @param {Point} _point
 * @param {Point} _handleIn
 * @param {Point} _handleOut
 * @param {Any} _id
 */
 function Node( _point, _handleIn, _handleOut, _id, isBaseContour ){
  this.id = _id;
  this.isBaseContour = isBaseContour;
  this.type = NORMAL_NODE;
  this.point   = _point;
  this.handleIn = _handleIn;  // handleIn
  this.handleOut = _handleOut;  // handleOut
  this.linkIn = null;  // aka linkIn
  this.linkOut = null;  // linkOut
  this.uniqueID = ++UNIQUE_ID;

  // In case of an intersection this will be a merged node.
  // And we need space to save the "other Node's" parameters before merging.
  this.idB = null;
  this.isBaseContourB = false;
  // this.pointB   = this.point; // point should be the same
  this.handleBIn = null;
  this.handleBOut = null;
  this.linkBIn = null;
  this.linkBOut = null;

  this._segment = null;

  this.getSegment = function( recalculate ){
    if( this.type === INTERSECTION_NODE && recalculate ){
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
      // Also update the references in links to point to "this" Node
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
}

/**
 * Links in the graph are analogous to CUrve objects
 * @param {Node} _nodeIn
 * @param {Node} _nodeOut
 * @param {Any} _id
 */
 function Link( _nodeIn, _nodeOut, _id, isBaseContour ) {
  this.id = _id;
  this.isBaseContour = isBaseContour;
  this.nodeIn = _nodeIn;  // nodeStart
  this.nodeOut = _nodeOut;  // nodeEnd
  this.nodeIn.linkOut = this;  // nodeStart.linkOut
  this.nodeOut.linkIn = this;  // nodeEnd.linkIn
  this._curve = null;
  this.intersections = [];

  // for reusing the paperjs function we need to (temperorily) build a Curve object from this Link
  // for performance reasons we cache it.
  this.getCurve = function() {
    this._curve = this._curve || new Curve( this.nodeIn.getSegment(), this.nodeOut.getSegment() );
    return this._curve;
  };
}

/**
 * makes a graph. Only works on paths, for compound paths we need to
 * make graphs for each of the child paths and merge them.
 * @param  {Path} path
 * @param  {Integer} id
 * @return {Array} Links
 */
 function makeGraph( path, id, isBaseContour ){
  var graph = [];
  var segs = path.segments, prevNode = null, firstNode = null, nuLink, nuNode;
  for( i = 0, l = segs.length; i < l; i++ ){
    // var nuSeg = segs[i].clone();
    var nuSeg = segs[i];
    nuNode = new Node( nuSeg.point, nuSeg.handleIn, nuSeg.handleOut, id, isBaseContour );
    if( prevNode ) {
      nuLink = new Link( prevNode, nuNode, id, isBaseContour );
      graph.push( nuLink );
    }
    prevNode = nuNode;
    if( !firstNode ){
      firstNode = nuNode;
    }
  }
  // the path is closed
  nuLink = new Link( prevNode, firstNode, id, isBaseContour );
  graph.push( nuLink );
  return graph;
}

/**
 * Calculates the Union of two paths
 * Boolean API.
 * @param  {Path} path1
 * @param  {Path} path2
 * @return {CompoundPath} union of path1 & path2
 */
 function boolUnion( path1, path2 ){
  return computeBoolean( path1, path2, BooleanOps.Union );
}


/**
 * Calculates the Intersection between two paths
 * Boolean API.
 * @param  {Path} path1
 * @param  {Path} path2
 * @return {CompoundPath} Intersection of path1 & path2
 */
 function boolIntersection( path1, path2 ){
  return computeBoolean( path1, path2, BooleanOps.Intersection );
}


/**
 * Calculates path1—path2
 * Boolean API.
 * @param  {Path} path1
 * @param  {Path} path2
 * @return {CompoundPath} path1 <minus> path2
 */
 function boolSubtract( path1, path2 ){
  return computeBoolean( path1, path2, BooleanOps.Subtraction );
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
 * @param  {[type]} path [description]
 * @return {[type]}      [description]
 */
 function reorientCompoundPath( path ){
  if( !(path instanceof CompoundPath) ){ return; }
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
}

/**
 * Actual function that computes the boolean
 * @param  {Path} _path1 (cannot be self-intersecting at the moment)
 * @param  {Path} _path2 (cannot be self-intersecting at the moment)
 * @param  {BooleanOps type} operator
 * @return {CompoundPath} boolean result
 */
 function computeBoolean( _path1, _path2, operator ){
  IntersectionID = 1;
  UNIQUE_ID = 1;

  // The boolean operation may modify the original paths
  var path1 = _path1.clone();
  var path2 = _path2.clone();
  // if( !path1.clockwise ){ path1.reverse(); }
  // if( !path2.clockwise ){ path2.reverse(); }
  //
  var i, j, k, l, lnk, crv, node, nuNode, leftLink, rightLink;
  var path1Clockwise, path2Clockwise;

  // If one of the operands is empty, resolve self-intersections on the second operand
  var childCount1 = (_path1 instanceof CompoundPath)? _path1.children.length : _path1.curves.length;
  var childCount2 = (_path2 instanceof CompoundPath)? _path2.children.length : _path2.curves.length;
  var resolveSelfIntersections = !childCount1 | !childCount2;

  if( !resolveSelfIntersections ){
    reorientCompoundPath( path1 );
    reorientCompoundPath( path2 );
  }

  // Prepare the graphs. Graphs are list of Links that retains
  // full connectivity information. The order of links in a graph is not important
  // That allows us to sort and merge graphs and 'splice' links with their splits easily.
  // Also, this is the place to resolve self-intersecting paths
  var graph = [], path1Children, path2Children, base;
  if( path1 instanceof CompoundPath ){
    path1Children = path1.children;
    for (i = 0, base = true, l = path1Children.length; i < l; i++, base = false) {
      path1Children[i].closed = true;
      if( base ){ path1Clockwise = path1Children[i].clockwise; }
      graph = graph.concat( makeGraph( path1Children[i], 1, base ) );
    }
  } else {
    path1.closed = true;
    path1Clockwise = path1.clockwise;
    // path1.clockwise = true;
    graph = graph.concat( makeGraph( path1, 1, 1, true ) );
  }

  // if operator === BooleanOps.Subtraction, then reverse path2
  // so that the nodes and links will link correctly
  var reverse = ( operator === BooleanOps.Subtraction )? true: false;
  if( path2 instanceof CompoundPath ){
    path2Children = path2.children;
    for (i = 0, base = true, l = path2Children.length; i < l; i++, base = false) {
      path2Children[i].closed = true;
      if( reverse ){ path2Children[i].reverse(); }
      if( base ){ path1Clockwise = path1Children[i].clockwise; }
      graph = graph.concat( makeGraph( path2Children[i], 2, i + 1, base ) );
    }
  } else {
    path2.closed = true;
    // path2.clockwise = true;
    if( reverse ){ path2.reverse(); }
    path2Clockwise = path2.clockwise;
    graph = graph.concat( makeGraph( path2, 2, 1, true ) );
  }

  // console.log( "Total curves: " + graph.length );

  // Sort function to sort intersections according to the 'parameter'(t) in a link (curve)
  function ixSort( a, b ){ return a.parameter - b.parameter; }

  /*
   * Pass 1:
   * Calculate the intersections for all graphs
   * TODO: test if this takes are of self intersecting paths - NO
   *    And since it doesn't take self-intersecting curves, we need to only calculate
   *    intersections if the "id" of the links differ.
   * The rest of the algorithm can easily be modified to resolve self-intersections
   */
   for ( i = graph.length - 1; i >= 0; i--) {
    var c1 = graph[i].getCurve();
    var v1 = c1.getValues();
    for ( j = i -1; j >= 0; j-- ) {
      if( !resolveSelfIntersections && graph[j].id === graph[i].id ){ continue; }
      var c2 = graph[j].getCurve();
      var v2 = c2.getValues();
      var loc = [];
      Curve._addIntersections( v1, v2, c1, loc );
      if( loc.length ){
        for (k = 0, l=loc.length; k<l; k++) {
          graph[i].intersections.push( loc[k] );
          var loc2 = new CurveLocation( c2, null, loc[k].point );
          // TODO: change this to loc2._id when CurveLocation has an id property
          loc2.id = loc[k].id;
          graph[j].intersections.push( loc2 );
        }
      }
    }
  }


  /*
   * Pass 2:
   * Walk the graph, sort the intersections on each individual link.
   * for each link that intersects with another one, replace it with new split links.
   */
   var ix, ixPoint, ixHandleI, ixHandleOut, param, isLinear, parts, left, right;
   for ( i = graph.length - 1; i >= 0; i--) {
    if( graph[i].intersections.length ){
      ix = graph[i].intersections;
      // Sort the intersections if there is more than one
      if( graph[i].intersections.length > 1 ){ ix.sort( ixSort ); }
      // Remove the graph link, this link has to be split and replaced with the splits
      lnk = graph.splice( i, 1 )[0];
      for (j =0, l=ix.length; j<l && lnk; j++) {
        crv = lnk.getCurve();
        // We need to recalculate parameter after each curve split
        // This operation (except for recalculating the curve parameter),
        // is fairly similar to Curve.split method, except that it operates on Node and Link objects.
        param = crv.getParameterOf( ix[j].point );
        // var param = crv.getNearestLocation( ix[j] ).parameter;
        if( param === 0.0 || param === 1.0) {
          // Intersection falls on an existing node
          // there is no need to split the link
          nuNode = ( param === 0.0 )? lnk.nodeIn : lnk.nodeOut;
          nuNode.type = INTERSECTION_NODE;
          nuNode._intersectionID = ix[j].id;
          if( param === 1.0 ){
            leftLink = null;
            rightLink = lnk;
          } else {
            leftLink = lnk;
            rightLink = null;
          }
        } else {
          isLinear = crv.isLinear();
          parts = Curve.subdivide(crv.getValues(), param);
          left = parts[0];
          right = parts[1];
          // Make new link and convert handles from absolute to relative
          ixPoint = new Point( left[6], left[7] );
          if( !isLinear ){
            ixHandleIn = new Point(left[4] - ixPoint.x, left[5] - ixPoint.y);
            ixHandleOut = new Point(right[2] - ixPoint.x, right[3] - ixPoint.y);
          } else {
            ixHandleIn = ixHandleOut = null;
          }
          nuNode = new Node( ixPoint, ixHandleIn, ixHandleOut, lnk.id, lnk.isBaseContour );
          nuNode.type = INTERSECTION_NODE;
          nuNode._intersectionID = ix[j].id;
          // clear the cached Segment on original end nodes and Update their handles
          lnk.nodeIn._segment = null;
          if( !isLinear ){
            var tmppnt = lnk.nodeIn.point;
            lnk.nodeIn.handleOut = new Point( left[2] - tmppnt.x, left[3] - tmppnt.y );
            lnk.nodeOut._segment = null;
            tmppnt = lnk.nodeOut.point;
            lnk.nodeOut.handleIn = new Point( right[4] - tmppnt.x, right[5] - tmppnt.y );
          }
          // Make new links after the split
          leftLink = new Link( lnk.nodeIn, nuNode, lnk.id, lnk.isBaseContour );
          rightLink = new Link( nuNode, lnk.nodeOut, lnk.id, lnk.isBaseContour );
        }
        // Add the first split link back to the graph, since we sorted the intersections
        // already, this link should contain no more intersections to the left.
        if( leftLink ){
          graph.splice( i, 0, leftLink );
        }
        // continue with the second split link, to see if
        // there are more intersections to deal with
        lnk = rightLink;
      }
      // Add the last split link back to the graph
      if( lnk ){
        graph.splice( i, 0, lnk );
      }
    }
  }


  /**
   * Pass 3:
   * Merge matching intersection Node Pairs (type is INTERSECTION_NODE &&
   *  a._intersectionID == b._intersectionID )
   *
   * Mark each Link(Curve) according to whether it is
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
  for ( i = graph.length - 1; i >= 0; i--) {
    lnk = graph[i];
    crv = lnk.getCurve();
    // var midPoint = new Point(lnk.nodeIn.point);
    var midPoint = crv.getPoint( 0.5 );
    var insidePath1 = (lnk.id === 1 )? false : path1.contains( midPoint );
    var insidePath2 = (lnk.id === 2 )? false : path2.contains( midPoint );
    if( !operator( lnk, insidePath1, insidePath2 ) ){
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
    if( node.type === INTERSECTION_NODE ){
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
        //Check if it is a self-intersecting Node
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
          node.type = otherNode.type = NORMAL_NODE;
          node._intersectionID = null;
          node._segment = otherNode._segment = null;
        } else {
          // Merge the nodes together, by adding this node's information to the other node
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

  // Final step: Retrieve the resulting paths from the graph
  var boolResult = new CompoundPath();
  var firstNode = true, nextNode, foundBasePath = false;
  while( firstNode ){
    firstNode = nextNode = null;
    len = graph.length;
    while( len-- ){
      lnk = graph[len];
      if( !lnk.INVALID && !lnk.nodeIn.visited && !firstNode ){
        if( !foundBasePath && lnk.isBaseContour === 1 ){
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
      while( firstNode.uniqueID !== nextNode.uniqueID ){
        path.add( nextNode.getSegment( true ) );
        nextNode.visited = true;
        if( !nextNode.linkOut ){
          throw { name: 'Boolean Error', message: 'No link found at node id: ' + nextNode.id };
        }
        nextNode = nextNode.linkOut.nodeOut;
      }
      path.closed = true;
      // path.clockwise = true;
      if( path.segments.length > 1 ){ // avoid stray segments
        boolResult.addChild( path );
      }
    }
  }
  boolResult = boolResult.reduce();

  // Remove the paths we duplicated
  path1.remove();
  path2.remove();

  return boolResult;
}


function markPoint( pnt, t, c, tc, remove ) {
  if( !pnt ) return;
  c = c || '#000';
  if( remove === undefined ){ remove = true; }
  var cir = new Path.Circle( pnt, 2 );
  cir.style.fillColor = c;
  cir.style.strokeColor = tc;
  if( t !== undefined || t !== null ){
    var text = new PointText( pnt.add([0, -3]) );
    text.justification = 'center';
    text.fillColor = c;
    text.content = t;
    if( remove ){
      text.removeOnMove();
    }
  }
  if( remove ) {
    cir.removeOnMove();
  }
}

// Same as the paperjs' Numerical class,
// added here because I can't access the original from this scope
var Numerical = {
  TOLERANCE : 10e-6
};

// paperjs' Curve._addIntersections modified to return just intersection Point with a
// unique id.
paper.Curve._addIntersections =  function(v1, v2, curve, locations) {
  var bounds1 = Curve.getBounds(v1),
  bounds2 = Curve.getBounds(v2);
  if (bounds1.touches(bounds2)) {
      // See if both curves are flat enough to be treated as lines.
      if (Curve.isFlatEnough(v1, /*#=*/ Numerical.TOLERANCE)
        && Curve.isFlatEnough(v2, /*#=*/ Numerical.TOLERANCE)) {
        // See if the parametric equations of the lines interesct.
      var point = new Line(v1[0], v1[1], v1[6], v1[7], false)
      .intersect(new Line(v2[0], v2[1], v2[6], v2[7], false),
              // Filter out beginnings of the curves, to avoid
              // duplicate solutions where curves join.
              true, false);
      if (point){
          // Passing null for parameter leads to lazy determination of
          // parameter values in CurveLocation#getParameter() only
          // once they are requested.
          var cl = new CurveLocation(curve, null, point);
          cl.id = UNIQUE_ID++;
          locations.push( cl );
        }
      } else {
        // Subdivide both curves, and see if they intersect.
        var v1s = Curve.subdivide(v1),
        v2s = Curve.subdivide(v2);
        for (var i = 0; i < 2; i++)
          for (var j = 0; j < 2; j++)
            this._addIntersections(v1s[i], v2s[j], curve, locations);
        }
      }
      return locations;
    };
