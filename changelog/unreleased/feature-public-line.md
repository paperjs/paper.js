### Added

- Document `Line` as public API, with `new Line(from, to)`, `new Line({ from, to })` and `new Line({ point, vector })`, an `infinite` property and `toString()`.

### Changed

- `Line`: An `infinite` line set at creation replaces the `asVector` and `isInfinite` arguments, and `getDistance()` and `getSignedDistance()` measure from the nearest end for points beyond the ends of a line that isn't infinite.
