### Removed

- Remove the undocumented static methods of `Curve` that work on curve values, such as `Curve.getPoint(v, t)`, `Curve.getPart(v, from, to)` and `Curve.getLength(v)`. Use the methods of curves instead, e.g. `curve.getPointAtTime(t)`.
