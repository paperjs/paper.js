/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/*
 * Offsetting of paths and outlining of strokes, with the offsets of curves
 * after kurbo by Raph Levien and the Linebender contributors, and the areas
 * of tight turns after "Converting Stroked Primitives to Filled Primitives" by
 * Diego Nehab.
 *
 * @author Jan Bösenberg <jan.boesenberg@gmail.com>
 * @author Jürg Lehni <juerg@scratchdisk.com>
 */
PathItem.inject(new function() {
    var abs = Math.abs,
        clamp = Numerical.clamp,
        errorThreshold = 0.1,
        epsilon = /*#=*/Numerical.EPSILON,
        geomEpsilon = /*#=*/Numerical.GEOMETRIC_EPSILON;

    // The outline of the strokes of the paths, as the union of the areas that
    // their parts sweep, their joins and their caps. The curves are split where
    // an offset has a cusp, and the parts into areas that each sweep in one
    // direction, so that no opposite windings cancel.
    function outlineStroke(paths, radius, join, cap, miterLimit) {
        // The offsets' error, relative to small radii:
        var tolerance = Math.min(errorThreshold, radius / 100),
            areas = [];

        // Adds the area between two sides of a part, leaving the segments of
        // the second one as they are, as the evolute is shared:
        function addSides(side1, side2) {
            var part = new Path({ segments: side1, insert: false });
            for (var i = side2.length - 1; i >= 0; i--)
                part.add(side2[i].reversed());
            part.setClosed(true);
            part = part.unite();
            // Parts that fold onto themselves can leave nothing:
            if (!part.isEmpty())
                areas.push(part);
        }

        // Adds the area of the part of the curve with the values v. Where it
        // turns more tightly than the radius, the inner side sweeps backwards
        // beyond the evolute, so we split it there into two areas (Nehab):
        function addPart(v) {
            var curvature = Curve.getCurvature(v, 0.5);
            if (abs(curvature) * radius > 1) {
                // The centers of curvature lie against the normals:
                var inner = curvature > 0 ? -radius : radius,
                    evolute = getEvolute(v, inner, tolerance);
                addSides(getOffsetSegments(v, -inner, tolerance), evolute);
                addSides(getOffsetSegments(v, inner, tolerance), evolute);
            } else {
                addSides(getOffsetSegments(v, radius, tolerance),
                        getOffsetSegments(v, -radius, tolerance));
            }
        }

        // Adds a round join or cap as the sector of the circle between the
        // normals, which ends where the sides of the parts do, instead of
        // crossing them at shallow angles as a whole circle would:
        function addSector(point, normal1, normal2, direction) {
            var sector = new Path({ insert: false });
            sector.moveTo(point);
            sector.lineTo(point.add(normal1));
            sector.arcTo(point.add(direction.normalize(radius)),
                    point.add(normal2));
            sector.closePath();
            areas.push(sector);
        }

        function addPolygon(points) {
            areas.push(new Path({ segments: points, closed: true,
                    insert: false }));
        }

        // Adds the join at the point between the directions of the curves,
        // on the outer side of their turn, unless they continue each other:
        function addJoin(point, tangent1, tangent2) {
            // Paper.js's normals, to tell the outer side by their angle:
            var normal1 = new Point(tangent1.y, -tangent1.x).multiply(radius),
                normal2 = new Point(tangent2.y, -tangent2.x).multiply(radius),
                angle = normal1.getDirectedAngle(normal2);
            if (!Numerical.isZero(tangent1.cross(tangent2))
                    || tangent1.dot(tangent2) < 0) {
                if (angle < 0) {
                    normal1 = normal1.negate();
                    normal2 = normal2.negate();
                }
                // Widen the join into the parts on both sides, so that it
                // overlaps them rather than sharing edges that the union can't
                // tell apart at small angles. Its arc stays within the
                // tolerance of their offsets there:
                var widening = Math.sqrt(tolerance / radius) * 180 / Math.PI
                        * (angle < 0 ? -1 : 1),
                    outer1 = normal1.rotate(-widening),
                    outer2 = normal2.rotate(widening),
                    direction = normal1.add(normal2);
                // Cusps turn back, ahead of the first curve:
                if (direction.getLength() < geomEpsilon * radius)
                    direction = tangent1;
                if (join === 'round') {
                    addSector(point, outer1, outer2, direction);
                } else {
                    var length = radius / Math.cos(abs(angle) * Math.PI / 360),
                        points = [point, point.add(outer1), point.add(normal1)];
                    if (join === 'miter' && length <= miterLimit * radius)
                        points.push(point.add(direction.normalize(length)));
                    addPolygon(points.concat(point.add(normal2),
                            point.add(outer2)));
                }
            }
        }

        // Adds the cap at the point, at the end of the path in the direction
        // of the tangent:
        function addCap(point, tangent) {
            var normal = new Point(-tangent.y, tangent.x).multiply(radius);
            if (cap === 'round') {
                addSector(point, normal, normal.negate(), tangent);
            } else if (cap === 'square') {
                var ahead = tangent.multiply(radius);
                addPolygon([point.add(normal), point.add(normal).add(ahead),
                        point.subtract(normal).add(ahead),
                        point.subtract(normal)]);
            }
        }

        // Tight parts whose normals turn by less than the tolerance at the
        // radius would only add slivers, so they stay with their neighbors,
        // as do parts shorter than it that turn as little. Other parts don't,
        // as they would lose their own sweeps to their neighbors' kind:
        function isSliver(v, t1, t2) {
            return getTurn(v, t1, t2) * radius < tolerance
                    && (abs(Curve.getCurvature(v, (t1 + t2) / 2)) * radius > 1
                        || Curve.getLength(v, t1, t2) < tolerance);
        }

        function addPath(path) {
            var segments = path._segments,
                closed = path._closed,
                curves = path.getCurves();
            // Make segments smooth that are so within the tolerance, which
            // moves the curves less than it, as their joins would only add
            // slivers, and their parts' corners lie too close to tell apart:
            for (var i = 0, l = segments.length; i < l; i++) {
                var segment = segments[i],
                    handleIn = segment._handleIn,
                    handleOut = segment._handleOut;
                if (!handleIn.isZero() && !handleOut.isZero()) {
                    var angle = abs(handleOut.getDirectedAngle(
                            handleIn.negate())) * Math.PI / 180,
                        lengthIn = handleIn.getLength(),
                        lengthOut = handleOut.getLength();
                    if (angle && angle * Math.max(radius, lengthIn, lengthOut)
                            < tolerance) {
                        var direction = handleOut.normalize().subtract(
                                handleIn.normalize());
                        segment.setHandleIn(direction.normalize(-lengthIn));
                        segment.setHandleOut(direction.normalize(lengthOut));
                    }
                }
            }
            if (!path.getLength()) {
                // A dot, as a circle or a square, as caps only apply to open
                // paths:
                if (segments.length && !closed && cap !== 'butt') {
                    var center = segments[0]._point;
                    areas.push(cap === 'round'
                        ? new Path.Circle({ center: center, radius: radius,
                            insert: false })
                        : new Path.Rectangle({ point: center.subtract(radius),
                            size: [2 * radius, 2 * radius], insert: false }));
                }
            } else {
                // The curves with their directions at their ends, as their
                // parts use them, which the joins and caps continue:
                var ends = [];
                for (var i = 0, l = curves.length; i < l; i++) {
                    var curve = curves[i];
                    if (curve.hasLength(geomEpsilon)) {
                        var v = regularize(curve.getValues(),
                                tolerance / 4),
                            reversals = Curve.getReversals(v, tolerance),
                            start = Curve.getTangent(v, 0),
                            end = Curve.getTangent(v, 1);
                        if (reversals.length) {
                            // A curve along a line that reverses along it:
                            // straight parts between the reversals, joined
                            // round, as the limit of a tight turn (kurbo's
                            // do_linear()):
                            var points = [new Point(v[0], v[1])];
                            for (var j = 0, m = reversals.length; j < m; j++)
                                points.push(Curve.getPoint(v, reversals[j]));
                            points.push(new Point(v[6], v[7]));
                            start = points[1].subtract(points[0]).normalize();
                            end = points[points.length - 1].subtract(
                                    points[points.length - 2]).normalize();
                            for (var j = 1, m = points.length; j < m; j++) {
                                var p1 = points[j - 1],
                                    p2 = points[j];
                                addPart([p1.x, p1.y, p1.x, p1.y, p2.x, p2.y,
                                        p2.x, p2.y]);
                                if (j < m - 1) {
                                    // The turn sweeps a whole circle, ahead of
                                    // it and behind, in two halves that end
                                    // at the parts' sides:
                                    var tangent = p2.subtract(p1).normalize(),
                                        normal = new Point(-tangent.y,
                                            tangent.x).multiply(radius);
                                    addSector(p2, normal, normal.negate(),
                                            tangent);
                                    addSector(p2, normal.negate(), normal,
                                            tangent.negate());
                                }
                            }
                        } else {
                            var times = getCuspTimes(v, radius).concat(1);
                            for (var j = 0, t0 = 0, m = times.length; j < m;
                                    j++) {
                                var t = times[j];
                                if (t === 1 || !isSliver(v, t0, t)
                                        && !isSliver(v, t, times[j + 1])) {
                                    addPart(Curve.getPart(v, t0, t));
                                    t0 = t;
                                }
                            }
                        }
                        ends.push({ curve: curve, start: start, end: end });
                    }
                }
                for (var i = 1, l = ends.length; i <= l; i++) {
                    var end1 = ends[i - 1],
                        end2 = ends[i % l];
                    if (i < l || closed)
                        addJoin(end2.curve._segment1._point, end1.end,
                                end2.start);
                }
                if (!closed && ends.length) {
                    var first = ends[0],
                        last = ends[ends.length - 1];
                    addCap(first.curve._segment1._point, first.start.negate());
                    addCap(last.curve._segment2._point, last.end);
                }
            }
        }

        // Adds the area that the pens of the path's stroke profile sweep: the
        // ellipses that change linearly between the stops, see
        // Path#strokeProfile. The sides of the stroke lie where the moving pen
        // touches the edge of the area, which we find exactly at each time on
        // the curves, and fit with cubics. Where the pens change abruptly or
        // the sides end, at stops, steps, corners and reversals, we add the
        // pens there as they are, as each lies within the area.
        function addProfilePath(path) {
            var pens = path._getStrokeProfilePens(),
                closed = path._closed,
                length = path.getLength(),
                curves = path.getCurves(),
                spans = [],
                ends = [];

            // The pen with the values, as the half axes of its ellipse and its
            // angle in radians, with their changes along the span, if any. As
            // the product of the width and the aspect, b changes its rate too:
            function getPen(values, span) {
                var toRadians = Math.PI / 180;

                function getSlope(key) {
                    return span ? (span.next[key] - span.entry[key])
                            / (span.next.offset - span.entry.offset) : 0;
                }

                var a = radius * values.width,
                    dWidth = getSlope('width'),
                    dAspect = getSlope('aspect');
                return {
                    a: a,
                    b: a * values.aspect,
                    angle: values.angle * toRadians,
                    da: radius * dWidth,
                    db: radius * (dWidth * values.aspect
                            + values.width * dAspect),
                    ddb: 2 * radius * dWidth * dAspect,
                    dAngle: getSlope('angle') * toRadians
                };
            }

            // The pen of the span at the offset within it:
            function getSpanPen(span, offset) {
                var entry = span.entry,
                    next = span.next,
                    factor = (offset - entry.offset)
                            / (next.offset - entry.offset),
                    values = {};
                for (var key in entry) {
                    values[key] = entry[key]
                            + (next[key] - entry[key]) * factor;
                }
                return getPen(values, span);
            }

            function getSpan(offset, after) {
                for (var i = 0, l = spans.length; i < l; i++) {
                    var span = spans[i];
                    if (after ? offset < span.next.offset
                            : offset <= span.next.offset)
                        return span;
                }
                return spans[spans.length - 1];
            }

            function addPen(point, pen) {
                if (pen.a > 0 && pen.b > 0) {
                    areas.push(new Path.Ellipse({
                        center: point,
                        radius: [pen.a, pen.b],
                        insert: false
                    }).rotate(pen.angle * 180 / Math.PI, point));
                }
            }

            // The axes of the pen's ellipse:
            function getAxes(pen) {
                var cos = Math.cos(pen.angle),
                    sin = Math.sin(pen.angle);
                return [new Point(cos, sin), new Point(-sin, cos)];
            }

            // Returns where the pen at the time on the curve touches the edge
            // of the area that it sweeps, with the derivatives of these points
            // along the curve's length. On the pen
            // p + a cos(φ) e1 + b sin(φ) e2, they lie at the angles φ where its
            // motion runs along its edge, the roots of a trigonometric
            // quadratic f(φ), which we bracket and refine. Between them, the
            // arcs of its edge where f(φ) > 0 move outwards and sweep the
            // area, as strips between the paths of their ends. Mostly, there is
            // one of them, between the sides of the stroke, and two where the
            // pen turns faster than it moves. They are sorted along the
            // curve's normal, as are the sides:
            function getContacts(v, t, offset, span) {
                var pen = getSpanPen(span, offset + Curve.getLength(v, 0, t)),
                    a = pen.a,
                    b = pen.b,
                    da = pen.da,
                    db = pen.db,
                    dAngle = pen.dAngle,
                    contacts = { sides: null, strips: [] };
                if (a > 0) {
                    var point = Curve.getPoint(v, t),
                        tangent = Curve.getTangent(v, t),
                        normal = new Point(-tangent.y, tangent.x),
                        curvature = Curve.getCurvature(v, t),
                        axes = getAxes(pen),
                        // The tangent in the pen's axes, and its changes:
                        t1 = tangent.dot(axes[0]),
                        t2 = tangent.dot(axes[1]),
                        dt1 = (dAngle - curvature) * t2,
                        dt2 = (curvature - dAngle) * t1,
                        f = function(phi) {
                            var c = Math.cos(phi),
                                s = Math.sin(phi);
                            return t1 * b * c + t2 * a * s + da * b * c * c
                                    + a * db * s * s
                                    + dAngle * (a * a - b * b) * s * c;
                        },
                        df = function(phi) {
                            var c = Math.cos(phi),
                                s = Math.sin(phi);
                            return -t1 * b * s + t2 * a * c
                                    + 2 * (a * db - da * b) * s * c
                                    + dAngle * (a * a - b * b)
                                        * (c * c - s * s);
                        },
                        count = 32,
                        step = 2 * Math.PI / count,
                        phi0 = step / 2,
                        f0 = f(phi0),
                        d0 = df(phi0),
                        roots = [];

                    // Adds the side at the root of f(φ) between the angles,
                    // with the change of φ along the length that keeps it
                    // there, for the derivative of its point:
                    var addRoot = function(phi0, phi1, f0, f1) {
                        var phi = Numerical.findSignChange(f, phi0, phi1, f0,
                                f1, epsilon),
                            c = Math.cos(phi),
                            s = Math.sin(phi),
                            dfs = (dt1 * b + t1 * db) * c
                                + (dt2 * a + t2 * da) * s + da * db
                                + a * pen.ddb * s * s
                                + 2 * dAngle * (a * da - b * db) * s * c,
                            dfphi = df(phi),
                            dphi = dfphi ? -dfs / dfphi : 0,
                            side = {
                                phi: phi,
                                point: point.add(axes[0].multiply(a * c))
                                    .add(axes[1].multiply(b * s)),
                                derivative: axes[0].multiply(t1 + da * c
                                        - (a * dphi + dAngle * b) * s)
                                    .add(axes[1].multiply(t2 + db * s
                                        + (b * dphi + dAngle * a) * c))
                            };
                        side.distance = side.point.subtract(point).dot(normal);
                        roots.push(side);
                    };

                    for (var i = 1; i <= count; i++) {
                        var phi1 = phi0 + step,
                            f1 = f(phi1),
                            d1 = df(phi1);
                        if (f0 * f1 <= 0 && f0 !== f1) {
                            addRoot(phi0, phi1, f0, f1);
                        } else if (d0 * d1 < 0) {
                            // Two roots close together hide between the
                            // samples if the extremum between them crosses:
                            var phi = Numerical.findSignChange(df, phi0, phi1,
                                    d0, d1, epsilon),
                                f2 = f(phi);
                            if (f2 * f0 < 0) {
                                addRoot(phi0, phi, f0, f2);
                                addRoot(phi, phi1, f2, f1);
                            }
                        }
                        phi0 = phi1;
                        f0 = f1;
                        d0 = d1;
                    }
                    var count = roots.length;
                    for (var i = 0; i < count; i++) {
                        var from = roots[i],
                            to = roots[(i + 1) % count],
                            phi = from.phi + ((to.phi - from.phi + 2 * Math.PI)
                                    % (2 * Math.PI) || 2 * Math.PI) / 2;
                        if (f(phi) > 0) {
                            contacts.strips.push({
                                from: from,
                                to: to,
                                distance: axes[0].multiply(a * Math.cos(phi))
                                    .add(axes[1].multiply(b * Math.sin(phi)))
                                    .dot(normal)
                            });
                        }
                    }
                    contacts.strips.sort(function(a, b) {
                        return b.distance - a.distance;
                    });
                    if (count > 1) {
                        roots.sort(function(a, b) {
                            return b.distance - a.distance;
                        });
                        contacts.sides = [roots[0], roots[count - 1]];
                    }
                }
                return contacts;
            }

            function getSides(v, t, offset, span) {
                return getContacts(v, t, offset, span).sides;
            }

            // Adds the area that the pen sweeps along the curve from ta to tb,
            // within the span, as strips between the paths of the points where
            // it touches the edge of the area, see getContacts(). We split them
            // where these points appear or vanish, where two strips trade
            // places, and where a strip folds over as one of its ends turns
            // back across it. The pens at the first two lie within the area and
            // cover the ends of the strips there. Strips that fold over sweep
            // beyond their inner edge, so we split them into two areas at the
            // points that stand still across them, as with the evolute in
            // addPart() (Nehab):
            function addPiece(v, offset, span, ta, tb) {
                // As the points that touch the edge move around the pen
                // as it and the curve turn, sample them at least every 10°:
                var turn = abs(getSpanPen(span, offset).dAngle)
                        * Curve.getLength(v, ta, tb) + getTurn(v, ta, tb),
                    count = Math.max(16, Math.ceil(turn * 18 / Math.PI)),
                    // The times where the parts end and the next ones start:
                    splits = [[ta, ta], [tb, tb]],
                    cache = {};

                // Fitting asks for the same times for each end of a strip:
                function getStrips(t) {
                    return cache[t] || (cache[t] =
                            getContacts(v, t, offset, span).strips);
                }

                // The point at the end of the strip at the time, or the curve's
                // point where a change between the samples took the strip away,
                // which lies within the pen too:
                function getEnd(t, j, end) {
                    var strip = getStrips(t)[j];
                    return strip ? strip[end].point : Curve.getPoint(v, t);
                }

                // The motions of the strip's ends across the line between them:
                function getMotions(strip) {
                    var vector = strip.to.point.subtract(strip.from.point),
                        normal = new Point(-vector.y, vector.x);
                    return [
                        strip.from.derivative.dot(normal),
                        strip.to.derivative.dot(normal)
                    ];
                }

                // Whether the strips are the same ones as before, in the same
                // order, by the angles on the pen where they start:
                function isSame(strips, before) {
                    if (strips.length !== before.length)
                        return false;
                    for (var i = 0, l = strips.length; i < l; i++) {
                        var phi = strips[i].from.phi;
                        for (var j = 0; j < l; j++) {
                            if (j !== i && getAngle(phi, before[j].from.phi)
                                    < getAngle(phi, before[i].from.phi))
                                return false;
                        }
                    }
                    return true;
                }

                function getAngle(phi1, phi2) {
                    var angle = Math.abs(phi1 - phi2) % (2 * Math.PI);
                    return Math.min(angle, 2 * Math.PI - angle);
                }

                // Whether the ends of the same strips moved less than 20° on
                // the pen, as they jump where pairs of them appear and vanish
                // again between the samples:
                function isClose(strips, before) {
                    return strips.every(function(strip, i) {
                        var other = before[i];
                        return getAngle(strip.from.phi, other.from.phi) < 0.35
                                && getAngle(strip.to.phi, other.to.phi) < 0.35;
                    });
                }

                // Sample the strips evenly, and where the curve's curvature
                // peaks or changes sign, as the strips fold over around there:
                var samples = [];
                for (var i = 0; i < count; i++)
                    samples.push(ta + (tb - ta) * i / count);
                // Exactly at the end, as rounding could take it beyond:
                samples.push(tb);
                getCurvatureExtrema(v).concat(getInflections(v)).forEach(
                    function(t) {
                        if (t > ta && t < tb)
                            samples.push(t);
                    });
                samples.sort(function(a, b) {
                    return a - b;
                });
                for (var i = 1, t0 = ta, s0 = getStrips(ta); i < samples.length;
                        i++) {
                    var t1 = samples[i],
                        s1 = getStrips(t1);
                    if (isSame(s1, s0) && !isClose(s1, s0)
                            && t1 - t0 > /*#=*/Numerical.CURVETIME_EPSILON) {
                        // Sample halfway before going on:
                        samples.splice(i--, 0, (t0 + t1) / 2);
                        continue;
                    }
                    // There may be more than one change between the samples:
                    while (!isSame(s1, s0)) {
                        var t = t0,
                            u = t1;
                        for (var j = 0; j < 40; j++) {
                            var middle = (t + u) / 2;
                            if (isSame(getStrips(middle), s0)) {
                                t = middle;
                            } else {
                                u = middle;
                            }
                        }
                        splits.push([t, u]);
                        addPen(Curve.getPoint(v, t), getSpanPen(span,
                                offset + Curve.getLength(v, 0, t)));
                        t0 = u;
                        s0 = getStrips(u);
                    }
                    s0.forEach(function(strip, j) {
                        var m0 = getMotions(strip),
                            m1 = getMotions(s1[j]);
                        for (var k = 0; k < 2; k++) {
                            if (m0[k] * m1[k] < 0) {
                                var t = Numerical.findSignChange(
                                    function(t) {
                                        var strip = getStrips(t)[j];
                                        return strip ? getMotions(strip)[k]
                                                : 0;
                                    }, t0, t1, m0[k], m1[k], 1e-9);
                                splits.push([t, t]);
                            }
                        }
                    });
                    t0 = t1;
                    s0 = s1;
                }
                splits.sort(function(a, b) {
                    return a[0] - b[0];
                });
                for (var i = 1, l = splits.length; i < l; i++) {
                    var t0 = splits[i - 1][1],
                        t1 = splits[i][0],
                        strips = t1 - t0 > geomEpsilon
                            ? getStrips((t0 + t1) / 2) : [];
                    strips.forEach(function(strip, j) {
                        var motions = getMotions(strip),
                            from = fitSide(function(t) {
                                return getEnd(t, j, 'from');
                            }, t0, t1),
                            to = fitSide(function(t) {
                                return getEnd(t, j, 'to');
                            }, t0, t1);
                        if (motions[0] * motions[1] < 0) {
                            var still = fitSide(function(t) {
                                var strip = getStrips(t)[j];
                                if (!strip)
                                    return Curve.getPoint(v, t);
                                var motions = getMotions(strip),
                                    point = strip.from.point,
                                    // Within the strip, also where its motions
                                    // vary more than the samples tell:
                                    factor = clamp(motions[0]
                                        / (motions[0] - motions[1]), 0, 1);
                                return point.add(strip.to.point.subtract(point)
                                        .multiply(factor));
                            }, t0, t1);
                            addSides(from, still);
                            addSides(to, still);
                        } else {
                            addSides(from, to);
                        }
                    });
                }
            }

            // Adds the part of a curve, split at the spans that it crosses:
            function addPart(part) {
                var v = part.v,
                    start = part.offset,
                    end = start + part.length,
                    // Regularized curves can be a little shorter than the
                    // offsets along the path say:
                    length = Curve.getLength(v);

                function getTime(offset) {
                    return offset <= start ? 0 : offset - start >= length ? 1
                            : Curve.getTimeAt(v, offset - start);
                }

                for (var i = 0, l = spans.length; i < l; i++) {
                    var span = spans[i],
                        from = Math.max(span.entry.offset, start),
                        to = Math.min(span.next.offset, end),
                        ta = getTime(from),
                        tb = to === end ? 1 : getTime(to);
                    if (to > from && tb > ta)
                        addPiece(v, start, span, ta, tb);
                }
            }

            // Fits cubics to the points that the function returns from t0 to
            // t1, with the directions at their ends, by least squares, and
            // subdivided while they are off by more than the tolerance:
            function fitSide(evaluate, t0, t1) {
                var count = 8,
                    segments = [new Segment(evaluate(t0))];

                function fit(t0, t1, p0, p3, depth) {
                    var delta = (t1 - t0) * 1e-5,
                        chord = p3.subtract(p0),
                        tangent0 = evaluate(t0 + delta).subtract(p0),
                        tangent3 = p3.subtract(evaluate(t1 - delta)),
                        points = [],
                        lengths = [],
                        total = 0;
                    tangent0 = (tangent0.isZero() ? chord : tangent0)
                            .normalize();
                    tangent3 = (tangent3.isZero() ? chord : tangent3)
                            .normalize();
                    for (var i = 0, prev = p0; i <= count; i++) {
                        var point = i < count
                                ? evaluate(t0 + (t1 - t0) * (i + 1)
                                    / (count + 1))
                                : p3;
                        total += point.getDistance(prev);
                        if (i < count) {
                            points.push(point);
                            lengths.push(total);
                        }
                        prev = point;
                    }
                    // The handles' lengths with the least squares error at
                    // the points, by their distances along the chords:
                    var c11 = 0, c12 = 0, c22 = 0, x1 = 0, x2 = 0;
                    for (var i = 0; i < count; i++) {
                        var u = total ? lengths[i] / total : 0,
                            w = 1 - u,
                            a1 = tangent0.multiply(3 * w * w * u),
                            a2 = tangent3.multiply(-3 * w * u * u),
                            rest = points[i]
                                .subtract(p0.multiply(w * w * (w + 3 * u)))
                                .subtract(p3.multiply(u * u * (u + 3 * w)));
                        c11 += a1.dot(a1);
                        c12 += a1.dot(a2);
                        c22 += a2.dot(a2);
                        x1 += a1.dot(rest);
                        x2 += a2.dot(rest);
                    }
                    var det = c11 * c22 - c12 * c12,
                        length = chord.getLength(),
                        alpha = det ? (x1 * c22 - x2 * c12) / det : 0,
                        beta = det ? (c11 * x2 - c12 * x1) / det : 0;
                    if (!(alpha > epsilon && beta > epsilon
                            && alpha < 2 * total && beta < 2 * total)) {
                        alpha = beta = length / 3;
                    }
                    var handle1 = tangent0.multiply(alpha),
                        handle2 = tangent3.multiply(-beta),
                        c = [p0.x, p0.y, p0.x + handle1.x, p0.y + handle1.y,
                            p3.x + handle2.x, p3.y + handle2.y, p3.x, p3.y],
                        error = 0;
                    // Measure the error at the points and halfway between
                    // them, where the cubic may bulge away from the side:
                    for (var i = 0; i <= 2 * count; i++) {
                        var point = i < count ? points[i]
                                : evaluate(t0 + (t1 - t0) * (i - count + 0.5)
                                    / (count + 1));
                        error = Math.max(error, point.getDistance(
                                Curve.getPoint(c,
                                    Curve.getNearestTime(c, point))));
                    }
                    if (error > tolerance && depth < 12) {
                        var t = (t0 + t1) / 2,
                            point = evaluate(t);
                        fit(t0, t, p0, point, depth + 1);
                        fit(t, t1, point, p3, depth + 1);
                    } else {
                        segments[segments.length - 1].setHandleOut(handle1);
                        segments.push(new Segment(p3, handle2));
                    }
                }

                fit(t0, t1, segments[0]._point, evaluate(t1), 0);
                return segments;
            }

            // Adds the join at the point between the curves at their ends, on
            // the outer side of their turn, unless they continue each other.
            // Round joins are the pen, the others connect its sides there:
            function addJoin(end1, end2) {
                var point = end2.point,
                    part1 = end1.last,
                    part2 = end2.first,
                    offset = part2.offset,
                    tangent1 = end1.end,
                    tangent2 = end2.start,
                    cross = tangent1.cross(tangent2),
                    span = getSpan(offset, true),
                    pen = getSpanPen(span, offset);
                if (join === 'round' || Numerical.isZero(cross)
                        && tangent1.dot(tangent2) > 0) {
                    // Where the curves continue each other, the pen covers the
                    // ends of their parts, which the union can't tell apart
                    // where they only meet:
                    addPen(point, pen);
                } else {
                    var span1 = getSpan(offset, false),
                        // The side against the turn, see getSides():
                        k = cross > 0 ? 1 : 0,
                        sides1 = getSides(part1.v, 1, part1.offset, span1),
                        sides2 = getSides(part2.v, 0, offset, span);
                    if (sides1 && sides2) {
                        var side1 = sides1[k].point,
                            side2 = sides2[k].point,
                            direction1 = sides1[k].derivative.normalize(),
                            direction2 = sides2[k].derivative.normalize(),
                            // Widen the join into the parts on both
                            // sides, as in addJoin() above:
                            widening = Math.sqrt(tolerance * pen.a),
                            // From the inner sides, as the ends of the
                            // parts only run through the point where the
                            // pen doesn't change. All lie on the pen:
                            points = [sides1[1 - k].point,
                                side1.subtract(direction1.multiply(
                                    widening)),
                                side1];
                        if (join === 'miter') {
                            var miter = Line.intersect(
                                    side1.x, side1.y,
                                    direction1.x, direction1.y,
                                    side2.x, side2.y,
                                    direction2.x, direction2.y,
                                    true, true);
                            if (miter && miter.getDistance(point)
                                    <= miterLimit * pen.a)
                                points.push(miter);
                        }
                        addPolygon(points.concat(side2, side2.add(
                                direction2.multiply(widening)),
                                sides2[1 - k].point));
                    }
                }
            }

            // Adds the cap at the end of the part at the time, in the
            // direction of the tangent. Round caps are the pen, square ones
            // extend its sides as far as it reaches ahead:
            function addCap(part, t, tangent) {
                var offset = part.offset + (t ? part.length : 0),
                    span = getSpan(offset, !t),
                    pen = getSpanPen(span, offset);
                if (cap === 'round') {
                    addPen(Curve.getPoint(part.v, t), pen);
                } else if (cap === 'square') {
                    var sides = getSides(part.v, t, part.offset, span);
                    if (sides) {
                        var axes = getAxes(pen),
                            reach = new Point(pen.a * tangent.dot(axes[0]),
                                pen.b * tangent.dot(axes[1])).getLength(),
                            ahead = tangent.multiply(reach);
                        var side0 = sides[0].point,
                            side1 = sides[1].point;
                        addPolygon([side0, side0.add(ahead), side1.add(ahead),
                                side1]);
                    }
                }
            }

            if (!length) {
                // A dot, as the pen or the square around it, as caps only
                // apply to open paths:
                var segments = path._segments;
                if (segments.length && !closed && cap !== 'butt') {
                    var center = segments[0]._point,
                        stop = path.getStrokeProfileAt(0),
                        pen = getPen(stop),
                        axes = getAxes(pen);
                    if (cap === 'round') {
                        addPen(center, pen);
                    } else {
                        var x = axes[0].multiply(pen.a),
                            y = axes[1].multiply(pen.b);
                        addPolygon([center.subtract(x).subtract(y),
                                center.add(x).subtract(y),
                                center.add(x).add(y),
                                center.subtract(x).add(y)]);
                    }
                }
            } else {
                for (var i = 1, l = pens.length; i < l; i++) {
                    if (pens[i].offset > pens[i - 1].offset)
                        spans.push({ entry: pens[i - 1], next: pens[i] });
                }
                // The pens where the spans meet, except at steps, which end
                // the parts straight across, as butt caps do:
                for (var i = 0, l = pens.length; i < l; i++) {
                    var entry = pens[i],
                        offset = entry.offset,
                        isStep = i > 0 && pens[i - 1].offset === offset
                            || i < l - 1 && pens[i + 1].offset === offset;
                    if (!isStep && (closed ? offset < length
                            : offset > 0 && offset < length))
                        addPen(path.getPointAt(offset), getPen(entry));
                }
                for (var i = 0, offset = 0, l = curves.length; i < l; i++) {
                    var curve = curves[i],
                        curveLength = curve.getLength();
                    if (curve.hasLength(geomEpsilon)) {
                        var v = regularize(curve.getValues(), tolerance / 4),
                            reversals = Curve.getReversals(v, tolerance),
                            parts = [];
                        if (reversals.length) {
                            // A curve along a line that reverses along it:
                            // straight parts between the reversals, as in
                            // addPath(), where the pen turns as it is:
                            var points = [new Point(v[0], v[1])];
                            for (var j = 0, m = reversals.length; j < m; j++)
                                points.push(Curve.getPoint(v, reversals[j]));
                            points.push(new Point(v[6], v[7]));
                            for (var j = 1, start = offset, m = points.length;
                                    j < m; j++) {
                                var p1 = points[j - 1],
                                    p2 = points[j],
                                    third = p2.subtract(p1).divide(3),
                                    distance = p1.getDistance(p2);
                                if (j > 1) {
                                    addPen(p1, getSpanPen(getSpan(start),
                                            start));
                                }
                                parts.push({
                                    v: [p1.x, p1.y, p1.x + third.x,
                                        p1.y + third.y, p2.x - third.x,
                                        p2.y - third.y, p2.x, p2.y],
                                    offset: start,
                                    length: distance
                                });
                                start += distance;
                            }
                        } else {
                            parts.push({
                                v: regularizeCusp(v, tolerance / 4),
                                offset: offset,
                                length: curveLength
                            });
                        }
                        parts.forEach(addPart);
                        var first = parts[0],
                            last = parts[parts.length - 1];
                        ends.push({
                            point: curve._segment1._point,
                            first: first,
                            last: last,
                            start: Curve.getTangent(first.v, 0),
                            end: Curve.getTangent(last.v, 1)
                        });
                    }
                    offset += curveLength;
                }
                for (var i = 1, l = ends.length; i <= l; i++) {
                    if (i < l || closed)
                        addJoin(ends[i - 1], ends[i % l]);
                }
                if (!closed && ends.length) {
                    var first = ends[0],
                        last = ends[ends.length - 1];
                    addCap(first.first, 0, first.start.negate());
                    addCap(last.last, 1, last.end);
                }
            }
        }

        for (var i = 0, l = paths.length; i < l; i++) {
            var path = paths[i];
            if (path._strokeProfile) {
                addProfilePath(path);
            } else {
                addPath(path);
            }
        }
        return areas.length
                ? areas.length > 1 ? areas[0].unite(areas.slice(1)) : areas[0]
                : new Path({ insert: false });
    }

    // The offset of an open path, as the curves of the outline of its stroke
    // with butt caps on the side of the offset, without the caps:
    function offsetSide(path, offset, join, miterLimit) {
        var radius = abs(offset),
            outline = outlineStroke([path], radius, join, 'butt', miterLimit),
            first = path.getFirstSegment(),
            last = path.getLastSegment(),
            caps = [
                [first._point, path.getFirstCurve().getNormalAtTime(0)],
                [last._point, path.getLastCurve().getNormalAtTime(1)]
            ],
            tolerance = radius / 1e4,
            paths = [];

        // The caps are the straight curves along the normals at the ends:
        function isCap(curve) {
            if (!curve.hasHandles()) {
                for (var i = 0; i < 2; i++) {
                    var point = caps[i][0],
                        normal = caps[i][1],
                        vector1 = curve._segment1._point.subtract(point),
                        vector2 = curve._segment2._point.subtract(point);
                    if (abs(vector1.cross(normal)) < tolerance
                            && abs(vector2.cross(normal)) < tolerance)
                        return true;
                }
            }
            return false;
        }

        function isOnSide(curve) {
            var point = curve.getPointAtTime(0.5),
                location = path.getNearestLocation(point);
            return !isCap(curve) && point.subtract(location.getPoint())
                    .dot(location.getNormal()) * offset > 0;
        }

        function addRun(curves) {
            var segments = [new Segment(curves[0]._segment1._point, null,
                    curves[0]._segment1._handleOut)];
            for (var i = 0, l = curves.length; i < l; i++) {
                var segment = curves[i]._segment2;
                segments.push(new Segment(segment._point, segment._handleIn,
                        i < l - 1 ? segment._handleOut : null));
            }
            var run = new Path({ segments: segments, insert: false });
            // Run along the path:
            if (path.getNearestLocation(run.getFirstSegment()._point)
                    .getOffset() > path.getNearestLocation(
                        run.getLastSegment()._point).getOffset())
                run.reverse();
            paths.push(run);
        }

        var contours = outline._children || [outline];
        for (var i = 0, l = contours.length; i < l; i++) {
            var curves = contours[i].getCurves(),
                count = curves.length,
                keeps = [],
                start = -1;
            for (var j = 0; j < count; j++) {
                keeps.push(isOnSide(curves[j]));
                if (!keeps[j])
                    start = j;
            }
            if (count && start === -1) {
                // The whole contour lies on the side:
                paths.push(contours[i].clone({ insert: false }));
            } else {
                // Collect the runs of curves on the side, starting after one
                // that isn't, so that none wraps around the contour's end:
                var run = [];
                for (var j = 1; j <= count; j++) {
                    var index = (start + j) % count;
                    if (keeps[index]) {
                        run.push(curves[index]);
                    } else if (run.length) {
                        addRun(run);
                        run = [];
                    }
                }
            }
        }
        return paths;
    }

    // Returns the angle in radians by which the tangent of the curve with the
    // values v turns from t1 to t2, in total across its inflections:
    function getTurn(v, t1, t2) {
        var times = [t1].concat(getInflections(v).filter(function(t) {
                return t > t1 && t < t2;
            }), t2),
            turn = 0;
        for (var i = 1, l = times.length; i < l; i++) {
            turn += abs(Curve.getTangent(v, times[i - 1]).getDirectedAngle(
                    Curve.getTangent(v, times[i])));
        }
        return turn * Math.PI / 180;
    }

    // Returns the times where the offsets on either side of the curve have a
    // cusp, where its radius of curvature equals the radius. Between the
    // extrema and the inflections of the curvature, its magnitude changes
    // monotonically, so each of these intervals holds at most one:
    function getCuspTimes(v, radius) {
        var times = getCurvatureExtrema(v).concat(getInflections(v), 0, 1)
                .sort(function(a, b) {
                    return a - b;
                }),
            cusps = [];

        function f(t) {
            var curvature = Curve.getCurvature(v, t) * radius;
            return 1 - curvature * curvature;
        }

        for (var i = 1, l = times.length; i < l; i++) {
            var t0 = times[i - 1],
                t1 = times[i],
                f0 = f(t0),
                f1 = f(t1);
            if (f0 * f1 < 0)
                cusps.push(Numerical.findSignChange(f, t0, t1, f0, f1,
                        epsilon));
        }
        return cusps;
    }

    // Returns the center of curvature of the curve with the values v at t, its
    // derivative, and the numerator of its speed, which is zero where the
    // curvature has its extrema. With the derivatives d1, d2, d3 of the curve,
    // the center lies at p + perp(d1) * |d1|² / (d1 × d2), and moves along
    // perp(d1):
    function getEvoluteAt(v, t) {
        var x0 = v[0], y0 = v[1],
            cx = 3 * (v[2] - x0),
            cy = 3 * (v[3] - y0),
            bx = 3 * (v[4] - v[2]) - cx,
            by = 3 * (v[5] - v[3]) - cy,
            ax = v[6] - x0 - cx - bx,
            ay = v[7] - y0 - cy - by,
            dx = (3 * ax * t + 2 * bx) * t + cx,
            dy = (3 * ay * t + 2 * by) * t + cy,
            ddx = 6 * ax * t + 2 * bx,
            ddy = 6 * ay * t + 2 * by,
            cross = dx * ddy - dy * ddx,
            length2 = dx * dx + dy * dy,
            speed = 3 * (dx * ddx + dy * ddy) * cross
                - length2 * (dx * 6 * ay - dy * 6 * ax),
            perp = new Point(-dy, dx);
        return {
            point: Curve.getPoint(v, t).add(perp.multiply(length2 / cross)),
            derivative: perp.multiply(speed / (cross * cross)),
            speed: speed,
            // The signed radius of curvature, along perp(d1):
            radius: length2 * Math.sqrt(length2) / cross
        };
    }

    // Returns the times where the curvature of the curve has its extrema:
    function getCurvatureExtrema(v) {
        var count = 32,
            times = [];

        function f(t) {
            return getEvoluteAt(v, t).speed;
        }

        for (var i = 1, f0 = f(0); i <= count; i++) {
            var t0 = (i - 1) / count,
                t1 = i / count,
                f1 = f(t1);
            if (f0 * f1 < 0) {
                times.push(Numerical.findSignChange(f, t0, t1, f0, f1,
                        epsilon));
            }
            f0 = f1;
        }
        return times;
    }

    // Returns the segments of the evolute of the curve with the values v, the
    // curve of its centers of curvature, fitted with cubic Hermite curves
    // between its cusps. Where the centers lie beyond the inner offset, or on
    // the other side, the inner side doesn't sweep backwards, and the evolute
    // follows the inner offset instead:
    function getEvolute(v, inner, tolerance) {
        var c = regularizeCusp(v, tolerance / 4),
            times = getCurvatureExtrema(c).concat(1),
            t0 = 0,
            e0 = evaluate(0),
            segments = [new Segment(e0.point)];

        function evaluate(t) {
            var e = getEvoluteAt(c, t),
                // Paper.js's normals point against perp(d1):
                distance = inner > 0 ? -e.radius : e.radius;
            // Also where the radius is undefined, at zero derivatives, and
            // where it lies within the tolerance of the inner offset, so that
            // both meet exactly at the ends of the tight parts:
            if (!(distance >= 0 && distance < abs(inner) - tolerance)) {
                var derivative = Curve.getWeightedTangent(c, t);
                e = {
                    point: Curve.getPoint(c, t).add(
                            Curve.getNormal(c, t).multiply(inner)),
                    derivative: derivative.multiply(
                            1 + inner * Curve.getCurvature(c, t))
                };
            }
            return e;
        }

        function fit(t0, e0, t1, e1, depth) {
            var tm = (t0 + t1) / 2,
                em = evaluate(tm),
                h0 = e0.derivative.multiply((t1 - t0) / 3),
                h1 = e1.derivative.multiply((t0 - t1) / 3),
                mid = e0.point.add(e1.point).multiply(0.5)
                    .add(h0.add(h1).multiply(3 / 8));
            if (depth < 8 && mid.getDistance(em.point) > tolerance / 10) {
                fit(t0, e0, tm, em, depth + 1);
                fit(tm, em, t1, e1, depth + 1);
            } else {
                segments[segments.length - 1].setHandleOut(h0);
                segments.push(new Segment(e1.point, h1));
            }
        }

        for (var i = 0, l = times.length; i < l; i++) {
            var e1 = evaluate(times[i]);
            fit(t0, e0, times[i], e1, 0);
            t0 = times[i];
            e0 = e1;
        }
        return segments;
    }

    // Returns the segments of the offset of the curve with the values v:
    function getOffsetSegments(v, offset, tolerance) {
        if (Curve.isStraight(v)) {
            // Along the normals at the ends, as the joins and caps use them:
            return [
                new Segment(new Point(v[0], v[1]).add(
                        Curve.getNormal(v, 0).multiply(offset))),
                new Segment(new Point(v[6], v[7]).add(
                        Curve.getNormal(v, 1).multiply(offset)))
            ];
        } else {
            // Paper.js's normals point the other way than those of the method
            // below, see getUnitNormal():
            return offsetCubic(v, -offset, tolerance);
        }
    }

    // The offset of a cubic Bézier curve after kurbo's offset_cubic(), by Raph
    // Levien and the Linebender contributors (Apache-2.0 OR MIT):
    // https://github.com/linebender/kurbo/blob/main/kurbo/src/offset.rs
    // Each part is drawn as an arc, refined by least squares, and subdivided
    // while its error exceeds the tolerance, first at the cusps of the offset.
    function offsetCubic(v, d, tolerance) {
        var c = regularizeCusp(v, tolerance / 4),
            p0 = new Point(c[0], c[1]),
            p1 = new Point(c[2], c[3]),
            p2 = new Point(c[4], c[5]),
            p3 = new Point(c[6], c[7]),
            // The control points of the derivative:
            q0 = p1.subtract(p0).multiply(3),
            q1 = p2.subtract(p1).multiply(3),
            q2 = p3.subtract(p2).multiply(3),
            // The cross product of the second and first derivatives, times the
            // offset, as the polynomial c0 + c1 * t + c2 * t^2:
            q1xq0 = q1.cross(q0),
            q2xq0 = q2.cross(q0),
            q2xq1 = q2.cross(q1),
            c0 = 2 * d * q1xq0,
            c1 = 2 * d * (q2xq0 - 2 * q1xq0),
            c2 = 2 * d * (q2xq1 - q2xq0 + q1xq0),
            utan0 = Curve.getTangent(c, 0),
            utan1 = Curve.getTangent(c, 1),
            segments = [new Segment(p0.add(getUnitNormal(utan0, d)))],
            // The Bézier weights of the points of the least squares fit:
            count = 8,
            weights = [];
        for (var i = 0; i < count; i++) {
            var t = (i + 1) / (count + 1);
            weights.push(3 * (1 - t) * (1 - t) * t);
        }

        function getUnitNormal(utan, length) {
            return new Point(-utan.y, utan.x).multiply(length);
        }

        function evaluate(t) {
            return Curve.getPoint(c, t);
        }

        function derive(t) {
            var u = 1 - t,
                w0 = u * u,
                w1 = 2 * t * u,
                w2 = t * t;
            return new Point(w0 * q0.x + w1 * q1.x + w2 * q2.x,
                    w0 * q0.y + w1 * q1.y + w2 * q2.y);
        }

        // The curvature times the offset plus one, which is zero where the
        // offset has a cusp:
        function getCusp(t) {
            var ds2 = derive(t).dot(derive(t));
            return ((c2 * t + c1) * t + c0) / (ds2 * Math.sqrt(ds2)) + 1;
        }

        function getEndCusp(tangent, y) {
            var length = Math.max(tangent.getLength(), epsilon);
            return y / (length * length * length) + 1;
        }

        // The offset curve of the part from t0 to t1, with the handles of the
        // offset drawn as an arc that a and b adjust:
        function getOffsetCurve(part, a, b) {
            var s = (part.t1 - part.t0) / 3,
                start = evaluate(part.t0).add(getUnitNormal(part.utan0, d)),
                end = evaluate(part.t1).add(getUnitNormal(part.utan1, d)),
                l0 = s * derive(part.t0).getLength() + a * d,
                l1 = s * derive(part.t1).getLength() - b * d;
            return [
                start,
                l0 * part.cusp0 > 0
                    ? start.add(part.utan0.multiply(l0)) : start,
                l1 * part.cusp1 > 0
                    ? end.subtract(part.utan1.multiply(l1)) : end,
                end
            ];
        }

        // The error of the offset curve, at the points on it whose normals meet
        // the curve at the times in ts, which a Newton step refines. It is
        // called a lot, so we calculate with coordinates, not points:
        function getError(part, points, ts) {
            var error = 0,
                normals = [],
                vectors = [],
                x0 = points[0].x, y0 = points[0].y,
                x1 = points[1].x, y1 = points[1].y,
                x2 = points[2].x, y2 = points[2].y,
                x3 = points[3].x, y3 = points[3].y,
                sign = part.cusp0 < 0 ? -1 : 1;
            for (var i = 0; i < count; i++) {
                var ta = (i + 1) / (count + 1),
                    u = 1 - ta,
                    w0 = u * u * u,
                    w1 = 3 * u * u * ta,
                    w2 = 3 * u * ta * ta,
                    w3 = ta * ta * ta,
                    px = w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3,
                    py = w0 * y0 + w1 * y1 + w2 * y2 + w3 * y3,
                    tx = (x1 - x0) * u * u + (x2 - x1) * 2 * u * ta
                        + (x3 - x2) * ta * ta,
                    ty = (y1 - y0) * u * u + (y2 - y1) * 2 * u * ta
                        + (y3 - y2) * ta * ta,
                    t = ts[i],
                    point = evaluate(t),
                    derivative = derive(t);
                t += (tx * (px - point.x) + ty * (py - point.y))
                        / (tx * derivative.x + ty * derivative.y);
                t = ts[i] = clamp(t, part.t0, part.t1);
                point = evaluate(t);
                var length = Math.sqrt(tx * tx + ty * ty),
                    nx = -ty / length * sign,
                    ny = tx / length * sign,
                    vx = px - point.x - nx * d,
                    vy = py - point.y - ny * d,
                    squared = vx * vx + vy * vy;
                normals.push(new Point(nx, ny));
                vectors.push(new Point(vx, vy));
                // Reject refinements that produce invalid values:
                error = Math.max(error, isFinite(squared) ? squared : 1e12);
            }
            return { squared: error, normals: normals, vectors: vectors };
        }

        // Adjusts a and b to minimize the least squares error, mostly normal to
        // the offset, with a little of the error along it blended in:
        function refine(part, a, b, error) {
            var blend = 1e-3,
                aa = 0, ab = 0, ac = 0, bb = 0, bc = 0;
            for (var i = 0; i < count; i++) {
                var n = error.normals[i],
                    vector = error.vectors[i],
                    cn = vector.dot(n),
                    ct = vector.cross(n),
                    an = weights[i] * part.utan0.dot(n),
                    at = weights[i] * part.utan0.cross(n),
                    bn = weights[count - 1 - i] * part.utan1.dot(n),
                    bt = weights[count - 1 - i] * part.utan1.cross(n);
                aa += an * an + blend * at * at;
                ab += an * bn + blend * at * bt;
                ac += an * cn + blend * at * ct;
                bb += bn * bn + blend * bt * bt;
                bc += bn * cn + blend * bt * ct;
            }
            var idet = 1 / (d * (aa * bb - ab * ab));
            return [
                a - idet * (ac * bb - ab * bc),
                b - idet * (aa * bc - ac * ab)
            ];
        }

        // Finds the time in t0..t1 where the tangent points along `tangent`,
        // with `force` returning the end with the smaller derivative if there
        // isn't exactly one:
        function getTimeWithTangent(utan0, t0, t1, tangent, force) {
            var z0 = tangent.cross(q0),
                z1 = tangent.cross(q1),
                z2 = tangent.cross(q2),
                roots = [],
                found = Numerical.solveQuadratic(z2 - 2 * z1 + z0,
                        2 * (z1 - z0), z0, roots, t0, t1),
                t = roots[0];
            if (found !== 1) {
                if (!force)
                    return null;
                t = derive(t0).getLength() > derive(t1).getLength() ? t1 : t0;
            }
            var q = derive(t);
            return {
                t: t,
                utan: found === 1 && q.dot(q) >= epsilon ? q.normalize()
                    : tangent.dot(tangent) >= epsilon ? tangent.normalize()
                    // A U-turn: pick a direction.
                    : getUnitNormal(utan0, 1)
            };
        }

        // Where to subdivide: in the middle if its tangent is balanced between
        // the ends', otherwise at the tangent that bisects them, or with an
        // inflection, at half of the total turning:
        function getSubdivision(part) {
            var t = (part.t0 + part.t1) / 2,
                q = derive(t),
                x0 = abs(part.utan0.cross(q)),
                x1 = abs(part.utan1.cross(q));
            if (x0 > 0.1 * x1 && x1 > 0.1 * x0)
                return { t: t, utan: q.normalize() };
            var chord = evaluate(part.t1).subtract(evaluate(part.t0));
            if (chord.cross(part.utan0) * chord.cross(part.utan1) < 0) {
                var split = getTimeWithTangent(part.utan0, part.t0, part.t1,
                        part.utan0.add(part.utan1), false);
                if (split)
                    return split;
            }
            var tangents = [part.utan0],
                ts = [part.t0],
                inflections = getInflections(c);
            for (var i = 0; i < inflections.length; i++) {
                var ti = inflections[i];
                if (ti > part.t0 && ti < part.t1) {
                    tangents.push(derive(ti));
                    ts.push(ti);
                }
            }
            tangents.push(part.utan1);
            ts.push(part.t1);
            var angles = [],
                sum = 0;
            for (var i = 0; i < tangents.length - 1; i++) {
                var angle = Math.atan2(tangents[i].cross(tangents[i + 1]),
                        tangents[i].dot(tangents[i + 1]));
                sum += abs(angle);
                angles.push(angle);
            }
            var target = sum / 2,
                j = 0;
            while (abs(angles[j]) < target) {
                target -= abs(angles[j]);
                j++;
            }
            var base = tangents[j],
                turn = angles[j] < 0 ? -target : target,
                tangent = base.rotate(turn * 180 / Math.PI);
            return getTimeWithTangent(j ? base.normalize() : part.utan0,
                    ts[j], ts[j + 1], tangent, true);
        }

        function subdivide(part, t, utan, cuspMinus, cuspPlus) {
            offsetPart({
                t0: part.t0, t1: t, utan0: part.utan0, utan1: utan,
                cusp0: part.cusp0, cusp1: cuspMinus, depth: part.depth + 1
            });
            offsetPart({
                t0: t, t1: part.t1, utan0: utan, utan1: part.utan1,
                cusp0: cuspPlus, cusp1: part.cusp1, depth: part.depth + 1
            });
        }

        function offsetPart(part) {
            // Subdivide at a cusp of the offset first:
            if (part.cusp0 * part.cusp1 < 0) {
                var t = Numerical.findSignChange(getCusp, part.t0, part.t1,
                        part.cusp0, part.cusp1, epsilon);
                subdivide(part, t, derive(t).normalize(),
                        part.cusp0 < 0 ? -epsilon : epsilon,
                        part.cusp1 < 0 ? -epsilon : epsilon);
                return;
            }
            // The arc from the normal at the start to the one at the end:
            var angle = Math.atan2(part.utan1.cross(part.utan0),
                        part.utan1.dot(part.utan0)),
                a = 2 / 3 / (1 + Math.cos(angle / 2)) * 2 * Math.sin(angle / 2),
                b = -a,
                dt = (part.t1 - part.t0) / (count + 1),
                ts = [];
            for (var i = 0; i < count; i++)
                ts.push(part.t0 + (i + 1) * dt);
            var points = getOffsetCurve(part, a, b),
                error = getError(part, points, ts),
                tolerance2 = tolerance * tolerance;
            for (var i = 0; i < 2 && error.squared > tolerance2; i++) {
                var refined = refine(part, a, b, error),
                    points2 = getOffsetCurve(part, refined[0], refined[1]),
                    error2 = getError(part, points2, ts);
                if (error2.squared >= error.squared)
                    break;
                a = refined[0];
                b = refined[1];
                points = points2;
                error = error2;
            }
            // Pieces within the tolerance of their start can't be off by
            // more, as near cusps of the offset, where the error doesn't
            // converge and subdivision only adds pieces of no length:
            var isShort = points[1].getDistance(points[0]) < tolerance
                    && points[2].getDistance(points[0]) < tolerance
                    && points[3].getDistance(points[0]) < tolerance;
            if (part.depth < 8 && error.squared > tolerance2 && !isShort) {
                var split = getSubdivision(part),
                    cusp = getCusp(split.t);
                subdivide(part, split.t, split.utan, cusp, cusp);
            } else {
                var last = segments[segments.length - 1];
                last.setHandleOut(points[1].subtract(points[0]));
                segments.push(new Segment(points[3],
                        points[2].subtract(points[3])));
            }
        }

        offsetPart({
            t0: 0, t1: 1, utan0: utan0, utan1: utan1,
            cusp0: getEndCusp(q0, c0),
            cusp1: getEndCusp(q2, c0 + c1 + c2),
            depth: 0
        });
        return segments;
    }

    // The times of the inflections of the curve:
    function getInflections(v) {
        var p0 = new Point(v[0], v[1]),
            p1 = new Point(v[2], v[3]),
            p2 = new Point(v[4], v[5]),
            p3 = new Point(v[6], v[7]),
            a = p1.subtract(p0),
            b = p2.subtract(p1).subtract(a),
            c = p3.subtract(p0).subtract(p2.subtract(p1).multiply(3)),
            roots = [],
            count = Numerical.solveQuadratic(b.cross(c), a.cross(c),
                    a.cross(b), roots, 0, 1);
        return count > 0 ? roots.slice(0, count) : [];
    }

    // Gives handles that are shorter than the dimension that length, along
    // their own direction, as it is their curve's tangent, or towards the next
    // control point if they have none, so that the curve's derivative doesn't
    // vanish at its ends (after kurbo's CubicBez::regularize()):
    function regularize(v, dimension) {
        var p0 = new Point(v[0], v[1]),
            p1 = new Point(v[2], v[3]),
            p2 = new Point(v[4], v[5]),
            p3 = new Point(v[6], v[7]),
            handle1 = p1.subtract(p0),
            handle2 = p2.subtract(p3);
        if (handle1.getLength() < dimension) {
            if (!handle1.isZero()) {
                p1 = p0.add(handle1.normalize(dimension));
            } else if (p0.getDistance(p2) >= dimension) {
                p1 = p0.add(p2.subtract(p0).normalize(dimension));
            } else {
                p1 = p0.add(p3.subtract(p0).divide(3));
                p2 = p3.add(p0.subtract(p3).divide(3));
            }
        }
        if (handle2.getLength() < dimension) {
            if (!handle2.isZero()) {
                p2 = p3.add(handle2.normalize(dimension));
            } else if (p3.getDistance(p1) >= dimension) {
                p2 = p3.add(p1.subtract(p3).normalize(dimension));
            } else {
                p1 = p0.add(p3.subtract(p0).divide(3));
                p2 = p3.add(p0.subtract(p3).divide(3));
            }
        }
        return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];
    }

    // Nudges the handles of a curve with a cusp within it, where its derivative
    // vanishes, so that its curvature stays finite (kurbo's regularize_cusp()):
    function regularizeCusp(v, dimension) {
        var p0 = new Point(v[0], v[1]),
            p1 = new Point(v[2], v[3]),
            p2 = new Point(v[4], v[5]),
            p3 = new Point(v[6], v[7]),
            d01 = p1.subtract(p0),
            d02 = p2.subtract(p0),
            d03 = p3.subtract(p0),
            d12 = p2.subtract(p1),
            d23 = p3.subtract(p2),
            det012 = d01.cross(d02),
            det123 = d12.cross(d23),
            det013 = d01.cross(d03),
            det023 = d02.cross(d03);
        if (det012 * det123 > 0 && det012 * det013 < 0
                && det012 * det023 < 0) {
            // The derivative is the quadratic of q0, q1, q2. Find where it is
            // shortest, and its curvature there:
            var q0 = d01.multiply(3),
                q1 = d12.multiply(3),
                q2 = d23.multiply(3),
                t = Curve.getNearestTime([q0.x, q0.y,
                        q0.x + (q1.x - q0.x) * 2 / 3,
                        q0.y + (q1.y - q0.y) * 2 / 3,
                        q2.x + (q1.x - q2.x) * 2 / 3,
                        q2.y + (q1.y - q2.y) * 2 / 3, q2.x, q2.y],
                        new Point(0, 0)),
                u = 1 - t,
                q = q0.multiply(u * u).add(q1.multiply(2 * t * u))
                    .add(q2.multiply(t * t)),
                dq = q1.subtract(q0).multiply(2 * u)
                    .add(q2.subtract(q1).multiply(2 * t)),
                cross = q.cross(dq),
                distance2 = q.dot(q);
            if (distance2 * distance2 * distance2
                    <= cross * dimension * cross * dimension) {
                var a = 3 * det012 + det023 - 2 * det013,
                    b = -3 * det012 + det013,
                    discriminant = b * b - 4 * a * det012,
                    l01 = d01.getLength(),
                    l23 = d23.getLength();
                if (discriminant > 0) {
                    // A double inflection: keep the handles at least as long as
                    // the dimension.
                    if (l01 > 2 * dimension)
                        p1 = p1.subtract(d01.multiply(dimension / l01));
                    if (l23 > 2 * dimension)
                        p2 = p2.add(d23.multiply(dimension / l23));
                } else {
                    // A loop:
                    p1 = p1.add(d01.multiply(dimension / l01));
                    p2 = p2.subtract(d23.multiply(dimension / l23));
                }
            }
        }
        return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];
    }

    // Returns a copy of the path item with its matrix applied, and without
    // curves of zero length, which have no directions for joins and caps:
    function prepare(item) {
        return item.clone({ insert: false }).transform(null, true, true)
                .reduce();
    }

    function createResult(item, result, options) {
        if (Base.pick(options && options.insert, paper.settings.insertItems))
            result.insertAbove(item);
        result.copyAttributes(item, true);
        return result;
    }

    return /** @lends PathItem# */{
        /**
         * {@grouptitle Offsetting and Outlining}
         *
         * Offsets the path item by the given distance and returns the result
         * as a new path item. Closed paths and compound paths grow by positive
         * distances and shrink by negative ones, open paths are offset along
         * their normals for positive distances, and against them for negative
         * ones. As with the boolean operations, the path item's matrix is
         * applied first.
         *
         * @option [options.join='miter'] {String} the shape of the corners
         *     that the offset adds where the path turns away from it:
         *     {@values 'miter', 'round', 'bevel'}
         * @option [options.miterLimit=10] {Number} the limit of miter corners,
         *     see {@link Style#miterLimit}
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above this path
         *
         * @param {Number} distance the distance to offset the path item by
         * @param {Object} [options] the offset options
         * @return {PathItem} the resulting path item
         *
         * @example {@paperscript}
         * var path = new Path.Star([50, 50], 5, 20, 40);
         * path.strokeColor = 'black';
         * var result = path.offset(10, { join: 'round' });
         * result.strokeColor = 'red';
         */
        offset: function(distance, options) {
            var join = options && options.join || 'miter',
                miterLimit = options && options.miterLimit || 10,
                path = prepare(this),
                paths = path._children || [path],
                result;
            if (!distance) {
                result = path;
            } else if (this._children || this._closed) {
                var outline = outlineStroke(paths, abs(distance), join,
                        'butt', miterLimit);
                result = path[distance > 0 ? 'unite' : 'subtract'](outline,
                        { insert: false });
            } else {
                result = new CompoundPath({
                    children: path.isEmpty() ? []
                        : offsetSide(path, distance, join, miterLimit),
                    insert: false
                }).reduce();
            }
            return createResult(this, result, options);
        },

        /**
         * Outlines the stroke of the path item, and returns the area that it
         * covers as a new path item, filled with the stroke's color. As with
         * the boolean operations, the path item's matrix is applied first.
         *
         * Paths with a {@link Path#strokeProfile} are outlined as the area
         * that its pens sweep. Their round joins and caps are the pens
         * themselves, and their other joins and caps connect the points where
         * the pens touch the sides of the stroke. Steps in the profile end
         * the parts of the stroke straight across, as butt caps do.
         *
         * @option [options.width=this.strokeWidth] {Number} the width of the
         *     stroke
         * @option [options.join=this.strokeJoin] {String} the shape of the
         *     stroke's corners: {@values 'miter', 'round', 'bevel'}
         * @option [options.cap=this.strokeCap] {String} the shape of the
         *     stroke's ends: {@values 'round', 'square', 'butt'}
         * @option [options.miterLimit=this.miterLimit] {Number} the limit of
         *     miter corners, see {@link Style#miterLimit}
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above this path
         *
         * @param {Object} [options] the outline options
         * @return {PathItem} the resulting path item
         *
         * @example {@paperscript}
         * var path = new Path.Arc([20, 70], [50, 20], [80, 70]);
         * path.strokeColor = 'black';
         * path.strokeWidth = 20;
         * path.strokeCap = 'round';
         * var result = path.outline();
         * result.strokeColor = 'red';
         * result.strokeWidth = 1;
         * path.remove();
         */
        outline: function(options) {
            options = options || {};
            var path = prepare(this),
                result = outlineStroke(path._children || [path],
                    Base.pick(options.width, this.getStrokeWidth()) / 2,
                    options.join || this.getStrokeJoin(),
                    options.cap || this.getStrokeCap(),
                    options.miterLimit || this.getMiterLimit());
            result = createResult(this, result.reduce(), options);
            result.setFillColor(this.getStrokeColor());
            result.setStrokeColor(null);
            return result;
        }
    };
});
