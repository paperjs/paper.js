
paper.install(window);



function runTests() {
  var caption, pathA, pathB, group;

  var container = document.getElementById( 'container' );

  caption = prepareTest( 'Overlapping circles', container );
  pathA = new Path.Circle(new Point(80, 110), 50);
  pathB = new Path.Circle(new Point(150, 110), 70);
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Disjoint circles', container );
  pathA = new Path.Circle(new Point(60, 110), 50);
  pathB = new Path.Circle(new Point(170, 110), 50);
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Overlapping circles - enveloping', container );
  pathA = new Path.Circle(new Point(110, 110), 100);
  pathB = new Path.Circle(new Point(120, 110), 60);
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Polygon and square', container );
  pathA = new Path.RegularPolygon(new Point(80, 110), 12, 80);
  pathB = new Path.Rectangle(new Point(100, 80), [80, 80] );
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Circle and square (overlaps exactly on existing segments)', container );
  pathA = new Path.Circle(new Point(110, 110), 80);
  pathB = new Path.Rectangle(new Point(110, 110), [80, 80] );
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Circle and banana (multiple intersections within same curve segment)', container );
  pathA = new Path.Circle(new Point(80, 110), 80);
  pathB = new Path.Circle(new Point(130, 110), 80 );
  pathB.segments[3].point = pathB.segments[3].point.add( [ 0, -120 ] );
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Overlapping stars 1', container );
  pathA = new Path.Star(new Point(80, 110), 10, 20, 80);
  pathB = new Path.Star(new Point(120, 110), 10, 30, 100);
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Overlapping stars 2', container );
  pathA = new Path.Star(new Point(110, 110), 20, 20, 80);
  pathB = new Path.Star(new Point(110, 110), 6, 30, 100);
  testBooleanStatic( pathA, pathB, caption );

  // caption = prepareTest( 'Circles overlap exactly over each other', container );
  // pathA = new Path.Circle(new Point(110, 110), 100);
  // pathB = new Path.Circle(new Point(110, 110), 100 );
  // testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Maximum possible intersections between 2 cubic bezier curve segments - 9', container );
  pathA = new Path();
  pathA.add( new Segment( [173, 44], [-281, 268], [-86, 152] ) );
  pathA.add( new Segment( [47, 93], [-89, 100], [240, -239] ) );
  pathA.closed = true;
  pathB = pathA.clone();
  pathB.rotate( -90 );
  pathA.translate( [-10,0] );
  pathB.translate( [10,0] );
  testBooleanStatic( pathA, pathB, caption );
  annotatePath( pathA, null, '#008' );
  annotatePath( pathB, null, '#800' );
  view.draw();

  caption = prepareTest( 'SVG gears', container );
  group  = paper.project.importSvg( document.getElementById( 'svggears' ) );
  pathA = group.children[0];
  pathB = group.children[1];
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'Glyphs imported from SVG', container );
  group  = paper.project.importSvg( document.getElementById( 'glyphsys' ) );
  pathA = group.children[0];
  pathB = group.children[1];
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'CompoundPaths 1', container );
  group  = paper.project.importSvg( document.getElementById( 'glyphsacirc' ) );
  pathA = group.children[0];
  pathB = group.children[1];
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'CompoundPaths 2', container );
  group  = paper.project.importSvg( document.getElementById( 'glyphsacirc' ) );
  pathA = group.children[0];
  pathB = new CompoundPath();
  group.children[1].clockwise = true;
  pathB.addChild(group.children[1]);
  var npath = new Path.Circle([110, 110], 30);
  pathB.addChild( npath );
  testBooleanStatic( pathA, pathB, caption );

  caption = prepareTest( 'CompoundPaths 3 !', container );
  group  = paper.project.importSvg( document.getElementById( 'svggreenland' ) );
  pathA = group.children[0];
  pathB = group.children[1];
  pathB.scale( 0.75 ).translate( [25, 0] );
  testBooleanStatic( pathA, pathB, caption );

  // window.p = pathB;


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

var booleanStyle = {
  fillColor: new Color( 1, 0, 0, 0.5 ),
  strokeColor: new Color( 0, 0, 0 ),
  strokeWidth: 2
};

var pathStyleNormal = {
  strokeColor: new Color( 0, 0, 0 ),
  fillColor: new Color( 0, 0, 0, 0.0 ),
  strokeWidth: 1
};

var pathStyleBoolean = {
  strokeColor: new Color( 0.8 ),
  fillColor: new Color( 0, 0, 0, 0.0 ),
  strokeWidth: 1
};

// Better if path1 and path2 fit nicely inside a 200x200 pixels rect
function testBooleanStatic( path1, path2, caption ) {
  try{
    var _p1U = path1.clone().translate( [250, 0] );
    var _p2U = path2.clone().translate( [250, 0] );
    _p1U.style = _p2U.style = pathStyleBoolean;
    console.time( 'Union' );
    var boolPathU = boolUnion( _p1U, _p2U );
    console.timeEnd( 'Union' );

    var _p1I = path1.clone().translate( [500, 0] );
    var _p2I = path2.clone().translate( [500, 0] );
    _p1I.style = _p2I.style = pathStyleBoolean;
    console.time( 'Intersection' );
    var boolPathI = boolIntersection( _p1I, _p2I );
    console.timeEnd( 'Intersection' );

    var _p1S = path1.clone().translate( [750, 0] );
    var _p2S = path2.clone().translate( [750, 0] );
    _p1S.style = _p2S.style = pathStyleBoolean;
    console.time( 'Subtraction' );
    var boolPathS = boolSubtract( _p1S, _p2S );
    console.timeEnd( 'Subtraction' );

    path1.style = path2.style = pathStyleNormal;
    boolPathU.style = boolPathI.style = booleanStyle;
    boolPathS.style = booleanStyle;
  } catch( e ){
    console.error( e.message );
    if( caption ) { caption.className += ' error'; }
    paper.project.view.element.className += ' hide';
  } finally {
    console.timeEnd( 'Union' );
    console.timeEnd( 'Intersection' );
    console.timeEnd( 'Subtraction' );
    view.draw();
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
  l.style.strokeColor = l2.style.strokeColor = cir.style.fillColor = c;
  if( remove ) {
    l.removeOnMove();
    l2.removeOnMove();
    cir.removeOnMove();
    text.removeOnMove();
  }
}
