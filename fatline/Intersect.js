

var EPSILON = 10e-12;
var TOLERANCE = 10e-6;

var _tolerence = TOLERANCE;

function getIntersections2( path1, path2 ){
    var locations = [];
    return locations;
}


paper.Curve.prototype._addIntersections2 = function( v1, v2, curve, locations ) {

};

function _clipFatLine( v1, v2, t1, t2, u1, u2, tdiff, udiff, tvalue, curve1, curve2, locations, count ){
    if( count === undefined ) { count = 0; }
    else { ++count; }
    if( t1 >= t2 - _tolerence && t1 <= t2 + _tolerence && u1 >= u2 - _tolerence && u1 <= u2 + _tolerence ){
        var curve = tvalue ? curve2 : curve1;
        locations.push( new CurveLocation( curve, t1 ) );
        return;
    }

    var p0 = new Point( v1[0], v1[1] ), p3 = new Point( v1[6], v1[7] );
    var p1 = new Point( v1[2], v1[3] ), p2 = new Point( v1[4], v1[5] );
    var q0 = new Point( v2[0], v2[1] ), q3 = new Point( v2[6], v2[7] );
    var q1 = new Point( v2[2], v2[3] ), q2 = new Point( v2[4], v2[5] );

    // Calculate L
    var lp = new Line( p0, p3, false );
    var d1 = lp.getSide( p1 ) * lp.getDistance( p1 );
    var d2 = lp.getSide( p2 ) * lp.getDistance( p2 );
    var dmin, dmax;
    if( d1 * d2 > 0){
        // 3/4 * min{0, d1, d2}
        dmin = 0.75 * Math.min( 0, d1, d2 );
        dmax = 0.75 * Math.max( 0, d1, d2 );
    } else {
        // 4/9 * min{0, d1, d2}
        dmin = 4 * Math.min( 0, d1, d2 ) / 9.0;
        dmax = 4 * Math.max( 0, d1, d2 ) / 9.0;
    }

    // Infinite lines for dmin and dmax for clipping
    var vecdmin = new Line( [0, dmin], [1, 0] );
    var vecdmax = new Line( [0, dmax], [1, 0] );
    // The convex hull for the non-parametric bezier curve D(ti, di(t))
    var dq0 = new Point( 0.0, lp.getSide(q0) * lp.getDistance(q0) );
    var dq1 = new Point( 0.3333333333333333, lp.getSide(q1) * lp.getDistance(q1) );
    var dq2 = new Point( 0.6666666666666666, lp.getSide(q2) * lp.getDistance(q2) );
    var dq3 = new Point( 1.0, lp.getSide(q3) * lp.getDistance(q3) );
    // Ideally we need to calculate the convex hull for D(ti, di(t))
    // here we are just checking against all possibilities
    var Dt = [
        new Line( dq0, dq1, false ),
        new Line( dq1, dq2, false ),
        new Line( dq2, dq3, false ),
        new Line( dq3, dq0, false ),
        new Line( dq0, dq2, false ),
        new Line( dq3, dq1, false )
    ];
    // Now we clip the convex hulls for D(ti, di(t)) with dmin and dmax
    // for the coorresponding t values
    var tmindmin = Infinity, tmaxdmin = -Infinity,
    tmindmax = Infinity, tmaxdmax = -Infinity, ixd, ixdx, i;
    for (i = 0; i < 6; i++) {
        var Dtl = Dt[i];
        ixd = Dtl.intersect( vecdmin );
        if( ixd ){
            ixdx = ixd.x;
            tmindmin = ( ixdx < tmindmin )? ixdx : tmindmin;
            tmaxdmin = ( ixdx > tmaxdmin )? ixdx : tmaxdmin;
        }
        ixd = Dtl.intersect( vecdmax );
        if( ixd ){
            ixdx = ixd.x;
            tmindmax = ( ixdx < tmindmax )? ixdx : tmindmax;
            tmaxdmax = ( ixdx > tmaxdmax )? ixdx : tmaxdmax;
        }
    }
    var tmin = Math.min( tmindmin, tmaxdmin, tmindmax, tmaxdmax );
    var tmax = Math.max( tmindmin, tmaxdmin, tmindmax, tmaxdmax );

    if( tmin < 0 || tmax > 1 ) {
        return;
    }


    // if( count === 1 ){
    //   // console.log( dmin, dmax, tmin, tmax )
    //   plotD_vs_t( 250, 110, Dt, dmin, dmax, tmin, tmax, 1, tvalue );
    // }

    // We need to toggle clipping both curves alternatively
    // tvalue indicates whether to compare t or u for testing for convergence
    var nuV2 = Curve.getPart( v2, tmin, tmax );
    var convRate;
    if( tvalue ){
        nuT1 = t1 + tmin * ( t2 - t1 );
        nuT2 = t1 + tmax * ( t2 - t1 );
        // Test the convergence rate
        // if the clipping fails to converge atleast 20%,
        // subdivide the longest curve.
        convRate = (tdiff - tmax + tmin ) / tdiff;
        if( convRate <= 0.2) {

        }

        // console.log( nuT1, nuT2, t1, t2 );
        _clipFatLine( nuV2, v1, nuT1, nuT2, u1, u2, (tmax - tmin), udiff, !tvalue, curve1, curve2, locations, count );
    } else {
        nuU1 = u1 + tmin * ( u2 - u1 );
        nuU2 = u1 + tmax * ( u2 - u1 );

        convRate = ( udiff - tmax + tmin ) / udiff;

        _clipFatLine( nuV2, v1, t1, t2, nuU1, nuU2 , tdiff, (tmax - tmin), !tvalue, curve1, curve2, locations, count );
    }
}


