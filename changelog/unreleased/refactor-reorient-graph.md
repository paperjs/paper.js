### Changed

- `PathItem#reorient()` finds the orientations of the sub-paths with the graph of the boolean operations. Sub-paths that touch or cross each other are replaced by the outlines of the area that they fill.

### Removed

- `PathItem#interiorPoint`, which only `reorient()` used.
