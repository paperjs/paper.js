# Migrating from Paper.js 0.17 to 1.0

Paper.js 1.0 is a rewrite of the library as ES modules in TypeScript. Most
scripts run as they are, but the way the library is loaded changed, the `getX()`
/ `setX()` methods are gone in favor of properties, and some argument forms and
deprecated APIs are removed. This guide lists every change that can break
existing code, with the old and the new form side by side. The
[change log](CHANGELOG.md) lists everything that is new.

## Loading the library

The package is ES modules only, with an `exports` map, and needs Node.js 22.22
or later. Its entries:

| Entry                           | Contains                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| `paper`                         | the core, with `paper` as its default export, the first scope |
| `paper/core`                    | the core's classes, without a scope created at import         |
| `paper/paperscript`             | PaperScript, on top of the core                               |
| `paper/node`                    | the core on Node.js, see below                                |
| `paper/hosted`                  | hosted projects, for hosts that keep their own document       |
| `paper/svg`                     | SVG import and export, for `use(svg)` with `paper/core`       |
| `paper/boolean`, `paper/offset` | the boolean operations and offsetting on plain path data      |

```js
// 0.17
const paper = require('paper')

// 1.0
import paper, { Path, Point } from 'paper'
// CommonJS still works through Node.js's require() of ES modules:
const paper = require('paper')
```

- Deep imports of files that the `exports` map doesn't list stop working.
- The AMD export is gone.
- Without a bundler, the script files remain: `dist/paper-core.js`,
  `dist/paper-full.js` with PaperScript, and `dist/paper-hosted.js` with
  PaperScript and hosted projects, each also as `.min.js`. They set the global
  `paper` as before.
- The examples and the docs no longer ship in the package.
- The code targets ES2022 and evergreen browsers.

## PaperScript

PaperScript is its own entry. `dist/paper-full.js` includes it as before.

```js
// 0.17: part of the library
paper.execute(code)

// 1.0
import paper from 'paper'
import 'paper/paperscript'
paper.execute(code)
```

- Importing `paper/paperscript` no longer runs the page's
  `<script type="text/paperscript">` tags. Call `PaperScript.load()` once the
  page has loaded. `dist/paper-full.js` still runs them on its own.
- Code is parsed by acorn 8 as a module, so current JavaScript syntax works, and
  strict-mode errors apply at parse time, e.g. for `with` and legacy octals.
- Scripts with `src` load through `fetch`, asynchronously.
- Code is evaluated through `eval` in all browsers, so a content security policy
  has to allow `unsafe-eval`. In Chrome, `unsafe-inline` was needed before.
- `PaperScript.execute(code, scope, options)` takes the options `url`, `source`,
  `sourceMaps`, `offset`, `paperFeatures`, `handlers`, `evaluate` and `load`,
  and returns the script's exports, or a promise of them for code with top-level
  `await`.

## Node.js

`paper/node` replaces the `paper-jsdom` and `paper-jsdom-canvas` packages. It
renders through happy-dom and `@napi-rs/canvas`, which are optional peer
dependencies, instead of jsdom and node-canvas.

```js
// 0.17
const paper = require('paper-jsdom-canvas')

// 1.0
import paper, { GlobalFonts } from 'paper/node'
```

- `CanvasView#exportFrames()` and `exportImage()` return promises, in place of
  the `onComplete` option and the `callback` argument.

    ```js
    // 0.17
    view.exportImage('out.png', () => console.log('done'))

    // 1.0
    await view.exportImage('out.png')
    ```

- A view with `onFrame` no longer keeps the process running.
- The PDF and SVG canvases of node-canvas, the stream methods, and the
  `require()` hook for `.pjs` files are gone. The README shows how to run
  PaperScript on Node.js.
- Fonts are registered with `GlobalFonts`, exported by `paper/node`.

## Properties instead of getter and setter methods

The argument-less methods that 0.17 generated for its properties are gone. Use
the properties, which were there before too.

| 0.17                                        | 1.0                                  |
| ------------------------------------------- | ------------------------------------ |
| `item.getPosition()`, `item.setPosition(p)` | `item.position`, `item.position = p` |
| `item.isVisible()`                          | `item.visible`                       |
| `path.getSegments()`                        | `path.segments`                      |
| `point.getLength()`, `point.getX()`         | `point.length`, `point.x`            |
| `view.getViewSize()`                        | `view.viewSize`                      |

