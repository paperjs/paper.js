### Fixed

- Calculate `Curve#getTimesWithTangent()`, `#length` and `Curve.getPeaks()`
  precisely also far from the origin, from the curve's polynomial
  coefficients, which take the differences of the points first.
