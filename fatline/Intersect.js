

var EPSILON = 10e-12;
var TOLERANCE = 10e-6;

var _tolerence = EPSILON;

function getIntersections2( path1, path2 ){
    var locations = [];
    return locations;
}


paper.Curve.getIntersections2 = function( v1, v2, curve1, curve2, locations, _t1,  _t2, _u1, _u2 ) {
    _t1 = _t1 || 0; _t2 = _t2 || 1;
    _u1 = _u1 || 0; _u2 = _u2 || 1;
    var loc = { parameter: null };
    var ret = _clipFatLine( v1, v2, 0, 1, 0, 1, true, curve1, curve2, loc );
    if( ret === 1 ){
        var parameter = _t1 + loc.parameter * ( _t2 - _t1 );
        locations.push( new CurveLocation( curve1, parameter, curve1.getPoint(parameter), curve2 ) );
    } else if( ret < 0) {
        // We need to subdivide one of the curves
        // Better if we can subdivide the longest curve
        var v1lx = v1[6] - v1[0];
        var v1ly = v1[7] - v1[1];
        var v2lx = v2[6] - v2[0];
        var v2ly = v2[7] - v2[1];
        var sqrDist1 = v1lx * v1lx  + v1ly * v1ly;
        var sqrDist2 = v2lx * v2lx  + v2ly * v2ly;
        var parts;
        // A quick and dirty way to determine which curve to subdivide
        if( sqrDist1 > sqrDist2 ){
            parts = Curve.subdivide( v1 );
            nuT = ( _t1 + _t2 ) / 2;
            Curve.getIntersections2( parts[0], v2, curve1, curve2, locations, _t1, nuT, _u1, _u2 );
            Curve.getIntersections2( parts[1], v2, curve1, curve2, locations, nuT, _t2, _u1, _u2 );
        } else {
            parts = Curve.subdivide( v2 );
            nuU = ( _u1 + _u2 ) / 2;
            Curve.getIntersections2( v1, parts[0], curve1, curve2, locations, _t1, _t2, _u1, nuU );
            Curve.getIntersections2( v1, parts[1], curve1, curve2, locations, _t1, _t2, nuU, _u2 );
        }
    }
};

