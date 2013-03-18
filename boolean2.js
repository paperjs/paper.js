
project.currentStyle.fillColor = 'black';

var path11 = new Path.Circle([80, 80], 50);
// var path11 = new Path.Rectangle([100, 100], [100, 100]);
var path21 = new Path.Rectangle([100, 100], [100, 100]);
// var path21 = new Path.Polygon
var newPath = new Path();
path11.style.fillColor = 'rgb( 71, 91, 98 )'
path21.style.fillColor = 'rgb( 129, 144, 144 )'


// onFrame = function( event ) {
  path21.rotate( 1 );
  
  newPath.removeSegments();

  var path1 = path11.clone();
  var path2 = path21.clone();

// console.log(path1.isClockwise())
// console.log(path2.isClockwise())

  // Intersections of path1 with path2
  var ixs = path1.getIntersections( path2 );

  // TODO for both paths, first sort ixs according to curveOffset,
  // so that, insert order is correct

  if( ixs.length > 0 ) {
    ixs.forEach( function( item, index ){

      var newSeg1 = new Segment( item.point );
      var newSeg2 = new Segment( item.point );
      newSeg1._ixCurveOffset = item.curveOffset;
      newSeg2._ixCurveOffset = item._ixLocation.curveOffset;
      newSeg1._ixOtherSeg = newSeg2;
      newSeg2._ixOtherSeg = newSeg1;

      if( item.curve.segment1._ixPoints === undefined ){
        item.curve.segment1._ixPoints = [ newSeg1 ];
      } else {
        item.curve.segment1._ixPoints.push( newSeg1 );
      }
      if( item._ixLocation.curve.segment1._ixPoints === undefined ){
        item._ixLocation.curve.segment1._ixPoints = [ newSeg2 ];
      } else {
        item._ixLocation.curve.segment1._ixPoints.push( newSeg2 );
      }
    });


    // path1.segments.forEach( function( item, index ){
    //   if( item._ixPoints ) {
    //     if( item._ixPoints.length > 1 ) {
    //       item._ixPoints.sort( compare_ixPoints );
    //     }
    //     path1.insertSegments( item.index + 1, item._ixPoints );
    //     item._ixPoints = undefined;
    //   }
    // });
    // path2.segments.forEach( function( item, index ){
    //   console.log(item._ixPoints)
    //   if( item._ixPoints ) {
    //     if( item._ixPoints.length > 1 ) {
    //       item._ixPoints.sort( compare_ixPoints );
    //     }
    //     path2.insertSegments( item.index + 1, item._ixPoints );
    //     item._ixPoints = undefined;
    //   }
    // });

    // TODO make sure path is closed

    // Walk the segments in path1, backwards (counter-clockwise)
    var pathSeg = path1.lastSegment;
    do{
      if( pathSeg._ixPoints ) {
        if( pathSeg._ixPoints.length > 1 ) {
          pathSeg._ixPoints.sort( compare_ixPoints );
        }
        path1.insertSegments( pathSeg.index + 1, pathSeg._ixPoints );
        pathSeg._ixPoints = undefined;
      }
      pathSeg = pathSeg.previous;
    } while ( pathSeg !== path1.lastSegment );

    // Walk the segments in path2, backwards (counter-clockwise)
    var pathSeg = path2.lastSegment;
    do {
      if( pathSeg._ixPoints ) {
        if( pathSeg._ixPoints.length > 1 ) {
          pathSeg._ixPoints.sort( compare_ixPoints );
        }
        path2.insertSegments( pathSeg.index + 1, pathSeg._ixPoints );
        pathSeg._ixPoints = undefined;
      }
      pathSeg = pathSeg.previous;
    } while ( pathSeg !== path2.lastSegment );


    // TODO Make sure, if path1 is not completely inside path2.
    // TODO. This part will differ for different boolean ops.
    // For Union
    var startSeg = path1.firstSegment;
    while( path2.contains( startSeg.point ) || startSeg._ixOtherSeg ) {
      startSeg = startSeg.next;
    }

    // path11.segments[startSeg.index].selected = true;

    // startSeg.selected = true;

    var curSeg;
    var count = 1;
    var ixswitch = true;
    do {
      if( !curSeg ) {
        curSeg = startSeg;
      }
      if( curSeg._ixOtherSeg ){
        curSeg = curSeg._ixOtherSeg;
        ixswitch = !ixswitch
      }
      newPath.addSegment( new Segment( curSeg ) );

      // var text = new PointText( curSeg.point - [ 5, 5 ] );
      // text.justification = 'center';
      // if( ixswitch ) {
      //   text.fillColor = 'black';
      // }else{
      //   text.fillColor = 'blue';
      // }
      // text.content = count.toString();

      count++;

      curSeg = curSeg.next;
    } while( curSeg !== startSeg && count < 50);

    // console.log(count);


    // annotateSegments( path1, 5, '#f00' )
    // annotateSegments( path2, -5, '#000' )

    newPath.closePath()
    newPath.translate( [200, 0] );
    newPath.style.fillColor = 'rgb( 209, 28, 36 )';
    newPath.fullySelected = true;
  }

//   path1.remove();
//   path2.remove();
// }

// path1.selected = true;
// path2.selected = true;


// Sort new intersection points according to their 
// distance along the curve, so that when we 
// insert them in to the respective paths, the orientation
// of the path is maintained ( in out case clockwise )
function compare_ixPoints( a, b ) {
  if( a._ixCurveOffset < b._ixCurveOffset ) {
    return -1
  } else if( a._ixCurveOffset > b._ixCurveOffset ){
    return 1;
  } else {
    // This shouldn't happen?!
    return 0;
  }
}

// For debugging: Show a number next to each segment ina path
function annotateSegments( p, d, c ) {
  var count = 0;
  p.segments.forEach( function( item, index ){
    var text = new PointText( item.point - [ d, d ] );
    text.style.fillColor = c;
    text.justification = 'center';
    text.content = count.toString();
    count++;
  });
}
