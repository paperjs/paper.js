### Fixed

- Measure the lengths of curves precisely also where they slow down sharply,
  near cusps, where `Curve#getLength()`, `#getTimeAt()` and
  `Path#getPointAt()` were off by up to 6% and jumped along the curve.