- Getters that take arguments stay methods, e.g. `item.getBounds(options)`,
  `path.getPointAt(offset)`.
- Predicates stay methods too, e.g. `point.isZero()`, `path.isEmpty()`,
  `segment.isSmooth()`.
- `PathItem#getInteriorPoint()` is gone, see below, and `Raster#getElement()` is
  the `element` property.

## Arguments

Methods no longer accept the numbers of points, sizes and rectangles spread over
several arguments. Pass one point, size or rectangle per argument, as an object
or an array.

| 0.17                                      | 1.0                                             |
| ----------------------------------------- | ----------------------------------------------- |
| `new Segment(10, 20)`                     | `new Segment([10, 20])`                         |
| `path.cubicCurveTo(x1, y1, x2, y2, x, y)` | `path.cubicCurveTo([x1, y1], [x2, y2], [x, y])` |
| `item.hitTest(x, y, options)`             | `item.hitTest([x, y], options)`                 |
| `item.rotate(45, x, y)`                   | `item.rotate(45, [x, y])`                       |
| `new Path.Circle(x, y, radius)`           | `Path.circle([x, y], radius)`                   |
| `new Rectangle(point, width, height)`     | `new Rectangle(point, [width, height])`         |
| `color.add(0.1, 0.2, 0.3)`                | `color.add([0.1, 0.2, 0.3])`                    |

These forms stay:

- `(x, y)` where a point or size is the only argument: `path.moveTo(10, 20)`,
  `point.add(1, 2)`, `item.translate(10, 0)`.
- The constructors `new Point(x, y)`, `new Size(width, height)`,
  `new Rectangle(x, y, width, height)` and `new Rectangle(point, size)`.
- Single numbers, e.g. `point.multiply(2)`.
- The documented pairs `scale(hor, ver, center)`, `shear()`, `skew()`,
  `getPixel(x, y)` and `setPixel(x, y, color)`.
- The object forms of the factories, e.g.
  `Path.circle({ center, radius, fillColor })`.

Some argument forms read differently now:

- `path.add(0, 0)` and `path.insert()` read every argument as a segment, so this
  adds two segments at the origin.
- `path.arcTo(to, radius, rotation, clockwise, large)` reads a number radius as
  both radii, and draws the SVG form whenever a rotation is given.
- `new Path({ x, y, strokeColor })` makes its segment of `x` and `y` and sets
  the other properties, which were dropped before.

## Factories for paths and shapes

The constructors of predefined paths and shapes are deprecated in favor of
factory methods. They still work in 1.0.

```js
// 0.17
new Path.Circle({ center: [50, 50], radius: 20 })
new Shape.Rectangle(rectangle)

// 1.0
Path.circle({ center: [50, 50], radius: 20 })
Shape.rectangle(rectangle)
```

The factories are `Path.line()`, `circle()`, `rectangle()`, `ellipse()`,
`arc()`, `regularPolygon()` and `star()`, and `Shape.circle()`, `rectangle()`
and `ellipse()`. `Path.RoundRectangle` and `Path.Oval` are gone: use
`Path.rectangle({ rectangle, radius })` and `Path.ellipse()`.

## Classes

`Item.extend()` is gone. Subclass with `class extends`, and register the class
with `registerClasses()` for it to come back from JSON.

```js
// 0.17
const Arrow = Path.extend({
    _class: 'Arrow',
    initialize: function (props) {
        Path.call(this, props)
    }
})

// 1.0
import { Path, registerClasses } from 'paper'
class Arrow extends Path {}
registerClasses({ Arrow })
```

`paper.Symbol` and `paper.PlacedSymbol`, the aliases deprecated since 0.10, are
gone: use `SymbolDefinition` and `SymbolItem`.

## Removed APIs

