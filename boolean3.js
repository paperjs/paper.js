project.currentStyle.fillColor = 'black';

// var path11 = new Path.Circle([95, 95], 50);
// var path21 = new Path.Rectangle([100, 100], [100, 100]);

// var path11 = new Path.Rectangle([100, 100], [100, 100]);
// var path21 = new Path.Polygon

var path11 = new Path.Star(new Point(260, 250), 10, 50, 150);
var path21 = new Path.Star(new Point(350, 250), 10, 70, 250);
// path11.smooth();
// path21.smooth();

path11.style.fillColor = 'rgb( 71, 91, 98 )'
path21.style.fillColor = 'rgb( 129, 144, 144 )'


function compare_ixPoints( a, b ) {
  if( a.curveOffset < b.curveOffset ) {
    return -1
  } else if( a.curveOffset > b.curveOffset ){
    return 1;
  } else {
    // This shouldn't happen?!
    return 0;
  }
}

Path.prototype.getUnion = function( other ) {
  var path1 = this.clone();
  var path2 = other.clone();
  // TODO do the necessary checks here.
  if( !path1.isClockwise() ) path1.reverse();
  if( !path2.isClockwise() ) path2.reverse();

  console.time("Lines");
  var ixs = path1.getIntersections( path2 );
  console.timeEnd("Lines");

  console.time("sort");
  ixs.sort( compare_ixPoints );
  console.timeEnd("sort");

  // console.log( ixs.length )

  for (var i = 0, l = ixs.length; i < l; i++) {
    for (var j = i + 1, l = ixs.length; j < l; j++) {
      if(ixs[i].point == ixs[j].point && 
        ixs[i].curve.index === ixs[j].curve.index &&
        ixs[i]._ixLocation.curve.index === ixs[j]._ixLocation.curve.index ){
          ixs[i]._ixdup = true;
      }
    }
  }

  var counter = 0;

  if( ixs.length > 1 ){
    ixs.forEach( function( item, index ){
      if(item._ixdup) return;
      var crv1 = item.divide();
      var crv2 = item._ixLocation.divide();

      if( !crv1 ) {
        if( item.parameter === 1 ){
          crv1 = item.curve.next;
        } else {
          crv1 = item.curve;
        }
      }
      if( !crv2 ) {
        console.log( item._ixLocation )

        // TODO if _ixLocation.parameter is null
        // patch the _addIntersections method,
        // to intersect the curve back again at that point

        if( item._ixLocation.parameter === 1 ){
          crv2 = item._ixLocation.curve.next;
        } else {
          crv2 = item._ixLocation.curve;
        }
      }

      annotateSegment(crv2.segment1, -10, "#000", false, counter++)
      crv1.segment1._ixLink = crv2.segment1;
      crv2.segment1._ixLink = crv1.segment1;
    });

    // annotateSegments( path1, 5, '#000', true )
    // annotateSegments( path2, -5, '#00f' )
    // path1.fullySelected = true;
    // path2.fullySelected = true;

    var newPath = new Path(),
      startSeg = path1.firstSegment,
      curSeg, loopCut = 0;

    while( path2.contains( startSeg.point ) || startSeg._ixLink ) {
      startSeg = startSeg.next;
    }

    annotateSegment( startSeg, -5, "#0ff" )

    do {
      if( !curSeg ) {
        curSeg = startSeg;
      }
      if( curSeg._ixLink ){
        newPath.addSegment( new Segment( curSeg.point, curSeg.handleIn,  curSeg._ixLink.handleOut) );
        console.log( "S - " + curSeg.index + " -> " + curSeg._ixLink.index )
        curSeg = curSeg._ixLink;
      } else {
        newPath.addSegment( new Segment( curSeg ) );
      }
      loopCut++;
      curSeg = curSeg.next;
    } while( curSeg !== startSeg && loopCut < 50);
    
    newPath.closePath();
    // newPath.style.fillColor = null
    newPath.translate( [500, 0] )
    annotateSegments( newPath , -5, '#0f0' );

  } else {
    // TODO one path is either completely inside
    // or outside the other one.
  }

  // Debug code
  // console.log( newPath.segments.length );
  // annotateSegments( path1, 5, '#000', true )
  // path1.fullySelected = true;
  // annotateSegments( path2, -5, '#00f' )
  // path2.fullySelected = true;
  // path1.selected = true;
  path2.selected = true;
}

path11.getUnion( path21 )

// For debugging: Show a number next to each segment ina path
function annotateSegments( p, d, c, hiLink ) {
  hiLink = hiLink || false;
  p.segments.forEach( function( item, index ){
    annotateSegment( item, d, c, hiLink )
  });
}
function annotateSegment( s, d, c, hiLink , txt) {
  hiLink = hiLink || false;
  var text = new PointText( s.point - [ d, d ] );
  text.style.fillColor = c;
  text.justification = 'center';
  if( txt === undefined )
    text.content = s.index.toString();
  else
    text.content = txt;
  if( hiLink && s._ixLink) {
    annotateSegment( s._ixLink, d - 5, '#f00', false )
  }
}
function markpoint( p ) {
  new Path.Circle(p, 2).style = { strokeColor: '#f0f', fillColor: '#000'}
}

// markpoint( [236.34995495235776, 152.72369685178597 ])
