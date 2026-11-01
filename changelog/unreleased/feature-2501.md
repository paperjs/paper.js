### Added

- Support `options` in `PathItem#simplify()`, with `tolerance` and a range of
  segments to fit through `from` and `to`, as in `PathItem#smooth()` (#2501).

### Fixed

- Fix `PathItem#smooth()` with a negative `to` on closed paths, which threw.
