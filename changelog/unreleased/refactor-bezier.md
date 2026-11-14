### Added

- Add `Curve#getPeaks()`, for the peaks of a curve's curvature, in place of the static `Curve.getPeaks()`.

### Removed

- Remove the undocumented static methods of `Curve` that work on curve values. Most have a method of curves that does the same: `curve.getPointAtTime(t)` and its siblings for `Curve.getPoint(v, t)`, `curve.getPart(from, to)` for `Curve.getPart()` and `Curve.subdivide()`, `curve.getNearestLocation(point)` for `Curve.getNearestTime()`, and `curve.getIntersections(other)`, whose locations tell with `hasOverlap()`, for `Curve.getOverlaps()`. `Curve.getMonoCurves()`, `Curve.isFlatEnough()`, `Curve.getReversals()` and `Curve.solveCubic()` go without one.
- Remove `CurveLocation.expand()`, which was not documented.
