
var TOLERANCE = 10e-6;

/**
 * This method is analogous to paperjs#PathItem.getIntersections
 */
function getIntersections2( path1, path2 ){
    // First check the bounds of the two paths. If they don't intersect,
    // we don't need to iterate through their curves.
    if (!path1.getBounds().touches(path2.getBounds()))
        return [];
    var locations = [],
        curves1 = path1.getCurves(),
        curves2 = path2.getCurves(),
        length2 = curves2.length,
        values2 = [];
    for (var i = 0; i < length2; i++)
        values2[i] = curves2[i].getValues();
    for (var i = 0, l = curves1.length; i < l; i++) {
        var curve1 = curves1[i],
            values1 = curve1.getValues();
        for (var j = 0; j < length2; j++)
            Curve.getIntersections2(values1, values2[j], curve1, curves2[j],
                    locations);
    }
    return locations;
}

/**
 * This method is analogous to paperjs#Curve.getIntersections
 * @param  {[type]} v1
 * @param  {[type]} v2
 * @param  {[type]} curve1
 * @param  {[type]} curve2
 * @param  {[type]} locations
 * @param  {[type]} _v1t      - Only used for recusion
 * @param  {[type]} _v2t      - Only used for recusion
 */
paper.Curve.getIntersections2 = function( v1, v2, curve1, curve2, locations, _v1t, _v2t ) {
    // cache the original parameter range.
    _v1t = _v1t || { t1: 0, t2: 1 };
    _v2t = _v2t || { t1: 0, t2: 1 };
    var v1t = { t1: _v1t.t1, t2: _v1t.t2 };
    var v2t = { t1: _v2t.t1, t2: _v2t.t2 };
    // Get the clipped parts from the original curve, to avoid cumulative errors
    var _v1 = Curve.getPart( v1, v1t.t1, v1t.t2 );
    var _v2 = Curve.getPart( v2, v2t.t1, v2t.t2 );
// markCurve( _v1, '#f0f', true );
// markCurve( _v2, '#0ff', false );
    var nuT, parts, tmpt = { t1:null, t2:null };
    // Loop until both parameter range converge. We have to handle the degenerate case
    // seperately, where fat-line clipping can become numerically unstable when one of the
    // curves has converged to a point and the other hasn't.
    while( Math.abs(v1t.t2 - v1t.t1) > TOLERANCE || Math.abs(v2t.t2 - v2t.t1) > TOLERANCE ){
        // First we clip v2 with v1's fat-line
        tmpt.t1 = v2t.t1; tmpt.t2 = v2t.t2;
        var intersects1 = _clipBezierFatLine( _v1, _v2, tmpt );
        // Stop if there are no possible intersections
        if( intersects1 === 0 ){
            return;
        } else if( intersects1 > 0 ){
            // Get the clipped parts from the original v2, to avoid cumulative errors
            // ...and reuse some objects.
            v2t.t1 = tmpt.t1; v2t.t2 = tmpt.t2;
            _v2 = Curve.getPart( v2, v2t.t1, v2t.t2 );
        }
// markCurve( _v2, '#0ff', false );
        // Next we clip v1 with nuv2's fat-line
        tmpt.t1 = v1t.t1; tmpt.t2 = v1t.t2;
        var intersects2 = _clipBezierFatLine( _v2, _v1, tmpt );
        // Stop if there are no possible intersections
        if( intersects2 === 0 ){
            return;
        }else if( intersects1 > 0 ){
            // Get the clipped parts from the original v2, to avoid cumulative errors
            v1t.t1 = tmpt.t1; v1t.t2 = tmpt.t2;
            _v1 = Curve.getPart( v1, v1t.t1, v1t.t2 );
        }
// markCurve( _v1, '#f0f', true );
        // Get the clipped parts from the original v1
        // Check if there could be multiple intersections
        if( intersects1 < 0 || intersects2 < 0 ){
            // Subdivide the curve which has converged the least from the original range [0,1],
            // which would be the curve with the largest parameter range after clipping
            if( v1t.t2 - v1t.t1 > v2t.t2 - v2t.t1 ){
                // subdivide _v1 and recurse
                nuT = ( _v1t.t1 + _v1t.t2 ) / 2.0;
                Curve.getIntersections2( v1, v2, curve1, curve2, locations, { t1: _v1t.t1, t2: nuT }, _v2t );
                Curve.getIntersections2( v1, v2, curve1, curve2, locations, { t1: nuT, t2: _v1t.t2 }, _v2t );
                return;
            } else {
                // subdivide _v2 and recurse
                nuT = ( _v2t.t1 + _v2t.t2 ) / 2.0;
                Curve.getIntersections2( v1, v2, curve1, curve2, locations, _v1t, { t1: _v2t.t1, t2: nuT } );
                Curve.getIntersections2( v1, v2, curve1, curve2, locations, _v1t, { t1: nuT, t2: _v2t.t2 } );
                return;
            }
        }
        // Check to see if both parameter ranges have converged or else,
        // see if both curves are flat enough to be treated as lines, either
        // because they have no control points at all, or are "flat enough"
        // If the curve was flat in a previous iteration, we don't need to
        // recalculate since it does not need further subdivision then.
        if( Math.abs(v1t.t2 - v1t.t1) <= TOLERANCE && Math.abs(v2t.t2 - v2t.t1) <= TOLERANCE ){
            locations.push(new CurveLocation(curve1, v1t.t1, null, curve2));
            return;
        } else {
            //!code from: paperjs#Curve.getIntersections method
            if ( Curve.isFlatEnough(_v1, TOLERANCE)
                && Curve.isFlatEnough(_v2, TOLERANCE) ) {
                var point = Line.intersect(
                                _v1[0], _v1[1], _v1[6], _v1[7],
                                _v2[0], _v2[1], _v2[6], _v2[7], false);
                if (point) {
                    // point = new Point( point );
                    // Avoid duplicates when hitting segments (closed paths too)
                    var first = locations[0],
                        last = locations[locations.length - 1];
                    if ((!first || !point.equals(first._point))
                            && (!last || !point.equals(last._point)))
                        // Passing null for parameter leads to lazy determination
                        // of parameter values in CurveLocation#getParameter()
                        // only once they are requested.
                        locations.push(new CurveLocation(curve1, null, point, curve2));
                        // This method can find only one intersection at a time and we just found it.
                        return;
                }
            }
        }
    }
};

