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
PathItem.inject(
  new (function () {
    const abs = Math.abs
    const clamp = Numerical.clamp
    const errorThreshold = 0.1
    const epsilon = /*#=*/ Numerical.EPSILON
    const geomEpsilon = /*#=*/ Numerical.GEOMETRIC_EPSILON
    // The angles where the edges of stroke profiles' pens are sampled,
    // with their cosines and sines, the same for all pens:
    const penSamples = []

    for (let i = 0; i <= 32; i++) {
      const phi = (i + 0.5) * Math.PI / 16
      penSamples.push({ phi: phi, cos: Math.cos(phi), sin: Math.sin(phi) })
    }

    // The outline of the strokes of the paths, as the union of the areas that
    // their parts sweep, their joins and their caps. The curves are split where
    // an offset has a cusp, and the parts into areas that each sweep in one
    // direction, so that no opposite windings cancel.
    function outlineStroke(paths, radius, join, cap, miterLimit) {
      // The offsets' error, relative to small radii:
      const tolerance = Math.min(errorThreshold, radius / 100)
      const areas = []

      // Adds the area between two sides of a part, leaving the segments of
      // the second one as they are, as the evolute is shared. Strips of
      // stroke profiles leave out slivers thinner than the tolerance, which
      // only add points so close to the others' that the union can't tell
      // them apart:
      function addSides(side1, side2, isStrip) {
        let part = new Path({ segments: side1, insert: false })
        for (let i = side2.length - 1; i >= 0; i--)
          part.add(side2[i].reversed())
        part.setClosed(true)
        part = part.unite()
        // Parts that fold onto themselves can leave nothing:
        if (isStrip ? !isThin(part) : !part.isEmpty()) areas.push(part)
      }

      // Checks that the part is thin on average, and also where it may taper,
      // looking half the tolerance inside the middle of each curve, on the
      // side that unite() leaves inside. Points that lie that far from the
      // outline, within rounding, are thick:
      function isThin(part) {
        const half = tolerance / 2
        if (abs(part.getArea()) > half * part.getLength()) return false
        const curves = part.getCurves()
        for (let i = 0, l = curves.length; i < l; i++) {
          const curve = curves[i]
          const inside = curve.getPointAtTime(0.5).subtract(
            curve.getNormalAtTime(0.5).multiply(half)
          )
          if (
            part.contains(inside) && (
              part.getNearestPoint(inside).getDistance(inside) >
              half * 0.99
            )
          )
            return false
        }
        return true
      }

      // Adds the area of the part of the curve with the values v. Where it
      // turns more tightly than the radius, the inner side sweeps backwards
      // beyond the evolute, so we split it there into two areas (Nehab):
      function addPart(v) {
        const curvature = Curve.getCurvature(v, 0.5)
        if (abs(curvature) * radius > 1) {
          // The centers of curvature lie against the normals:
          const inner = curvature > 0 ? -radius : radius
          const evolute = getEvolute(v, inner, tolerance)
          addSides(getOffsetSegments(v, -inner, tolerance), evolute)
          addSides(getOffsetSegments(v, inner, tolerance), evolute)
        } else {
          addSides(
            getOffsetSegments(v, radius, tolerance),
            getOffsetSegments(v, -radius, tolerance)
          )
        }
      }

      // Adds a round join or cap as the sector of the circle between the
      // normals, which ends where the sides of the parts do, instead of
      // crossing them at shallow angles as a whole circle would:
      function addSector(point, normal1, normal2, direction) {
        const sector = new Path({ insert: false })
        sector.moveTo(point)
        sector.lineTo(point.add(normal1))
        sector.arcTo(point.add(direction.normalize(radius)), point.add(normal2))
        sector.closePath()
        areas.push(sector)
      }

      function addPolygon(points) {
        areas.push(new Path({ segments: points, closed: true, insert: false }))
      }

      // Adds the join at the point between the directions of the curves,
      // on the outer side of their turn, unless they continue each other:
      function addJoin(point, tangent1, tangent2) {
        // Paper.js's normals, to tell the outer side by their angle:
        let normal1 = new Point(tangent1.y, -tangent1.x).multiply(radius)
        let normal2 = new Point(tangent2.y, -tangent2.x).multiply(radius)
        const angle = normal1.getDirectedAngle(normal2)
        if (
          !Numerical.isZero(tangent1.cross(tangent2)) ||
          tangent1.dot(tangent2) < 0
        ) {
          if (angle < 0) {
            normal1 = normal1.negate()
            normal2 = normal2.negate()
          }
          // Widen the join into the parts on both sides, so that it
          // overlaps them rather than sharing edges that the union can't
          // tell apart at small angles. Its arc stays within the
          // tolerance of their offsets there:
          const widening = (
            Math.sqrt(tolerance / radius) *
            180 /
            Math.PI *
            (angle < 0 ? -1 : 1)
          )
          const outer1 = normal1.rotate(-widening)
          const outer2 = normal2.rotate(widening)
          let direction = normal1.add(normal2)
          // Cusps turn back, ahead of the first curve:
          if (direction.getLength() < geomEpsilon * radius) direction = tangent1
          if (join === 'round') {
            addSector(point, outer1, outer2, direction)
          } else {
            const length = radius / Math.cos(abs(angle) * Math.PI / 360)
            const points = [point, point.add(outer1), point.add(normal1)]
            if (join === 'miter' && length <= miterLimit * radius)
              points.push(point.add(direction.normalize(length)))
            addPolygon(points.concat(point.add(normal2), point.add(outer2)))
          }
        }
      }

      // Adds the cap at the point, at the end of the path in the direction
      // of the tangent:
      function addCap(point, tangent) {
        const normal = new Point(-tangent.y, tangent.x).multiply(radius)
        if (cap === 'round') {
          addSector(point, normal, normal.negate(), tangent)
        } else if (cap === 'square') {
          const ahead = tangent.multiply(radius)
          addPolygon([
            point.add(normal),
            point.add(normal).add(ahead),
            point.subtract(normal).add(ahead),
            point.subtract(normal)
          ])
        }
      }

      // Tight parts whose normals turn by less than the tolerance at the
      // radius would only add slivers, so they stay with their neighbors,
      // as do parts shorter than it that turn as little. Other parts don't,
      // as they would lose their own sweeps to their neighbors' kind:
      function isSliver(v, t1, t2) {
        return (
          getTurn(v, t1, t2) * radius < tolerance && (
            abs(Curve.getCurvature(v, (t1 + t2) / 2)) * radius > 1 ||
            Curve.getLength(v, t1, t2) < tolerance
          )
        )
      }

      function addPath(path) {
        let i
        let l
        let j
        let m
        let t0

        const segments = path._segments
        const closed = path._closed
        const curves = path.getCurves()
        // Make segments smooth that are so within the tolerance, which
        // moves the curves less than it, as their joins would only add
        // slivers, and their parts' corners lie too close to tell apart:
        for (i = 0, l = segments.length; i < l; i++) {
          const segment = segments[i]
          const handleIn = segment._handleIn
          const handleOut = segment._handleOut
          if (!handleIn.isZero() && !handleOut.isZero()) {
            const angle = (
              abs(
                handleOut.getDirectedAngle(
                  handleIn.negate()
                )
              ) *
              Math.PI /
              180
            )
            const lengthIn = handleIn.getLength()
            const lengthOut = handleOut.getLength()
            if (
              angle && (
                angle * Math.max(radius, lengthIn, lengthOut) <
                tolerance
              )
            ) {
              const direction = handleOut.normalize().subtract(
                handleIn.normalize()
              )
              segment.setHandleIn(direction.normalize(-lengthIn))
              segment.setHandleOut(direction.normalize(lengthOut))
            }
          }
        }
        if (!path.getLength()) {
          // A dot, as a circle or a square, as caps only apply to open
          // paths:
          if (segments.length && !closed && cap !== 'butt') {
            const center = segments[0]._point
            areas.push(
              cap === 'round'
                ? new Path.Circle({
                    center: center,
                    radius: radius,
                    insert: false
                  })
                : new Path.Rectangle({
                    point: center.subtract(radius),
                    size: [2 * radius, 2 * radius],
                    insert: false
                  })
            )
          }
        } else {
          // The curves with their directions at their ends, as their
          // parts use them, which the joins and caps continue:
          const ends = []
          for (i = 0, l = curves.length; i < l; i++) {
            const curve = curves[i]
            if (curve.hasLength(geomEpsilon)) {
              const v = regularize(curve.getValues(), tolerance / 4)
              const reversals = Curve.getReversals(v, tolerance)
              let start = Curve.getTangent(v, 0)
              let end = Curve.getTangent(v, 1)
              if (reversals.length) {
                // A curve along a line that reverses along it:
                // straight parts between the reversals, joined
                // round, as the limit of a tight turn (kurbo's
                // do_linear()):
                const points = [new Point(v[0], v[1])]
                for (j = 0, m = reversals.length; j < m; j++)
                  points.push(Curve.getPoint(v, reversals[j]))
                points.push(new Point(v[6], v[7]))
                start = points[1].subtract(points[0]).normalize()
                end = points[points.length - 1].subtract(
                  points[points.length - 2]
                ).normalize()
                for (j = 1, m = points.length; j < m; j++) {
                  const p1 = points[j - 1]
                  const p2 = points[j]
                  addPart([p1.x, p1.y, p1.x, p1.y, p2.x, p2.y, p2.x, p2.y])
                  if (j < m - 1) {
                    // The turn sweeps a whole circle, ahead of
                    // it and behind, in two halves that end
                    // at the parts' sides:
                    const tangent = p2.subtract(p1).normalize()
                    const normal = new Point(-tangent.y, tangent.x).multiply(
                      radius
                    )
                    addSector(p2, normal, normal.negate(), tangent)
                    addSector(p2, normal.negate(), normal, tangent.negate())
                  }
                }
              } else {
                const times = getCuspTimes(v, radius).concat(1)
                for (j = 0, t0 = 0, m = times.length; j < m; j++) {
                  const t = times[j]
                  if (
                    t === 1 || (
                      !isSliver(v, t0, t) &&
                      !isSliver(v, t, times[j + 1])
                    )
                  ) {
                    addPart(Curve.getPart(v, t0, t))
                    t0 = t
                  }
                }
              }
              ends.push({ curve: curve, start: start, end: end })
            }
          }
          for (i = 1, l = ends.length; i <= l; i++) {
            const end1 = ends[i - 1]
            const end2 = ends[i % l]
            if (i < l || closed)
              addJoin(end2.curve._segment1._point, end1.end, end2.start)
          }
          if (!closed && ends.length) {
            const first = ends[0]
            const last = ends[ends.length - 1]
            addCap(first.curve._segment1._point, first.start.negate())
            addCap(last.curve._segment2._point, last.end)
          }
        }
      }

      // Adds the area that the pens of the path's stroke profile sweep: the
      // ellipses that change along curves between the stops, see
      // Path#strokeProfile. The sides of the stroke lie where the moving pen
      // touches the edge of the area, which we find exactly at each time on
      // the curves, and fit with cubics. Where the pens change abruptly or
      // the sides end, at stops, steps, corners and reversals, we add the
      // pens there as they are, as each lies within the area.
      function addProfilePath(path) {
        let pen
        let i
        let l
        let offset
        let j
        let m
        let start
        let part
        let first
        let last

        const pens = path._getStrokeProfilePens()
        const getValues = path._getStrokeProfileValues()
        const closed = path._closed
        const length = path.getLength()
        const curves = path.getCurves()
        const spans = []
        const ends = []
        const allParts = []

        // The pen at the offset, as the half axes of its ellipse and its
        // angle in radians, with their first and second derivatives along
        // the path. Where a step lies at the offset, `after` picks the side
        // after it. As the product of the width and the aspect, b changes
        // with both:
        function getPen(offset, after) {
          const values = getValues(offset, after)
          const width = values.width
          const aspect = values.aspect
          const angle = values.angle
          const toRadians = Math.PI / 180
          const a = radius * width[0]
          return {
            a: a,
            b: a * aspect[0],
            angle: angle[0] * toRadians,
            da: radius * width[1],
            db: radius * (width[1] * aspect[0] + width[0] * aspect[1]),
            dda: radius * width[2],
            ddb: (
              radius * (
                width[2] * aspect[0] +
                2 * width[1] * aspect[1] +
                width[0] * aspect[2]
              )
            ),
            dAngle: angle[1] * toRadians,
            ddAngle: angle[2] * toRadians
          }
        }

        // The pen of the span at the offset within it, also where rounding
        // took the offset beyond its ends, and onto the other side of a
        // step there:
        function getSpanPen(span, offset) {
          const end = span.next.offset
          return offset < end
            ? getPen(Math.max(offset, span.entry.offset), true)
            : getPen(end, false)
        }

        // The offset along the path at the time on the part. Regularizing
        // can make its curve a little longer or shorter than the part is
        // along the path, so we scale its lengths, and the parts meet at
        // the same offsets, with the same pens:
        function getOffset(part, t) {
          return (
            part.offset +
            part.length *
            Curve.getLength(part.v, 0, t) /
            part.curveLength
          )
        }

        // The time on the part at the offset along the path, the inverse
        // of getOffset():
        function getTime(part, offset) {
          const start = part.offset
          return offset <= start
            ? 0
            : offset >= start + part.length
              ? 1
              : Curve.getTimeAt(
                  part.v,
                  (offset - start) *
                  part.curveLength /
                  part.length
                )
        }

        // The span at the offset, or the one before it where they meet.
        // Before the start of closed paths lies their end:
        function getSpan(offset, after) {
          if (closed && !after && !offset) offset = length
          for (let i = 0, l = spans.length; i < l; i++) {
            const span = spans[i]
            if (after ? offset < span.next.offset : offset <= span.next.offset)
              return span
          }
          return spans[spans.length - 1]
        }

        // Adds the pen at the point, with points at the angles where the
        // sides of the strips that end and start there touch it, so that
        // it meets them there instead of crossing them at shallow angles,
        // as the pen's ellipse drawn with points at its axes would:
        function addPen(point, pen, strips) {
          // The point on the unit circle, which the pen's matrix maps:
          function getPoint(phi) {
            return new Point(Math.cos(phi), Math.sin(phi))
          }

          if (pen.a > 0 && pen.b > 0) {
            const full = 2 * Math.PI
            const angles = []
            const ellipse = new Path({ insert: false })
            ;(strips || []).forEach(function (strip) {
              ;[strip.from.phi, strip.to.phi].forEach(function (phi) {
                angles.push((phi % full + full) % full)
              })
            })
            angles.sort(function (a, b) {
              return a - b
            })
            if (!angles.length) angles.push(0)
            angles.push(angles[0] + full)
            ellipse.moveTo(getPoint(angles[0]))
            for (let i = 1, l = angles.length; i < l; i++) {
              const phi0 = angles[i - 1]
              const sweep = angles[i] - phi0
              // Arcs of up to 90°, as Path.Ellipse has:
              const count = Math.ceil(sweep / (Math.PI / 2) - 1e-9)
              const step = sweep / count
              if (sweep > geomEpsilon) {
                for (let j = 1; j <= count; j++) {
                  ellipse.arcTo(
                    getPoint(phi0 + (j - 0.5) * step),
                    getPoint(phi0 + j * step)
                  )
                }
              }
            }
            ellipse.closePath(geomEpsilon)
            areas.push(
              ellipse.transform(
                new Matrix()
                  .translate(point)
                  .rotate(pen.angle * 180 / Math.PI)
                  .scale(pen.a, pen.b)
              )
            )
          }
        }

        // The axes of the pen's ellipse:
        function getAxes(pen) {
          const cos = Math.cos(pen.angle)
          const sin = Math.sin(pen.angle)
          return [new Point(cos, sin), new Point(-sin, cos)]
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
        function getContacts(part, t, span) {
          let sample
          let i
          let l
          let phi

          const v = part.v
          const pen = getSpanPen(span, getOffset(part, t))
          const a = pen.a
          const b = pen.b
          const da = pen.da
          const db = pen.db
          const dAngle = pen.dAngle
          const contacts = { sides: null, strips: [] }
          if (a > 0) {
            const point = Curve.getPoint(v, t)
            const tangent = Curve.getTangent(v, t)
            const normal = new Point(-tangent.y, tangent.x)
            const curvature = Curve.getCurvature(v, t)
            const axes = getAxes(pen)
            // The tangent in the pen's axes, and its changes:
            const t1 = tangent.dot(axes[0])
            const t2 = tangent.dot(axes[1])
            const dt1 = (dAngle - curvature) * t2
            const dt2 = (curvature - dAngle) * t1
            // f(φ) and its derivative by the cosine and sine of φ,
            // which the samples have already:
            const fcs = function (c, s) {
              return (
                t1 * b * c +
                t2 * a * s +
                da * b * c * c +
                a * db * s * s +
                dAngle * (a * a - b * b) * s * c
              )
            }
            const dfcs = function (c, s) {
              return (
                -t1 * b * s +
                t2 * a * c +
                2 * (a * db - da * b) * s * c +
                dAngle *
                (a * a - b * b) *
                (c * c - s * s)
              )
            }
            const f = function (phi) {
              return fcs(Math.cos(phi), Math.sin(phi))
            }
            const df = function (phi) {
              return dfcs(Math.cos(phi), Math.sin(phi))
            }
            const ddf = function (phi) {
              const c = Math.cos(phi)
              const s = Math.sin(phi)
              return (
                -t1 * b * c -
                t2 * a * s +
                2 * (a * db - da * b) * (c * c - s * s) -
                4 * dAngle * (a * a - b * b) * s * c
              )
            }
            // The root of f between the angles where it changes its
            // sign, by Newton's method from the secant's root:
            const solve = function (f, df, phi0, phi1, f0, f1) {
              const sign = f0 < 0 ? 1 : -1
              return Numerical.findRoot(
                function (phi) {
                  return sign * f(phi)
                },
                function (phi) {
                  return sign * df(phi)
                },
                (f1 * phi0 - f0 * phi1) / (f1 - f0),
                phi0,
                phi1,
                32,
                epsilon
              )
            }
            sample = penSamples[0]
            let phi0 = sample.phi
            let f0 = fcs(sample.cos, sample.sin)
            let d0 = dfcs(sample.cos, sample.sin)
            const roots = []

            // Adds the side at the root of f(φ) between the angles,
            // with the change of φ along the length that keeps it
            // there, for the derivative of its point:
            const addRoot = function (phi0, phi1, f0, f1) {
              const phi = solve(f, df, phi0, phi1, f0, f1)
              const c = Math.cos(phi)
              const s = Math.sin(phi)
              const dfs = (
                (dt1 * b + t1 * db) * c +
                (dt2 * a + t2 * da) * s +
                da * db +
                pen.dda * b * c * c +
                a * pen.ddb * s * s +
                (
                  pen.ddAngle * (a * a - b * b) +
                  2 * dAngle * (a * da - b * db)
                ) *
                s *
                c
              )
              const dfphi = df(phi)
              const dphi = dfphi ? -dfs / dfphi : 0
              const side = {
                phi: phi,
                point: point
                  .add(axes[0].multiply(a * c))
                  .add(axes[1].multiply(b * s)),
                derivative: axes[0]
                  .multiply(
                    t1 +
                    da * c -
                    (a * dphi + dAngle * b) * s
                  )
                  .add(
                    axes[1].multiply(
                      t2 +
                      db * s +
                      (b * dphi + dAngle * a) * c
                    )
                  )
              }
              side.distance = side.point.subtract(point).dot(normal)
              roots.push(side)
            }

            for (i = 1, l = penSamples.length; i < l; i++) {
              sample = penSamples[i]
              const phi1 = sample.phi
              const f1 = fcs(sample.cos, sample.sin)
              const d1 = dfcs(sample.cos, sample.sin)
              if (f0 * f1 <= 0 && f0 !== f1) {
                addRoot(phi0, phi1, f0, f1)
              } else if (d0 * d1 < 0) {
                // Two roots close together hide between the
                // samples if the extremum between them crosses:
                phi = solve(df, ddf, phi0, phi1, d0, d1)
                const f2 = f(phi)
                if (f2 * f0 < 0) {
                  addRoot(phi0, phi, f0, f2)
                  addRoot(phi, phi1, f2, f1)
                }
              }
              phi0 = phi1
              f0 = f1
              d0 = d1
            }
            const count = roots.length
            for (i = 0; i < count; i++) {
              const from = roots[i]
              const to = roots[(i + 1) % count]
              phi = (
                from.phi +
                (
                  (
                    (to.phi - from.phi + 2 * Math.PI) %
                    (2 * Math.PI)
                  ) ||
                  2 * Math.PI
                ) /
                2
              )
              if (f(phi) > 0) {
                contacts.strips.push({
                  from: from,
                  to: to,
                  distance: axes[0]
                    .multiply(a * Math.cos(phi))
                    .add(axes[1].multiply(b * Math.sin(phi)))
                    .dot(normal)
                })
              }
            }
            contacts.strips.sort(function (a, b) {
              return b.distance - a.distance
            })
            if (count > 1) {
              roots.sort(function (a, b) {
                return b.distance - a.distance
              })
              contacts.sides = [roots[0], roots[count - 1]]
            }
          }
          return contacts
        }

        function getSides(part, t, span) {
          return getContacts(part, t, span).sides
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
        function addPiece(part, span, ta, tb) {
          let i
          let t0
          let s0
          let t1
          let s1
          let l

          // As the points that touch the edge move around the pen
          // as it and the curve turn, sample them at least every 10°:
          const v = part.v
          const turn = (
            abs(
              getSpanPen(span, getOffset(part, tb)).angle -
              getSpanPen(span, getOffset(part, ta)).angle
            ) +
            getTurn(v, ta, tb)
          )
          const count = Math.max(16, Math.ceil(turn * 18 / Math.PI))
          // The times where the parts end and the next ones start:
          const splits = [[ta, ta], [tb, tb]]
          const cache = {}

          // Fitting asks for the same times for each end of a strip:
          function getStrips(t) {
            return cache[t] || (cache[t] = getContacts(part, t, span).strips)
          }

          // The point at the end of the strip at the time, or the curve's
          // point where a change between the samples took the strip away,
          // which lies within the pen too:
          function getEnd(t, j, end) {
            const strip = getStrips(t)[j]
            return strip ? strip[end].point : Curve.getPoint(v, t)
          }

          // The motions of the strip's ends across the line between them:
          function getMotions(strip) {
            const vector = strip.to.point.subtract(strip.from.point)
            const normal = new Point(-vector.y, vector.x)
            return [
              strip.from.derivative.dot(normal),
              strip.to.derivative.dot(normal)
            ]
          }

          // Whether the fitted side moves away from where it starts by
          // more than the tolerance, with the handles that bound it:
          function isMoving(side) {
            const point = side[0]._point
            return side.some(function (segment) {
              const other = segment._point
              return (
                other.getDistance(point) > tolerance || (
                  other.add(segment._handleIn).getDistance(point) >
                  tolerance
                ) || (
                  other.add(segment._handleOut).getDistance(point) >
                  tolerance
                )
              )
            })
          }

          // Whether the strips are the same ones as before, in the same
          // order, by the angles on the pen where they start:
          function isSame(strips, before) {
            if (strips.length !== before.length) return false
            for (let i = 0, l = strips.length; i < l; i++) {
              const phi = strips[i].from.phi
              for (let j = 0; j < l; j++) {
                if (
                  j !== i && (
                    getAngle(phi, before[j].from.phi) <
                    getAngle(phi, before[i].from.phi)
                  )
                )
                  return false
              }
            }
            return true
          }

          function getAngle(phi1, phi2) {
            const angle = Math.abs(phi1 - phi2) % (2 * Math.PI)
            return Math.min(angle, 2 * Math.PI - angle)
          }

          // Whether the ends of the same strips moved less than 20° on
          // the pen, as they jump where pairs of them appear and vanish
          // again between the samples:
          function isClose(strips, before) {
            return strips.every(function (strip, i) {
              const other = before[i]
              return (
                getAngle(strip.from.phi, other.from.phi) < 0.35 &&
                getAngle(strip.to.phi, other.to.phi) < 0.35
              )
            })
          }

          // Sample the strips evenly, and where the curve's curvature
          // peaks or changes sign, as the strips fold over around there:
          const samples = []
          for (i = 0; i < count; i++) samples.push(ta + (tb - ta) * i / count)
          // Exactly at the end, as rounding could take it beyond:
          samples.push(tb)
          getCurvatureExtrema(v)
            .concat(getInflections(v))
            .forEach(
              function (t) {
                if (t > ta && t < tb) samples.push(t)
              }
            )
          samples.sort(function (a, b) {
            return a - b
          })
          for (i = 1, t0 = ta, s0 = getStrips(ta); i < samples.length; i++) {
            t1 = samples[i]
            s1 = getStrips(t1)
            if (
              isSame(s1, s0) &&
              !isClose(s1, s0) &&
              t1 - t0 > /*#=*/ Numerical.CURVETIME_EPSILON
            ) {
              // Sample halfway before going on:
              samples.splice(i--, 0, (t0 + t1) / 2)
              continue
            }
            // There may be more than one change between the samples:
            while (!isSame(s1, s0)) {
              let t = t0
              let u = t1
              for (let j = 0; j < 40; j++) {
                const middle = (t + u) / 2
                if (isSame(getStrips(middle), s0)) {
                  t = middle
                } else {
                  u = middle
                }
              }
              splits.push([t, u])
              addPen(
                Curve.getPoint(v, t),
                getSpanPen(span, getOffset(part, t)),
                getStrips(t).concat(getStrips(u))
              )
              t0 = u
              s0 = getStrips(u)
            }
            s0.forEach(function (strip, j) {
              let k

              const m0 = getMotions(strip)
              const m1 = getMotions(s1[j])
              for (k = 0; k < 2; k++) {
                if (m0[k] * m1[k] < 0) {
                  const t = Numerical.findSignChange(
                    function (t) {
                      const strip = getStrips(t)[j]
                      return strip ? getMotions(strip)[k] : 0
                    }, t0, t1, m0[k], m1[k], 1e-9
                  )
                  splits.push([t, t])
                }
              }
            })
            t0 = t1
            s0 = s1
          }
          splits.sort(function (a, b) {
            return a[0] - b[0]
          })
          for (i = 1, l = splits.length; i < l; i++) {
            t0 = splits[i - 1][1]
            t1 = splits[i][0]
            const strips =
              t1 - t0 > geomEpsilon
                ? getStrips((t0 + t1) / 2)
                : []
            strips.forEach(function (strip, j) {
              const motions = getMotions(strip)
              const from = fitSide(
                function (t) {
                  return getEnd(t, j, 'from')
                },
                t0,
                t1
              )
              const to = fitSide(
                function (t) {
                  return getEnd(t, j, 'to')
                },
                t0,
                t1
              )
              // Strips whose ends stand still sweep nothing, and the
              // points that stand still across them are only noise:
              if (
                motions[0] * motions[1] < 0 &&
                (isMoving(from) || isMoving(to))
              ) {
                const still = fitSide(
                  function (t) {
                    const strip = getStrips(t)[j]
                    if (!strip) return Curve.getPoint(v, t)
                    const motions = getMotions(strip)
                    const point = strip.from.point
                    // Within the strip, also where its motions
                    // vary more than the samples tell:
                    const factor = clamp(
                      motions[0] /
                      (motions[0] - motions[1]),
                      0,
                      1
                    )
                    return point.add(
                      strip.to.point.subtract(point).multiply(factor)
                    )
                  },
                  t0,
                  t1
                )
                addSides(from, still, true)
                addSides(to, still, true)
              } else {
                addSides(from, to, true)
              }
            })
          }
        }

        // Adds the part of a curve, split at the spans that it crosses:
        function addPart(part) {
          const start = part.offset
          const end = start + part.length
          // Measured once, for getOffset() and getTime():
          part.curveLength = Curve.getLength(part.v)
          for (let i = 0, l = spans.length; i < l; i++) {
            const span = spans[i]
            const from = Math.max(span.entry.offset, start)
            const to = Math.min(span.next.offset, end)
            const ta = getTime(part, from)
            const tb = getTime(part, to)
            if (to > from && tb > ta) addPiece(part, span, ta, tb)
          }
        }

        // Fits cubics to the points that the function returns from t0 to
        // t1, with the directions at their ends, by least squares, and
        // subdivided while they are off by more than the tolerance:
        function fitSide(evaluate, t0, t1) {
          const count = 8
          const segments = [new Segment(evaluate(t0))]

          function fit(t0, t1, p0, p3, depth) {
            let i
            let prev
            let point

            const delta = (t1 - t0) * 1e-5
            const chord = p3.subtract(p0)
            let tangent0 = evaluate(t0 + delta).subtract(p0)
            let tangent3 = p3.subtract(evaluate(t1 - delta))
            const points = []
            const times = []
            let total = 0
            let gap = 0
            let index
            tangent0 = (tangent0.isZero() ? chord : tangent0)
              .normalize()
            tangent3 = (tangent3.isZero() ? chord : tangent3)
              .normalize()
            for (i = 0, prev = p0; i <= count; i++) {
              point =
                i < count
                  ? evaluate(
                      t0 + (
                        (t1 - t0) *
                        (i + 1) /
                        (count + 1)
                      )
                    )
                  : p3
              const distance = point.getDistance(prev)
              total += distance
              if (distance > gap) {
                gap = distance
                index = i
              }
              if (i < count) {
                points.push(point)
                times.push(total)
              }
              prev = point
            }
            // The points lie at the times on the cubic by their
            // distances along the chords at first, refined to their
            // nearest times on it while it is off (Schneider):
            for (i = 0; i < count; i++) times[i] = total ? times[i] / total : 0
            const length = chord.getLength()
            let handle1
            let handle2
            let c
            let error
            for (let iteration = 0; iteration < 4; iteration++) {
              // The handles' lengths with the least squares error
              // at the points:
              let c11 = 0
              let c12 = 0
              let c22 = 0
              let x1 = 0
              let x2 = 0
              for (i = 0; i < count; i++) {
                const u = times[i]
                const w = 1 - u
                const a1 = tangent0.multiply(3 * w * w * u)
                const a2 = tangent3.multiply(-3 * w * u * u)
                const rest = points[i]
                  .subtract(p0.multiply(w * w * (w + 3 * u)))
                  .subtract(p3.multiply(u * u * (u + 3 * w)))
                c11 += a1.dot(a1)
                c12 += a1.dot(a2)
                c22 += a2.dot(a2)
                x1 += a1.dot(rest)
                x2 += a2.dot(rest)
              }
              const det = c11 * c22 - c12 * c12
              let alpha = det ? (x1 * c22 - x2 * c12) / det : 0
              let beta = det ? (c11 * x2 - c12 * x1) / det : 0
              if (!(
                alpha > epsilon &&
                beta > epsilon &&
                alpha < 2 * total &&
                beta < 2 * total
              )) {
                alpha = beta = length / 3
              }
              handle1 = tangent0.multiply(alpha)
              handle2 = tangent3.multiply(-beta)
              c = [
                p0.x,
                p0.y,
                p0.x + handle1.x,
                p0.y + handle1.y,
                p3.x + handle2.x,
                p3.y + handle2.y,
                p3.x,
                p3.y
              ]
              error = 0
              for (i = 0; i < count; i++) {
                const time = Curve.getNearestTime(c, points[i])
                error = Math.max(
                  error,
                  points[i].getDistance(
                    Curve.getPoint(c, time)
                  )
                )
                times[i] = time
              }
              if (error <= tolerance) break
            }
            // Measure the error halfway between the points too, where
            // the cubic may bulge away from the side:
            for (i = 0; i <= count; i++) {
              point = evaluate(
                t0 + (
                  (t1 - t0) *
                  (i + 0.5) /
                  (count + 1)
                )
              )
              error = Math.max(
                error,
                point.getDistance(
                  Curve.getPoint(c, Curve.getNearestTime(c, point))
                )
              )
            }
            // Where the points pass most of the way between two of
            // them, the side moves faster than they tell, and the
            // cubic may swing away from the line between them:
            if (gap > Math.max(total / 2, tolerance)) {
              const from = index ? points[index - 1] : p0
              const to = index < count ? points[index] : p3
              point = Curve.getPoint(
                c,
                (
                  (
                    index
                      ? times[index - 1]
                      : 0
                  ) +
                  (index < count ? times[index] : 1)
                ) /
                2
              )
              error = Math.max(
                error,
                Line.getDistance(
                  from.x, from.y, to.x, to.y, point.x, point.y
                )
              )
            }
            if (error > tolerance && depth < 12) {
              const t = (t0 + t1) / 2
              point = evaluate(t)
              fit(t0, t, p0, point, depth + 1)
              fit(t, t1, point, p3, depth + 1)
            } else {
              segments[segments.length - 1].setHandleOut(handle1)
              segments.push(new Segment(p3, handle2))
            }
          }

          fit(t0, t1, segments[0]._point, evaluate(t1), 0)
          return segments
        }

        // Adds the join at the point between the curves at their ends, on
        // the outer side of their turn, unless they continue each other.
        // Round joins are the pen, the others connect its sides there:
        function addJoin(end1, end2) {
          const point = end2.point
          const part1 = end1.last
          const part2 = end2.first
          const offset = part2.offset
          const tangent1 = end1.end
          const tangent2 = end2.start
          const cross = tangent1.cross(tangent2)
          const span = getSpan(offset, true)
          const pen = getSpanPen(span, offset)
          // Where the curves continue each other, their parts meet in
          // the same points, and need no join:
          if (!Numerical.isZero(cross) || tangent1.dot(tangent2) < 0) {
            if (join === 'round') {
              addPen(
                point,
                pen,
                getContacts(part1, 1, getSpan(offset, false)).strips.concat(
                  getContacts(part2, 0, span).strips
                )
              )
            } else {
              const span1 = getSpan(offset, false)
              // The side against the turn, see getSides():
              const k = cross > 0 ? 1 : 0
              const sides1 = getSides(part1, 1, span1)
              const sides2 = getSides(part2, 0, span)
              if (sides1 && sides2) {
                // Widen the join into the parts on both sides, as
                // in addJoin() above, by turning the sides' points
                // around their pens, back along the first side and
                // ahead along the second:
                const widening = Math.sqrt(tolerance / radius)
                const widen = function (side, pen, direction) {
                  const axes = getAxes(pen)
                  const c = Math.cos(side.phi)
                  const s = Math.sin(side.phi)
                  const along = axes[0]
                    .multiply(-pen.a * s)
                    .add(axes[1].multiply(pen.b * c))
                    .dot(side.derivative)
                  const phi = (
                    side.phi + (
                      widening *
                      (along > 0 ? direction : -direction)
                    )
                  )
                  return side.point
                    .add(
                      axes[0].multiply(
                        pen.a * (Math.cos(phi) - c)
                      )
                    )
                    .add(
                      axes[1].multiply(
                        pen.b * (Math.sin(phi) - s)
                      )
                    )
                }
                const side1 = sides1[k].point
                const side2 = sides2[k].point
                const direction1 = sides1[k].derivative.normalize()
                const direction2 = sides2[k].derivative.normalize()
                // From the inner sides, as the ends of the
                // parts only run through the point where the
                // pen doesn't change. All lie on the pen:
                const points = [
                  sides1[1 - k].point,
                  widen(
                    sides1[k],
                    getSpanPen(span1, part1.offset + part1.length),
                    -1
                  ),
                  side1
                ]
                if (join === 'miter') {
                  const miter = Line.intersect(
                    side1.x, side1.y,
                    direction1.x, direction1.y,
                    side2.x, side2.y,
                    direction2.x, direction2.y,
                    true, true
                  )
                  if (
                    miter && (
                      miter.getDistance(point) <=
                      miterLimit * pen.a
                    )
                  )
                    points.push(miter)
                }
                addPolygon(
                  points.concat(
                    side2,
                    widen(sides2[k], pen, 1),
                    sides2[1 - k].point
                  )
                )
              }
            }
          }
        }

        // Adds the cap at the end of the part at the time, in the
        // direction of the tangent. Round caps are the pen, square ones
        // extend its sides as far as it reaches ahead:
        function addCap(part, t, tangent) {
          const offset = part.offset + (t ? part.length : 0)
          const span = getSpan(offset, !t)
          const pen = getSpanPen(span, offset)
          if (cap === 'round') {
            addPen(
              Curve.getPoint(part.v, t),
              pen,
              getContacts(part, t, span).strips
            )
          } else if (cap === 'square') {
            const sides = getSides(part, t, span)
            if (sides) {
              const axes = getAxes(pen)
              const reach = new Point(
                pen.a * tangent.dot(axes[0]),
                pen.b * tangent.dot(axes[1])
              ).getLength()
              const ahead = tangent.multiply(reach)
              const side0 = sides[0].point
              const side1 = sides[1].point
              addPolygon([side0, side0.add(ahead), side1.add(ahead), side1])
            }
          }
        }

        if (!length) {
          // A dot, as the pen or the square around it, as caps only
          // apply to open paths:
          const segments = path._segments
          if (segments.length && !closed && cap !== 'butt') {
            const center = segments[0]._point
            pen = getPen(0, true)
            const axes = getAxes(pen)
            if (cap === 'round') {
              addPen(center, pen)
            } else {
              const x = axes[0].multiply(pen.a)
              const y = axes[1].multiply(pen.b)
              addPolygon([
                center.subtract(x).subtract(y),
                center.add(x).subtract(y),
                center.add(x).add(y),
                center.subtract(x).add(y)
              ])
            }
          }
        } else {
          for (i = 1, l = pens.length; i < l; i++) {
            if (pens[i].offset > pens[i - 1].offset)
              spans.push({ entry: pens[i - 1], next: pens[i] })
          }
          for (i = 0, offset = 0, l = curves.length; i < l; i++) {
            const curve = curves[i]
            const curveLength = curve.getLength()
            if (curve.hasLength(geomEpsilon)) {
              const v = regularize(curve.getValues(), tolerance / 4)
              const reversals = Curve.getReversals(v, tolerance)
              const parts = []
              if (reversals.length) {
                // A curve along a line that reverses along it:
                // straight parts between the reversals, as in
                // addPath(), where the pen turns as it is:
                const points = [new Point(v[0], v[1])]
                for (j = 0, m = reversals.length; j < m; j++)
                  points.push(Curve.getPoint(v, reversals[j]))
                points.push(new Point(v[6], v[7]))
                for (j = 1, start = offset, m = points.length; j < m; j++) {
                  const p1 = points[j - 1]
                  const p2 = points[j]
                  const third = p2.subtract(p1).divide(3)
                  const distance = p1.getDistance(p2)
                  parts.push({
                    v: [
                      p1.x,
                      p1.y,
                      p1.x + third.x,
                      p1.y + third.y,
                      p2.x - third.x,
                      p2.y - third.y,
                      p2.x,
                      p2.y
                    ],
                    offset: start,
                    length: distance
                  })
                  start += distance
                }
              } else {
                parts.push({
                  v: regularizeCusp(v, tolerance / 4),
                  offset: offset,
                  length: curveLength
                })
              }
              parts.forEach(addPart)
              // The straight parts reverse where they meet, and the
              // pen turns around there:
              for (j = 1, m = parts.length; j < m; j++) {
                part = parts[j]
                start = part.offset
                const span = getSpan(start)
                addPen(
                  new Point(part.v[0], part.v[1]),
                  getSpanPen(span, start),
                  getContacts(parts[j - 1], 1, span)
                    .strips.concat(getContacts(part, 0, span).strips)
                )
              }
              allParts.push.apply(allParts, parts)
              first = parts[0]
              last = parts[parts.length - 1]
              ends.push({
                point: curve._segment1._point,
                first: first,
                last: last,
                start: Curve.getTangent(first.v, 0),
                end: Curve.getTangent(last.v, 1)
              })
            }
            offset += curveLength
          }
          // The pens where the spans meet and the pen changes abruptly,
          // as the sides jump there, except at steps, which end the parts
          // straight across, as butt caps do. Where the pen changes
          // smoothly, the parts meet in the same points:
          for (i = 0, l = pens.length; i < l; i++) {
            offset = pens[i].offset
            const isStep = (
              i > 0 && pens[i - 1].offset === offset ||
              i < l - 1 && pens[i + 1].offset === offset
            )
            if (
              !isStep &&
              (closed ? offset < length : offset > 0 && offset < length)
            ) {
              pen = getPen(offset, true)
              const before = getPen(offset, false)
              // About how far the sides jump, by the pen's size.
              // Where values change in straight lines through
              // the stop, the rates on both sides only differ by
              // rounding:
              const size = Math.max(pen.a, pen.b)
              const jump = (
                size * (
                  Math.abs(pen.da - before.da) +
                  Math.abs(pen.db - before.db) +
                  size * Math.abs(pen.dAngle - before.dAngle)
                )
              )
              if (jump > geomEpsilon) {
                // The part that the stop lies on, and the one
                // before it where the stop starts it:
                j = 0
                while (allParts[j].offset + allParts[j].length <= offset) j++
                part = allParts[j]
                const t = getTime(part, offset)
                const previous = t
                  ? part
                  : allParts[j - 1] ||
                    allParts[allParts.length - 1]
                addPen(
                  Curve.getPoint(part.v, t),
                  pen,
                  getContacts(
                    previous,
                    t || 1,
                    getSpan(offset, false)
                  ).strips.concat(
                    getContacts(part, t, getSpan(offset, true)).strips
                  )
                )
              }
            }
          }
          for (i = 1, l = ends.length; i <= l; i++) {
            if (i < l || closed) addJoin(ends[i - 1], ends[i % l])
          }
          if (!closed && ends.length) {
            first = ends[0]
            last = ends[ends.length - 1]
            addCap(first.first, 0, first.start.negate())
            addCap(last.last, 1, last.end)
          }
        }
      }

      for (let i = 0, l = paths.length; i < l; i++) {
        const path = paths[i]
        if (path._strokeProfile) {
          addProfilePath(path)
        } else {
          addPath(path)
        }
      }
      return areas.length
        ? areas.length > 1
          ? areas[0].unite(areas.slice(1))
          : areas[0]
        : new Path({ insert: false })
    }

    // The offset of an open path, as the curves of the outline of its stroke
    // with butt caps on the side of the offset, without the caps:
    function offsetSide(path, offset, join, miterLimit) {
      let j

      const radius = abs(offset)
      const outline = outlineStroke([path], radius, join, 'butt', miterLimit)
      const first = path.getFirstSegment()
      const last = path.getLastSegment()
      const caps = [
        [first._point, path.getFirstCurve().getNormalAtTime(0)],
        [last._point, path.getLastCurve().getNormalAtTime(1)]
      ]
      const tolerance = radius / 1e4
      const paths = []

      // The caps are the straight curves along the normals at the ends:
      function isCap(curve) {
        if (!curve.hasHandles()) {
          for (let i = 0; i < 2; i++) {
            const point = caps[i][0]
            const normal = caps[i][1]
            const vector1 = curve._segment1._point.subtract(point)
            const vector2 = curve._segment2._point.subtract(point)
            if (
              abs(vector1.cross(normal)) < tolerance &&
              abs(vector2.cross(normal)) < tolerance
            )
              return true
          }
        }
        return false
      }

      function isOnSide(curve) {
        const point = curve.getPointAtTime(0.5)
        const location = path.getNearestLocation(point)
        return (
          !isCap(curve) && (
            (
              point.subtract(location.getPoint()).dot(location.getNormal()) *
              offset
            ) >
            0
          )
        )
      }

      function addRun(curves) {
        const segments = [
          new Segment(
            curves[0]._segment1._point,
            null,
            curves[0]._segment1._handleOut
          )
        ]
        for (let i = 0, l = curves.length; i < l; i++) {
          const segment = curves[i]._segment2
          segments.push(
            new Segment(
              segment._point,
              segment._handleIn,
              i < l - 1 ? segment._handleOut : null
            )
          )
        }
        const run = new Path({ segments: segments, insert: false })
        // Run along the path:
        if (
          path.getNearestLocation(run.getFirstSegment()._point).getOffset() >
          path.getNearestLocation(
            run.getLastSegment()._point
          ).getOffset()
        )
          run.reverse()
        paths.push(run)
      }

      const contours = outline._children || [outline]
      for (let i = 0, l = contours.length; i < l; i++) {
        const curves = contours[i].getCurves()
        const count = curves.length
        const keeps = []
        let start = -1
        for (j = 0; j < count; j++) {
          keeps.push(isOnSide(curves[j]))
          if (!keeps[j]) start = j
        }
        if (count && start === -1) {
          // The whole contour lies on the side:
          paths.push(contours[i].clone({ insert: false }))
        } else {
          // Collect the runs of curves on the side, starting after one
          // that isn't, so that none wraps around the contour's end:
          let run = []
          for (j = 1; j <= count; j++) {
            const index = (start + j) % count
            if (keeps[index]) {
              run.push(curves[index])
            } else if (run.length) {
              addRun(run)
              run = []
            }
          }
        }
      }
      return paths
    }

    // Returns the angle in radians by which the tangent of the curve with the
    // values v turns from t1 to t2, in total across its inflections:
    function getTurn(v, t1, t2) {
      const times = [t1].concat(
        getInflections(v).filter(function (t) {
          return t > t1 && t < t2
        }),
        t2
      )
      let turn = 0
      for (let i = 1, l = times.length; i < l; i++) {
        turn += abs(
          Curve.getTangent(v, times[i - 1]).getDirectedAngle(
            Curve.getTangent(v, times[i])
          )
        )
      }
      return turn * Math.PI / 180
    }

    // Returns the times where the offsets on either side of the curve have a
    // cusp, where its radius of curvature equals the radius. Between the
    // extrema and the inflections of the curvature, its magnitude changes
    // monotonically, so each of these intervals holds at most one:
    function getCuspTimes(v, radius) {
      const times = getCurvatureExtrema(v)
        .concat(getInflections(v), 0, 1)
        .sort(function (a, b) {
          return a - b
        })
      const cusps = []

      function f(t) {
        const curvature = Curve.getCurvature(v, t) * radius
        return 1 - curvature * curvature
      }

      for (let i = 1, l = times.length; i < l; i++) {
        const t0 = times[i - 1]
        const t1 = times[i]
        const f0 = f(t0)
        const f1 = f(t1)
        if (f0 * f1 < 0)
          cusps.push(Numerical.findSignChange(f, t0, t1, f0, f1, epsilon))
      }
      return cusps
    }

    // Returns the center of curvature of the curve with the values v at t, its
    // derivative, and the numerator of its speed, which is zero where the
    // curvature has its extrema. With the derivatives d1, d2, d3 of the curve,
    // the center lies at p + perp(d1) * |d1|² / (d1 × d2), and moves along
    // perp(d1):
    function getEvoluteAt(v, t) {
      const x0 = v[0]
      const y0 = v[1]
      const cx = 3 * (v[2] - x0)
      const cy = 3 * (v[3] - y0)
      const bx = 3 * (v[4] - v[2]) - cx
      const by = 3 * (v[5] - v[3]) - cy
      const ax = v[6] - x0 - cx - bx
      const ay = v[7] - y0 - cy - by
      const dx = (3 * ax * t + 2 * bx) * t + cx
      const dy = (3 * ay * t + 2 * by) * t + cy
      const ddx = 6 * ax * t + 2 * bx
      const ddy = 6 * ay * t + 2 * by
      const cross = dx * ddy - dy * ddx
      const length2 = dx * dx + dy * dy
      const speed = (
        3 * (dx * ddx + dy * ddy) * cross -
        length2 * (dx * 6 * ay - dy * 6 * ax)
      )
      const perp = new Point(-dy, dx)
      return {
        point: Curve.getPoint(v, t).add(perp.multiply(length2 / cross)),
        derivative: perp.multiply(speed / (cross * cross)),
        speed: speed,
        // The signed radius of curvature, along perp(d1):
        radius: length2 * Math.sqrt(length2) / cross
      }
    }

    // Returns the times where the curvature of the curve has its extrema:
    function getCurvatureExtrema(v) {
      const count = 32
      const times = []

      function f(t) {
        return getEvoluteAt(v, t).speed
      }

      for (let i = 1, f0 = f(0); i <= count; i++) {
        const t0 = (i - 1) / count
        const t1 = i / count
        const f1 = f(t1)
        if (f0 * f1 < 0) {
          times.push(Numerical.findSignChange(f, t0, t1, f0, f1, epsilon))
        }
        f0 = f1
      }
      return times
    }

    // Returns the segments of the evolute of the curve with the values v, the
    // curve of its centers of curvature, fitted with cubic Hermite curves
    // between its cusps. Where the centers lie beyond the inner offset, or on
    // the other side, the inner side doesn't sweep backwards, and the evolute
    // follows the inner offset instead:
    function getEvolute(v, inner, tolerance) {
      const c = regularizeCusp(v, tolerance / 4)
      const times = getCurvatureExtrema(c).concat(1)
      let t0 = 0
      let e0 = evaluate(0)
      const segments = [new Segment(e0.point)]

      function evaluate(t) {
        let e = getEvoluteAt(c, t)
        // Paper.js's normals point against perp(d1):
        const distance = inner > 0 ? -e.radius : e.radius
        // Also where the radius is undefined, at zero derivatives, and
        // where it lies within the tolerance of the inner offset, so that
        // both meet exactly at the ends of the tight parts:
        if (!(distance >= 0 && distance < abs(inner) - tolerance)) {
          const derivative = Curve.getWeightedTangent(c, t)
          e = {
            point: Curve.getPoint(c, t).add(
              Curve.getNormal(c, t).multiply(inner)
            ),
            derivative: derivative.multiply(
              1 + inner * Curve.getCurvature(c, t)
            )
          }
        }
        return e
      }

      function fit(t0, e0, t1, e1, depth) {
        const tm = (t0 + t1) / 2
        const em = evaluate(tm)
        const h0 = e0.derivative.multiply((t1 - t0) / 3)
        const h1 = e1.derivative.multiply((t0 - t1) / 3)
        const mid = e0.point
          .add(e1.point)
          .multiply(0.5)
          .add(h0.add(h1).multiply(3 / 8))
        if (depth < 8 && mid.getDistance(em.point) > tolerance / 10) {
          fit(t0, e0, tm, em, depth + 1)
          fit(tm, em, t1, e1, depth + 1)
        } else {
          segments[segments.length - 1].setHandleOut(h0)
          segments.push(new Segment(e1.point, h1))
        }
      }

      for (let i = 0, l = times.length; i < l; i++) {
        const e1 = evaluate(times[i])
        fit(t0, e0, times[i], e1, 0)
        t0 = times[i]
        e0 = e1
      }
      return segments
    }

    // Returns the segments of the offset of the curve with the values v:
    function getOffsetSegments(v, offset, tolerance) {
      if (Curve.isStraight(v)) {
        // Along the normals at the ends, as the joins and caps use them:
        return [
          new Segment(
            new Point(v[0], v[1]).add(
              Curve.getNormal(v, 0).multiply(offset)
            )
          ),
          new Segment(
            new Point(v[6], v[7]).add(
              Curve.getNormal(v, 1).multiply(offset)
            )
          )
        ]
      } else {
        // Paper.js's normals point the other way than those of the method
        // below, see getUnitNormal():
        return offsetCubic(v, -offset, tolerance)
      }
    }

    // The offset of a cubic Bézier curve after kurbo's offset_cubic(), by Raph
    // Levien and the Linebender contributors (Apache-2.0 OR MIT):
    // https://github.com/linebender/kurbo/blob/main/kurbo/src/offset.rs
    // Each part is drawn as an arc, refined by least squares, and subdivided
    // while its error exceeds the tolerance, first at the cusps of the offset.
    function offsetCubic(v, d, tolerance) {
      const c = regularizeCusp(v, tolerance / 4)
      const p0 = new Point(c[0], c[1])
      const p1 = new Point(c[2], c[3])
      const p2 = new Point(c[4], c[5])
      const p3 = new Point(c[6], c[7])
      // The control points of the derivative:
      const q0 = p1.subtract(p0).multiply(3)
      const q1 = p2.subtract(p1).multiply(3)
      const q2 = p3.subtract(p2).multiply(3)
      // The cross product of the second and first derivatives, times the
      // offset, as the polynomial c0 + c1 * t + c2 * t^2:
      const q1xq0 = q1.cross(q0)
      const q2xq0 = q2.cross(q0)
      const q2xq1 = q2.cross(q1)
      const c0 = 2 * d * q1xq0
      const c1 = 2 * d * (q2xq0 - 2 * q1xq0)
      const c2 = 2 * d * (q2xq1 - q2xq0 + q1xq0)
      const utan0 = Curve.getTangent(c, 0)
      const utan1 = Curve.getTangent(c, 1)
      const segments = [new Segment(p0.add(getUnitNormal(utan0, d)))]
      // The Bézier weights of the points of the least squares fit:
      const count = 8
      const weights = []
      for (let i = 0; i < count; i++) {
        const t = (i + 1) / (count + 1)
        weights.push(3 * (1 - t) * (1 - t) * t)
      }

      function getUnitNormal(utan, length) {
        return new Point(-utan.y, utan.x).multiply(length)
      }

      function evaluate(t) {
        return Curve.getPoint(c, t)
      }

      function derive(t) {
        const u = 1 - t
        const w0 = u * u
        const w1 = 2 * t * u
        const w2 = t * t
        return new Point(
          w0 * q0.x + w1 * q1.x + w2 * q2.x,
          w0 * q0.y + w1 * q1.y + w2 * q2.y
        )
      }

      // The curvature times the offset plus one, which is zero where the
      // offset has a cusp:
      function getCusp(t) {
        const ds2 = derive(t).dot(derive(t))
        return ((c2 * t + c1) * t + c0) / (ds2 * Math.sqrt(ds2)) + 1
      }

      function getEndCusp(tangent, y) {
        const length = Math.max(tangent.getLength(), epsilon)
        return y / (length * length * length) + 1
      }

      // The offset curve of the part from t0 to t1, with the handles of the
      // offset drawn as an arc that a and b adjust:
      function getOffsetCurve(part, a, b) {
        const s = (part.t1 - part.t0) / 3
        const start = evaluate(part.t0).add(getUnitNormal(part.utan0, d))
        const end = evaluate(part.t1).add(getUnitNormal(part.utan1, d))
        const l0 = s * derive(part.t0).getLength() + a * d
        const l1 = s * derive(part.t1).getLength() - b * d
        return [
          start,
          l0 * part.cusp0 > 0
            ? start.add(part.utan0.multiply(l0))
            : start,
          l1 * part.cusp1 > 0
            ? end.subtract(part.utan1.multiply(l1))
            : end,
          end
        ]
      }

      // The error of the offset curve, at the points on it whose normals meet
      // the curve at the times in ts, which a Newton step refines. It is
      // called a lot, so we calculate with coordinates, not points:
      function getError(part, points, ts) {
        let error = 0
        const normals = []
        const vectors = []
        const x0 = points[0].x
        const y0 = points[0].y
        const x1 = points[1].x
        const y1 = points[1].y
        const x2 = points[2].x
        const y2 = points[2].y
        const x3 = points[3].x
        const y3 = points[3].y
        const sign = part.cusp0 < 0 ? -1 : 1
        for (let i = 0; i < count; i++) {
          const ta = (i + 1) / (count + 1)
          const u = 1 - ta
          const w0 = u * u * u
          const w1 = 3 * u * u * ta
          const w2 = 3 * u * ta * ta
          const w3 = ta * ta * ta
          const px = w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3
          const py = w0 * y0 + w1 * y1 + w2 * y2 + w3 * y3
          const tx = (
            (x1 - x0) * u * u +
            (x2 - x1) * 2 * u * ta +
            (x3 - x2) * ta * ta
          )
          const ty = (
            (y1 - y0) * u * u +
            (y2 - y1) * 2 * u * ta +
            (y3 - y2) * ta * ta
          )
          let t = ts[i]
          let point = evaluate(t)
          const derivative = derive(t)
          t += (
            (tx * (px - point.x) + ty * (py - point.y)) /
            (tx * derivative.x + ty * derivative.y)
          )
          t = ts[i] = clamp(t, part.t0, part.t1)
          point = evaluate(t)
          const length = Math.sqrt(tx * tx + ty * ty)
          const nx = -ty / length * sign
          const ny = tx / length * sign
          const vx = px - point.x - nx * d
          const vy = py - point.y - ny * d
          const squared = vx * vx + vy * vy
          normals.push(new Point(nx, ny))
          vectors.push(new Point(vx, vy))
          // Reject refinements that produce invalid values:
          error = Math.max(error, isFinite(squared) ? squared : 1e12)
        }
        return { squared: error, normals: normals, vectors: vectors }
      }

      // Adjusts a and b to minimize the least squares error, mostly normal to
      // the offset, with a little of the error along it blended in:
      function refine(part, a, b, error) {
        const blend = 1e-3
        let aa = 0
        let ab = 0
        let ac = 0
        let bb = 0
        let bc = 0
        for (let i = 0; i < count; i++) {
          const n = error.normals[i]
          const vector = error.vectors[i]
          const cn = vector.dot(n)
          const ct = vector.cross(n)
          const an = weights[i] * part.utan0.dot(n)
          const at = weights[i] * part.utan0.cross(n)
          const bn = weights[count - 1 - i] * part.utan1.dot(n)
          const bt = weights[count - 1 - i] * part.utan1.cross(n)
          aa += an * an + blend * at * at
          ab += an * bn + blend * at * bt
          ac += an * cn + blend * at * ct
          bb += bn * bn + blend * bt * bt
          bc += bn * cn + blend * bt * ct
        }
        const idet = 1 / (d * (aa * bb - ab * ab))
        return [
          a - idet * (ac * bb - ab * bc),
          b - idet * (aa * bc - ac * ab)
        ]
      }

      // Finds the time in t0..t1 where the tangent points along `tangent`,
      // with `force` returning the end with the smaller derivative if there
      // isn't exactly one:
      function getTimeWithTangent(utan0, t0, t1, tangent, force) {
        const z0 = tangent.cross(q0)
        const z1 = tangent.cross(q1)
        const z2 = tangent.cross(q2)
        const roots = []
        const found = Numerical.solveQuadratic(
          z2 - 2 * z1 + z0,
          2 * (z1 - z0),
          z0,
          roots,
          t0,
          t1
        )
        let t = roots[0]
        if (found !== 1) {
          if (!force) return null
          t = derive(t0).getLength() > derive(t1).getLength() ? t1 : t0
        }
        const q = derive(t)
        return {
          t: t,
          utan:
            found === 1 && q.dot(q) >= epsilon
              ? q.normalize()
              : tangent.dot(tangent) >= epsilon
                ? tangent.normalize()
                : // A U-turn: pick a direction.
                  getUnitNormal(utan0, 1)
        }
      }

      // Where to subdivide: in the middle if its tangent is balanced between
      // the ends', otherwise at the tangent that bisects them, or with an
      // inflection, at half of the total turning:
      function getSubdivision(part) {
        let i

        const t = (part.t0 + part.t1) / 2
        const q = derive(t)
        const x0 = abs(part.utan0.cross(q))
        const x1 = abs(part.utan1.cross(q))
        if (x0 > 0.1 * x1 && x1 > 0.1 * x0) return { t: t, utan: q.normalize() }
        const chord = evaluate(part.t1).subtract(evaluate(part.t0))
        if (chord.cross(part.utan0) * chord.cross(part.utan1) < 0) {
          const split = getTimeWithTangent(
            part.utan0,
            part.t0,
            part.t1,
            part.utan0.add(part.utan1),
            false
          )
          if (split) return split
        }
        const tangents = [part.utan0]
        const ts = [part.t0]
        const inflections = getInflections(c)
        for (i = 0; i < inflections.length; i++) {
          const ti = inflections[i]
          if (ti > part.t0 && ti < part.t1) {
            tangents.push(derive(ti))
            ts.push(ti)
          }
        }
        tangents.push(part.utan1)
        ts.push(part.t1)
        const angles = []
        let sum = 0
        for (i = 0; i < tangents.length - 1; i++) {
          const angle = Math.atan2(
            tangents[i].cross(tangents[i + 1]),
            tangents[i].dot(tangents[i + 1])
          )
          sum += abs(angle)
          angles.push(angle)
        }
        let target = sum / 2
        let j = 0
        while (abs(angles[j]) < target) {
          target -= abs(angles[j])
          j++
        }
        const base = tangents[j]
        const turn = angles[j] < 0 ? -target : target
        const tangent = base.rotate(turn * 180 / Math.PI)
        return getTimeWithTangent(
          j ? base.normalize() : part.utan0,
          ts[j],
          ts[j + 1],
          tangent,
          true
        )
      }

      function subdivide(part, t, utan, cuspMinus, cuspPlus) {
        offsetPart({
          t0: part.t0,
          t1: t,
          utan0: part.utan0,
          utan1: utan,
          cusp0: part.cusp0,
          cusp1: cuspMinus,
          depth: part.depth + 1
        })
        offsetPart({
          t0: t,
          t1: part.t1,
          utan0: utan,
          utan1: part.utan1,
          cusp0: cuspPlus,
          cusp1: part.cusp1,
          depth: part.depth + 1
        })
      }

      function offsetPart(part) {
        let i

        // Subdivide at a cusp of the offset first:
        if (part.cusp0 * part.cusp1 < 0) {
          const t = Numerical.findSignChange(
            getCusp,
            part.t0,
            part.t1,
            part.cusp0,
            part.cusp1,
            epsilon
          )
          subdivide(
            part,
            t,
            derive(t).normalize(),
            part.cusp0 < 0 ? -epsilon : epsilon,
            part.cusp1 < 0 ? -epsilon : epsilon
          )
          return
        }
        // The arc from the normal at the start to the one at the end:
        const angle = Math.atan2(
          part.utan1.cross(part.utan0),
          part.utan1.dot(part.utan0)
        )
        let a = 2 / 3 / (1 + Math.cos(angle / 2)) * 2 * Math.sin(angle / 2)
        let b = -a
        const dt = (part.t1 - part.t0) / (count + 1)
        const ts = []
        for (i = 0; i < count; i++) ts.push(part.t0 + (i + 1) * dt)
        let points = getOffsetCurve(part, a, b)
        let error = getError(part, points, ts)
        const tolerance2 = tolerance * tolerance
        for (i = 0; i < 2 && error.squared > tolerance2; i++) {
          const refined = refine(part, a, b, error)
          const points2 = getOffsetCurve(part, refined[0], refined[1])
          const error2 = getError(part, points2, ts)
          if (error2.squared >= error.squared) break
          a = refined[0]
          b = refined[1]
          points = points2
          error = error2
        }
        // Pieces within the tolerance of their start can't be off by
        // more, as near cusps of the offset, where the error doesn't
        // converge and subdivision only adds pieces of no length:
        const isShort = (
          points[1].getDistance(points[0]) < tolerance &&
          points[2].getDistance(points[0]) < tolerance &&
          points[3].getDistance(points[0]) < tolerance
        )
        if (part.depth < 8 && error.squared > tolerance2 && !isShort) {
          const split = getSubdivision(part)
          const cusp = getCusp(split.t)
          subdivide(part, split.t, split.utan, cusp, cusp)
        } else {
          const last = segments[segments.length - 1]
          last.setHandleOut(points[1].subtract(points[0]))
          segments.push(new Segment(points[3], points[2].subtract(points[3])))
        }
      }

      offsetPart({
        t0: 0,
        t1: 1,
        utan0: utan0,
        utan1: utan1,
        cusp0: getEndCusp(q0, c0),
        cusp1: getEndCusp(q2, c0 + c1 + c2),
        depth: 0
      })
      return segments
    }

    // The times of the inflections of the curve:
    function getInflections(v) {
      const p0 = new Point(v[0], v[1])
      const p1 = new Point(v[2], v[3])
      const p2 = new Point(v[4], v[5])
      const p3 = new Point(v[6], v[7])
      const a = p1.subtract(p0)
      const b = p2.subtract(p1).subtract(a)
      const c = p3.subtract(p0).subtract(p2.subtract(p1).multiply(3))
      const roots = []
      const count = Numerical.solveQuadratic(
        b.cross(c),
        a.cross(c),
        a.cross(b),
        roots,
        0,
        1
      )
      return count > 0 ? roots.slice(0, count) : []
    }

    // Gives handles that are shorter than the dimension that length, along
    // their own direction, as it is their curve's tangent, or towards the next
    // control point if they have none, so that the curve's derivative doesn't
    // vanish at its ends (after kurbo's CubicBez::regularize()):
    function regularize(v, dimension) {
      const p0 = new Point(v[0], v[1])
      let p1 = new Point(v[2], v[3])
      let p2 = new Point(v[4], v[5])
      const p3 = new Point(v[6], v[7])
      const handle1 = p1.subtract(p0)
      const handle2 = p2.subtract(p3)
      if (handle1.getLength() < dimension) {
        if (!handle1.isZero()) {
          p1 = p0.add(handle1.normalize(dimension))
        } else if (p0.getDistance(p2) >= dimension) {
          p1 = p0.add(p2.subtract(p0).normalize(dimension))
        } else {
          p1 = p0.add(p3.subtract(p0).divide(3))
          p2 = p3.add(p0.subtract(p3).divide(3))
        }
      }
      if (handle2.getLength() < dimension) {
        if (!handle2.isZero()) {
          p2 = p3.add(handle2.normalize(dimension))
        } else if (p3.getDistance(p1) >= dimension) {
          p2 = p3.add(p1.subtract(p3).normalize(dimension))
        } else {
          p1 = p0.add(p3.subtract(p0).divide(3))
          p2 = p3.add(p0.subtract(p3).divide(3))
        }
      }
      return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
    }

    // Nudges the handles of a curve with a cusp within it, where its derivative
    // vanishes, so that its curvature stays finite (kurbo's regularize_cusp()):
    function regularizeCusp(v, dimension) {
      const p0 = new Point(v[0], v[1])
      let p1 = new Point(v[2], v[3])
      let p2 = new Point(v[4], v[5])
      const p3 = new Point(v[6], v[7])
      const d01 = p1.subtract(p0)
      const d02 = p2.subtract(p0)
      const d03 = p3.subtract(p0)
      const d12 = p2.subtract(p1)
      const d23 = p3.subtract(p2)
      const det012 = d01.cross(d02)
      const det123 = d12.cross(d23)
      const det013 = d01.cross(d03)
      const det023 = d02.cross(d03)
      if (det012 * det123 > 0 && det012 * det013 < 0 && det012 * det023 < 0) {
        // The derivative is the quadratic of q0, q1, q2. Find where it is
        // shortest, and its curvature there:
        const q0 = d01.multiply(3)
        const q1 = d12.multiply(3)
        const q2 = d23.multiply(3)
        const t = Curve.getNearestTime(
          [
            q0.x,
            q0.y,
            q0.x + (q1.x - q0.x) * 2 / 3,
            q0.y + (q1.y - q0.y) * 2 / 3,
            q2.x + (q1.x - q2.x) * 2 / 3,
            q2.y + (q1.y - q2.y) * 2 / 3,
            q2.x,
            q2.y
          ],
          new Point(0, 0)
        )
        const u = 1 - t
        const q = q0
          .multiply(u * u)
          .add(q1.multiply(2 * t * u))
          .add(q2.multiply(t * t))
        const dq = q1
          .subtract(q0)
          .multiply(2 * u)
          .add(q2.subtract(q1).multiply(2 * t))
        const cross = q.cross(dq)
        const distance2 = q.dot(q)
        if (
          distance2 * distance2 * distance2 <=
          cross * dimension * cross * dimension
        ) {
          const a = 3 * det012 + det023 - 2 * det013
          const b = -3 * det012 + det013
          const discriminant = b * b - 4 * a * det012
          const l01 = d01.getLength()
          const l23 = d23.getLength()
          if (discriminant > 0) {
            // A double inflection: keep the handles at least as long as
            // the dimension.
            if (l01 > 2 * dimension)
              p1 = p1.subtract(d01.multiply(dimension / l01))
            if (l23 > 2 * dimension) p2 = p2.add(d23.multiply(dimension / l23))
          } else {
            // A loop:
            p1 = p1.add(d01.multiply(dimension / l01))
            p2 = p2.subtract(d23.multiply(dimension / l23))
          }
        }
      }
      return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
    }

    // Returns a copy of the path item with its matrix applied, and without
    // curves of zero length, which have no directions for joins and caps:
    function prepare(item) {
      return item.clone({ insert: false }).transform(null, true, true).reduce()
    }

    // Returns the dashes of the paths as open paths, as the canvas draws them:
    // the pattern starts over on each path, an odd number of lengths repeats
    // to alternate dashes and gaps, and patterns without lengths leave the
    // paths as they are. Each path is cut in one pass along its curves, and
    // the dashes keep the parts of its stroke profile:
    function getDashes(paths, dashArray, dashOffset) {
      const count = dashArray.length
      const isDashed = dashArray.some(function (dash) {
        return dash > 0
      })
      const dashes = []

      function getDash(i) {
        return dashArray[((i % count) + count) % count]
      }

      function addDashes(path) {
        const curves = path.getCurves()
        const length = path.getLength()
        const profile = path._strokeProfile && path._takeStrokeProfile()
        let index = 0
        let start = 0
        let from = -dashOffset
        let j = 0

        // The curve and its time at the offset, walking on from the last
        // one, as the offsets only grow:
        function getLocation(offset) {
          let curve = curves[index]
          while (
            index < curves.length - 1 &&
            start + curve.getLength() < offset
          ) {
            start += curve.getLength()
            curve = curves[++index]
          }
          return {
            index: index,
            time: Curve.getTimeAt(
              curve.getValues(),
              Math.min(offset - start, curve.getLength())
            ) || 0
          }
        }

        function addDash(from, to) {
          const a = getLocation(from)
          const b = getLocation(to)
          const segments = []
          for (let i = a.index; i <= b.index; i++) {
            const v = Curve.getPart(
              curves[i].getValues(),
              i === a.index ? a.time : 0,
              i === b.index ? b.time : 1
            )
            if (segments.length) {
              segments[segments.length - 1].setHandleOut(
                v[2] - v[0], v[3] - v[1]
              )
            } else {
              segments.push(
                new Segment(
                  new Point(v[0], v[1]),
                  null,
                  new Point(v[2] - v[0], v[3] - v[1])
                )
              )
            }
            segments.push(
              new Segment(
                new Point(v[6], v[7]),
                new Point(v[4] - v[6], v[5] - v[7])
              )
            )
          }
          const dash = new Path({ segments: segments, insert: false })
          if (profile) dash._setStrokeProfilePart(profile, from, to)
          dashes.push(dash)
        }

        // Step back in the pattern to where it starts before the path:
        while (from > 0) from -= getDash(--j) + getDash(--j)
        while (from < length) {
          const to = from + getDash(j++)
          if (
            Math.min(to, length) - Math.max(from, 0) >
            /*#=*/ Numerical.GEOMETRIC_EPSILON
          )
            addDash(Math.max(from, 0), Math.min(to, length))
          from = to + getDash(j++)
        }
      }

      for (let i = 0, l = paths.length; i < l; i++) {
        if (isDashed) {
          addDashes(paths[i])
        } else {
          dashes.push(paths[i])
        }
      }
      return dashes
    }

    function createResult(item, result, options) {
      if (Base.pick(options && options.insert, paper.settings.insertItems))
        result.insertAbove(item)
      result.copyAttributes(item, true)
      return result
    }

    return /** @lends PathItem# */ {
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
      offset: function (distance, options) {
        const join = options && options.join || 'miter'
        const miterLimit = options && options.miterLimit || 10
        const path = prepare(this)
        const paths = path._children || [path]
        let result
        if (!distance) {
          result = path
        } else if (this._children || this._closed) {
          const outline = outlineStroke(
            paths,
            abs(distance),
            join,
            'butt',
            miterLimit
          )
          result = path[distance > 0 ? 'unite' : 'subtract'](outline, {
            insert: false
          })
        } else {
          result = new CompoundPath({
            children: path.isEmpty()
              ? []
              : offsetSide(path, distance, join, miterLimit),
            insert: false
          }).reduce()
        }
        return createResult(this, result, options)
      },

      /**
       * Outlines the stroke of the path item, and returns the area that it
       * covers as a new path item, filled with the stroke's color. As with
       * the boolean operations, the path item's matrix is applied first.
       * Dashed strokes are outlined as their dashes, each with the stroke's
       * caps, as the canvas draws them, see {@link #dash(options)}.
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
      outline: function (options) {
        options = options || {}
        let result
        if (
          !this._children &&
          this._matrix.isIdentity() &&
          options.width === undefined &&
          !options.join &&
          !options.cap &&
          !options.miterLimit
        ) {
          // Paths keep the outline of their own stroke, see
          // #_getStrokeOutline():
          result = this._getStrokeOutline().clone({ insert: false })
        } else {
          const path = prepare(this)
          result = outlineStroke(
            getDashes(
              path._children || [path],
              this.getDashArray(),
              this.getDashOffset()
            ),
            Base.pick(options.width, this.getStrokeWidth()) / 2,
            options.join || this.getStrokeJoin(),
            options.cap || this.getStrokeCap(),
            options.miterLimit || this.getMiterLimit()
          ).reduce()
        }
        result = createResult(this, result, options)
        result.setFillColor(this.getStrokeColor())
        result.setStrokeColor(null)
        return result
      },

      /**
       * Cuts the stroke of the path item into its dashes, as the canvas draws
       * them with the {@link Style#dashArray} and {@link Style#dashOffset}
       * of the path item or those of the options, and returns them as a new
       * group of open paths with the path item's style, without its dash
       * pattern. The pattern starts over on each path of a compound path,
       * and the dashes keep the parts of the paths' stroke profiles. As with
       * the boolean operations, the path item's matrix is applied first.
       *
       * @option [options.dashArray=this.dashArray] {Number[]} the lengths of
       *     the dashes and the gaps between them
       * @option [options.dashOffset=this.dashOffset] {Number} the offset
       *     into the pattern at which the dashes start
       * @option [options.insert=true] {Boolean} whether the resulting group
       *     should be inserted back into the scene graph, above this path
       *     item
       *
       * @param {Object} [options] the dash options
       * @return {Group} the dashes, as a new group of paths
       *
       * @example {@paperscript}
       * var path = new Path.Circle({
       *     center: [80, 50],
       *     radius: 35,
       *     strokeColor: 'black',
       *     strokeWidth: 4,
       *     dashArray: [12, 6]
       * });
       * // Turn every other dash red:
       * var dashes = path.dash();
       * dashes.children.forEach(function(dash, i) {
       *     if (i % 2)
       *         dash.strokeColor = 'red';
       * });
       * path.remove();
       */
      dash: function (options) {
        options = options || {}
        const path = prepare(this)
        let result = new Group({
          children: getDashes(
            path._children || [path],
            Base.pick(options.dashArray, this.getDashArray()),
            Base.pick(options.dashOffset, this.getDashOffset())
          ),
          insert: false
        })
        result = createResult(this, result, options)
        result.setDashArray([])
        return result
      },

      // The outline of the path's stroke in its own coordinates, with its
      // dashes, kept until its geometry or its stroke changes, see
      // Path#_changed(). Paths with a stroke profile draw, bound and
      // hit-test their stroke with it:
      _getStrokeOutline: function () {
        return (
          this._strokeOutline ||
          (this._strokeOutline = outlineStroke(
            getDashes(
              [this.clone({ insert: false }).reduce()],
              this.getDashArray(),
              this.getDashOffset()
            ),
            this.getStrokeWidth() / 2,
            this.getStrokeJoin(),
            this.getStrokeCap(),
            this.getMiterLimit()
          ).reduce())
        )
      }
    }
  })()
)
