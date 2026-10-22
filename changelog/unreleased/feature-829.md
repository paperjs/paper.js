### Added

- Add pattern colors, which fill and stroke items, text included, with the
  repeated tiles of a `PatternDefinition`: `new Color({ pattern, matrix })`, or
  `{ pattern }` assigned to `fillColor` and `strokeColor`. A
  `PatternDefinition` holds an item as its tile, a `Raster` for image patterns
  or any other item for vector patterns, with an optional `tile` rectangle and
  `spacing` between the tiles: `new PatternDefinition(item, { tile, spacing })`.
  The matrix places the tiles in the item's coordinates and transforms with the
  item, as gradient colors do. Pattern colors are exported to and imported from
  SVG as `<pattern>`, and to and from JSON (#829).
