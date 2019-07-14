# Change Log

## `0.12.3`

### Fixed

- Fix regression in `Color` change propagation (#1672, #1674).
- SVG Export: Fix viewport size of exported `Symbol` (#1668).
- Handle non-invertible matrices in `Item#contains()` (#1651).
- Improve documentation for `Item#clipMask` (#1673).
- Improve TypeScript definitions (#1659, #1663, #1664, #1667)

### Added

- Add documentation for `Item#internalBounds`.

## `0.12.2`

### Fixed

- Fix drawing with compound-paths as clip-items (#1361).
- Fix drawing of path selection with small handle size (#1327).
- Do not ignore `Group#clipItem.matrix` in `Group#internalBounds` (#1427).
- Correctly calculate bounds with nested empty items (#1467).
- Fix color change propagation on groups (#1152).
- Fix `Path#arcTo()` where `from` and `to` points are equal (#1613).
- Improve `new Raster(size[, position])` constructor (#1621).
- SVG Export: Fix error when `Item#matrix` is not invertible (#1580).
- SVG Export: Include missing viewBox attribute (#1576).
- SVG Import: Use correct default values for gradients (#1632, #1660).
- SVG Import: Add basic `<switch/>` support (#1597).
- JSON Import: Prevent `Item#insert()` method from being overridden (#1392).
- PaperScript: Fix issues with increment/decrement operators (#1450, #1611).

## `0.12.1`

### Added

- Add TypeScript definition, automatically generated from JSDoc comments
  (#1612).
- Support `new Raster(size[, position])` constructor.
- Expose `Raster#context` accessor.
- Implement `Raster#clear()` method to clear associated canvas context.
- Node.js: Add support for Node.js v11 and v12.

### Fixed

- Fix parsing of CSS colors with spaces in parentheses (#1629).
- Improve `Color.random()` documentation.
- Fix `Tween#then()` documentation.

### Removed

- Node.js: Remove support for Node.js v6.

## `0.12.0`

### News

Another release, another new member on the team: Please welcome
[@arnoson](https://github.com/arnoson), who has worked hard on the all new
animation support, exposed through the `Tween` class and its various methods on
the `Item` class, see below for details:

### Added

- Add new `Tween` class and related methods on `Item`, to animate and
  interpolate their various properties, including colors, sub-properties, etc.:
  `Item#tween(from, to, options)`, `Item#tween(to, options)`,
  `Item#tween(options)`, `Item#tweenFrom(from, options)`,
  `Item#tweenTo(to, options)`

### Fixed

- Only draw Raster if image is not empty (#1320).
- Emit mousedrag events on correct items when covered by other items (#1465).
- Fix drawing issues of bounds and position with `Group#selectedColor` (#1571).
- Fix `Item.once()` to actually only emit event once.
- Various documentation fixes and improvements (#1399).

## `0.11.8`

### News

This is the first release in quite a while, and it was made possible thanks to
two new people on the team:

A warm welcome to [@sasensi](https://github.com/sasensi) and
[@sapics](https://github.com/sapics), the two new and very active maintainers /
contributors! :tada:

Their efforts mean that many issues are finally getting proper attention and
solid fixes, as we are paving the way for the upcoming release of `1.0.0`. Here
the fixes and additions from the past two weeks:

### Fixed

- Prevent `paper` object from polluting the global scope (#1544).
- Make sure `Path#arcTo()` always passes through the provide through point
  (#1477).
- Draw shadows on `Raster` images (#1437).
- Fix boolean operation edge case (#1506, #1513, #1515).
- Handle closed paths with only one segment in `Path#flatten()` (#1338).
- Remove memory leak on gradient colors (#1499).
- Support alpha channel in CSS colors (#1468, #1539, #1565).
- Improve color CSS string parsing and documentation.
- Improve caching of item positions (#1503).
- Always draw selected position in global coordinates system (#1545).
- Prevent empty `Symbol` items from causing issues with transformations (#1561).
- Better detect when a cached global matrix is not valid anymore (#1448).
- Correctly draw selected position when item is in a group with matrix not
  applied (#1535).
- Improve handling of huge amounts of segments in paths (#1493).
- Do not trigger error messages about passive event listeners on Chrome (#1501).
- Fix errors with event listeners on mobile (#1533).
- Prevent first mouse drag event from being emitted twice (#1553).
- Support optional arguments in translate and rotate statements in SVG Import
  (#1487).
- Make sure SVG import always applies imported attributes (#1416).
- Correctly handle `Raster` images positions in SVG import (#1328).
- Improve documentation for `Shape#toPath()` (#1374).
- Improve documentation of hit test coordinate system (#1430).
- Add documentation for `Item#locked` (#1436).
- Support Webpack bundling in Node.js server (#1482).
- Travis CI: Get unit tests to run correctly again.
- Travis CI: Remove Node 4 and add Node 9.

### Added

- `Curve#getTimesWithTangent()` and `Path#getOffsetsWithTangent()` as a way to
  get the curve-times / offsets where the path is tangential to a given vector.
- `Raster#smoothing` to control if pixels should be blurred or repeated when a
  raster is scaled up (#1521).
- Allow `PaperScript`to export from executed code, supporting `export default`,
  named exports, as well as `module.exports`.

## `0.11.5`

### Fixed

- Fix `Curve#isSelected()` to correctly reflect the state of `#handle1` (#1378).
- Key Events: Fix auto-filling issue on Chrome (#1358, #1365).
- Boolean: Check that overlaps are on the right path (#1321).
- Boolean: Add better filtering for invalid segments (#1385).

### Added

- Node.js: Add JPEG support to exportFrames() (#1166).

## `0.11.4`

### Changed

- Node.js: Add support for v8, and keep testing v4, v6, v7 in Travis CI.

## `0.11.3`

### Fixed

- Mouse Events: Fix item-based `doubleclick` events (#1316).
- Overhaul the caching of bounds and matrix decomposition, improving reliability
  of `Item#rotation` and `#scaling` and fixing situations caused by wrongly
  caching `Item#position` and `#bounds` values.
- Prevent consumed properties in object literal constructors from being set on
  the instance.

### Changed

- Make all functions and accessors enumerable on all Paper.js classes.

## `0.11.2`

### Fixed

- PaperScript: Fix a parsing error in math operations without white-space
  (#1314).

## `0.11.1`

### Fixed

- Bring back deactivation of Node.js modules on browsers. This has most probably
  broken Webpack bundling in `0.11.0`.

## `0.11.0`

### Changed

- Separate `paper` module on NPM into: `paper`, `paper-jsdom` and
 `paper-jsdom-canvas` (#1252):
    - `paper` is the main library, and can be used directly in a browser
      context, e.g. a web browser or worker.
    - `paper-jsdom` is a shim module for Node.js, offering headless use with SVG
      importing and exporting through [jsdom](https://github.com/tmpvar/jsdom).
    - `paper-jsdom-canvas` is a shim module for Node.js, offering canvas
      rendering through [Node-Canvas](https://github.com/Automattic/node-canvas)
      as well as SVG importing and exporting through
      [jsdom](https://github.com/tmpvar/jsdom).

### Added

- PaperScript: Support newer, external versions of Acorn.js for PaperScript
  parsing, opening the doors to ES 2015 (#1183, #1275).
- Hit Tests: Implement `options.position` to hit `Item#position` (#1249).
- Split `Item#copyTo()` into `#addTo()` and `#copyTo()`.

### Fixed

- Intersections: Bring back special handling of curve end-points (#1284).
- Intersections: Correctly handle `Item#applyMatrix = false` (#1289).
- Boolean: Bring back on-path winding handling (#1281).
- Boolean: Pass on options in `PathItem#subtract(path, options)` (#1221).
- Boolean: Implement `options.trace` as a way to perform boolean operations on
  the strokes / traces instead of the fills / areas of the involved paths
  (#1221).
- Boolean: Always return `CompoundPath items (#1221).
- Style: Fix handling of gradient matrices when `Item#applyMatrix = false`
  (#1238).
- Style: Prevent cleaning pre-existing styles when setting `Item#style` to an
  object (#1277).
- Mouse Events: Only handle dragItem if the hitItem responds to `mousedrag`
  events (#1247, #1286).
- Bounds: Clear parent's bounds cache when item's visibility changes (#1248).
- Bounds: Fix calculation of internal bounds with children and
  `Item#applyMatrix = false` (#1250).
- Hit-Tests: Fix issue with non-invertible matrices ( #1271).
- SVG Import: Improve handling of sizes in percent (#1242).
- Rectangle: Improve handling of dimension properties, dealing better with
  `left` / `top` / `right` / `bottom` / `center` values (#1147).
- Scene Graph: Do not allow inserting same item as child multiple times.
- Path: Fix handling of `insert = false` in `new Path.Constructor()`
  initialization (#1305).
- PaperScript: Fix positive unary operator.
- Docs: Fix parameter sequence in Matrix constructor (#1273).
- Docs: Add documentation for options.bound and options.matrix in `#exportSVG()`
  (#1254).
- Docs: Fix wrong `@link` references to bean properties.

## `0.10.3`

### Changed

- Node.js: Support v7, and keep testing v4 up to v7 in Travis CI.
- Node.js: Loosely couple Node.js / Electron code to `Canvas` module, and treat
  its absence like a headless web worker context in the browser (#1103).
- Clean up handling of `Item#_set()`, `#set()` and `#initialize()`:
    - Use `#_set()` for actually setting internal properties, e.g. on `Point`,
      `Size`, so that derived classes can reuse other parts without having to
      override each individual function (e.g. in `SegmentPoint`)
    - Define `#set()` as a shortcut to `#initialize()` on all basic types, to
      offer the same amount of flexibility when setting values, accepting object
      literals as well as lists of value arguments.
- SVG Export: Add support for shorter `h` / `v` commands for horizontal /
  vertical lines in SVG output.
- JSON Import / Export: Implement new and shorter segments array notation:
    - Close paths by including `true` as the last entry
    - Allow nested segment arrays to be passed to `PathItem.create()` as well as
      the `CompoundPath` constructor to create all sub-paths.
- Reflect `View#zoom` and `View#center` through matrix decomposition, and
  implement additional decomposed properties such as `#scaling` and `#rotation`.
- Reduce various internal epsilon values for general improved precision while
  maintaining reliability.
- Split `PathItem#resolveCrossings()` into `#resolveCrossings()` and
  `#reorient()` (#973).

### Added

- Implement `Path#divideAt(location)`, in analogy to `Curve#divideAt(location)`.
- Add `PathItem#compare()` as a way to compare the geometry of two paths to see
  if they describe the same shape, handling cases where paths start in different
  segments or use different amounts of curves to describe the same shape.
- Implement `Curve#hasLength()` as an optimized check for curve-length (#1109).
- Implement `Curve#classify()` to determine the type of cubic Bézier curve via
  discriminant classification, based on an approach described by Loop and Blinn,
  and use it to simplify curve self-intersection handling (#773, #1074, #1235).
- Add `Curve.getPeaks()` as a fast way to retrieve points that are often similar
  to the more costly curvature extrema for use in curve offsetting.
- Expose `Curve. getCurveLineIntersections()` for use in curve offsetting.
- Add `Line.getDistance()` and use it in `Curve.getOverlaps()` (#1253).
- Implement `Segment#isSmooth()` and use it in handling of stroke-joins.
- Bring back caching of `Item#rotation` and `#scaling`, but only allow matrix
  decomposition-based properties on items with `#applyMatrix = false`
  (#1004, #1177).

### Fixed

- Many improvements to boolean operations:
    - Improve performance of boolean operations when there no actual crossings
      between the paths, but paths may be contained within each other.
    - Improve path tracing approach by implementing a branching structure and
      sorting segments according to their reliability as starting points for
      traces (#1073).
    - Improve calculation and reliability of winding contributions.
    - Improve code that resolves crossings and reorients compound-paths based
      on how the sub-paths are nested.
    - Fix issue where unite operation wrongly fills inner path (#1075).
    - Better handle cases where one `Path` is open and the other closed (#1089).
    - Solve `null` exceptions during complex boolean operations (#1091).
    - Improve bidirectional curve-time rescaling in `divideLocations()` (#1191).
    - Improve handling of intersections between touching curves (#1165).
    - Improve reliability of `Curve#getIntersections()` (#1174).
    - Fix `getOverlaps()` to always return overlaps in correct sequence (#1223).
    - Improve handling of multiple crossings on the same curve.
- Improve tangent direction handling in `CurveLocation#isCrossing()`, by finding
  unambiguous vectors, taking the curve's loop, cusp, inflection, and "peak"
  points into account (#1073, #1074).
- Prevent `Path#getStrokeBounds(matrix)` from accidentally modifying segments
  (#1102).
- Improve compatibility with JSPM (#1104).
- SVG Import: Correctly handle multiple sequential move commands (#1134).
- SVG Export: Properly handle generated IDs (#1138).
- SVG Export: Support multiple gradient offsets at 0 (#1241).
- Fix imprecision in `Numerical.findRoot()` (#1149).
- PaperScript: Prevent invalid JavaScript in assignment operators (#1151).
- Hit Tests: Improve handling of SymbolItem in#hitTestAll() (#1199).
- Hit Tests: Fix stroke hit-testing for rounded shape items (#1207).
- Fix matrix cloning for groups with `#applyMatrix = false` ( #1225).
- Correctly handle offset in `Curve#divideAt(offset)` (#1230).
- Fix issue with `Curve#isStraight()` where handles were checked incorrectly
  for collinearity (#1269). 
- Fix `Line#getSide()` imprecisions when points are on the line.
- Docs: Fix documentation of `Project#hitTestAll()` (#536).
- Docs: Improve description of `option.class` value in `Project#hitTest()`
  (#632).

### Removed

- Remove `Numerical.TOLERANCE = 1e-6` as there is no internal use for it
  anymore.

## `0.10.2`

### Fixed

- Get published version to work correctly in Bower again.

## `0.10.1`

### Fixed

- Correct a few issues with documentation and NPM publishing that slipped
  through in the `0.10.0` release.

## `0.10.0`

### Preamble

This is a huge release for Paper.js as we aim for a version `1.0.0` release
later this year. As of this version, all notable changes are documented in the
change-log following common [CHANGELOG](http://keepachangelog.com/) conventions.
Paper.js now also adheres to [Semantic Versioning](http://semver.org/).

There are many items in the changelog (and many more items not in the changelog)
so here a high-level overview to frame the long list of changes:

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
  `PathItem#unite()`, `#subtract()`, `#intersect()`, `#exclude()`, `#divide()`:
    - Improve handling of self-intersecting paths and non-zero fill-rules.
    - Handle operations on identical paths.
    - Improve handling of near-collinear lines.
    - Handle self-intersecting paths that merely "touch" themselves.
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
    - `Curve#getTangentAt(time, true)` → `#getTangentAtTime(time)`
    - `Curve#getNormalAt(time, true)` → `#getNormalAtTime(time)`
    - `Curve#getCurvatureAt(time, true)` → `#getCurvatureAtTime(time)`
    - `CurveLocation#parameter` → `#time`
    - `Path#split(offset/location)` → `#splitAt(offset/location)`
- Significant improvement of reliability of bezier fat-line clipping code in
  `PathItem#getIntersections()` and `#getCrossings()`.
- `PathItem#smooth()` now accepts an `options.type` string  specifying which
  smoothing algorithm to use: `'asymmetric'` (default), `'continuous'`,
  `'catmull-rom'`, and `'geometric'` (#338).
- `PathItem#flatten()`: argument has been changed from `tolerance` (maximum
  allowed distance between points) to `flatness` (maximum allowed error) (#618).
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
- Switch to the new HTML5 Page Visibility API when detecting invisible documents
  and canvases.
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
- `Matrix` properties `#b` and `#c` have been reversed to match common standard.
- `#importSVG()`: improve handling of style inheritance for nested `<defs>`.
- Move `PaperScript#execute()` URL argument into `options.url` (#902).
- PaperScript: Only translate `==` to `equals() calls for `Point`, `Size` and
  `Color` (#1043).

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
- Add `tolerance` argument to `Path#join(path, tolerance)`.
- Add `Curve#getOffsetAtTime(time)`, as the reverse of
  `Curve#getTimeAt(offset)`.
- Add `Raster#loaded` to reflect the loading state of its image.

### Fixed

- Fix calculations of `Item#strokeBounds` for all possible combinations of
  `Item#strokeScaling` and `Item#applyMatrix` for `Path`, `Shape` and
  `SymbolItem`, along with correct handling of such strokes in Item#hitTest()
  (#697, #856, #1014). 
- Make new code-base unified for Node.js/browser work with module bundlers like
  Webpack (#986).
- Improve hit-testing and `#contains()` checks on path with horizontal lines
  (#819).
- Improve reliability of `Path#getInteriorPoint()` in rare edge-cases.
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
- Consistently interpret curves as straight or not-straight (#838).
- Switch blendMode to 'lighter' in Candy Crash example for better performance
  (#453).
- Don't block touch actions when using paper in JavaScript mode (#686).
- Convert touch event coordinates to project coordinates (#633).
- Fix exceptions when a top-level layer is selected.
- Don't allow layers to turn up in hit-tests (#608).
- Maintain `Raster#source` correctly on Node.js (#914).
- Boolean operations correctly handle open `Path` items within `CompoundPath`
  (#912).
- Don't modify an array of child items passed to `CompoundPath#insertChildren()`
  when it is a child items array of a `CompoundPath`.
- Correctly handle `#strokeScaling` in `Shape` hit-tests (#697).
- Support clip-masks in hit-testing (#671).
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
- `#importSVG()` handles `onLoad` and `onError` callbacks for string inputs that
  load external resources (#827).
- `#importJSON()` and `#exportJSON()` now handle non-`Item` objects correctly
  (#392).
- `#exportSVG()` now exports empty paths if used as a clip-mask.
- `#importJSON()` no longer generates callstack exceeded exceptions (#764).
- Fix problems with group selection structures after `Group#importJSON()`
  (#785).
- Fix an issue in `Item#importJSON()` where `#parent` is `null` when calling it
  on existing, already inserted items (#1041).
- Correct issue when using paper-core in Node.js (#975).
- Fix `event.delta` on mousedrag events (#981).
- Improve handling of XML attribute namespaces for IE's XMLSerializer() (#984).
- Make sure `Item#removeChildren()` fully removes children (#991).
- Improve handling of event propagation on `View` and `Item` (#995).
- `#importSVG()`: Improve handling of viewBox.
- Make sure all named item lookup structures are kept in sync (#1009).
- Convert absolute local gradient URLs to relative ones (#1001).
- Fix TypeError in `Path#unite()` (#1000).
- Allow the selection of a `Path` item's bounds without selecting the segments
  (#769).
- Fix wrong indices in `Item#insertChildren()`, when inserting children that
  were previously inserted in the same parent (#1015).
- Add capability to `PathItem#closePath()` to handle imprecise SVG data due to
  rounding (#1045).
- Improve reliability of fat-line clipping for curves that are very similar
  (#904).
- Improve precision of `Numerical.solveQuadratic()` and
  `Numerical.solveCubic()` for edge-cases (#1085).

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

- `#windingRule` on `Item` and `Style` → `#fillRule`
- `Curve#getNormalAt(time, true)` → `#getNormalAtTime(true)`
- `Curve#divide()` → `#divideAt(offset)` / `#divideAtTime(time)`
- `Curve#split()` → `#splitAt(offset)` / `#splitAtTime(time)`
- `Curve#getParameterAt(offset)` → `#getTimeAt(offset)`
- `Curve#getParameterOf(point)` → `getTimeOf(point)`
- `Curve#getPointAt(time, true)` → `#getPointAtTime(time)`
- `Curve#getTangentAt(time, true)` → `#getTangentAtTime(time)`
- `Curve#getNormalAt(time, true)` → `#getNormalAtTime(time)`
- `Curve#getCurvatureAt(time, true)` → `#getCurvatureAtTime(time)`
- `CurveLocation#parameter` → `#time`
- `Path#split(offset/location)` → `#splitAt(offset/location)`
- `Symbol` → `SymbolDefinition`
- `PlacedSymbol` → `SymbolItem`
- `Symbol#definition` → `SymbolDefinition#item`
- `PlacedSymbol#symbol` → `SymbolItem#definition`
- `Project#symbols` → `#symbolDefinitions`
- `Matrix#concatenate` → `#append`
- `Matrix#preConcatenate` → `#prepend`
- `Matrix#chain` → `#appended`
- `GradientStop#rampPoint` → `#offset`
