
paper.install(window);



function runTests() {
  var caption, pathA, pathB, group;

  var container = document.getElementById( 'container' );

  // caption = prepareTest( 'Overlapping circles', container );
  // pathA = new Path.Circle(new Point(80, 110), 50);
  // pathB = new Path.Circle(new Point(150, 110), 70);
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Polygon and square', container );
  // pathA = new Path.RegularPolygon(new Point(80, 110), 12, 80);
  // pathB = new Path.Rectangle(new Point(100, 80), [80, 80] );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Circle and square (overlaps exactly on existing segments)', container );
  // pathA = new Path.Circle(new Point(110, 110), 80);
  // pathB = new Path.Rectangle(new Point(110, 110), [80, 80] );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Circle and square (existing segments overlaps on curves)', container );
  // pathA = new Path.Circle(new Point(110, 110), 80);
  // pathB = new Path.Rectangle(new Point(110, 110), [100, 100] );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Square and square (one segment overlaps on a line)', container );
  // pathA = new Path.Rectangle(new Point(80, 125), [50, 50] );
  // pathA.rotate( 45 );
  // pathB = new Path.Rectangle(new Point(pathA.segments[2].point.x, 110), [80, 80] );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Rectangle and rectangle (overlaps exactly on existing curves)', container );
  // pathA = new Path.Rectangle(new Point(30.5, 50.5), [100, 150]);
  // pathB = new Path.Rectangle(new Point(130.5, 60.5), [100, 150]);
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Circle and banana (multiple intersections within same curve segment)', container );
  // pathA = new Path.Circle(new Point(80, 110), 80);
  // pathB = new Path.Circle(new Point(130, 110), 80 );
  // pathB.segments[3].point = pathB.segments[3].point.add( [ 0, -120 ] );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Overlapping stars 1', container );
  // pathA = new Path.Star(new Point(80, 110), 10, 20, 80);
  // pathB = new Path.Star(new Point(120, 110), 10, 30, 100);
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Overlapping stars 2', container );
  // pathA = new Path.Star(new Point(110, 110), 20, 20, 80);
  // pathB = new Path.Star(new Point(110, 110), 6, 30, 100);
  // testIntersections( pathA, pathB, caption );

  // // caption = prepareTest( 'Circles overlap exactly over each other', container );
  // // pathA = new Path.Circle(new Point(110, 110), 100);
  // // pathB = new Path.Circle(new Point(110, 110), 100 );
  // // // pathB.translate([0.5,0])
  // // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Maximum possible intersections between 2 cubic bezier curve segments - 9', container );
  // pathA = new Path();
  // pathA.add( new Segment( [173, 44], [-281, 268], [-86, 152] ) );
  // pathA.add( new Segment( [47, 93], [-89, 100], [240, -239] ) );
  // pathA.closed = true;
  // pathB = pathA.clone();
  // pathB.rotate( -90 );
  // pathA.translate( [-10,0] );
  // pathB.translate( [10,0] );
  // testIntersections( pathA, pathB, caption );
  // // annotatePath( pathA, null, '#008' );
  // // annotatePath( pathB, null, '#800' );
  // view.draw();

  // caption = prepareTest( 'SVG gears', container );
  // group  = paper.project.importSVG( document.getElementById( 'svggears' ) );
  // pathA = group.children[0];
  // pathB = group.children[1];
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'Glyphs imported from SVG', container );
  // group  = paper.project.importSVG( document.getElementById( 'glyphsys' ) );
  // pathA = group.children[0];
  // pathB = group.children[1];
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'CompoundPaths 1', container );
  // group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
  // pathA = group.children[0];
  // pathB = group.children[1];
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'CompoundPaths 2 - holes', container );
  // group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
  // pathA = group.children[0];
  // pathB = new CompoundPath();
  // group.children[1].clockwise = true;
  // pathB.addChild(group.children[1]);
  // var npath = new Path.Circle([110, 110], 30);
  // pathB.addChild( npath );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'CompoundPaths 3 !', container );
  // group  = paper.project.importSVG( document.getElementById( 'svggreenland' ) );
  // pathA = group.children[0];
  // pathB = group.children[1];
  // pathB.scale( 0.5, 1 ).translate( [25.5, 0] );
  // // pathA.scale( 2 );
  // // pathB.scale( 2 );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'CompoundPaths 4 - holes and islands 1', container );
  // group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
  // pathA = group.children[0];
  // pathB = new CompoundPath();
  // group.children[1].clockwise = true;
  // pathB.addChild(group.children[1]);
  // var npath = new Path.Circle([40, 80], 20);
  // pathB.addChild( npath );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'CompoundPaths 5 - holes and islands 2', container );
  // group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
  // pathA = group.children[0];
  // pathB = new CompoundPath();
  // group.children[1].clockwise = true;
  // pathB.addChild(group.children[1]);
  // var npath = new Path.Circle([40, 80], 20);
  // pathB.addChild( npath );
  // npath = new Path.Circle([120, 110], 30);
  // pathB.addChild( npath );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'CompoundPaths 6 - holes and islands 3', container );
  // group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
  // pathA = group.children[0];
  // pathB = new CompoundPath();
  // var npath = new Path.Circle([110, 110], 100);
  // pathB.addChild( npath );
  // npath = new Path.Circle([110, 110], 60);
  // pathB.addChild( npath );
  // npath = new Path.Circle([110, 110], 30);
  // pathB.addChild( npath );
  // testIntersections( pathA, pathB, caption );

  // caption = prepareTest( 'CompoundPaths 6 - holes and islands 4 (curves overlap exactly on existing curves)', container );
  // pathA = new Path.Rectangle(new Point(50.5, 50.5), [100, 120]);
  // pathB = new CompoundPath();
  // pathB.addChild( new Path.Rectangle(new Point(140.5, 30.5), [100, 150]) );
  // pathB.addChild( new Path.Rectangle(new Point(150.5, 65.5), [50, 100]) );
  // // pathB = new Path.Rectangle(new Point(150.5, 80.5), [80, 80] );
  // testIntersections( pathA, pathB, caption );

  // var tool = new Tool();
  // tool.onMouseMove = function( e ){
  //   var hi = project.hitTest( e.point );
  //   if( hi ){
  //     var item = hi.item;
  //     if( item instanceof PathItem ){
  //       var txt = new PointText( e.point.add([0, -10]) );
  //       txt.justification = 'center';
  //       txt.content = item.id;
  //       txt.fillColor = '#000';
  //       txt.removeOnMove();
  //     }
  //   }
  // };

  window.a = pathA;
  window.b = pathB;

  prepareTest( 'none', container );

  // var pa = new Path( new Segment([100, 100], null, [70, 0]), new Segment([200, 200], [0, -70], null) );
  var pa = new Path( new Segment([100, 100], null, [150, 0]), new Segment([230, 180], [-150, -20], null) );
  var pb = new Path.Line( [120, 80], [ 210, 200 ] );
  // pb.reverse();
  // pb.scale(0.6);
  pa.style = pb.style = pathStyleBoolean;

  var vc = pa.curves[0].getValues();
  var vl = pb.curves[0].getValues();

  var loc = [];
  // _getCurveLineIntersection( vc, vl, pa.curves[0], pb.curves[0], loc );
  _getCurveLineIntersection( vl, vc, pb.curves[0], pa.curves[0], loc );

  console.log( loc )
  markIntersections( loc )

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
function testIntersections( path1, path2, caption ) {
  // try{
    path1.style = path2.style = pathStyleNormal;
    var maxCount = 1, count = maxCount;
    console.time('paperjs');
    while(count--){
      var ixsPaper = path1.getIntersections( path2 );
    }
    console.timeEnd('paperjs');

    count = maxCount;
    console.time('fatline');
    while(count--){
      var ixsFatline = getIntersections2( path1, path2 );
    }
    console.timeEnd('fatline');

    markIntersections( ixsPaper, '#00f' );
    markIntersections( ixsFatline, '#f00' );
    view.draw();
  // } catch(e){
  //   console.error( e.name + ": " + e.message );
  //   if( caption ) { caption.className += ' error'; }
  // }finally{
  //   console.timeEnd(caption + ' paperjs');
  //   console.timeEnd(caption + ' fatline');
  //   view.draw();
  // }
}

function markIntersections( ixs, c ){
  for (i = 0, len = ixs.length; i < len; i++) {
    // markPoint( ixs[i].point, ixs[i].parameter );
    markPoint( ixs[i].point, ' ', c );
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
    // window.__p1.fullySelected = true;
  } else {
    if( window.__p2 ) window.__p2.remove();
    window.__p2 = new Path(
      new Segment( [crv[0], crv[1]], null, [crv[2] - crv[0], crv[3] - crv[1]] ),
      new Segment( [crv[6], crv[7]], [crv[4] - crv[6], crv[5] - crv[7]], null )
      );
    window.__p2.style.strokeColor = c;
    // window.__p2.fullySelected = true;
  }
  view.draw();
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
