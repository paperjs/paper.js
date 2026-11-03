### Added

- Add `PathItem#offset(distance, options)`, which grows, shrinks or offsets
  paths and compound paths with miter, round or bevel corners (#371).
- Add `PathItem#outline(options)`, which turns the stroke of a path item into a
  filled path item, with its joins, caps and dashes (#371).
- Add `PathItem#dash(options)`, which cuts a stroke into its dashes as the
  canvas draws them, as a group of open paths.
- Add stroke profiles, `Path#strokeProfile`: stops along a path that change
  the width, aspect and angle of the pen that draws its stroke, see
  `StrokeProfileStop`. Not yet supported: compound paths, `strokeScaling` off,
  and `offset()`, boolean operations, `interpolate()` and SVG (#2505, #2506,
  #2507).
- Add live effects, `Item#effects`, which change what an item draws without
  changing the item, starting with `offset` and `outline`. `Effect` defines new
  ones, and `Item#previewBounds` measures what they draw.
- Add pattern colors from a `PatternDefinition`, which tiles a raster or any
  other item, for fills and strokes, also in SVG and JSON (#829).
- Add `Color#aspect` for elliptical radial gradients, and transform gradients
  exactly with their items, also when these scale unevenly or shear (#1744).
- Add `Group#buffered`, which keeps a group's drawing in a canvas until the
  group changes, for large groups that rarely do (#377).
- Add `Item#onDraw` and `Item#onDrawSelection`, which draw beneath an item or
  its selection, or replace them, also as class-level handlers such as
  `Path.onDraw`.
- Add `PathItem#arcAround(center, angle)` and `PathItem#arcTowards(to)`
  (#1052).
- Support `options` in `PathItem#simplify()`, with `tolerance` and a range of
  segments through `from` and `to`, as in `PathItem#smooth()` (#2501).
- Export and import the names and data of segments in SVG, as a
  `data-paper-segments` attribute (#2398).
- Add `Project#onActivate` and `Project#onDeactivate`, also as
  `Project.onActivate` and `Project.onDeactivate` for all projects.
- Pass the import attributes of `import … with { … }` in PaperScript on to the
  loader in `options.load` of `PaperScript.execute()`.
- Hosted projects, see `Project#host`:
  - Share symbol and pattern definitions between items, referred to by their
    keys in JSON, and let scripts create new ones.
  - Load the pixels of rasters from the host on first access.
  - Load items in full when they move into a project with another host.
  - Call `Item#onDraw` and `Item#onDrawSelection`, through `Project#draw()`.

### Changed

- Run the library in strict mode, which makes `Path#getNearestPoint()` about
  14% and `Item#hitTest()` about 6% faster. PaperScript still runs in sloppy
  mode.
- Draw items with opacity, blend modes or shadows about twice as fast (#377).
- Make `PaperScope#project` an accessor, so that PaperScript's `project`
  follows the active project, as `view` does.
- Emit `deactivate` when the active project or tool is removed.
- Write the definition of symbol items to JSON as `definition` instead of
  `symbol`, which still loads.
- Let hosted linked text that moves into a project with another host bring a
  copy of its story along (#2462, #2463).

### Fixed

- Fix boolean operations that could lose areas or whole results, at straight
  curves, near-coincident crossings, curves running back and forth along a
  line, shallow crossings and merged vertices.
- Measure curve lengths precisely near cusps, where `Curve#getLength()` and
  `Path#getPointAt()` were off by up to 6%.
- Find the nearest point on curves that cover a lot of ground between their
  samples, in `#getNearestPoint()` and the methods using it.
- Fix `PathItem#smooth()` with a negative `to` on closed paths, which threw.
- Fix `PathItem#arcTo()` with tiny arcs, which missed their end point.
- Keep the attributes of compound paths in `CompoundPath#reduce()` when a
  single child is left.
- Return `false` from `CompoundPath#simplify()` without children.
- Keep the stripes of linear gradients across them when transforming them
  unevenly (#1744).
- Export the gradients of items that keep their matrix to SVG in the
  coordinates of their elements (#2410).
- Honor the `bounds` and `matrix` options of `Item#exportSVG()`.
- Keep `Group#isolated` and `Group#buffered` in clones.
- Keep the content of rasters when setting `Raster#size`.
- Load `new Raster(source)` from a string where there is no document, as in
  workers.
- Draw the segments of selected paths again by default (#1899).
- Count the duration of `Item#tween()` from the first frame.
- PaperScript: compile `++` and `--` correctly wherever they appear, keep
  keywords apart from replaced expressions in minified code, report the right
  lines in stack traces on V8, and return an object from `compile()` for empty
  code.
- Hosted projects: leave items that moved away out of `Project#takeChanges()`,
  and turn off `View#autoUpdate` when setting `Project#host`.
- Let Angular's esbuild builder bundle Paper.js for browsers (#2035).