| Removed                                                                                         | Use instead                                              |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `Emitter#attach()`, `detach()`, `fire()`                                                        | `on()`, `off()`, `emit()`                                |
| `Item#appendTop()`, `appendBottom()`                                                            | `addChild()`, `insertChild(0, item)`                     |
| `Item#moveAbove()`, `moveBelow()`                                                               | `insertAbove()`, `insertBelow()`                         |
| `Item#transformContent`                                                                         | `applyMatrix`                                            |
| `Item#rasterize(resolution, insert)`                                                            | `rasterize({ resolution, insert })`                      |
| `Item#fitBounds(rectangle, true)`                                                               | `fitBounds(rectangle, 'cover')`                          |
| the `type` option of `matches()` and `hitTest()`                                                | the `class` option                                       |
| the styles `leading`, `tracking`, `font`, `windingRule`                                         | `lineHeight`, `letterTracking`, `fontFamily`, `fillRule` |
| `Project#options`                                                                               | `paper.settings`                                         |
| `Project#symbols`                                                                               | `symbolDefinitions`                                      |
| `Shape#shape`, `SymbolDefinition#definition`, `SymbolItem#symbol`                               | `type`, `item`, `definition`                             |
| `Raster#ppi`                                                                                    | `resolution`                                             |
| `GradientStop#rampPoint`                                                                        | `offset`                                                 |
| `CurveLocation#parameter`, `Curve#getParameterAt()`, `getParameterOf()`, the `isTime` arguments | `time`, `getTimeAt()`, `getTimeOf()`                     |
| `Path#split(index, time)`                                                                       | `splitAt(location)`                                      |
| `Event#timeStamp`                                                                               | `time`                                                   |
| `View#draw()`                                                                                   | `update()`                                               |
| `View#scrollBy(delta)`                                                                          | `translate()` with the negated delta                     |
| `PaperScope#browser`                                                                            | `agent`                                                  |
| `paper.DomEvent`, `DomElement`, `Http`                                                          | the DOM's own APIs                                       |
| the properties `nearestLocation`, `nearestPoint`, `intersections`, `crossings` of `Path`        | the methods of the same names                            |
| the arguments of `PathItem#getPathData()`                                                       | `pathData`                                               |
| the range of `Path#clear(start, end)`                                                           | `removeSegments(start, end)`                             |
| the `onExport` / `onImport` options of SVG                                                      | `processNode` / `processItem`                            |
| `PathItem#interiorPoint`                                                                        | none                                                     |
| the static methods of `Curve` on curve values                                                   | the methods of curves, e.g. `curve.getPointAtTime(t)`    |
| `Curve#getValues(matrix)`, `Curve.getValues()`                                                  | `curve.values`                                           |

## Changed behavior

**Geometry and items**

- Rectangles and ellipses start at the segment SVG starts them with: the top
  left for rectangles, the right for ellipses. Dashes then match exported
  `<rect>` and `<ellipse>` elements.
- Symbol definitions keep their items in place instead of centering them, and
  the `dontCenter` argument is gone. `place(point)` still puts the item's origin
  at the point.
- `Item#pivot` is read and written in the coordinates of the item's parent, as
  `position` is. Nothing changes for items that apply their matrix, such as
  paths and groups. For shapes, rasters, symbol items, text and items with
  `applyMatrix: false`, convert a pivot in the item's own coordinates with
  `localToGlobal()`.
- `Item#getBounds()` without arguments returns a plain `Rectangle`. `bounds` and
  `strokeBounds` return linked ones, as before.
- `Item#replaceWith()` returns a boolean instead of the item, and
  `Matrix#isInvertible()` a boolean instead of the determinant.
- `Item#removeChildren(start, null)` removes the children up to the end.
- A style set on a `SymbolItem` now fills in the properties that its
  definition's content leaves unset, as SVG's `<use>` does. Before, it had no
  effect.
- A `null` `width` or `dashArray` in the options of `offset()`, `outline()` and
  `dash()` falls back to the item's.

**SVG**

- `Project#importSVG()` of SVG that Paper.js exported makes its layers the
  project's layers again, and returns them as an array instead of a group.
- A `<use>` of an element keeps that element's own styles, and passes on its own
  only where the element sets none, as browsers draw it.

**Mouse and tool events**

- Views handle the DOM's pointer events instead of touch and mouse events, so a
  mouse or pen works on touch devices too. Paper.js's own event names stay
  `mousedown`, `mousedrag` and so on.
- `event.event` is a `PointerEvent`. Code that reads its `touches` needs to
  change. `MouseEvent` and `ToolEvent` have `button`, `buttons`, `pointerType`
  and `pressure` of their own.
- Views listen on their own element and capture the pointer while it is pressed,
  instead of listening on the document. While nothing is pressed, a view no
  longer sees moves over other elements.
- Items and views receive `mouseleave` when a touch on them ends, and views
  receive `mouseenter` once as the pointer enters, not again after every press
  and release.

**Hosted projects**

- `Project#takeChanges()` and `hasChanges()` also report items whose `data` a
  script changed in place.
- Content that loads from the host takes the style that the host gives it, not
  the project's current style.
