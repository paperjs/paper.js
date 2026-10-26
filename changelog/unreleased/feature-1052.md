### Added

- Add `PathItem#arcAround(center, angle)`, which draws an arc around a center
  by an angle, full circles included, and `PathItem#arcTowards(to)`, which
  continues the path smoothly with an arc to a point (#1052).

### Fixed

- Fix `PathItem#arcTo()` with tiny arcs, which didn't reach their end point.
