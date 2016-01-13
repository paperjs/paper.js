# Change Log
All notable changes to Paper.js shall be documented in this file, following common [CHANGELOG](http://keepachangelog.com/) conventions. As of `0.10.0`, Paper.js adheres to [Semantic Versioning](http://semver.org/).

## `0.10.0` (Unreleased)

### Changed
- Significant overhaul and improvement of boolean path operations (`#unite()`,
  `#subtract()`, `#intersect()`, `#exclude()`, `#divide()`):
    - Improve handling of self-intersecting paths and non-zero fill-rules.
    - Handle operations on identical paths.
    - Improve handling of near-collinear lines.
    - Better handle self-intersecting paths that merely "touch" themselves.
    - Handle situations where all encountered intersections are part of overlaps.
- Significant improvement of reliability of bezier fat-line clipping code in
  `#getIntersections()` and `#getCrossings()`.
- Complete refactoring of key-event handling to increase reliably when handling
  special keys.
- Complete refactoring of mouse-event handling on item and view, to better
  handle event bubbling and `Item#removeOn()` calls.
- Rename `#windingRule` to `#fillRule` on `Item` and `Style`.
- Do not replace existing named child reference on `Item#children` with new one
  when the name is identical.
- Update internal Acorn JavaScript parser to `0.5.0`, the last small version.
- Update QUnit to `1.20.0`.

### Added
- Multiple additions to SVG export (`#exportSVG()`):
    - Support `{ precision: value }` option.
    - Support `#fillRule` through the SVG `fill-rule` attribute.
    - Support `#blendMode` through the CSS `mix-blend-mode` attribute.
- Various additions to `#getItems()` on `Project` and `Item`:
    - Add support for `{ recursive: false }` as a way to prevent iterating over
      all children of children.
    - Add support for `{ match: function() {} }`, so the match function can be
      passed in combination with other options.
- Add `Item#copyAttributes()` and `Item#copyContent()`, and use them in
  `Item#clone()`.
- Add `insert` parameter to `Path#toShape()`, `Shape#toPath()`,
  `Item#rasterize()`, controlling whether the created item is inserted into the
  scene graph or not.
- Add visual item comparison to QUnit, through rasterization and Resemble.js
  diffing.
- Add many unit tests for known edge cases in boolean operations and curve
  intersections.
- Start using automatic code testing through Travis CI.
- Reach JSHint compliance and include regular linting in Travis CI tests.
- Define code format standards in .editorconfig file

### Deprecated
- Deprecate `#windingRule` on `Item` and `Style` in favor of `#fillRule`.

<!--
### Removed
-->

### Fixed
- Improve hit-testing and `#contains()` checks on path with horizontal lines (#819).
- Handle non-reversible matrices in `Item#hitTest()` (#617).
- Fix various issues with adding and removing of segments in paths (#815).
- Support bubbling up of `doubleclick` events on `Group` (#834).
- Fix wrong `#key` values in key-events that do not match character (#881).
- Fix handling of control and meta key sequences and special character handling
  (#860).
- Handle incorrect mouse event on `ctrl-alt-del` key sequence on Chrome/Windows
  (#800).
- Do not rasterize items if the resulting raster will be empty (#828).
- Fix SVG serialization in JSDOM `7.0.0` and newer (#821).
- Correctly handle gradients in SVG import on Firefox (#666).
- Fix `Shape#strokeBounds` when `#strokeScaling` is false (#856).
- Consistently interpret curves as straight or not-straight (#838).
- Switch blendMode to 'lighter' in CandyCrash (#453).

… and many more.