/**
 * Clip curve V2 with fat-line of v1
 * @param  {Array}  v1 - Section of the first curve, for which we will make a fat-line
 * @param  {Array}  v2 - Section of the second curve; we will clip this curve with the fat-line of v1
 * @param  {Object} v2t - The parameter range of v2
 * @return {number} -> 0 -no Intersection, 1 -one intersection, -1 -more than one intersection
 */
function _clipBezierFatLine( v1, v2, v2t ){
    // first curve, P
    var p0x = v1[0], p0y = v1[1], p3x = v1[6], p3y = v1[7];
    var p1x = v1[2], p1y = v1[3], p2x = v1[4], p2y = v1[5];
    // second curve, Q
    var q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7];
    var q1x = v2[2], q1y = v2[3], q2x = v2[4], q2y = v2[5];
    // Calculate the fat-line L for P is the baseline l and two
    // offsets which completely encloses the curve P.
    var d1 = _getSignedDist( p0x, p0y, p3x, p3y, p1x, p1y );
    var d2 = _getSignedDist( p0x, p0y, p3x, p3y, p2x, p2y );
    var dmin, dmax;
    if( d1 * d2 > 0){
        // 3/4 * min{0, d1, d2}
        dmin = 0.75 * Math.min( 0, d1, d2 );
        dmax = 0.75 * Math.max( 0, d1, d2 );
    } else {
        // 4/9 * min{0, d1, d2}
        dmin = 0.4444444444444444 * Math.min( 0, d1, d2 );
        dmax = 0.4444444444444444 * Math.max( 0, d1, d2 );
    }
    // Calculate non-parametric bezier curve D(ti, di(t)) -
    // di(t) is the distance of Q from the baseline l of the fat-line,
    // ti is equally spaced in [0,1]
    var dq0 = _getSignedDist( p0x, p0y, p3x, p3y, q0x, q0y );
    var dq1 = _getSignedDist( p0x, p0y, p3x, p3y, q1x, q1y );
    var dq2 = _getSignedDist( p0x, p0y, p3x, p3y, q2x, q2y );
    var dq3 = _getSignedDist( p0x, p0y, p3x, p3y, q3x, q3y );
    // Find the minimum and maximum distances from l,
    // this is useful for checking whether the curves intersect with each other or not.
    var mindist = Math.min( dq0, dq1, dq2, dq3 );
    var maxdist = Math.max( dq0, dq1, dq2, dq3 );
    // If the fatlines don't overlap, we have no intersections!
    if( dmin > maxdist || dmax < mindist ){
        return 0;
    }
    // Calculate the convex hull for non-parametric bezier curve D(ti, di(t))
    var Dt  = _convexhull( dq0, dq1, dq2, dq3 );
    // Now we clip the convex hulls for D(ti, di(t)) with dmin and dmax
    // for the coorresponding t values (tmin, tmax):
    // Portions of curve v2 before tmin and after tmax can safely be clipped away
    // TODO: try to calculate tmin and tmax directly here
    var tmindmin = Infinity, tmaxdmin = -Infinity,
    tmindmax = Infinity, tmaxdmax = -Infinity, ixd, ixdx, i, len;
    // var dmina = [0, dmin, 2, dmin];
    // var dmaxa = [0, dmax, 2, dmax];
    for (i = 0, len = Dt.length; i < len; i++) {
        var Dtl = Dt[i];
        // ixd = _intersectLines( Dtl, dmina);
        // TODO: Optimize: Avaoid creating point objects in Line.intersect?!
        //  speeds up by 30%!
        ixd = Line.intersect( Dtl[0], Dtl[1], Dtl[2], Dtl[3], 0, dmin, 2, dmin, false);
        if( ixd ){
            ixdx = ixd.x;
            tmindmin = ( ixdx < tmindmin )? ixdx : tmindmin;
            tmaxdmin = ( ixdx > tmaxdmin )? ixdx : tmaxdmin;
        }
        // ixd = _intersectLines( Dtl, dmaxa);
        ixd = Line.intersect( Dtl[0], Dtl[1], Dtl[2], Dtl[3], 0, dmax, 2, dmax, false);
        if( ixd ){
            ixdx = ixd.x;
            tmindmax = ( ixdx < tmindmax )? ixdx : tmindmax;
            tmaxdmax = ( ixdx > tmaxdmax )? ixdx : tmaxdmax;
        }
    }
    // if dmin doesnot intersect with the convexhull, reset the parameter limits to 0
    tmindmin = ( tmindmin === Infinity )? 0 : tmindmin;
    tmaxdmin = ( tmaxdmin === -Infinity )? 0 : tmaxdmin;
    // if dmax doesnot intersect with the convexhull, reset the parameter limits to 1
    tmindmax = ( tmindmax === Infinity )? 1 : tmindmax;
    tmaxdmax = ( tmaxdmax === -Infinity )? 1 : tmaxdmax;
    // Return the parameter values for v2 for which we can be sure that the
    // intersection with v1 lies within.
    var tmin, tmax;
    if( dq3 > dq0 ){
        tmin = Math.min( tmindmin, tmaxdmin );
        tmax = Math.max( tmindmax, tmaxdmax );
        if( Math.min( tmindmax, tmaxdmax ) < tmin )
            tmin = 0;
        if( Math.max( tmindmin, tmaxdmin ) > tmax )
            tmax = 1;
    }else{
        tmax = Math.max( tmindmin, tmaxdmin );
        tmin = Math.min( tmindmax, tmaxdmax );
        if( Math.min( tmindmin, tmaxdmin ) < tmin )
            tmin = 0;
        if( Math.max( tmindmax, tmaxdmax ) > tmax )
            tmax = 1;
    }
