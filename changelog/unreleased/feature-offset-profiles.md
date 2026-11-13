### Added

- `offset()` keeps stroke profiles: each stop is carried over along its normal to the nearest point of the offset.

### Fixed

- Fix `offset()` of paths with stroke profiles, which followed the outline of the profile instead of lying at the distance all along.
- Fix boolean operations leaving stops without values on results that only follow paths without profiles.
