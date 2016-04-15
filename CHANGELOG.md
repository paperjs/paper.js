# Change Log
All notable changes to Paper.js shall be documented in this file, following
common [CHANGELOG](http://keepachangelog.com/) conventions. As of `0.10.0`,
Paper.js adheres to [Semantic Versioning](http://semver.org/).

## `0.10.0` (Unreleased)

### Preamble

This is a huge release for Paper.js as we aim for a version `1.0.0` release
later this year. There are many items in the changelog (and many more items not
in the changelog) so here a high-level overview to frame the long list of
changes:

- Boolean operations have been improved and overhauled for reliability and
  efficiency. These include the path functions to unite, intersect, subtract,
  exclude, and divide with another path.

- There was a large amount of work implementing test coverage under QUnit.

- Mouse and key handling has been re-engineered and extended to work with view.
  Many outstanding bugs have been fixed with mouse and key handling.

- Many SVG-handling enhancements and bug-fixes, including handling browser-
  specific interpretations of the SVG standard, have been added.

- There are API name changes for more consistency as well as some required by
  changes in the EcmaScript 6 standard (e.g., `Symbol` → `SymbolDefinition`).

- Even though it is not new, since version `0.9.22` Paper.js no longer resizes
  the canvas to match the view. The canvas must be resized independently.

Thank you all for using Paper.js, submitting bugs and ideas, and all those that
contribute to the code.

### Changed
- Significant overhaul and improvements of boolean path operations
  `PathItem#unite()`, `#subtract()`, `#intersect()`, `#exclude()`, `#divide()`
  (#936):
    - Improve handling of self-intersecting paths and non-zero fill-rules.
    - Handle operations on identical paths.
    - Improve handling of near-collinear lines.
    - Better handle self-intersecting paths that merely "touch" themselves.
    - Handle situations where all encountered intersections are part of overlaps.
- Methods that accepted a `time` parameter or boolean second parameter causing
  the argument to be interpreted as curve-time instead of offset are now
  separate functions with distinct names (#563):
    - `Curve#getNormalAt(time, true)` → `#getNormalAtTime(true)`
    - `Curve#divide()` → `#divideAt(offset)` / ` #divideAtTime(time)`
    - `Curve#split()` → `#splitAt(offset)` / `#splitAtTime(time)`
    - `Curve#getParameterAt(offset)` → `#getTimeAt(offset)`
    - `Curve#getParameterOf(point)` → `getTimeOf(point)`
    - `Curve#getPointAt(time, true)` → `#getPointAtTime(time)`
    - `Curve#getTangentAt(time, true)` → `#getTangenttTime(time)`
    - `Curve#getNormalAt(time, true)` → `#getNormalAtTime(time)`
    - `Curve#getCurvatureAt(time, true)` → `#getCurvatureAtTime(time)`
    - `CurveLocation#parameter` → `#time`
    - `Path#split(offset/location)` → `#splitAt(offset/location)`
- Significant improvement of reliability of bezier fat-line clipping code in
  `PathItem#getIntersections()` and `#getCrossings()`.
- `PathItem#smooth()` now accepts an `options.type` string  specifying which
  smoothing algorithm to use: `'asymmetric'` (default), `'continuous'`,
  `'catmull-rom'`, and `'geometric'` (#338).
- Update internal Acorn JavaScript parser to `0.5.0`, the last small version.
- Transition to Gulp based build process.
- Update QUnit to `1.20.0`.
- Update to JSDOM `8.3.0`, to benefit from integrated image and canvas support.
- Complete refactoring of keyboard event handling to increase reliably when
  handling special keys.
- Complete refactoring of mouse-event handling on item and view, to better
  handle event propagation, default behavior and `Item#removeOn()` calls.
- Simplify and streamline the mouse-handling code on `Tool` (#595).
- Mouse handlers can to return `false` to call `event.stop()`, stopping event
  propagation and prevent the default browser behavior.
- `event.preventDefault()` is called by default after any handled mouse mouse
  events, except `'mousemove'`, and only on a `'mousedown'` event if the view
  or tool respond to `'mouseup'`.
- Rename `#windingRule` to `#fillRule` on `Item` and `Style`.
- Do not replace existing named child reference on `Item#children` with new one
  when the name is identical.
- Limit the effects of `#strokeScaling` to `PathItem` and `Shape` (#721).
- Throw an exception if arguments to `#smooth()` are segments or curves from
  incorrect paths.
- Rename `Matrix#concatenate()` to `#append()` and `preConcatenate()` to
  `#prepend()`.
- Make `Matrix#shiftless()` and `#orNullIfIdentity()` internal functions.
- De-bounce internal `View#update()` calls to minimize the number of times a
  canvas is redrawn (#830, #925).
- `Symbol` now clashes with ES6 definition of Symbol and has been changed
  (#770):
    - `Symbol` → `SymbolDefinition`
    - `PlacedSymbol` → `SymbolItem`
    - `Symbol#definition` → `SymbolDefinition#item`
    - `PlacedSymbol#symbol` → `SymbolItem#definition`
- Don't serialize deprecated `Style#font` property.
- Don't serialize text-styles in non-text items (#934).
- Changed argument `parameter` to `time` for Postscript-style drawing commands.
- `Item#clone()`: optional argument is now an options object with defaults
  `{insert: true, deep: true}`. `insert` controls whether the clone is inserted
  into the project and `deep` controls whether the item's children are cloned.
  The previous boolean optional argument is still interpreted as the `insert`
  option (#941).
- `PathItem#flatten()`: argument has been changed from `tolerance` (maximum
  allowed distance between points) to `flatness` (maximum allowed error) (#618).
- `Matrix` properties `#b` and `#c` have been reversed to match common standard.
- `#importSVG()`: improve handling of style inheritance for nested `<defs>`.
- Move `PaperScript#execute()` URL argument into `options.url` (#902).

### Added
- Use unified code-base for browsers, Node.js, Electron, and anything
  in-between, and enable npm install for browser use (#739).
- Start using automatic code testing and deployment of prebuilt versions through
  Travis CI.
- Reach JSHint compliance and include regular linting in Travis CI tests.
- Use QUnit tests for leaked globals.
- Define code format standards in .editorconfig file
- Add support for running without a canvas for Web Workers, Node.js
  (#561, #582, #634).
- Add support for all common mouse events to `View`.
- Add support for `'keydown'` and `'keyup'` events to `View` (#896).
- Add `View#requestUpdate()` function to minimize number of actual canvas
  redraw.
- Add `View#matrix` to allow matrix transformation to be accessed and modified
  directly on the view (#832).
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
- Add `Project#addLayer()` and `Project#insertLayer()` (#903).
- Layers may now be given names and be accessed through `project.layers[name]`
  (#491).
- Add `Matrix#prepended()` and `#appended()` to return copies of the modified
  matrix.
- `Shape#hitTest()`: Add boolean option `options.stroke` (#911).
- Insert version number into docs.
- Support `Raster#onLoad()` events on `Raster#setImage()` now (#924).
- Add `Raster#onError()` event support (#849).
- Allow the control of automatic updating of the canvas through
  `View#autoUpdate` (default: `true`)(#921).
- Set `1px` default `strokeWidth` for SVG imports to fix IE/Edge default (#467).
- `ImportSVG()` passes imported SVG data to `onLoad` callback as second
  parameter.
- Add `#interpolate` for `Segment`, `Path`, and `CompoundPath` (#624).
- Implement `CompoundPath#flatten()`, `#simplify()`, `#smooth()` (#727).
- Implement `#hitTestAll()` to return all items that were hit (#536).
- `#importSVG()` implements `option.onError` callback (#969).
- `settings.insertItems` controls whether newly created items are inserted or
  not (default: `true`).
- Add `#importSVG()` `option.insert` (default: `true`) to control insertion
  (#763).
- Add new options to `#exportSVG()` to control output bounds and transformation
  matrix (#972).
- Allow `Item#position` to be selected via `Item#position.selected` (#980).

### Fixed
- Make new code-base unified for Node.js/browser work with module bundlers like
  Webpack (#986).
- Improve hit-testing and `#contains()` checks on path with horizontal lines
  (#819).
- Handle non-reversible matrices in `Item#hitTest()` (#617).
- Fix various issues with adding and removing of segments in paths (#815).
- Support bubbling up of `doubleclick` events on `Group` (#834).
- Fix wrong `#key` values in key-events that do not match character (#881).
- Fix keyboard event handling of control and meta keyboard sequences and special
  character handling (#860).
- Handle incorrect mouse event on `ctrl-alt-del` key sequence on Chrome/Windows
  (#800).
- Do not rasterize items if the resulting raster will be empty (#828).
- Fix SVG serialization in JSDOM `7.0.0` and newer (#821).
- Correctly handle gradients in SVG import on Firefox (#666).
- Fix `Shape#strokeBounds` when `#strokeScaling` is false (#856).
- Correctly handle `#strokeScaling` when calculating `Path` and `Shape` bounds
  (#697).
- Consistently interpret curves as straight or not-straight (#838).
- Switch blendMode to 'lighter' in Candy Crash example for better performance
  (#453).
- Don't block touch actions when using paper in JavaScript mode (#686).
- Convert touch event coordinates to project coordinates (#633).
- Fix problems with group selection structures after `group#importJSON()`
  (#785).
- Fix exceptions when a top-level layer is selected.
- Don't allow layers to turn up in hit-tests (#608).
- Maintain `Raster#source` correctly on Node.js (#914).
- Boolean operations correctly handle open `Path` items within `CompoundPath`
  (#912).
- Don't modify an array of child items passed to `CompoundPath#insertChildren()`
  when it is a child items array of a `CompoundPath`.
- Correctly handle `#strokeScaling` in `Shape` hit-tests (#697).
- Support clip-masks in hit-testing (#671).
- `#importJSON()` no longer generates callstack exceeded exceptions (#764).
- Fix incorrect `#hitTest()` and `#contains()` cases (#819, #884).
- Update documentation to note appropriate use for `#simplify()` (#920).
- `#importSVG()` now supports percentage dimensions and
  `gradientUnits="objectBoundingBox"`. (#954, #650).
- `Group` items with clip-masks now calculate correct bounding boxes (#956).
- Calling `event.stopPropagation()` in `'mousedown'` handler no longer prevents
  `'mousedrag'` events (#952).
- Draw `Item` shadows when `#shadowBlur` is zero (#955).
- Fixes for web site examples (#967).
- Prevent `Item` bounds from permanently collapsing to 0 when applying non-
  invertible transformations (#558).
- Scaling shadows now works correctly with browser- and view-zoom (#831).
- `Path#arcTo()` correctly handles zero sizes.
- `#importSVG()` handles onLoad and onError callbacks for string inputs that
  load external resources (#827).
- `#importJSON()` and `#exportJSON()` now handle non-`Item` objects correctly
  (#392).
- `#exportSVG()` now exports empty paths if used as a clip-mask.
- Correct issue when using paper-core in Node.js (#975).
- Fix `event.delta` on mousedrag events (#981).
- Improve handling of XML attribute namespaces for IE's XMLSerializer() (#984).
- Make sure `Item#removeChildren()` fully removes children (#991).
- Improve handling of `event#stopPropagation()` on `View` and `Item` (#995).
- `#importSVG()`: Improve handling of viewBox.
- Make sure all named item lookup structures are kept in sync (#1009).
- Convert absolute local gradient URLs to relative ones (#1001).
- Fix TypeError in `Path#unite()` (#1000).
- Allow the selection of a `Path` item's bounds without selecting the segments
  (#769).

### Removed
- Canvas attributes "resize" and "data-paper-resize" no longer cause paper to
  resize the canvas when the viewport size changes; Additional CSS styles are
  required since `0.9.22`, e.g.:

  ```css
  /* Scale canvas with resize attribute to full size */
  canvas[resize] {
      width: 100%;
      height: 100%;
  }
  ```
- Legacy `Color` constructors (removed in `0.9.25`): `GrayColor`, `RgbColor`,
  `HsbColor`, `HslColor`, and `GradientColor`. These have been replaced
   with corresponding forms of the `Color` constructor.
- Undocumented function `Project#addChild()` that added a layer to a project.
  It is replaced by `Project#addLayer()` and `Project#insertLayer()`.

### Deprecated
- `#windingRule` on `Item` and `Style` → `#fillRule`.
- `Curve#getNormalAt(time, true)` → `#getNormalAtTime(true)`
- `Curve#divide()` → `#divideAt(offset)` / `#divideAtTime(time)`
- `Curve#split()` → `#splitAt(offset)` / `#splitAtTime(time)`
- `Curve#getParameterAt(offset)` → `#getTimeAt(offset)`
- `Curve#getParameterOf(point)` → `getTimeOf(point)`
- `Curve#getPointAt(time, true)` → `#getPointAtTime(time)`
- `Curve#getTangentAt(time, true)` → `#getTangenttTime(time)`
- `Curve#getNormalAt(time, true)` → `#getNormalAtTime(time)`
- `Curve#getCurvatureAt(time, true)` → `#getCurvatureAtTime(time)`
- `CurveLocation#parameter` → `#time`
- `Path#split(offset/location)` → `#splitAt(offset/location)`
- `Symbol` → `SymbolDefinition`
- `PlacedSymbol` → `SymbolItem`
- `Symbol#definition` → `SymbolDefinition#item`
- `PlacedSymbol#symbol` → `SymbolItem#definition`
- `Project#symbols` → `#symbolDefinitions`
- `Matrix#concatenante` → `#append`.
- `Matrix#preConcatenate` → `#prepend`.
- `Matrix#chain` → `#appended`.
