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
- `#smooth()` now accepts an `options.type` string  specifying which smoothing
  algorithm to use: 'asymmetric' (default), 'continuous', 'catmull-rom', and
  'geometric' (#338).
- Combine and simplify `Tool` mousedrag and mousemove code (#595).
- Move `Tool#_fireEvent()` into private function in `Tool#_handleEvent()`.
- Mouse handlers can to return `true` to cause browser default behavior.
- `event.preventDefault()` is called by default after all mouse events except
  'mousemove'. It will not be called if the event handler returns `false` nor
  will it be called on a 'mousedown' event if the view or tools respond to
  'mouseup'.
- Add `_canScaleStroke` flag to selectively activate stroke-scaling on classes
  that support it (#721).
- Throw an exception if arguments to `smooth()` are segments or curves from
  incorrect paths.
- Many minor code and algorithm optimizations.
- Performance optimization for monotone curves (#907).
- Move to gulp build process.
- Move `PaperScript#execute` URL argument into `options.url` (#902).
- Rename `Matrix#concatenate()` to `#append()` and `preConcatenate()` to `#prepend()`.
- Make `Matrix#_shiftless` and `#orNullIfIdentity` internal functiond.


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
- Add optional `insert` boolean argument to `Path#toShape()`, `Shape#toPath()`,
  `Item#rasterize()`. Default is to insert, set to `false` to prevent the
  created item from being inserted into the scene graph.
- Add visual item comparison to QUnit, through rasterization and Resemble.js
  diffing.
- Add many unit tests for known edge cases in boolean operations and curve
  intersections.
- Start using automatic code testing through Travis CI.
- Reach JSHint compliance and include regular linting in Travis CI tests.
- Define code format standards in .editorconfig file
- Add `getSquaredLineLength()` (removed `getEndDistanceSquared()`)
- layers may now be given names (#491).
- Add `Project#addLayer()` and `Project#insertLayer()` (#903).
- Add `View#matrix` to allow matrix transformation to be used on the view (#832).
- Add tests QUnit tests for leaked globals.
- Add `Matrix#prepended` and `#appended` to return copies of the modified  matrix.
- Add `Shape#hitTest()` boolean option `options.stroke` (#911).
- Insert version number into docs.


### Deprecated
- Deprecate `#windingRule` on `Item` and `Style` in favor of `#fillRule`.
- `Matrix#concatenante` in favor of `#append`.
- `Matrix#preConcatenate` in favor of `#prepend`.
- `Matrix#chain` in favor of `#appended`.


### Removed
- Legacy `Color` constructors (removed in 0.9.25): `GrayColor`, `RgbColor`,
  `HsbColor`, `HslColor`, and `GradientColor`. These have been replaced
   with corresponding forms of the `Color` constructor.
- Remove `getEndDistanceSquared()` (added `getSquaredLineLength()`)
- `ctx.currentPath` caching optimization
- Undocumented function `Project#addChild()` that added a layer to a project.
  It is replaced by `Project#addLayer()` and `Project#insertLayer()`.


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
- Don't block touch actions when using paper in JavaScript mode (#686).
- Convert touch event coordinates to project coordinates (#633).
- Fix problems with group selection structures after `group#importJSON()` (#785).
- Fix exceptions when a top-level layer is selected.
- Don't allow layers to turn up in hit-tests (#608).
- Correctly handle `#strokeScaling` when calculating `Path` and `Shape` bounds (#697).
- Maintain `Raster#source` correctly on Node.js (#914).
- Boolean operations correctly handle open `Path` items within `CompoundPath` (#912).

