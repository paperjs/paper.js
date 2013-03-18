
project.currentStyle.fillColor = 'black';

var path11 = new Path.Rectangle([100, 100], [100, 100]);
var path21 = new Path.Rectangle([50, 30], [100, 100]);
var newPath = new Path();
path11.style.fillColor = 'rgb( 71, 91, 98 )'
path21.style.fillColor = 'rgb( 129, 144, 144 )'


// onFrame = function( event ) {
  path21.rotate( 148 );
  
  var path1 = path11.clone();
  var path2 = path21.clone();

  newPath.removeSegments();

// Intersections of path1 with path2
var ixs = path1.getIntersections( path2 );

// TODO for both paths, first sort ixs according to curveOffset,
// so that, insert order is correct

ixs.forEach( function( item, index ){
  // T
  console.log( item.curveOffset )
  var newSeg1 = new Segment( item.point );
  var newSeg2 = new Segment( item.point );
  newSeg1._ixOtherSeg = newSeg2;
  newSeg2._ixOtherSeg = newSeg1;
  path1.insertSegment( item.curve.segment1.index + 1, newSeg1 );
  path2.insertSegment( item._ixCurve.segment1.index + 1, newSeg2 );
});

// console.log( path2.segments )

var startSeg = path1.firstSegment;
// TODO Make sure, if path1 is not completely inside path2
while( path2.contains( startSeg.point ) ) {
   startSeg = startSeg.next;
}

// path2.firstSegment.selected = path2.firstSegment.next.selected = true;
// path1.firstSegment.selected = path1.firstSegment.next.selected = true;

console.log( path1.isClockwise() )
console.log( path2.isClockwise() )

// path2.reverse()
// startSeg.selected = true;

var curSeg;
var count = 1;
var ixswitch = true;
while( curSeg !== startSeg ) {
  if( !curSeg ) {
    curSeg = startSeg;
  }
  if( curSeg._ixOtherSeg ){
    curSeg = curSeg._ixOtherSeg;
    ixswitch = !ixswitch
  }
  newPath.addSegment( new Segment( curSeg ) );
  
  var text = new PointText( curSeg.point - [ 5, 5 ] );
  text.justification = 'center';
  if( ixswitch ) {
    text.fillColor = 'black';
  }else{
    text.fillColor = 'blue';
  }
  text.content = count.toString();
  count++;

  curSeg = curSeg.next;
}

newPath.translate( [200, 0] );
newPath.style.fillColor = 'rgb( 209, 28, 36 )';
newPath.selected = true;

// path1.remove();
// path2.remove();
// }

// path1.selected = true;
// path1.selected = true;

