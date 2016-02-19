# Change Log
All notable changes to Paper.js shall be documented in this file, following common [CHANGELOG](http://keepachangelog.com/) conventions. As of `0.10.0`, Paper.js adheres to [Semantic Versioning](http://semver.org/).

## `0.10.0` (Unreleased)

### Changed
- Significant overhaul and improvement of boolean path operations `#unite()`,
  `#subtract()`, `#intersect()`, `#exclude()`, `#divide()` (#936):
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
- Make `Matrix#_shiftless` and `#orNullIfIdentity` internal functions.
- Queue internal `View#update()` calls to minimize the number of times a canvas is redrawn (#830, #925).
- `Symbol` now clashes with ES6 definition of Symbol and has been changed (#770).
    - `Symbol` -> `SymbolDefinition`
    - `PlacedSymbol` -> `SymbolItem`
    - `Symbol#definition` -> `SymbolDefinition#item`
    - `PlacedSymbol#symbol` -> `SymbolItem#definition`
- Don't serialize deprecated `Style#font` property.
- Don't serialize text-styles in non-text items (#934).
- Methods that accepted a `time` parameter or boolean second parameter causing the argument to be interpreted as `time` instead of `offset` are now separate functions with distinct names (#563):
    - `Curve#getNormalAt(time, true)` -> `#getNormalAtTime(true)`
    - `Curve#divide()` -> `#divideAt(offset)` / ` #divideAtTime(time)`
    - `Curve#split()` -> `#splitAt(offset)` / `#splitAtTime(time)`
    - `Curve#getParameterAt(offset)` -> `#getTimeAt(offset)`
    - `Curve#getParameterOf(point)` -> `getTimeOf(point)`
    - `Curve#getPointAt(time, true)` -> `#getPointAtTime(time)`
    - `Curve#getTangentAt(time, true)` -> `#getTangenttTime(time)`
    - `Curve#getNormalAt(time, true)` -> `#getNormalAtTime(time)`
    - `Curve#getCurvatureAt(time, true)` -> `#getCurvatureAtTime(time)`
    - `CurveLocation#parameter` -> `#time`
    - `Path#split(offset/location)` -> `#splitAt(offset/location)`
- Changed argument `parameter` to `time` for Postscript-style drawing commands.
- `Item#clone()`'s optional argument is now an options object with defaults `{insert: true, deep: true}`. `insert` controls whether the clone is inserted into the project and `deep` controls whether the item's children are cloned. The previous boolean optional argument is still interpreted as the `insert` option (#941).
- `PathItem#flatten()`'s argument has been changed from `tolerance` (maximum allowed distance between points) to `flatness` (maximum allowed error) (#618).
- `Matrix` properties `#b` and `#c` have been reversed to match common standard.


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
- Add `View#requestUpdate()` function to minimize number of actual canvas redraw.
- Support `Raster#onLoad()` events on `Raster#setImage()` now (#924).
- Add `Raster#onError()` event support (#849).
- Add 'keydown' and 'keyup' events to `View` (#896).
- Add mouse events to `View`.
- Add `View#autoUpdate` boolean (default: true) to control  automatic updating of the canvas (#921).
- Allow running without a canvas for Web Workers, nodejs (#561, #582, #634).
- Unify node and browser versions and enable npm install (#739).
- Set 1px default `strokeWidth` for SVG imports to fix IE/Edge default (#467).
- `ImportSVG()` passes imported SVG data to `onLoad` callback as second parameter.
- Add `#interpolate` for `Segment`, `Path`, and `CompoundPath` (#624).
- Implement `CompoundPath#flatten()`, `#simplify()`, `#smooth()` (#727).
- Implement clip-mask support in hit-testing (#671).
- Implement `#hitTestAll()` to return all items that were hit (#536).
- `ImportSVG()` implements option.onError callback (#969).
- `PaperScope#settings.insertItems` controls whether newly created items are inserted or not (default: true).
- Add `#importSVG()` `option.insert` (default: true) to control insertion (#763).
- Add `CompoundPath` detection on SVG import.
- Add new options to `#exportSVG()` to control bounds and transformations (#972).


### Deprecated
- Deprecate `#windingRule` on `Item` and `Style` in favor of `#fillRule`.
- `Matrix#concatenante` in favor of `#append`.
- `Matrix#preConcatenate` in favor of `#prepend`.
- `Matrix#chain` in favor of `#appended`.
- `Project#symbols`in favor of `Project#getSymbolDefinitions()`


### Removed
- Legacy `Color` constructors (removed in 0.9.25): `GrayColor`, `RgbColor`,
  `HsbColor`, `HslColor`, and `GradientColor`. These have been replaced
   with corresponding forms of the `Color` constructor.
- Remove `getEndDistanceSquared()` (added `getSquaredLineLength()`)
- `ctx.currentPath` caching optimization
- Undocumented function `Project#addChild()` that added a layer to a project.
  It is replaced by `Project#addLayer()` and `Project#insertLayer()`.
- Canvas attributes "resize" and "data-paper-resize" no longer cause paper to resize the canvas when the viewport size changes; CSS is required since 0.9.22.

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
- Don't modify an array of child items passed to `CompoundPath#insertChildren()` when it is a child items array of a `CompoundPath`.
- Fix incorrect handling of `strokeScaling` for `Shape` and mouse detection (#697).
- `#importJSON` no longer generates "callstack exceeded" (#764).
- Fix incorrect `hitResult` and `#contains` cases (#819, #884).
- Update documentation to note appropriate use for `#simplify()` (#920).
- `#importSVG()` now supports percentage dimensions and `gradientUnits="objectBoundingBox"`. (#954, #650).
- `Groups` with clip-masks now calculate correct bounding boxes (#956).
- Calling `event.stopPropagation()` in mousedown handler no longer prevents mousedrag events (#952).
- Draw `Item` shadows when shadowBlur is zero (#955).
- Fixes for Web site examples (#967).
- Fixed `Item` dimension cannot be changed after being set to zero (#558).
- Scaling shadows now works correctly with browser- and view-zoom (#831).
- `Path#arcTo()` correctly handles zero sizes.
- `ImportSVG()` handles onLoad and onError callbacks for string inputs that load external resources (#827).
- `#importJSON()` and `#exportJSON()` now handle non-`Item` objects correctly (#392).
- `#exportSVG()` now exports empty paths if used as a clip-mask.
- Correct problem using paper-core in node.js (#975).
- Fix `event.delta` on mousedrag events (#981).
