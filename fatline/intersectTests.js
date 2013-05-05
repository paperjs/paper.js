
paper.install(window);



function runTests() {
  var caption, pathA, pathB, group;

  var container = document.getElementById( 'container' );

  caption = prepareTest( 'Find Curve Intersections - 10,000 times.', container );
  pathA = new Path.Circle(new Point(70, 110), 50);
  // pathA.rotate( 45 );
  pathB = new Path.Circle(new Point(160, 110), 50);
  // pathB.rotate( 45 );
  // pathB.segments[3].point = pathB.segments[3].point.add( [10, -120] );
  // pathB.segments[0].handleIn = pathB.segments[0].handleIn.add( [-100, 0] );
  pathB.translate( [ -20, -10 ] );
  // testIntersection( pathA, pathB, caption );

  window.a = pathA;
  window.b = pathB;

  var _p1U = new Path( pathA.segments[1], pathA.segments[2] );
  // var _p1U = new Path( pathA.segments[1], pathA.segments[2] );
  // _p1U.reverse();
  var _p2U = new Path( pathB.segments[0], pathB.segments[1] );
  _p1U.style = _p2U.style = pathStyleBoolean;
  var crvs = _p2U.curves;
  // for (var i = 0; i < crvs.length; i++) {
    drawFatline( _p1U.curves[0].getValues() );
    drawFatline( crvs[0].getValues() );
  // }

  var maxCount = 1, count = maxCount, loc, loc2;
  var v1 = crvs[0].getValues(), v2 = _p1U.curves[0].getValues();
  console.time('fatline');
  while( count-- ){
    loc = [];
    // Curve.getIntersections2( v1, v2, crvs[0], _p1U.curves[0], loc );
    var ret = _clipFatLine( v1, v2, 0, 1, 0, 1, 1, 1, true, crvs[0], _p1U.curves[0], loc );
  }
  console.timeEnd('fatline');

  count = maxCount;
  console.time('paperjs');
  while( count-- ){
    loc2 = [];
    Curve.getIntersections( v1, v2, crvs[0], _p1U.curves[0], loc2 );
  }
  console.timeEnd('pa perjs');

  console.log( ' ' );
  for( i =0; i < loc.length; i++){
    markPoint( loc[i].point, loc[i].parameter, '#f00' );
    console.log( 'fatline t = ' + loc[i].parameter );
  }
  for( i =0; i < loc2.length; i++){
    // markPoint( loc2[i].point, loc2[i].parameter, '#00f' );
    // console.log( 'paperjs t = ' + loc2[i].parameter );
    markPoint( loc2[i].getIntersection().point, loc2[i].getIntersection().parameter, '#00f' );
    console.log( 'paperjs t = ' + loc2[i].getIntersection().parameter );
  }


  convexhull( 20, 30 , 3 , -20 );

  view.draw();


  function prepareTest( testName, parentNode ){
    console.log( '\n' + testName );
    var caption = document.createElement('h3');
    caption.appendChild( document.createTextNode( testName ) );
    var canvas = document.createElement('CANVAS');
    parentNode.appendChild( caption );
    parentNode.appendChild( canvas );
    paper.setup( canvas );
    return caption;
  }
}

var pathStyleIx = {
  fillColor: new Color( 0.8, 0, 0 ),
  strokeColor: new Color( 0, 0, 0 )
};

var pathStyleNormal = {
  strokeColor: new Color( 0, 0, 0 ),
  fillColor: new Color( 0, 0, 0, 0.1 ),
  strokeWidth: 1
};

var pathStyleBoolean = {
  strokeColor: new Color( 0,0,0,0.4 ),
  fillColor: new Color( 0, 0, 0, 0.0 ),
  strokeWidth: 1
};

