

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
        var loc = tvalue ? new CurveLocation( curve2, t1, null, curve1 ) :
         new CurveLocation( curve1, u1, null, curve2 );
        locations.push( loc );
        return;
    }
    p0x = v1[0]; p0y = v1[1];
    p3x = v1[6]; p3y = v1[7];
    p1x = v1[2]; p1y = v1[3];
    p2x = v1[4]; p2y = v1[5];
    q0x = v2[0]; q0y = v2[1];
    q3x = v2[6]; q3y = v2[7];
    q1x = v2[2]; q1y = v2[3];
    q2x = v2[4]; q2y = v2[5];
    // Calculate L
    var d1 = _getSignedDist( p0x, p0y, p3x, p3y, p1x, p1y );
    var d2 = _getSignedDist( p0x, p0y, p3x, p3y, p2x, p2y );
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
    // The convex hull for the non-parametric bezier curve D(ti, di(t))
    var dq0 = _getSignedDist( p0x, p0y, p3x, p3y, q0x, q0y );
    var dq1 = _getSignedDist( p0x, p0y, p3x, p3y, q1x, q1y );
    var dq2 = _getSignedDist( p0x, p0y, p3x, p3y, q2x, q2y );
    var dq3 = _getSignedDist( p0x, p0y, p3x, p3y, q3x, q3y );

    var mindist = Math.min( dq0, dq3 );
    var maxdist = Math.max( dq0, dq3 );
    // If the fatlines don't overlap, we have no intersections!
    if( dmin > maxdist || dmax < mindist ){
        return;
    }
    // Ideally we need to calculate the convex hull for D(ti, di(t))
    // here we are just checking against all possibilities
    var Dt = [
        [ 0.0, dq0, 0.3333333333333333, dq1 ],
        [ 0.3333333333333333, dq1, 0.6666666666666666, dq2 ],
        [ 0.6666666666666666, dq2, 1.0, dq3 ],
        [ 1.0, dq3, 0.0, dq0 ],
        [ 0.0, dq0, 0.6666666666666666, dq2 ],
        [ 1.0, dq3, 0.3333333333333333, dq1 ]
    ];
    // Now we clip the convex hulls for D(ti, di(t)) with dmin and dmax
    // for the coorresponding t values
    var tmindmin = Infinity, tmaxdmin = -Infinity,
    tmindmax = Infinity, tmaxdmax = -Infinity, ixd, ixdx, i;
    var dmina = [0, dmin, 2, dmin];
    var dmaxa = [0, dmax, 2, dmax];
    for (i = 0; i < 6; i++) {
        var Dtl = Dt[i];
        // ixd = Dtl.intersect( vecdmin );
        ixd = _intersectLines( Dtl, dmina);
        if( ixd ){
            ixdx = ixd[0];
            tmindmin = ( ixdx < tmindmin )? ixdx : tmindmin;
            tmaxdmin = ( ixdx > tmaxdmin )? ixdx : tmaxdmin;
        }
        // ixd = Dtl.intersect( vecdmax );
        ixd = _intersectLines( Dtl, dmaxa);
        if( ixd ){
            ixdx = ixd[0];
            tmindmax = ( ixdx < tmindmax )? ixdx : tmindmax;
            tmaxdmax = ( ixdx > tmaxdmax )? ixdx : tmaxdmax;
        }
    }
    // if dmin doesnot intersect with the convexhull, reset it to 0
    tmindmin = ( tmindmin === Infinity )? 0 : tmindmin;
    tmaxdmin = ( tmaxdmin === -Infinity )? 0 : tmaxdmin;
    // if dmax doesnot intersect with the convexhull, reset it to 1
    tmindmax = ( tmindmax === Infinity )? 1 : tmindmax;
    tmaxdmax = ( tmaxdmax === -Infinity )? 1 : tmaxdmax;
    var tmin = Math.min( tmindmin, tmaxdmin, tmindmax, tmaxdmax );
    var tmax = Math.max( tmindmin, tmaxdmin, tmindmax, tmaxdmax);

    // if( count === 1 ){
    //   console.log( dmin, dmax, tmin, tmax, " - ", tmindmin, tmaxdmin, tmindmax, tmaxdmax )
    //   plotD_vs_t( 250, 110, Dt, dmin, dmax, tmin, tmax, 1, tvalue );
    // }

    // return;

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
        // pnt.push( new Point( x + arr[i].point.x * 190, y + arr[i].point.y * yscale ) );
        pnt.push( new Point( x + arr[i][0] * 190, y + arr[i][1] * yscale ) );
    }
    var pth = new Path( pnt[0], pnt[1], pnt[2], pnt[3] );
    pth.closed = true;
    pth.style.strokeColor = '#000';
    new Path( new Segment(pnt[0], null, pnt[1].subtract(pnt[0])), new Segment( pnt[3], pnt[2].subtract(pnt[3]), null ) ).style.strokeColor = clr;
}

function signum(num) {
    return ( num > 0 )? 1 : ( num < 0 )? -1 : 0;
}

var _intersectLines = function(v1, v2) {
    var result, a1x, a2x, b1x, b2x, a1y, a2y, b1y, b2y;
    a1x = v1[0]; a1y = v1[1];
    a2x = v1[2]; a2y = v1[3];
    b1x = v2[0]; b1y = v2[1];
    b2x = v2[2]; b2y = v2[3];
    var ua_t = (b2x - b1x) * (a1y - b1y) - (b2y - b1y) * (a1x - b1x);
    var ub_t = (a2x - a1x) * (a1y - b1y) - (a2y - a1y) * (a1x - b1x);
    var u_b  = (b2y - b1y) * (a2x - a1x) - (b2x - b1x) * (a2y - a1y);
    if ( u_b !== 0 ) {
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;
        if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
            return [a1x + ua * (a2x - a1x), a1y + ua * (a2y - a1y)];
        }
    }
};

var _getSignedDist = function( a1x, a1y, a2x, a2y, bx, by ){
    var vx = a2x - a1x, vy = a2y - a1y;
    var bax = bx - a1x, bay =  by - a1y;
    var ba2x = bx - a2x, ba2y =  by - a2y;
    var cvb = bax * vy - bay * vx;
    if (cvb === 0) {
        cvb = bax * vx + bay * vy;
        if (cvb > 0) {
            cvb = (bax - vx) * vx + (bay -vy) * vy;
            if (cvb < 0){ cvb = 0; }
        }
    }
    var side = cvb < 0 ? -1 : cvb > 0 ? 1 : 0;
    // Calculate the distance
    var m = vy / vx, b = a1y - ( m * a1x );
    var dist = Math.abs( by - ( m * bx ) - b ) / Math.sqrt( m*m + 1 );
    var dista1 = Math.sqrt( bax * bax + bay * bay );
    var dista2 = Math.sqrt( ba2x * ba2x + ba2y * ba2y );
    return side * Math.min( dist, dista1, dista2 );
};

