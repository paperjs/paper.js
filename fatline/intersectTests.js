
paper.install(window);

/**
 * http://stackoverflow.com/questions/6875625/does-javascript-provide-a-high-resolution-timer
 */
if (window.performance && window.performance.now) {
  console.log("Using high performance timer");
  getTimestamp = function() { return window.performance.now(); };
} else {
  if (window.performance && window.performance.webkitNow) {
    console.log("Using webkit high performance timer");
    getTimestamp = function() { return window.performance.webkitNow(); };
  } else {
    console.log("Using low performance timer");
    getTimestamp = function() { return new Date().getTime(); };
  }
}

function runTests() {
  var caption, pathA, pathB, group, testdata = [], randomtestdata = [], testQueued = 0, testExecuted = 0;

  var container = document.getElementById( 'container' );

  function runTest(testName, handler) {
    var caption = document.createElement('h3');
    var canvas = document.createElement('canvas');
    caption.appendChild(document.createTextNode(testName));
    container.appendChild(caption);
    container.appendChild(canvas);
    ++testQueued;
    setTimeout(function() {
      console.log('\n' + testName);
      paper.setup(canvas);
      var paths = handler();
      var success = testIntersections(paths[0], paths[1], caption, testName, testdata);
      if( !success ){
        window.p1 = paths[0].exportSVG();
        window.p2 = paths[1].exportSVG();
      }
      testExecuted++;
      if( testExecuted === testQueued ){
        plotData();
      }
    }, 0);
    return caption;
  }

  // var caption = document.createElement('h3');
  // caption.appendChild(document.createTextNode("Randomised tests (may take a while...)"));
  // container.appendChild(caption);
  // var canvas = document.createElement('CANVAS');
  // container.appendChild( canvas );
  // paper.setup( canvas );
  // doRandomTests( randomtestdata );
  // window.d = randomtestdata;
  // container.removeChild( canvas );

  // runTest('random', function(){
  //   pathA = getRandomPath(5);
  //   pathB = getRandomPath(5);
  //   return [pathA, pathB];
  // });

  runTest('random 2', function(){
    group  = paper.project.importSVG( document.getElementById( 'svgrandom1' ) );
    pathA = group.children[0];
    pathB = group.children[1];
    return [pathA, pathB];
  });

  runTest('Overlapping circles', function(){
    pathA = new Path.Circle(new Point(80, 110), 50);
    pathB = new Path.Circle(new Point(150, 110), 70);
    return [pathA, pathB];
  });

  runTest('Polygon and square', function(){
    pathA = new Path.RegularPolygon(new Point(80, 110), 12, 80);
    pathB = new Path.Rectangle(new Point(100, 80), [80, 80] );
    return [pathA, pathB];
  });

  runTest('Circle and square (overlaps exactly on existing segments)', function(){
    pathA = new Path.Circle(new Point(110, 110), 80);
    pathB = new Path.Rectangle(new Point(110, 110), [80, 80] );
    return [pathA, pathB];
  });

  runTest('Circle and square (existing segments overlaps on curves)', function(){
    pathA = new Path.Circle(new Point(110, 110), 80);
    pathB = new Path.Rectangle(new Point(110, 110), [100, 100] );
    return [pathA, pathB];
  });

  runTest('Square and square (one segment overlaps on a line)', function(){
    pathA = new Path.Rectangle(new Point(80, 125), [50, 50] );
    pathA.rotate( 45 );
    pathB = new Path.Rectangle(new Point(pathA.segments[2].point.x, 110), [80, 80] );
    return [pathA, pathB];
  });

  runTest('Rectangle and rectangle (overlaps exactly on existing curves)', function(){
    pathA = new Path.Rectangle(new Point(30.5, 50.5), [100, 150]);
    pathB = new Path.Rectangle(new Point(130.5, 60.5), [100, 150]);
    return [pathA, pathB];
  });

  runTest('Circle and banana (multiple intersections within same curve segment)', function(){
    pathA = new Path.Circle(new Point(80, 110), 80);
    pathB = new Path.Circle(new Point(130, 110), 80 );
    pathB.segments[3].point = pathB.segments[3].point.add( [ 0, -120 ] );
    return [pathA, pathB];
  });

  runTest('Overlapping stars 1', function(){
    pathA = new Path.Star(new Point(80, 110), 10, 20, 80);
    pathB = new Path.Star(new Point(120, 110), 10, 30, 100);
    return [pathA, pathB];
  });

  runTest('Overlapping stars 2', function(){
    pathA = new Path.Star(new Point(110, 110), 20, 20, 80);
    pathB = new Path.Star(new Point(110, 110), 6, 30, 100);
    return [pathA, pathB];
  });

  runTest('Maximum possible intersections between 2 cubic bezier curve segments - 9', function(){
    pathA = new Path();
    pathA.add( new Segment( [173, 44], [-281, 268], [-86, 152] ) );
    pathA.add( new Segment( [47, 93], [-89, 100], [240, -239] ) );
    pathA.closed = true;
    pathB = pathA.clone();
    pathB.rotate( -90 );
    pathA.translate( [-10,0] );
    pathB.translate( [10,0] );
    return [pathA, pathB];
  });

  runTest('SVG gears', function(){
      group  = paper.project.importSVG( document.getElementById( 'svggears' ) );
      pathA = group.children[0];
      pathB = group.children[1];
      return [pathA, pathB];
    });

  runTest('Glyphs imported from SVG', function(){
    group  = paper.project.importSVG( document.getElementById( 'glyphsys' ) );
    pathA = group.children[0];
    pathB = group.children[1];
    return [pathA, pathB];
  });

  runTest('CompoundPaths 1', function(){
    group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
    pathA = group.children[0];
    pathB = group.children[1];
    return [pathA, pathB];
  });

  runTest('CompoundPaths 2 - holes', function(){
    group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
    pathA = group.children[0];
    pathB = new CompoundPath();
    group.children[1].clockwise = true;
    pathB.addChild(group.children[1]);
    var npath = new Path.Circle([110, 110], 30);
    pathB.addChild( npath );
    return [pathA, pathB];
  });

  runTest('CompoundPaths 3 !', function(){
    group  = paper.project.importSVG( document.getElementById( 'svggreenland' ) );
    pathA = group.children[0];
    pathB = group.children[1];
    pathB.scale( 0.5, 1 ).translate( [25.5, 0] );
    // pathA.scale( 2 );
    // pathB.scale( 2 );
    return [pathA, pathB];
  });

  runTest('CompoundPaths 4 - holes and islands 1', function(){
    group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
    pathA = group.children[0];
    pathB = new CompoundPath();
    group.children[1].clockwise = true;
    pathB.addChild(group.children[1]);
    var npath = new Path.Circle([40, 80], 20);
    pathB.addChild( npath );
    return [pathA, pathB];
  });

  runTest('CompoundPaths 5 - holes and islands 2', function(){
    group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
    pathA = group.children[0];
    pathB = new CompoundPath();
    group.children[1].clockwise = true;
    pathB.addChild(group.children[1]);
    var npath = new Path.Circle([40, 80], 20);
    pathB.addChild( npath );
    npath = new Path.Circle([120, 110], 30);
    pathB.addChild( npath );
    return [pathA, pathB];
  });

  runTest('CompoundPaths 6 - holes and islands 3', function(){
    group  = paper.project.importSVG( document.getElementById( 'glyphsacirc' ) );
    pathA = group.children[0];
    pathB = new CompoundPath();
    var npath = new Path.Circle([110, 110], 100);
    pathB.addChild( npath );
    npath = new Path.Circle([110, 110], 60);
    pathB.addChild( npath );
    npath = new Path.Circle([110, 110], 30);
    pathB.addChild( npath );
    return [pathA, pathB];
  });

  runTest('CompoundPaths 6 - holes and islands 4 (curves overlap exactly on existing curves)', function(){
    pathA = new Path.Rectangle(new Point(50.5, 50.5), [100, 120]);
    pathB = new CompoundPath();
    pathB.addChild( new Path.Rectangle(new Point(140.5, 30.5), [100, 150]) );
    pathB.addChild( new Path.Rectangle(new Point(150.5, 65.5), [50, 100]) );
    // pathB = new Path.Rectangle(new Point(150.5, 80.5), [80, 80] );
    return [pathA, pathB];
  });


  // Plot the run times
  function plotData(){
    prepareTest( 'Results', container, true );
    var x = 80.5, y = 15.5, width = 500, height = 190, i, txt, ny,
      yy = y + height, xx = x + width;
    var ppaperfill = new Path(), pfatfill = new Path();
    var ppaper = new Path(), pfat = new Path();
    var max = testdata.reduce(function( a, b ){ return Math.max( a, b.paperTime + b.fatTime ); }, 0) + 20;
    var vscale = height / max, hscale = width / testdata.length;
    var caxes = '#999', ctxt = '#222', ctxt2 = '#555', cpaper = '#268BD2', cpaperfill ='#B5E1FF',
      cfat = '#D33682', cfatfill = '#FFADD4';
    new Path.Line( x, yy, xx, yy ).style.strokeColor = caxes;
    new Path.Line( x, yy, x, y ).style.strokeColor = caxes;
    for( i = 0; i < 10 ; i++ ){
      ny = yy - vscale * max * i / 10;
      new Path.Line( x, ny, x-5, ny ).style.strokeColor = caxes;
      txt = new PointText( [x-10, ny] );
      txt.justification = 'right';
      txt.fillColor = (i%2)? ctxt: ctxt2;
      txt.content = (max * i / 10).toFixed(1) + ((!i)? ' ms' : '');
    }
    ppaperfill.add( new Segment( x, yy ) );
    pfatfill.add( new Segment( x, yy ) );
    var vx = x, clr = ctxt;
    var coords = [], avgPaper = 0, avgFat = 0,
      maxSpeedup = -Infinity, minSpeedup = Infinity, avgSpeedup = 0;
    testdata.map(function(data){
      avgPaper += data.paperTime;
      ny = yy - (data.paperTime + data.fatTime) * vscale;
      ppaper.add( new Segment([vx, ny]) );
      ppaperfill.add( new Segment([vx, ny]) );
      var np = new Point( vx, ny );
      np._data = data;
      np._datatype = 'paper';
      coords.push( np );
      avgFat += data.fatTime;
      ny = yy - (data.fatTime) * vscale;
      pfat.add( new Segment([vx, ny]) );
      pfatfill.add( new Segment([vx, ny]) );
      np = new Point( vx, ny );
      np._data = data;
      np._datatype = 'fat';
      coords.push( np );

      var speedup = data.paperTime / data.fatTime;
      if( speedup > maxSpeedup ) maxSpeedup = speedup;
      if( speedup < minSpeedup ) minSpeedup = speedup;
      avgSpeedup += speedup;

      new Path.Line( vx, yy, vx, yy + 5 ).style.strokeColor = caxes;
      txt = new PointText( [vx, yy+18] );
      txt.justification = 'left';
      txt.fillColor = clr;
      txt.content = data.name;
      txt.rotate( 30, new Point(vx, yy+10) );

      if( !data.success ){
        var p = new Path.Line( vx, y, vx, yy );
        p.style.strokeWidth = 5;
        p.style.strokeColor = '#f00';
      }

      clr = ( clr === ctxt )? ctxt2 : ctxt;
      vx += hscale;
    });
    ppaper.style.strokeWidth = 2;
    ppaper.style.strokeColor = cpaper;
    ppaperfill.add( new Segment( vx-hscale, yy ) );
    ppaperfill.closed = true;
    ppaperfill.style.fillColor = cpaperfill;
    pfat.style.strokeWidth = 2;
    pfat.style.strokeColor = cfat;
    pfatfill.add( new Segment( vx-hscale, yy ) );
    pfatfill.closed = true;
    pfatfill.style.fillColor = cfatfill;

    avgPaper/= testdata.length;
    avgFat/= testdata.length;
    avgSpeedup = Math.round(avgSpeedup / testdata.length);
    maxSpeedup = Math.round( maxSpeedup );
    minSpeedup = Math.round( minSpeedup );
    ny = Math.round(yy - avgPaper * vscale) + 0.5;
    new Path.Line(x, ny, xx, ny).style.strokeColor = cpaper;
    txt = new PointText( [xx, ny] );
    txt.justification = 'right';
    txt.fillColor = cpaper;
    txt.content = avgPaper.toFixed(1);
    ny = Math.round(yy - avgFat * vscale) + 0.5;
    new Path.Line(x, ny, xx, ny).style.strokeColor = cfat;
    txt = new PointText( [xx, ny] );
    txt.justification = 'right';
    txt.fillColor = cfat;
    txt.content = avgFat.toFixed(1);

    txt = new PointText([610, 75]);
    txt.justification = 'center';
    txt.fillColor = '#000';
    txt.content = 'fatline vs subdiv';
    new Path.Rectangle( [600, 90], [20, 100] ).style = { fillColor: '#ccc', strokeColor: '#000' };
    ny = 190 - (avgSpeedup - minSpeedup) * 100.0 / (maxSpeedup - minSpeedup);
    new Path.Line( [600, ny], [620, ny] ).style = { strokeWidth: 2, strokeColor: '#000' };
    txt = new PointText([630, 95]);
    txt.fillColor = '#000';
    txt.content = maxSpeedup;
    txt = new PointText([630, 195]);
    txt.fillColor = '#000';
    txt.content = minSpeedup;
    txt = new PointText([630, ny+5]);
    txt.fillColor = '#000';
    txt.content = avgSpeedup + ' times';
    view.draw();

    var tool = new Tool();
    tool.onMouseMove = function( e ){
      var len = coords.length;
      var data = null, dist = Infinity, dst, pnt = null, type = 'paper';
      while( len-- ){
        dst = e.point.getDistance( coords[len], true );
        if( dst < dist ){
          pnt = coords[len];
          data = coords[len]._data;
          type = coords[len]._datatype;
          dist = dst;
        }
      }
      if( dist > 500 ){ return; }
      if( pnt && data ){
        var p = new Path.Line( pnt.x+0.5, y, pnt.x+0.5, yy );
        p.style.strokeColor = '#000';
        p.removeOnMove();
        p = new Path.Circle( pnt, 3 );
        p.style.fillColor = (type === 'fat')? '#D33682' :'#268BD2';
        p.removeOnMove();
        var txt = new PointText( [ 500, 20 ] );
        txt.content = 'subdiv : ' + data.paperTime.toFixed(1) + ' ms';
        txt.fillColor = '#222';
        txt.removeOnMove();
        txt = new PointText( [ 500, 36 ] );
        txt.content = 'fatline : ' + data.fatTime.toFixed(1) + ' ms';
        txt.fillColor = '#222';
        txt.removeOnMove();
      }
    };
  }


  function prepareTest( testName, parentNode, _big ){
    console.log( '\n' + testName );
    var caption = document.createElement('h3');
    caption.appendChild( document.createTextNode( testName ) );
    var canvas = document.createElement('CANVAS');
    if(_big){
      canvas.className += ' big';
    }
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
function testIntersections( path1, path2, caption, testname, testdata, nomark) {
  var i, l, maxCount = 1, count = maxCount, st, t1, t2,
    ixsPaper, ixsFatline, success = false, maxdiff = -Infinity;
  try{
    path1.style = path2.style = pathStyleNormal;

    if( !nomark ) console.time('paperjs x ' + maxCount);
    st = getTimestamp();
    while(count--){
      ixsPaper = path1.getIntersections( path2 );
    }
    t1 = (getTimestamp() - st) / maxCount;
    if( !nomark ) console.timeEnd('paperjs x ' + maxCount);

    count = maxCount;
    if( !nomark ) console.time('fatline x ' + maxCount);
    st = getTimestamp();
    while(count--){
      ixsFatline = getIntersections2( path1, path2 );
    }
    t2 = (getTimestamp() - st) / maxCount;
    if( !nomark ) console.timeEnd('fatline x ' + maxCount);

    var found = 0, tol = 0.1;
    if( ixsFatline.length === ixsPaper.length ){
      for(i=0, l=ixsFatline.length; i<l; i++){
        pa = ixsFatline[i].point;
        for (j = 0; j < ixsPaper.length; j++) {
          if( !ixsPaper[j]._found ){
            pb = ixsPaper[j].point;
            if( Math.abs( pa.x - pb.x ) < tol && Math.abs( pa.y - pb.y ) < tol ){
              ++found;
              ixsPaper[j]._found = true;
            }
          }
        }
      }
    }
    success = ixsPaper.length === found;

    if( !nomark ){
      markIntersections( ixsPaper, '#00f', 'paperjs' );
      markIntersections( ixsFatline, '#f00', 'fatline' );
    }
  } catch(e){
    console.timeEnd('paperjs x ' + maxCount);
    console.timeEnd('fatline x ' + maxCount);
    t1 = t2 = 0;
    console.error( e.name + ": " + e.message );
    if( caption ) { caption.className += ' error'; }
  }finally{
    view.draw();
    testdata.push({
      name: testname,
      ratio: ixsFatline.length / (path1.curves.length + path2.curves.length),
      paperTime: t1,
      fatTime: t2,
      success: success
    });
    console.log( found );
  }
  return success;
}

function doRandomTests( testdata ){
  var p1 = new Path(), p2 = new Path(), ixspaper, ixsfat;
  var seg = 5, maxseg = 20, maxiter = 10;
  var i, j, halfseg = (maxseg / 2) | 0;
  var p, hi, ho, st, t1, t2, success;
  while( seg <= maxseg ){
    for (i = 0; i < maxiter; i++) {
      p1.removeSegments();
      p2.removeSegments();
      for (j = 0; j < seg; j++) {
        p = new Point.random().multiply( [100, 100] );
        v = new Point.random().multiply( [20, 20] );
        p1.add( new Segment( p, v, v.multiply(-1) ) );
        p1.closed = true;
        p = new Point.random().multiply( [100, 100] );
        v = new Point.random().multiply( [20, 20] );
        p2.add( new Segment( p, v, v.multiply(-1) ) );
        p2.closed = true;
      }
      st = getTimestamp();
      ixspaper = p1.getIntersections( p2 );
      t1 = (getTimestamp() - st);
      st = getTimestamp();
      ixsfat = getIntersections2( p1, p2 );
      t2 = (getTimestamp() - st);
      // Check against paperjs output
      var found = 0, tol = 1;
      if( ixsfat.length === ixspaper.length ){
        for(i=0, l=ixsfat.length; i<l; i++){
          pa = ixsfat[i].point;
          for (j = 0; j < ixspaper.length; j++) {
            if( !ixspaper[j]._found ){
              pb = ixspaper[j].point;
              if( Math.abs( pa.x - pb.x ) < tol && Math.abs( pa.y - pb.y ) < tol ){
                ++found;
                ixspaper[j]._found = true;
              }
            }
          }
        }
      }
      success = ixspaper.length === found;
      testdata.push({
        curves: seg,
        ixsfat: ixsfat.length,
        ixspaper: ixspaper.length,
        ratio: ixsfat.length / (seg),
        paperTime: t1,
        fatTime: t2,
        speedup: t1 / t2,
        success: success
      });
    }
    ++seg;
    if( seg === halfseg ) maxiter = (maxiter / 2) | 0;
  }
}

function getRandomPath(seg){
  seg = seg || 3;
  var p = new Path(), pnt, hi, ho, v;
  for (j = 0; j < seg; j++) {
    pnt = new Point.random().multiply( [130, 130] );
    v = new Point.random().multiply( [20, 20] );
    p.add( new Segment( pnt, v, v.multiply(-1) ) );
    p.closed = true;
  }
  return p;
}

function markIntersections( ixs, c, txt ){
  for (i = 0, len = ixs.length; i < len; i++) {
    // markPoint( ixs[i].point, ixs[i].parameter );
    markPoint( ixs[i].point, ' ', c, null, false );
    // console.log( txt , ixs[i].parameter )
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