function drawFatline( v1 ) {
    var l = new Line( [v1[0], v1[1]], [v1[6], v1[7]], false );
    var p1 = new Point( v1[2], v1[3] ), p2 = new Point( v1[4], v1[5] );
    var d1 = l.getSide( p1 ) * l.getDistance( p1 );
    var d2 = l.getSide( p2 ) * l.getDistance( p2 );
    var dmin, dmax;
    if( d1 * d2 > 0){
        // 3/4 * min{0, d1, d2}
        dmin = 0.75 * Math.min( 0, d1, d2 );
        dmax = 0.75 * Math.max( 0, d1, d2 );
    } else {
        // 4/9 * min{0, d1, d2}
        dmin = 4 * Math.min( 0, d1, d2 ) / 9.0;
        dmax = 4 * Math.max( 0, d1, d2 ) / 9.0;
    }

    var ll = new Path.Line( v1[0], v1[1], v1[6], v1[7] );
    ll.style.strokeColor = new Color( 0,0,0.9, 0.8);
    var lp1 = ll.segments[0].point;
    var lp2 = ll.segments[1].point;
    var pm = l.vector, pm1 = pm.rotate( signum( dmin ) * -90 ), pm2 = pm.rotate( signum( dmax ) * -90 );
    var p11 = lp1.add( pm1.normalize( Math.abs(dmin) ) );
    var p12 = lp2.add( pm1.normalize( Math.abs(dmin) ) );
    var p21 = lp1.add( pm2.normalize( Math.abs(dmax) ) );
    var p22 = lp2.add( pm2.normalize( Math.abs(dmax) ) );
    ll = new Path.Line( p11, p12 );
    ll.style.strokeColor = new Color( 0,0,0.9);
    ll = new Path.Line( p21, p22 );
    ll.style.strokeColor = new Color( 0,0,0.9);
}

function plotD_vs_t( x, y, arr, dmin, dmax, tmin, tmax, yscale, tvalue ){
    yscale = yscale || 1;
    new Path.Line( x, y-100, x, y+100 ).style.strokeColor = '#aaa';
    new Path.Line( x, y, x + 200, y ).style.strokeColor = '#aaa';

    var clr = (tvalue)? '#a00' : '#00a';

    new Path.Line( x, y + dmin * yscale, x + 200, y + dmin * yscale ).style.strokeColor = '#000';
    new Path.Line( x, y + dmax * yscale, x + 200, y + dmax * yscale ).style.strokeColor = '#000';
    new Path.Line( x + tmin * 190, y-100, x + tmin * 190, y+100 ).style.strokeColor = clr;
    new Path.Line( x + tmax * 190, y-100, x + tmax * 190, y+100 ).style.strokeColor = clr;

    var pnt = [];
    for (var i = 0; i < arr.length; i++) {
        pnt.push( new Point( x + arr[i].point.x * 190, y + arr[i].point.y * yscale ) );
    	// pnt.push( new Point( x + arr[i][0] * 190, y + arr[i][1] * yscale ) );
    }
    var pth = new Path( pnt[0], pnt[1], pnt[2], pnt[3] );
    pth.closed = true;
    pth.style.strokeColor = '#000';
    new Path( new Segment(pnt[0], null, pnt[1].subtract(pnt[0])), new Segment( pnt[3], pnt[2].subtract(pnt[3]), null ) ).style.strokeColor = clr;
}

function signum(num) {
    return ( num > 0 )? 1 : ( num < 0 )? -1 : 0;
}

var _addLineIntersections = function(v1, v2, curve, locations) {
    var result, a1x, a2x, b1x, b2x, a1y, a2y, b1y, b2y;
    a1x = v1[0]; a1y = v1[1];
    a2x = v1[6]; a2y = v1[7];
    b1x = v2[0]; b1y = v2[1];
    b2x = v2[6]; b2y = v2[7];
    var ua_t = (b2x - b1x) * (a1y - b1y) - (b2y - b1y) * (a1x - b1x);
    var ub_t = (a2x - a1x) * (a1y - b1y) - (a2y - a1y) * (a1x - b1x);
    var u_b  = (b2y - b1y) * (a2x - a1x) - (b2x - b1x) * (a2y - a1y);
    if ( u_b !== 0 ) {
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;
        if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
            locations.push( new CurveLocation(curve, null, new Point(a1x + ua * (a2x - a1x), a1y + ua * (a2y - a1y))) );
        }
    }
};