function _clipFatLine( v1, v2, t1, t2, u1, u2, tvalue, curve1, curve2, location ){
    if( t1 >= t2 - _tolerence && t1 <= t2 + _tolerence && u1 >= u2 - _tolerence && u1 <= u2 + _tolerence ){
        location.parameter = u1;
        return 1;
    } else {
        var p0x = v1[0], p0y = v1[1];
        var p3x = v1[6], p3y = v1[7];
        var p1x = v1[2], p1y = v1[3];
        var p2x = v1[4], p2y = v1[5];
        var q0x = v2[0], q0y = v2[1];
        var q3x = v2[6], q3y = v2[7];
        var q1x = v2[2], q1y = v2[3];
        var q2x = v2[4], q2y = v2[5];
        // Calculate the fat-line L
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

        var mindist = Math.min( dq0, dq1, dq2, dq3 );
        var maxdist = Math.max( dq0, dq1, dq2, dq3 );
        // If the fatlines don't overlap, we have no intersections!
        if( dmin > maxdist || dmax < mindist ){
            return 0;
        }
        // Calculate the convex hull for non-parametric bezier curve D(ti, di(t))
        var Dt  = _convexhull( dq0, dq1, dq2, dq3 );

        // Now we clip the convex hulls for D(ti, di(t)) with dmin and dmax
        // for the coorresponding t values
        var tmindmin = Infinity, tmaxdmin = -Infinity,
        tmindmax = Infinity, tmaxdmax = -Infinity, ixd, ixdx, i, len;
        var dmina = [0, dmin, 2, dmin];
        var dmaxa = [0, dmax, 2, dmax];
        for (i = 0, len = Dt.length; i < len; i++) {
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
        // We need to toggle clipping both curves alternatively
        // tvalue indicates whether to compare t or u for testing for convergence
        var nuV2 = Curve.getPart( v2, tmin, tmax );
        var convRate, parts;
        if( tvalue ){
            nuT1 = t1 + tmin * ( t2 - t1 );
            nuT2 = t1 + tmax * ( t2 - t1 );
            // Test the convergence rate
            // if the clipping fails to converge by atleast 20%,
            // we need to subdivide the longest curve and try again.
            var td = ( t2 - t1 );
            convRate = ( td - ( nuT2 - nuT1 ) ) / td;
            // console.log( 'convergence rate for t = ' + convRate + "%" );
            if( convRate <= 0.2) {
                // subdivide the curve and try again
                return -1;
            } else {
                return _clipFatLine( nuV2, v1, nuT1, nuT2, u1, u2, !tvalue, curve1, curve2, location );
            }
        } else {
            nuU1 = u1 + tmin * ( u2 - u1 );
            nuU2 = u1 + tmax * ( u2 - u1 );
            var ud = ( u2 - u1 );
            convRate = ( ud - ( nuU2 - nuU1 ) ) / ud;
            // console.log( 'convergence rate for u = ' + convRate + "%" );
            if( convRate <= 0.2) {
                // subdivide the curve and try again
                return -1;
            } else {
                return _clipFatLine( nuV2, v1, t1, t2, nuU1, nuU2 , !tvalue, curve1, curve2, location );
            }
        }
    }
}


/**
 * Clip curve values V2 with fat-line of v1 and vice versa
 * @param  {Array}  v - Section of the first curve, for which we will make a fat-line
 * @param  {Number} t1 - start parameter for v in vOrg
 * @param  {Number} t2 - end parameter for v in vOrg
 * @param  {Array}  v2 - Section of the second curve; we will clip this curve with the fat-line of v
 * @param  {Number} u1 - start parameter for v2 in v2Org
 * @param  {Number} u2 - end parameter for v2 in v2Org
 * @param  {Array}  vOrg - The original curve values for v
 * @param  {Array}  v2Org - The original curve values for v2
 * @return {[type]}
 */
function _clipBezFatLine( v1, t1, t2, v2, u1, u2, vOrg, v2Org ){

}

function _convexhull( dq0, dq1, dq2, dq3 ){
    // Prepare the convex hull for D(ti, di(t))
    var distq1 = _getSignedDist( 0.0, dq0, 1.0, dq3, 0.3333333333333333, dq1 );
    var distq2 = _getSignedDist( 0.0, dq0, 1.0, dq3, 0.6666666666666666, dq2 );
    // Check if [1/3, dq1] and [2/3, dq2] are on the same side of line [0,dq0, 1,dq3]
    if( distq1 * distq2 < 0 ) {
        // dq1 and dq2 lie on different sides on [0, q0, 1, q3]
        // Convexhull is a quadrilatteral and line [0, q0, 1, q3] is NOT part of the convexhull
        // so we are pretty much done here.
        Dt = [
            [ 0.0, dq0, 0.3333333333333333, dq1 ],
            [ 0.3333333333333333, dq1, 1.0, dq3 ],
            [ 0.6666666666666666, dq2, 0.0, dq0 ],
            [ 1.0, dq3, 0.6666666666666666, dq2 ]
        ];
    } else {
        // dq1 and dq2 lie on the same sides on [0, q0, 1, q3]
        // Convexhull can be a triangle or a quadrilatteral and
        // line [0, q0, 1, q3] is part of the convexhull.
        // Check if the hull is a triangle or a quadrilatteral
        var dqmin, dqmax, dqapex1, dqapex2;
        distq1 = Math.abs(distq1);
        distq2 = Math.abs(distq2);
        var vqa1a2x, vqa1a2y, vqa1Maxx, vqa1Maxy, vqa1Minx, vqa1Miny;
        if( distq1 > distq2 ){
            dqmin = [ 0.6666666666666666, dq2 ];
            dqmax = [ 0.3333333333333333, dq1 ];
            // apex is dq3 and the other apex point is dq0
            // vector dqapex->dqapex2 or the base vector which is already part of c-hull
            vqa1a2x = 1.0, vqa1a2y = dq3 - dq0;
            // vector dqapex->dqmax
            vqa1Maxx = 0.6666666666666666, vqa1Maxy = dq3 - dq1;
            // vector dqapex->dqmin
            vqa1Minx = 0.3333333333333333, vqa1Miny = dq3 - dq2;
        } else {
            dqmin = [ 0.3333333333333333, dq1 ];
            dqmax = [ 0.6666666666666666, dq2 ];
            // apex is dq0 in this case, and the other apex point is dq3
            // vector dqapex->dqapex2 or the base vector which is already part of c-hull
            vqa1a2x = -1.0, vqa1a2y = dq0 - dq3;
            // vector dqapex->dqmax
            vqa1Maxx = -0.6666666666666666, vqa1Maxy = dq0 - dq2;
            // vector dqapex->dqmin
            vqa1Minx = -0.3333333333333333, vqa1Miny = dq0 - dq1;
        }
        // compare cross products of these vectors to determine, if
        // point is in triangles [ dq3, dqMax, dq0 ] or [ dq0, dqMax, dq3 ]
        var vcrossa1a2_a1Max = vqa1a2x * vqa1Maxy - vqa1a2y * vqa1Maxx;
        var vcrossa1a2_a1Min = vqa1a2x * vqa1Miny - vqa1a2y * vqa1Minx;
        var vcrossa1Max_a1Min = vqa1Maxx * vqa1Miny - vqa1Maxy * vqa1Minx;
        if( vcrossa1Max_a1Min * vcrossa1a2_a1Min < 0 ){
            // Point [2/3, dq2] is inside the triangle and the convex hull is a triangle
            Dt = [
                [ 0.0, dq0, dqmax[0], dqmax[1] ],
                [ dqmax[0], dqmax[1], 1.0, dq3 ],
                [ 1.0, dq3, 0.0, dq0 ]
            ];
        } else {
            // Convexhull is a quadrilatteral and we need all lines in the correct order where
            // line [0, q0, 1, q3] is part of the convex hull
            Dt = [
                [ 0.0, dq0, 0.3333333333333333, dq1 ],
                [ 0.3333333333333333, dq1, 0.6666666666666666, dq2 ],
                [ 0.6666666666666666, dq2, 1.0, dq3 ],
                [ 1.0, dq3, 0.0, dq0 ]
            ];
        }
    }
    return Dt;
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
        var pth = new Path.Line( new Point( x + arr[i][0] * 190, y + arr[i][1] * yscale ),
         new Point( x + arr[i][2] * 190, y + arr[i][3] * yscale ) );
        pth.style.strokeColor = '#999';
    }
    // var pth = new Path( pnt[0], pnt[1], pnt[2], pnt[3] );
    // pth.closed = true;
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
    // ba *cross* v
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

