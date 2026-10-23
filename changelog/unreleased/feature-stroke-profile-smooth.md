### Added

- Smooth stroke profiles: the values of the pens ease into and out of their
  stops, along cubics that are flat at the stops, so that a stop only shapes
  the values up to its neighbors, unless `StrokeProfileStop#smooth` is
  `false`, where they change in straight lines.
