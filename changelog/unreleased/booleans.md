### Added

- Let `PathItem#unite()`, `#intersect()`, `#subtract()` and `#exclude()` take
  an array of paths, which they combine in one call: unite, intersect and
  subtract in a balanced tree, exclude in one even-odd pass. Uniting 500 paths
  takes 0.22 s instead of 2.9 s chained, excluding them 0.45 s instead of
  minutes (#2094, #2303, #2304).

### Changed

- Trace the results of boolean operations through a planar graph of the
  operands' curves, which each operation builds within one geometric
  tolerance: intersections within it merge into one vertex, curves that pass
  within it of a vertex are cut there, and coincident curves become one edge.
  Results are correct to within about five times that tolerance, under a
  thousandth of a unit on a drawing of 1,000 units, and stable under tiny
  moves of the operands. They can differ from before in where their contours
  start and how they are divided, but not in their areas. Holes come out
  oriented opposite to their outlines, and islands like outlines (#2292).
- `PathItem#resolveCrossings()` returns the filled outline of a path, without
  the inner loops that its fill rule covers (#2292).
- Make boolean operations faster than in 0.14.0 on all inputs measured, from
  about 15% on small operations up to 5.7× on large polygons (#2293, #2296,
  #2297, #2299, #2300, #2301, #2302, #2305).

### Fixed

- Fix boolean operations on paths that touch or overlap along their edges,
  run close to each other, or cross near their vertices, which lost or added
  parts of their results (#1285, #1362, #1867, #1917, #1943, #1961, #2002,
  #2036, #2096, #2099).
- Fix `PathItem#resolveCrossings()` on paths with both overlaps and crossings,
  which lost parts of their outlines (#2290).
- Fix `Curve.getTimeOf()` at coordinates beyond about 2e8, where it didn't
  recognize points on the curve (#2291).
