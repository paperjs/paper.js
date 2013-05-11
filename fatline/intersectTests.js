
paper.install(window);



function runTests() {
  var caption, pathA, pathB, group;

  var container = document.getElementById( 'container' );

  caption = prepareTest( 'Find Curve Intersections - 10,000 times.', container );

  // pathA = new Path.Circle(new Point(70, 110), 50);
  // pathA.rotate( 45 );
  // pathB = new Path.Circle(new Point(160, 110), 50);
  // pathB.rotate( 45 );
  // // pathB.segments[3].point = pathB.segments[3].point.add( [10, -120] );
  // // pathB.translate( [ -20, -30 ] );
  // // pathB.segments[0].handleIn = pathB.segments[0].handleIn.add( [-100, 30] );
  // // pathB.translate( [ 20, -30 ] );
  // // testIntersection( pathA, pathB, caption );

  pathA = new Path();
  pathA.add( new Segment( [47, 93], [-89, 100], [240, -239] ) );
  pathA.add( new Segment( [173, 44], [-281, 268], [-86, 152] ) );
  pathA.closed = true;
  pathB = pathA.clone();
  pathB.rotate( -90 );
  pathA.translate( [-10,0] );
  pathB.translate( [10,0] );

  window.a = pathA;
  window.b = pathB;

  view.draw();

  window.setTimeout( function(){doTest( pathA, pathB, 1000 )}, 10 );

  // var v1 = [84.625,79.375,51,130.5,22.5,178,163,44];
  // var v2 = [91.81412502271213,92.91643774058434,142.93912502271212,126.54143774058434,190.43912502271212,155.04143774058434,56.43912502271214,14.541437740584342]
  // var c1 = new Curve( 84.625,79.375,51,130.5,22.5,178,163,44 );
  // var c2 = new Curve( 91.81412502271213,92.91643774058434,142.93912502271212,126.54143774058434,190.43912502271212,155.04143774058434,56.43912502271214,14.541437740584342);
  // var p1 = new Path( c1.segment1, c1.segment2 );
  // var p2 = new Path( c2.segment1, c2.segment2 );
  // p1.style = p2.style = pathStyleBoolean;
  // var loc = [];
  // Curve.getIntersections2( v1, v2, c1, c2, loc );
  // console.log( loc )

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


function doTest( pathA, pathB, count ){
  var _p1U = new Path( pathA.segments[0], pathA.segments[1] );
  // var _p1U = new Path( pathA.segments[1], pathA.segments[2] );
  // _p1U.reverse();
  var _p2U = new Path( pathB.segments[0], pathB.segments[1] );
  // var _p2U = new Path( pathB.segments[3], pathB.segments[0] );
  _p1U.style = _p2U.style = pathStyleBoolean;
  // for (var i = 0; i < crvs.length; i++) {
    // drawFatline( _p1U.curves[0].getValues() );
    // drawFatline( _p2U.curves[0].getValues() );
  // }

  var maxCount = count || 1, count = maxCount, loc, loc2;
  var v1 = _p1U.curves[0].getValues(), v2 = _p2U.curves[0].getValues();
  console.time('fatline');
  while( count-- ){
    loc = [];
    Curve.getIntersections2( v1, v2, _p1U.curves[0], _p2U.curves[0], loc );
    // Curve.getIntersections2( v2, v1, _p2U.curves[0], _p1U.curves[0], loc );
    // var ret = _clipFatLine( v1, v2, 0, 1, 0, 1, true, crvs[0], _p1U.curves[0], loc );
  }
  console.timeEnd('fatline');

  count = maxCount;
  console.time('paperjs');
  while( count-- ){
    loc2 = [];
    Curve.getIntersections( v1, v2, _p1U.curves[0], _p2U.curves[0], loc2 );
  }
  console.timeEnd('paperjs');

  console.log( ' ' );
  for( i =0; i < loc2.length; i++){
    markPoint( loc2[i].point, ' ', '#00f' );
    // markPoint( loc2[i].point, loc2[i].parameter, '#00f' );
    console.log( 'paperjs t = ' + loc2[i].parameter + ' , u = ' + loc2[i].getIntersection().parameter );
  }
  for( i =0; i < loc.length; i++){
    // console.log( loc[i].point )
    markPoint( loc[i].point, ' ', '#f00' );
    // markPoint( loc[i].point, loc[i].parameter, '#f00' );
    console.log( 'fatline t = ' + loc[i].parameter + ' , u = ' + loc[i].getIntersection().parameter );
  }
  view.draw();
}

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

function markCurve( crv, c, flag) {
  if( !crv ) return;
  c = c || '#000';
  if( flag ){
    if( window.__p1 ) window.__p1.remove();
    window.__p1 = new Path(
      new Segment( [crv[0], crv[1]], null, [crv[2] - crv[0], crv[3] - crv[1]] ),
      new Segment( [crv[6], crv[7]], [crv[4] - crv[6], crv[5] - crv[7]], null )
      );
    window.__p1.style.strokeColor = c;
  } else {
    if( window.__p2 ) window.__p2.remove();
    window.__p2 = new Path(
      new Segment( [crv[0], crv[1]], null, [crv[2] - crv[0], crv[3] - crv[1]] ),
      new Segment( [crv[6], crv[7]], [crv[4] - crv[6], crv[5] - crv[7]], null )
      );
    window.__p2.style.strokeColor = c;
  }
  view.draw();
}

function waitFor( time ){
  var st = new Date();
  while( new Date() - st < time ){}
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
