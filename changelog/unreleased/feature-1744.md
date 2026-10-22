### Added

- Add `Color#aspect`, which makes radial gradients ellipses, and with which
  gradient colors transform exactly with their items, also when they scale
  unevenly or shear, as items do that apply their matrix, and SVG import with
  `gradientTransform` or `gradientUnits="objectBoundingBox"` (#1744).

### Fixed

- Keep the stripes of linear gradients running across them when transforming
  them unevenly or shearing them (#1744).