// Better if path1 and path2 fit nicely inside a 200x200 pixels rect
function testIntersection( path1, path2, caption ) {
  try{
    path1.style = path2.style = pathStyleNormal;

    var _p1U = path1.clone().translate( [250, 0] );
    var _p2U = path2.clone().translate( [250, 0] );
    _p1U.style = _p2U.style = pathStyleBoolean;
    console.time( 'New' );
    var ixs = getIntersections2( _p1U, _p2U );
    console.timeEnd( 'New' );
    markIntersections(ixs);


    var _p1I = path1.clone().translate( [500, 0] );
    // _p1I.reverse();
    var _p2I = path2.clone().translate( [500, 0] );
    _p1I.style = _p2I.style = pathStyleBoolean;
    console.time( 'Paperjs' );
    ixs = _p1I.getIntersections( _p2I );
    console.timeEnd( 'Paperjs' );
    // markIntersections(ixs);

    var vals = ixs[0].curve.getValues();
    var section = Curve.getPart( vals, ixs[1].parameter, ixs[0].parameter );
    console.log(section)

    markPoint( new Point(section[0], section[1]), ixs[0].parameter );
    markPoint( new Point(section[6], section[7]), ixs[1].parameter );
  } catch( e ){
    console.error( e.name + ": " + e.message );
    if( caption ) { caption.className += ' error'; }
    // paper.project.view.element.className += ' hide';
  } finally {
    console.timeEnd( 'New' );
    console.timeEnd( 'Paperjs' );
    view.draw();
  }
}

function markIntersections( ixs ){
  for (i = 0, len = ixs.length; i < len; i++) {
    markPoint( ixs[i].point, ixs[i].parameter );
  }
}

function convexhull( dq0, dq1, dq2, dq3 ){
  // Prepare the convex hull for D(ti, di(t))
  var distq1 = _getSignedDist( 0.0, dq0, 1.0, dq3, 0.3333333333333333, dq1 );
  var distq2 = _getSignedDist( 0.0, dq0, 1.0, dq3, 0.6666666666666666, dq2 );
  // Check if [1/3, dq1] and [2/3, dq2] are on the same side of line [0,dq0, 1,dq3]
  if( distq1 * distq2 < 0 ) {
      Dt = [
          [ 0.0, dq0, 0.3333333333333333, dq1 ],
          [ 0.3333333333333333, dq1, 1.0, dq3 ],
          [ 0.6666666666666666, dq2, 0.0, dq0 ],
          [ 1.0, dq3, 0.6666666666666666, dq2 ]
      ];
  } else {
      // Check if the hull is a triangle or a quadrilatteral
      var dqmin, dqmax, dqapex1, dqapex2;
      distq1 = Math.abs(distq1);
      distq2 = Math.abs(distq2);
      var vqa1a2x, vqa1a2y, vqa1Maxx, vqa1Maxy, vqa1Minx, vqa1Miny;
      console.log( " distq1 =  " + distq1 + " , distq2 = " + distq2 )
      if( distq1 > distq2 ){
          dqapex1 = [ 1.0, dq3 ];
          dqapex2 = [ 0.0, dq0 ];
          dqmin = [ 0.6666666666666666, dq2 ];
          dqmax = [ 0.3333333333333333, dq1 ];
      } else {
          dqapex1 = [ 0.0, dq0 ];
          dqapex2 = [ 1.0, dq3 ];
          dqmin = [ 0.3333333333333333, dq1 ];
          dqmax = [ 0.6666666666666666, dq2 ];
      }
      // vector dqapex1->dqapex2
      var vqa1a2x = dqapex1[0] - dqapex2[0], vqa1a2y = dqapex1[1] - dqapex2[1];
      // vector dqapex1->dqmax
      var vqa1Maxx = dqapex1[0] - dqmax[0], vqa1Maxy = dqapex1[1] - dqmax[1];
      // vector dqapex1->dqmin
      var vqa1Minx = dqapex1[1] - dqmin[0], vqa1Miny = dqapex1[1] - dqmin[1];
      // compare cross products of these vectors to determine, if
      // point is in triangles [ dq3, dqMax, dq0 ] or [ dq0, dqMax, dq3 ]
      var vcrossa1a2_a1Max = vqa1a2x * vqa1Maxy - vqa1a2y * vqa1Maxx;
      var vcrossa1a2_a1Min = vqa1a2x * vqa1Miny - vqa1a2y * vqa1Minx;
      var vcrossa1Max_a1Min = vqa1Maxx * vqa1Miny - vqa1Maxy * vqa1Minx;
      var sign1 = signum( vcrossa1Max_a1Min );
      var sign2 = signum( vcrossa1a2_a1Min );
      console.log( vcrossa1a2_a1Max, vcrossa1a2_a1Min, vcrossa1Max_a1Min )
      if( sign1 === sign2 ){
          // Point [2/3, dq2] is inside the triangle and the convex hull is a triangle
          Dt = [
              [ 0.0, dq0, dqmax[0], dqmax[1] ],
              [ dqmax[0], dqmax[1], 1.0, dq3 ],
              [ 1.0, dq3, 0.0, dq0 ]
          ];
      } else {
          // Convexhull is a quadrilatteral and we need all lines in the correct order
          Dt = [
              [ 0.0, dq0, 0.3333333333333333, dq1 ],
              [ 0.3333333333333333, dq1, 0.6666666666666666, dq2 ],
              [ 0.6666666666666666, dq2, 1.0, dq3 ],
              [ 1.0, dq3, 0.0, dq0 ]
          ];
      }
  }
  Dt2 = [
  [ 0.0, dq0, 0.3333333333333333, dq1 ],
  [ 0.3333333333333333, dq1, 0.6666666666666666, dq2 ],
  [ 0.6666666666666666, dq2, 1.0, dq3 ],
  [ 1.0, dq3, 0.0, dq0 ]
  ];
  var yscale = 2;
  var x = 500, y = 110;
  for (var i = 0; i < Dt.length; i++) {
      var pth = new Path.Line( new Point( x + Dt[i][0] * 190, y + Dt[i][1] * yscale ),
       new Point( x + Dt[i][2] * 190, y + Dt[i][3] * yscale ) );
      pth.style.strokeColor = '#999';
  }
  var pnt = [];
  for ( i = 0; i < Dt2.length; i++) {
    pnt.push( new Point( x + Dt2[i][0] * 190, y + Dt2[i][1] * yscale ) );
    markPoint( pnt[i], " " );
  }
  new Path( new Segment(pnt[0], null, pnt[1].subtract(pnt[0])), new Segment( pnt[3], pnt[2].subtract(pnt[3]), null ) ).style.strokeColor = '#f00';

  return Dt;
}

