### News

- Paper.js 1.0 is written in TypeScript as ES modules, and ships its own type
  declarations. `paper` is the core, `paper/paperscript` adds PaperScript,
  `paper/node` runs it on Node.js and `paper/hosted` adds hosted projects. The
  script files `dist/paper-core.js` and `dist/paper-full.js` remain for use
  without a bundler.

### Added

- Add the factory methods `Path.line()`, `Path.circle()`, `Path.rectangle()`,
  `Path.ellipse()`, `Path.arc()`, `Path.regularPolygon()` and `Path.star()`,
  and `Shape.circle()`, `Shape.rectangle()` and `Shape.ellipse()`.
- Add the `paper/node` entry, which renders through happy-dom and
  `@napi-rs/canvas`, both optional peer dependencies, and exports
  `GlobalFonts` to register fonts (#2035).
- Add a `new Color(type, ...components)` form, e.g.
  `new Color('hsb', 0, 1, 1)`.
- Support current JavaScript syntax in PaperScript, which is parsed by acorn 8
  as a module.
- Document `new Group(item, item, …)` and `new Layer(item, item, …)`.

### Changed

- `Project#importSVG()` makes the layers of SVG content that Paper.js exported
  the layers of the project again, and returns them as an array instead of a
  group. Content beside the layers goes into a layer of its own, below them
  (#483).
- Rectangles and ellipses start at the segment SVG starts them with, the top
  left for rectangles and the right for ellipses, so dashes match exported
  `<rect>` and `<ellipse>` elements (#601).
- Symbol definitions keep their items in place instead of centering them, and
  the `dontCenter` argument goes (#2435).
- `Path#add()` and `Path#insert()` read every argument as a segment, so
  `path.add(0, 0)` adds two segments at the origin.
- `Path#arcTo(to, radius, rotation, clockwise, large)` reads a number radius
  as both radii, and draws the SVG form whenever a rotation is given.
- `new Path({ x, y, strokeColor })` makes its segment of `x` and `y` and sets
  the other properties, which were dropped before.
- A `null` `width` or `dashArray` in the options of `offset()`, `outline()`
  and `dash()` falls back to the item's.
- `Item#getBounds()` without arguments returns a plain `Rectangle`. The
  `bounds` and `strokeBounds` properties return linked ones, as before.
- `Item#replaceWith()` returns a boolean instead of the item, and
  `Matrix#isInvertible()` a boolean instead of the determinant.
- `PathItem#getInteriorPoint()` becomes the `interiorPoint` property, and
  `Raster#getElement()` the `element` property.
- PaperScript code is parsed as a module, so strict-mode errors apply at parse
  time, e.g. for `with` and legacy octals. Scripts with `src` load through
  `fetch`, asynchronously, and `PaperScope#execute()` moves to the
  `paper/paperscript` entry.
- On Node.js, `CanvasView#exportFrames()` and `CanvasView#exportImage()` return
  promises, and a view with `onFrame` no longer keeps the process running.
- The package is ES modules only, with an `exports` map, and needs Node.js
  22.22 or later. The examples and the docs no longer ship in it.

### Deprecated

- Deprecate the constructors `new Path.Line()`, `new Path.Circle()`,
  `new Path.Rectangle()`, `new Path.Ellipse()`, `new Path.Arc()`,
  `new Path.RegularPolygon()` and `new Path.Star()`, and `new Shape.Circle()`,
  `new Shape.Rectangle()` and `new Shape.Ellipse()`, in favor of the factory
  methods.

### Removed

- Remove the argument forms that spread the numbers of points, sizes and
  rectangles, e.g. `new Segment(x, y)`, `path.cubicCurveTo(x1, y1, …)`,
  `item.hitTest(x, y, options)`, `item.rotate(angle, x, y)`,
  `new Path.Circle(x, y, radius)` and `color.add(r, g, b)`: pass one point,
  size or rectangle per argument, as an object or an array.
- Remove the deprecated `Emitter#attach()`, `detach()` and `fire()`,
  `Item#transformContent`, `appendTop()`, `appendBottom()`, `moveAbove()`,
  `moveBelow()` and `rasterize(resolution, insert)`, the boolean `fit` of
  `Item#fitBounds()`, the `type` option of `matches()` and `hitTest()`, the
  style properties `leading`, `tracking`, `font` and `windingRule`,
  `Project#options` and `symbols`, `Shape#shape`,
  `SymbolDefinition#definition`, `SymbolItem#symbol`, `Raster#ppi`,
  `Gradient#rampPoint`, `CurveLocation#parameter`, the `isTime` arguments and
  `getParameterAt()` / `getParameterOf()` of `Curve`,
  `Path#split(index, time)`, `Path.RoundRectangle`, `Path.Oval`,
  `Event#timeStamp`, `View#draw()` and `scrollBy()`, the `onExport` and
  `onImport` aliases of the SVG options, and `PaperScope#browser`.
- Remove `Item.extend()` and `HostItem.extend()`: subclasses use
  `class extends`, and register for JSON with `registerClasses()`.
- Remove `paper.DomEvent`, `paper.DomElement` and `paper.Http`,
  `Curve#values` (use `getValues()`), the properties `nearestLocation`,
  `nearestPoint`, `intersections` and `crossings` of `Path` (their methods
  stay), and the arguments of `PathItem#getPathData()` (use `pathData`).
- Remove the support of node-canvas and jsdom with their PDF and SVG canvases
  and stream methods, the `paper-jsdom` and `paper-jsdom-canvas` packages,
  and the CommonJS and AMD exports.

### Fixed

- Fix `raster.width = …`, which lost the raster's content.
- Fix `Path.Rectangle([x, y, width, height], radius)`, which created a
  rectangle of 2 by 2.
- Fix the named forms of the path and shape factories, which left `x`,
  `width` or `center` behind as properties of the item.
- Fix `CompoundPath#interpolate()` between compound paths with fewer children,
  which threw.
- Fix the hit-test options of `CompoundPath`, which lost inherited keys.
- Fix `Segment#interpolate()` reporting four changes to its path instead of
  one.