// Debug: Plot the non-parametric graph and hull
// plotD_vs_t( 500, 110, Dt, [dq0, dq1, dq2, dq3], v1, dmin, dmax, tmin, tmax, 1.0 / ( tmax - tmin + 0.3 ) )
    // tmin and tmax are within the range (0, 1). We need to project it to the original
    // parameter range for v2.
    var v2tmin = v2t.t1;
    var tdiff = ( v2t.t2 - v2tmin );
    v2t.t1 = v2tmin + tmin * tdiff;
    v2t.t2 = v2tmin + tmax * tdiff;
    // If the new parameter range fails to converge by atleast 20% of the original range,
    // possibly we have multiple intersections. We need to subdivide one of the curves.
    if( (tdiff - ( v2t.t2 - v2t.t1 ))/tdiff < 0.2 ){
        return -1;
    }
    return 1;
}

/**
 * Calculate the convex hull for the non-paramertic bezier curve D(ti, di(t)).
 * The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
 * di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the curve are
 * already sorted in the X axis in the increasing order. Calculating convex-hull is
 * much easier than a set of arbitrary points.
 */
function _convexhull( dq0, dq1, dq2, dq3 ){
    var distq1 = _getSignedDist( 0.0, dq0, 1.0, dq3, 0.3333333333333333, dq1 );
    var distq2 = _getSignedDist( 0.0, dq0, 1.0, dq3, 0.6666666666666666, dq2 );
    // Check if [1/3, dq1] and [2/3, dq2] are on the same side of line [0,dq0, 1,dq3]
    if( distq1 * distq2 < 0 ) {
        // dq1 and dq2 lie on different sides on [0, q0, 1, q3]
        // Convexhull is a quadrilateral and line [0, q0, 1, q3] is NOT part of the convexhull
        // so we are pretty much done here.
        Dt = [
            [ 0.0, dq0, 0.3333333333333333, dq1 ],
            [ 0.3333333333333333, dq1, 1.0, dq3 ],
            [ 0.6666666666666666, dq2, 0.0, dq0 ],
            [ 1.0, dq3, 0.6666666666666666, dq2 ]
        ];
    } else {
        // dq1 and dq2 lie on the same sides on [0, q0, 1, q3]
        // Convexhull can be a triangle or a quadrilateral and
        // line [0, q0, 1, q3] is part of the convexhull.
        // Check if the hull is a triangle or a quadrilateral
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
            // Convexhull is a quadrilateral and we need all lines in the correct order where
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
    function signum(num) {
        return ( num > 0 )? 1 : ( num < 0 )? -1 : 0;
    }
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
    window.__p3.push( ll );
    window.__p3[window.__p3.length-1].style.strokeColor = new Color( 0,0,0.9, 0.8);
    var lp1 = ll.segments[0].point;
    var lp2 = ll.segments[1].point;
    var pm = l.vector, pm1 = pm.rotate( signum( dmin ) * -90 ), pm2 = pm.rotate( signum( dmax ) * -90 );
    var p11 = lp1.add( pm1.normalize( Math.abs(dmin) ) );
    var p12 = lp2.add( pm1.normalize( Math.abs(dmin) ) );
    var p21 = lp1.add( pm2.normalize( Math.abs(dmax) ) );
    var p22 = lp2.add( pm2.normalize( Math.abs(dmax) ) );
    window.__p3.push( new Path.Line( p11, p12 ) );
    window.__p3[window.__p3.length-1].style.strokeColor = new Color( 0,0,0.9);
    window.__p3.push( new Path.Line( p21, p22 ) );
    window.__p3[window.__p3.length-1].style.strokeColor = new Color( 0,0,0.9);
}

function plotD_vs_t( x, y, arr, arr2, v, dmin, dmax, tmin, tmax, yscale, tvalue ){
    yscale = yscale || 1;
    new Path.Line( x, y-100, x, y+100 ).style.strokeColor = '#aaa';
    new Path.Line( x, y, x + 200, y ).style.strokeColor = '#aaa';

    var clr = (tvalue)? '#a00' : '#00a';
    if( window.__p3 ) window.__p3.map(function(a){a.remove();});

    window.__p3 = [];

    drawFatline( v );

    window.__p3.push( new Path.Line( x, y + dmin * yscale, x + 200, y + dmin * yscale ) );
    window.__p3[window.__p3.length-1].style.strokeColor = '#000'
    window.__p3.push( new Path.Line( x, y + dmax * yscale, x + 200, y + dmax * yscale ) );
    window.__p3[window.__p3.length-1].style.strokeColor = '#000'
    window.__p3.push( new Path.Line( x + tmin * 190, y-100, x + tmin * 190, y+100 ) );
    window.__p3[window.__p3.length-1].style.strokeColor = clr
    window.__p3.push( new Path.Line( x + tmax * 190, y-100, x + tmax * 190, y+100 ) );
    window.__p3[window.__p3.length-1].style.strokeColor = clr

    for (var i = 0; i < arr.length; i++) {
        window.__p3.push( new Path.Line( new Point( x + arr[i][0] * 190, y + arr[i][1] * yscale ),
         new Point( x + arr[i][2] * 190, y + arr[i][3] * yscale ) ) );
        window.__p3[window.__p3.length-1].style.strokeColor = '#999';
    }
    var pnt = [];
    var arr2x = [ 0.0, 0.333333333, 0.6666666666, 1.0 ];
    for (var i = 0; i < arr2.length; i++) {
        pnt.push( new Point( x + arr2x[i] * 190, y + arr2[i] * yscale ) );
        window.__p3.push( new Path.Circle( pnt[pnt.length-1], 2 ) );
        window.__p3[window.__p3.length-1].style.fillColor = '#000'
    }
    // var pth = new Path( pnt[0], pnt[1], pnt[2], pnt[3] );
    // pth.closed = true;
    window.__p3.push( new Path( new Segment(pnt[0], null, pnt[1].subtract(pnt[0])), new Segment( pnt[3], pnt[2].subtract(pnt[3]), null ) ) );
    window.__p3[window.__p3.length-1].style.strokeColor = clr
    view.draw();
}

// This is basically an "unrolled" version of two methods from paperjs'
// Line class —#Line.getSide() and #Line.getDistance()
// If we create Point and Line objects, the code slows down significantly!
// May be a static method could be better!
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