// ==============================================================
// On screen debug helpers
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

function annotatePath( path, t, c, tc, remove ) {
  if( !path ) return;
  var crvs = path.curves;
  for (i = crvs.length - 1; i >= 0; i--) {
    annotateCurve( crvs[i], t, c, tc, remove );
  }
  var segs = path.segments;
  for (i = segs.length - 1; i >= 0; i--) {
    annotateSegment( segs[i], t, c, tc, remove, true );
  }
}

function annotateSegment( s, t, c, tc, remove, skipCurves ) {
  if( !s ) return;
  c = c || '#000';
  tc = tc || '#ccc';
  t = t || s.index;
  if( remove === undefined ){ remove = true; }
  var crv = s.curve;
  var t1 = crv.getNormal( 0 ).normalize( 10 );
  var p = s.point.clone().add( t1 );
  var cir = new Path.Circle( s.point, 2 );
  cir.style.fillColor = c;
  cir.style.strokeColor = tc;
  var text = new PointText( p );
  text.justification = 'center';
  text.fillColor = c;
  text.content = t;
  if( remove ) {
    cir.removeOnMove();
    text.removeOnMove();
  }
  if( !skipCurves ) {
    annotateCurve( s.curveIn, null, c, tc, remove );
    annotateCurve( s.curveOut, null, c, tc, remove );
  }
}

function annotateCurve( crv, t, c, tc, remove ) {
  if( !crv ) return;
  c = c || '#000';
  tc = tc || '#ccc';
  t = t || crv.index;
  if( remove === undefined ){ remove = true; }
  var p = crv.getPoint( 0.57 );
  var t1 = crv.getTangent( 0.57 ).normalize( -10 );
  var p2 = p.clone().add( t1 );
  var l = new Path.Line( p, p2 ).rotate( 30, p );
  var l2 = new Path.Line( p, p2 ).rotate( -30, p );
  p = crv.getPoint( 0.43 );
  var cir = new Path.Circle( p, 8 );
  var text = new PointText( p.subtract( [0, -4] ) );
  text.justification = 'center';
  text.fillColor = tc;
  text.content = t;
  l.style.strokeColor = l2.style.strokeColor = c;
  cir.style.fillColor = c;
  if( remove ) {
    l.removeOnMove();
    l2.removeOnMove();
    cir.removeOnMove();
    text.removeOnMove();
  }
}
