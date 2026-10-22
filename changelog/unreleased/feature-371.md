### Added

- Add `PathItem#offset(distance, options)`, which offsets paths and compound
  paths, growing or shrinking closed ones and moving open ones along their
  normals, with miter, round or bevel corners (#371).
- Add `PathItem#outline(options)`, which outlines the stroke of a path item as
  a filled path item with its joins and caps, also where the path turns more
  tightly than the stroke is wide (#371).
