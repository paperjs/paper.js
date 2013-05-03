
paper.PathItem.prototype.getIntersections = function(path) {
  // First check the bounds of the two paths. If they don't intersect,
  // we don't need to iterate through their curves.
  if (!this.getBounds().touches(path.getBounds()))
    return [];
  var locations = [],
    curves1 = this.getCurves(),
    curves2 = path.getCurves(),
    length2 = curves2.length,
    values2 = [];
  for (var i = 0; i < length2; i++)
    values2[i] = curves2[i].getValues();
  for (var i = 0, l = curves1.length; i < l; i++) {
    var curve = curves1[i],
      values1 = curve.getValues();
    for (var j = 0; j < length2; j++)
      Curve.getIntersections(values1, values2[j], curve, curves2[j], locations);
  }
  return locations;
};


paper.Curve.getIntersections = function(v1, v2, curve, curve2, locations) {
    var bounds1 = this.getBounds(v1),
      bounds2 = this.getBounds(v2);
    if (bounds1.touches(bounds2)) {
      // See if both curves are flat enough to be treated as lines, either
      // because they have no control points at all, or are "flat enough"
      if ((this.isLinear(v1)
          || this.isFlatEnough(v1, /*#=*/ Numerical.TOLERANCE))
        && (this.isLinear(v2)
          || this.isFlatEnough(v2, /*#=*/ Numerical.TOLERANCE))) {
        // See if the parametric equations of the lines interesct.
        var point = new Line(v1[0], v1[1], v1[6], v1[7], false)
            .intersect(new Line(v2[0], v2[1], v2[6], v2[7], false));
        if (point) {
          // Avoid duplicates when hitting segments (closed paths too)
          var first = locations[0],
            last = locations[locations.length - 1];
          if ((!first || !point.equals(first._point))
              && (!last || !point.equals(last._point))){
            // Passing null for parameter leads to lazy determination
            // of parameter values in CurveLocation#getParameter()
            // only once they are requested.
            var cloc = new CurveLocation(curve, null, point);
            var cloc2 = new CurveLocation(curve2, null, point)
            cloc2._ixPair = cloc;
            cloc._ixPair = cloc2;
            locations.push( cloc );
          }
        }
      } else {
        // Subdivide both curves, and see if they intersect.
        var v1s = this.subdivide(v1),
          v2s = this.subdivide(v2);
        for (var i = 0; i < 2; i++)
          for (var j = 0; j < 2; j++)
            this.getIntersections(v1s[i], v2s[j], curve, curve2, locations);
      }
    }
    return locations;
  };
