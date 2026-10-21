# Change Log

## Unreleased

### Added

- Load text items from the host of a hosted project, see `Project#host`, with
  their stories, and the paths and settings of path and area text, and let
  hosts lay them out as their documents do, through `host.layOut()`, given
  their JSON as the script holds them, also before the host has its changes,
  or `null` for text the script didn't change, which the host has as it is.
- Add text ranges: `TextRange`, a part of a text whose style properties read
  what its letters and paragraphs share and set them, from
  `TextItem#range(start, end)`, `#runs`, `#paragraphs`, `#words`, `#letters`
  and `#lines`, which ranges have too, and `#replace(content, start, end)`, and
  `TextStory`, a text's content, runs and paragraphs, as `TextItem#story`.
- Add text linking: `TextItem#link()`, `#unlink()`, `#isLinked()`,
  `#nextTextItem`, `#previousTextItem` and `#visibleRange`, by which a story
  flows through several text items, which `TextStory#textItems` lists.
- Add `PathText`, text along a path between `startOffset` and `endOffset`, each
  letter turned to the path, which it takes as `TextItem#textPath`.
- Add `AreaText`, text inside any path as its `textPath`, holes too, in
  columns and rows, with lines breaking between words and at soft hyphens,
  `verticalAlign`, `fitHeight()`, and `lineWrap`, a paragraph property that
  balances the lines.
- Add `Item#textWrap`, by which items push aside the text of the area texts
  below them in their layer, or let it flow inside them.
- Export area text, text on paths and text with mixed styles to SVG: point text
  keeps a `<tspan>` per line, with one per run where styles are mixed, and area
  text and text on paths are placed piece by piece, as they are laid out.
- Add character style properties: `fontStyle`, `lineHeight`, `letterKerning`,
  `letterScaling`, `letterRotation`, `baselineShift`, `baselinePosition`,
  `capitals`, `underline` and `strikethrough`, and `fontVariations` and
  `features` for hosts.
- Add paragraph style properties: `justifyLast`, `startIndent`, `endIndent`,
  `firstLineIndent`, `spaceBefore`, `spaceAfter` and `direction`, the
  justifications `'start'`, `'end'` and `'justify'`, and `justifySpacing`,
  `hyphenation`, `composer` and `tabs` for hosts.
- Let `Item#strokeBounds` be selected and set, as `Item#bounds` can:
  `item.strokeBounds.selected` draws the stroke bounds and their handles,
  independently of `item.bounds.selected`, and setting them scales the item so
  its stroke bounds match, also where its stroke's extent changes with its
  proportions, as with miters (#1030).
- Import the `data-*` attributes of SVG elements into `item.data`, with their
  names camelized as in `dataset`, next to `data-paper-data` (#1227).
- Export shadows to SVG as SVG 1.1 filters, which both browsers and editors
  such as Illustrator render, except for items without width or height, and
  import them back, along with CSS `drop-shadow()` (#1003).
- Import SVG masks as clip masks, which is exact for masks of solid white
  shapes, or of opaque shapes with `mask-type="alpha"`, and warns that other
  masks are approximated (#1916).
- Add `Group#ungroup()`, which replaces a group with its children, applying its
  matrix to them, and let `Item#replaceWith()` take several items (#1026).
- Add `settings.segmentSize`, the size of the segments when drawing selections,
  next to `settings.handleSize` for their handles, which it defaults to
  (#1899).
- Add `angleInRadians` to the object literals that create points, next to
  `angle`, e.g. `new Point({ length: 10, angleInRadians: Math.PI / 2 })` (#562).
- Add `Project#hasChanges()`, which tells whether changes were logged since the
  last `Project#takeChanges()`, without taking them.
- Add dynamic `import(specifier)` to PaperScript, which resolves to the module's
  namespace through the loader in `options.load`, which may return a Promise.
- Add static `import` to PaperScript, through a loader that hosts pass as
  `options.load` to `PaperScript.execute()`, together with `export … from`. It
  needs a current Acorn as `self.acorn`.
- Add `Item.getBounds(items[, options])`, the bounds of a list of items in
  project coordinates as if they were grouped, e.g. of the selection (#2252).
- Add `ToolEvent#velocity` and `#elapsed`, the velocity of the mouse since the
  last tool event in points per second, and the time since then in seconds,
  which stay even when the system misses a mouse report.
- Add `Event#time`, the time of the event in seconds, as frame events have it,
  and `options.time` to `View#dispatchMouseEvent()` and `#dispatchKeyEvent()`.
- Add a setter to `View#bounds`, which fits the view to the given rectangle, as
  `View#fitBounds()` does.

### Changed

- Lay out text by the ascent and descent of its fonts: the bounds of
  `PointText` are its lines' line heights, with the leading split around their
  ascent and descent, instead of 3/4 of the first above its baseline and 1/4 of
  the last below.
- Replace `leading` by `lineHeight`, `'auto'` (1.2) or another factor of the
  font size, or a fixed length; `leading` still sets and reads a fixed line
  height in pixels. Rename `tracking` to `letterTracking`, which `tracking`
  still sets and reads.
- Make `Style#getFontStyle()` return the CSS font style, `'normal'`,
  `'italic'` or `'oblique'`, instead of the font as canvas takes it, and remove
  `Style#getTrackingStyle()`.
- Only go into the children that items show in `Item#getItems()`, and log the
  changes of children that their parent doesn't show, such as a text's path, as
  the parent's.
- Make `Item#intersects()` check whether the items overlap, also when one
  contains the other, as `Rectangle#intersects()` does, instead of only whether
  their outlines cross, and use it in `getItems({ overlapping })` for items
  whose bounds contain the rectangle (#1751).
- Use `settings.hitTolerance` for the mouse events of items, such as
  `mouseenter` and `click`, which always hit-tested with a tolerance of 0
  (#1971).
- Keep the named exports of PaperScript modules with a default export:
  `export default x` now sets `module.exports.default` instead of replacing the
  exports, and such modules are marked with `__esModule`. `import x` receives
  the default export, or the whole exports of CommonJS-style modules, and
  `import * as m` all exports, with CommonJS-style ones also as `m.default`.
  So `PaperScript.execute()` returns `{ default: x }` for `export default x`.
- Deprecate `Event#timeStamp` in milliseconds, and the `options.timeStamp` of
  `View#dispatchMouseEvent()` and `#dispatchKeyEvent()`, for the new `time`
  in seconds.
- Rename the `paper-sourced.js` build to `paper-hosted.js`, and `Project#source`
  to `Project#host`, to match `HostItem` and the host document that backs the
  items.
- Draw dashes with `setLineDash()`, which every canvas supports, and remove
  the dash emulation for canvases without it, along with the undocumented
  `paper.support.nativeDash` (#2350).

### Fixed

- Import the paragraphs of text items after their content, also from JSON that
  lists them first, as JSON written by other tools may.
- Keep what scripts write to hosted items before they load, such as their
  `pivot` or an area text's `columns`, which loading replaced.
- Fix the stroke bounds of non-scaling strokes under non-uniform matrices,
  whose miters, bevels and square caps followed the untransformed angles.
- Fix `Item#strokeBounds` after scaling items that apply their matrix, such
  as paths and groups, when they were read before: the cached stroke bounds
  were scaled along, including the width of the stroke, which doesn't scale.
- Fix SVG export of `opacity` and `blendMode`, which aren't inherited, so
  children with the same values as their group lost them, and the defaults
  were written where the group differed.
- Fix the shadows of items that are both filled and stroked, which only cast
  the shadow of their fill, partly covered by the stroke (#892).
- Fix the shadows of text items, which only text with both a fill and a
  stroke drew (#2347).
- Fix the points at offsets of `PathFlattener` on straight curves, such as
  lines without handles, whose curve-time doesn't follow their length, which
  placed them off everywhere but at the ends.
- Fix SVG import of `<use>` elements, which now pass their styles and those of
  their parents on to the referenced element, as in SVG, instead of the styles
  of the place where it is defined, and skip circular references (#2090).
- Divide the operands of boolean operations at all their intersections, also
  where they only touch, which makes the results of near-coincident geometry
  more stable, and ends the endless loop of #1849.
- Fix `Curve#getTimeOf()` for points near the ends of straight curves, which it
  solved to times far from the ends, as it only tested the ends exactly.
- Fix boolean operations that backtracked while tracing their result, which could
  give a curve of it the handle of a dead end and make it bulge.
- Measure text in views without a canvas of their own, such as in workers, with a
  canvas from `CanvasProvider`, e.g. an `OffscreenCanvas`, so `PointText` has
  bounds there too.
- Fix PaperScript's exported variable declarations without semicolons, such as
  `export const a = 1`, which compiled to invalid code.
- Fix `Curve#classify()` reporting points of inflection, cusps and loops at the
  very ends of curves, which made boolean operations miss crossings at those
  vertices (#1879, #1387).
- Fix PaperScript's compound assignments of properties, such as
  `array[index()] += 1`, which evaluated their object and key twice.
- Fix PaperScript with a current Acorn provided as `self.acorn`, which parses
  all current syntax now, and its exports: of functions and classes, of renamed
  names (`export { a as b }`), of several declarations in a row, and of
  variables, which stay usable in the script itself.
- Fix intersections of curves and lines at the curves' ends, which were lost
  when the curve touched the line there, e.g. at a zero-length handle (#1848).
- Fix the orientation of the results of `PathItem#exclude()` and
  `#subtract()`, whose parts of the second path kept its reversed orientation,
  giving them negative areas (#2064).
- Fix `PathItem#interiorPoint` returning points on the path itself, such as a
  vertex shared with another path, which made boolean operations of paths that
  only touch keep or drop the wrong parts (#1837, #1979).
- Fix intersections and boolean operations of curves and paths that only touch,
  at coordinates beyond 16384, where the tolerance of their bounds checks got
  lost in floating point (#1940, #1882).
- Fix boolean operations on open paths that end where they start, which lost
  the curve between their ends (#1929, #1973, #1989, #2018).
- Fix boolean operations with `{ trace: false }` on closed paths, which could
  keep or drop the wrong parts depending on where the path started, and on
  compound paths, which threw an error (#1540, #1541, #1746, #1998, #2046).
- Document `Item#fullySelected`, which all items have, not only paths (#1687).
- Type options objects from their documented options, such as those of
  `Item#hitTest()`, `#exportSVG()` and `#rasterize()`, so misspelled options are
  errors in TypeScript (#1666).
- Type the setters of point, size, rectangle and color properties with the
  values they accept, such as `item.position = [10, 20]` and
  `item.fillColor = 'red'`. The typings now need TypeScript 4.3 (#1665).
- Handle the mouse events of `View#dispatchMouseEvent()` also outside the
  view's bounds, since the host decides which events belong to its drawing
  surface.


## `0.14.0`

### Added

- Add `options.handlers` to `PaperScript.execute()`, to export further global
  handlers next to `onFrame`, `onResize` and the tool's, for hosts that call
  them themselves, such as Scriptographer's `onStop`.
- Add `Tool#eventInterval`, as Scriptographer had it, to fire `onMouseDrag` again
  at an interval while the mouse button is held, also when the mouse doesn't
  move.
- Add `Project#scope`, `View#scope`, `Item#scope` and `Tool#scope`, to get from
  each of them to its `PaperScope` (#1634).
- Add `Group#isolated`, to draw a group or layer through a temporary canvas, so
  that the blend modes of its children, such as `'destination-out'`, only apply
  within it, like CSS's `isolation: isolate` (#474).
- Add `View#dispatchMouseEvent()` and `View#dispatchKeyEvent()`, to feed mouse
  and key events from hosts without a DOM, such as workers, through the same
  handling as the DOM's events, for tools, items and views.
- Add `settings.scaleStrokes`, to scale the stroke widths of paths and
  compound paths along with their content when matrices are applied (#2098,
  #1514).
- Add the `paper-sourced.js` build, in which a project's items can be backed
  by a host document through `Project#source`: items are created as light
  shells from the host's records, and load their content and children from
  the host on first access, so a script costs what it touches. Includes
  `HostItem`, for the host's own kinds of nodes (#2203).
- Add `Project#trackChanges` and `Project#takeChanges()`, to let hosts that
  keep their own document update only the items that changed, and export
  `ChangeFlag` (#2202).

### Changed

- `Path.RegularPolygon()` follows Illustrator: it stands on a flat bottom edge
  for any number of sides, and its segments run counterclockwise from its top
  vertex, or with an even number of sides, from the right end of its top edge.
  This changes the segment order of all regular polygons, and turns those with
  a multiple of 6 sides onto an edge (#1787).
- Hit-test transparent fills, as in SVG: only items without a fill color are
  not hit through their fill (#1157).
- `paper.install()` keeps what the target scope has already, such as the
  native `Event`, `MouseEvent` and `Symbol`, and PaperScript doesn't shadow
  existing globals with Paper.js's classes of the same name either (#1832,
  #1652).
- `Item#importJSON()` into an existing item resets the fields that the JSON
  leaves out, so the item ends up the same as a newly imported one, with its
  place in the scene graph and its event handlers kept (#1425, #1324).
- Canvases without `resize` get their CSS size from the view on every screen,
  not only at pixel ratios other than 1, where the page's CSS won (#2088).
- `#hitTestAll()` reports every segment and handle of a path within the
  tolerance, closest first, followed by its stroke or fill hit, instead of only
  the first hit per path (#1294).

### Fixed

- Create the tool in PaperScript for all of its global handlers, also for
  scripts that only define `onActivate()` or `onDeactivate()`, and document
  `Tool#onActivate` and `Tool#onDeactivate`.
- Keep `Key.modifiers` in sync with the flags of mouse events, so modifier keys
  pressed or released while the page didn't have the focus don't stay wrong
  (#1140).
- Keep Paper.js's own blend modes, which CSS doesn't have, such as
  `'destination-out'`, through SVG export and import, in a
  `data-paper-blend-mode` attribute (#1296).
- Throw a clear error when creating an item without a project, instead of a
  null access deep inside the constructor (#1889).
- Free the pixels of temporary canvases when they're released, which their pool
  kept allocated at their largest size for the life of the page.
- Keep the size of rasters in JSON, so imported rasters have their size and
  bounds before their image has loaded, or if it fails to load (#1598).
- Fix the frame timer of workers and Node.js running forever after any script,
  which kept hosts from seeing scripts end.
- Fix touch scrolling over empty parts of a canvas whose items have mouse
  handlers (#1930).
- Fix mouse events reaching items and views through elements that cover the
  canvas, such as menus. Drags still reach beyond them (#992).
- Fix the points of `#hitTestAll()` results of items inside transformed
  groups, which were in the items' own coordinates.
- Support `strokeScaling: false` on text, exactly for uniform scaling (#1703).
- Fix the view size of canvases inside elements with CSS transforms, which
  only scale the canvas on screen.
- Fix italic and oblique font weights in SVG export and import, which SVG
  keeps in `font-style` (#937).
- Fix `onFrame` in web workers, where views have no element (#2200).
- Fix `PaperScope#execute()` in web workers (#2201).

## `0.13.0`

### Added

- Add a `force` parameter to `View#update()`, to redraw the view even when
  nothing changed, e.g. after a web font has loaded (#1913).
- Add `View#fitBounds(rectangle[, fit])`, to fit a rectangle into the view.
  `fit` takes the values of CSS's `object-fit`: `'contain'` and `'cover'`
  (#1688).
- Add the `reuseImages` option to `#exportSVG()`, to export images shown by
  several rasters only once, and place them with `<use>` elements (#1993).
- Add `tracking` to the text styles: the space added after each character, in
  thousandths of an em, as in Adobe Illustrator and InDesign. `#exportSVG()` and
  `#importSVG()` write and read it as `letter-spacing` (#2066).
- Add `easeInSine`, `easeOutSine`, `easeInOutSine`, `easeInExpo`, `easeOutExpo`,
  `easeInOutExpo`, `easeInCirc`, `easeOutCirc` and `easeInOutCirc` to `Tween`
  (#1855).
- Add the `idPrefix` option to `#exportSVG()`, prepended to the generated ids of
  definitions, so that separately exported SVGs can be placed in one document
  (#1709).
- Add the `crossOrigin` option to `#importSVG()`, passed on to the rasters of
  `<image>` elements, so that canvases drawing them aren't tainted (#1094).
- Add `View#project` (#1634).
- Add `Point#clamp(min, max)`, e.g. to keep a point inside a rectangle with
  `point.clamp(rect.topLeft, rect.bottomRight)`.
- Use `OffscreenCanvas` in web-workers, so `Item#rasterize()`,
  `new Raster(size)`, items with opacity or blend modes, and CSS color names,
  which resolved to black, work there. `Raster#toDataURL()` remains unsupported
  in web-workers (#1643).

### Changed

- Time double-clicks from mousedown to mousedown and only within 3 pixels, as
  native `dblclick` events do, and don't take a third click for another
  double-click (#1451).
- Make `Rectangle#left`, `#right`, `#top` and `#bottom` move only their own
  side, as documented, and the corner points only their two sides, keeping the
  opposite ones where they are. They used to move the whole rectangle, unless
  another side was set before. This also applies to `Item#bounds`: setting a
  side or corner of an item's bounds now stretches the item. To move items,
  set `bounds.point`, `bounds.center`, `bounds.x` or `bounds.y` (#2024, #1147).
- Hit-test groups wherever one of their children is hit, as in Illustrator, so
  `hitTestAll()` always returns the groups above the hit items, and
  `hitTest(point, { class: Group })` finds the group under a point. Groups were
  only hit when all their children shared a fill (#2069).
- Let inline `style` declarations override presentation attributes in
  `#importSVG()`, as in CSS and browsers: `<rect fill="blue" style="fill: red">`
  now imports red (#1962).
- Keep the pixels of images in `#importSVG()` and scale them to their size in
  the SVG, instead of resampling them to that size, which made them blurry.
  `Raster#size` is now the image's own size, and images without a size are
  shown at it, as in browsers (#1963).
- Let `Item#clone()`, the boolean operations, `Item#rasterize()`,
  `Path#toShape()` and `Shape#toPath()` follow `settings.insertItems` when no
  `insert` option is passed, instead of always inserting their results. An
  options object without `insert` also inserts the clone by default now, as
  documented, e.g. `clone({ deep: false })` (#1721).
- Use jsdom's own `XMLSerializer` for `#exportSVG()` on Node.js, instead of a
  shim that returned HTML, so the output is valid XML with escaped attribute
  values, as in browsers. Empty elements are now self-closing (#1922).
- `Item#fitBounds(rectangle[, fit])` takes the values of CSS's `object-fit` as
  `fit`: `'contain'`, `'cover'` and `'fill'`, which stretches the item to the
  rectangle.
- Scale and align images in `#importSVG()` as their `preserveAspectRatio`
  describes, fitting them into their box uniformly and centered by default, as
  browsers do, instead of stretching them. `slice` is treated as `meet` (#1129).
- Let `Path#removeSegments(from, to)` wrap around on closed paths when `from` is
  larger than `to`, instead of removing nothing (#1881).
- Read the `href` of `<image>` elements in `#importSVG()` always as a URL, no
  longer as the id of a DOM element first.

### Deprecated

- The boolean `fill` parameter of `Item#fitBounds()`: use `'cover'` instead of
  `true`.

### Removed

- Remove the workaround for wrong `mouseout` coordinates in old versions of
  Chrome on Windows (#1811).
- Remove the CLA from the contribution guidelines, as it no longer exists
  (#2071).

### Fixed

- Fix `require('paper')` in the Node.js REPL (#2019, #1792).
- Fix loading PaperScript in bundles that leave the top-level `this` undefined,
  as in ES modules (#1480).
- Prevent source-map-loader from warning about the source map string in
  PaperScript (#1991).
- Fix replacing style colors that were set as strings, which threw in strict
  mode (#2049).
- Fix SVG path data with arc flags that aren't separated from the numbers
  after them, as SVGO writes them (#1808, #1885).
- Fix `#importSVG()` of gradients, fills, clip paths and `<use>` elements that
  reference definitions appearing later in the document (#1146, #1884, #1978).
- Fix `#importSVG()` of elements with numeric ids (#1754).
- Fix `#importSVG()` of rounded rectangles with only `rx` or `ry` (#1863).
- Fix `#exportSVG()` writing `fill-rule="none"`, `font-family="none"` etc. on
  groups with differently styled children (#1732).
- Fix `Curve#handleBounds`, which threw, to only include the curve's own
  points (#1992).
- Fix `Curve#getTimesWithTangent()` for curves without a cubic component,
  such as quadratic curves (#1870).
- Fix `Shape` JSON import with `type` after `radius` (#1820).
- Fix boolean operations with `trace: false` or `stroke: true` ignoring
  `options.insert` (#2028).
- Fix gradients drawn with `strokeScaling: false` (#1821, #1822).
- Fix the selection of items in symbol definitions being drawn (#1577).
- Fix `View#zoom` of mirrored views, which was 0 (#1411).
- Fix item mouse handlers that stopped working after removing items whose
  parent was already removed, or after moving items to another project
  (#2079, #1791).
- Fix key events with Control, Alt and Meta in Firefox and other browsers that
  fire no `keypress` for them (#1997, #1871).
- Fix the space key staying down after Option + Space on macOS.
- Fix key events not reaching a view that became visible after the focused one
  was hidden (#1953).
- Load in DOMs whose canvas has no 2D context, as jsdom without canvas in jest,
  and run there as in workers (#1805).
- Keep the original error as `cause` when jsdom or canvas fail to load on
  Node.js (#1759).
- Fix `#getItems()` and `#getItem()` with a match function or without options
  to search recursively, as documented, instead of matching only the top-level
  items.
- Fix `#importSVG()` of transforms and styles on `<use>` elements that
  reference groups (#978).
- Fix the `project` and `parent` options of the `Path.*` constructors. With
  `insert: false`, they no longer insert into the parent, as `new Path()`
  doesn't either (#2012).
- Fix the bounds of transformed circle and ellipse shapes (#1826).
- Fix `PointText#strokeBounds` to include the stroke, which got cut off when
  drawn with opacity (#1322).
- Fix the `Item#bounds` setter on items with zero width or height, which made
  their matrix non-invertible (#1794).
- Fix `#getItems()` with `overlapping`, which never matched shapes, rasters and
  texts, as their matrix was applied twice (#1300).
- Fix the bounds of items whose matrix cancels out the matrix of their parent
  (#1457).
- Fix the source URL and source map of PaperScript loaded from script tags,
  which were lost (#1753).
- Fix stroke hit-tests at the ends of paths with butt caps, which missed even
  the end points (#1460).
- Fix `Path#splitAt()` with locations that aren't on the path, which split
  the path at its start instead of returning `null`.
- Fix clipping with groups that are clipped themselves, as imported SVG with a
  `viewBox` is, which clipped with their own clip mask too (#1618).
- Fix `Item#hitTest()` and `#hitTestAll()` on items inside transformed
  groups, which took the point in their parent's coordinates instead of the
  documented global ones (#1803).
- Ignore `View#zoom` values that aren't positive numbers, which left the
  view's matrix without an inverse, so that `View#bounds` threw (#1433).
- Fix the hit-test tolerance of items inside transformed groups and of symbol
  items, which their transformations scaled. It is now in project
  coordinates, as documented (#1278).
- Limit the temporary canvases of items with opacity or blend modes to the
  visible area, so large groups no longer disappear or make zooming slow
  (#1644, #1920, #1925, #2001, #2029).
- Support SVG 2's plain `href` attribute in `#importSVG()`, besides
  `xlink:href`, for `<use>`, `<image>` and gradient links.
- Fix `#exportSVG()` of groups used as clip masks, which were exported as
  groups inside `<clipPath>`, where only shapes are allowed, so browsers
  clipped everything away (#1445, #1590).
- Keep the lines of multi-line text in `#exportSVG()` and `#importSVG()`, as
  `<tspan>` elements at their own baselines (#988).
- Fix shadows being cut off on items with a fill, a stroke and an opacity,
  which are drawn through a temporary canvas (#1628).
- Fix `#importSVG()` of `<use>` elements that place images, which weren't
  positioned and sized, as their rasters were cloned before the image loaded.
- Fix `Item#fitBounds()` and `View#fitBounds()` with empty rectangles or
  items: empty sides no longer collapse items, produce `NaN` coordinates with
  `'cover'`, or make the view throw; they are left out of the scaling.
- Fix `#importSVG()` of lengths in `in`, `cm`, `mm`, `pt` and `pc`, which were
  read as pixels (#1919).
- Fix `#importSVG()` of percentages inside nested `<svg>` elements, which
  referred to the size of the root instead of the nearest `<svg>` (#1404).
- Fix `#importSVG()` on Node.js of shapes without a fill, which were imported
  without one instead of black, as in browsers (#1229).
- Fix the quadratic time of `#exportSVG()` for groups with many children
  (#1353).
- Implement the documented `'pin-light'` blend mode, which drew nothing (#1527).
- Fix clip masks of items with a matrix and an opacity or blend mode, which
  clipped in the wrong place (#1594).
- Fix rasters and point texts used as clip masks, which clipped with the path
  drawn before them. They now clip with their rectangle and bounds (#1845).
- Fix the stroke bounds of sheared, mirrored and non-uniformly scaled paths with
  `applyMatrix: false`. The miter limit is now checked in the path's own
  coordinates, as canvas does (#2065).
- Fix symbol items overwriting the `globalMatrix` of their definition's item,
  which affected its stroke bounds and selection (#1684).
- Fix the view size of canvases with padding or border, which grew with each
  setup of a project for them (#1160, #2033).
- Fix setting `View#rotation` on mirrored views, which rotated the other way,
  and on non-uniformly scaled views, which got skewed (#1893).
- Fix touches outside of the view taking over its drag (#1875).
- Fix hit-tests of point texts ignoring the tolerance (#632).
- Fix removed selected items being kept by their project, which leaked memory
  (#1856).
- Fix the line width of selections, which used whatever line width the view's
  context was left with.
- Fix hit-tests of symbol items with `class`, `type` and `match` filters, which
  were applied to the definition's items instead (#1774).
- Leave `workspaces` and `resolutions` out of the published `package.json`,
  which made Yarn warn when installing paper (#1921).
- Fix stale `Item#globalMatrix` and `#localToGlobal()` results of items whose
  sibling was asked first after their parent was transformed, and of items
  moved to another parent or removed (#1750).
- Fix the points of mouse and touch events on canvases with padding or border,
  with a CSS size that differs from the view size, or under CSS transforms that
  scale them, which were offset or scaled (#549, #1729).
- Fix the sign of `Line#getSignedDistance()` for lines whose direction has
  two negative coordinates (#1880).
- Fix outdated bounds of nested groups after changes to items two or more
  levels down, and of groups containing placed symbols after changes to the
  symbol definition (#940).
- Docs: Mark the `path` argument of `PathItem#getIntersections()` as optional.
- Docs: Add `View#onKeyDown`, `View#onKeyUp`, `Point#negate()`,
  `Size#negate()`, `PaperScope#createCanvas()`, `#clear()` and `#remove()`.
- Docs: Correct the defaults of the hit-test options, the results of the math
  operator examples, `Raster#source` and `Item#guide`, and document
  `Path#reduce()`'s `simplify` option, nullable location getters, optional
  arguments, `ToolEvent#tool`, which items have children, how group styles,
  `getItems()` ordering, `Rectangle#selected` and `Tool#onMouseMove` work, and
  the `resize` canvas attribute (#2078, #2092, #2030, #1928, #1947, #1907,
  #1900, #2115, #1645, #1697, #1747, #1507, #604, #1330, #662).
- Docs: Add examples to the boolean path operations (#1007).
- Docs: Document that `new Path(pathData)` holds a single sub-path (#2057).
- Docs: Document that styles set on symbol items, or inherited by imported
  `<use>` elements, don't reach the symbol definition's items (#1329).
- Docs: Document using Paper.js with a bundler in the README (#1695).
- Docs: Move the documentation of `<symbol>` and `<use>` from
  `Project#importJSON()` to `Project#importSVG()`.

## `0.12.20`

### Fixed

- Keep the native `Symbol` in `PaperScope#install()`, which replaced it with
  the deprecated `paper.Symbol` alias of `SymbolDefinition`. `paper.Symbol`
  itself still works.
- Support jsdom 20 and newer in Node.js: find jsdom's internals where jsdom 28
  moved them, and run in worker mode without the canvas module again, which
  failed to load before.

### Changed

- Update `paper-jsdom` to jsdom 28, and `paper-jsdom-canvas` to jsdom 28 and
  canvas 3, which install on current Node.js versions. Both now require
  Node.js 20.19, 22.12 or 24 and newer.

## `0.12.19`

### Security

- Fix XSS in `#importSVG()`: imported SVG is now attached to a sandboxed iframe
  instead of the page while its styles are computed, so it can't run scripts or
  load resources (#2100).

### Changed

- `#importSVG()` is no longer affected by the page's style sheets. Style sheets
  inside the imported SVG still apply.

### Fixed

- Restore `settings.applyMatrix` and `settings.insertItems` when `#importSVG()`
  fails.
- Fix `new Path.Rectangle(rectangle, radius)`, `new Shape.Rectangle(rectangle,
  radius)` and `Item#fitBounds(rectangle, fill)` when the rectangle is given as
  an array or object literal.
- Fix `new Raster(source, position)` ignoring the position.
- Fix `new Path.Arc()` handling of `insert`: `{ insert: false }` shadowed
  `Path#insert()`, and `{ insert: true }` was ignored.
- Fix tweening of points, colors and relative values in `paper-core`, which
  relied on PaperScript.
- Fix setting `ToolEvent#count`, which had no effect.
- Fix `new Shape({ type: 'circle', radius })` without a size, which threw.
- Fix `View#getPixelSize()` returning `NaN` for views without an element, as in
  web workers, which broke `leading` for font sizes in units other than pixels.
- Only publish the intended files to npm, removing an accidental copy of the
  whole distribution from the package (12.3 MB → 6.2 MB unpacked).

## `0.12.18`

### Fixed

- Fix transformation in SvgImport (#1926).

### Added

- Implement `options.reduceAttributes` option for SVG export (#1895).
- Add setter for item.index (#1908).

## `0.12.17`

- Properly warning in Chrome Console by providing `{ willReadFrequently: true }`
  canvas context option where needed (#2008).

## `0.12.16`

### Fixed

- Fix `Item#rasterize()` bounds cache when reusing raster.
- Fix new warning in Chrome Console by providing `{ willReadFrequently: true }`
  canvas context option where needed (#1999, #2000, #2003).
- Fix `Path.*` constructor properties handling when passing `{ insert: true }`

### Changed

- Rename `Raster#setImageData()` to `#putImageData()`.
- Change `Raster#setImageData()` to also respect image size.
- Add separate `Numerical.ANGULAR_EPSILON` for `Path#arcTo()`

## `0.12.15`

### Fixed

- Fix NPM installation problem with `husky` introduced in `v0.12.13`

## `0.12.13`

### Fixed

- Fix faulty positioning regression in `Item#rasterize()` (#1905).

## `0.12.12`

### Fixed

- Fix installation problems on Windows by switching from NPM to Yarn for development (#1833).

### Changed

- Change `Item#raster({ resolution, insert })` to receive options object, while remaining backward compatible.
- Change `Raster#smoothing` to support the values `'low'`, `'medium'`, `'high'`
  and `'off'`. Setting to a boolean value is still supported, translating `false` →
  `'off'` and `true` → `'low'`.

### Added

- Allow reusing of raster items in `Item#rasterize({ raster })`: By providing an existing raster in `options.raster`, the raster and maybe even its underlying canvas can be reused, as long as the rasterized size doesn't change between rasterizations. This allows for big performance improvements.

## `0.12.11`

### Fixed

- Fix installation through Yarn (#1831).

## `0.12.9`

### Added

- Export `CanvasProvider` to allow experimenting with
  https://www.npmjs.com/package/canvaskit-wasm on Node.js

### Fixed

- Fix `Path.strokeBounds` that was incorrect for certain paths (#1824).
- Fix Gulp 3 issues to be able to run Travis CI tests on Node.js 10, 12, 13 and
  14.

## `0.12.8`

### Fixed

- TypeScript: Fix returned instance type (#1796).
- Fix `Path#strokeBounds` for open paths (#1817).
- Fix animation progress handling in `Tween.update()`.
- Fix setting `Item#scaling` to a new value after it was set to zero (#1816).
- SVG Import: Fully support SVG strings with leading line-breaks (#1813).
- Docs: Improve `Raster#initialize(object)` documentation (#1815, #1782).
- Docs: Fix `Item#getItem(options)` documentation.

## `0.12.7`

### Fixed

- PaperScript: Actually make `options.paperFeatures.moduleExports` work
  independently from `options.paperFeatures.operatorOverloading`.

## `0.12.6`

### Added

- PaperScript: Add option `options.paperFeatures.moduleExports` to control
  module exports conversion.

## `0.12.5`

### Added

- PaperScript: Add option `options.paperFeatures.operatorOverloading` to control
  operator overloading.

### Fixed

- Fix `new Raster(HTMLCanvasElement)` constructor (#1745).
- Handle `CurveLocation` on paths with only one segment.
- Fix recently introduced error in `CompoundPath.compare()` (#1769).
- Clamp opacity values to [0, 1] (#1814).
- Support closed `Path` items with blend mode and no segments (#1763).
- Fix error in `getCrossingSegments()` (#1773).
- SVG Import: Support SVG strings with leading line-breaks (#1813).
- Docs: Improve documentation for `Raster#drawImage(CanvasImageSource)` (#1784).

### Changed

- Use `'paper-'` prefix in generated view ids.

## `0.12.4`

### Added

- Allow paper core import in TypeScript (#1713).
- Boolean: Improve performance from `O(n^2)` to nearly `O(n)` by the use of the
  sweep and prune algorithm (#1737).
- Docs: Add support for nullable values.

### Fixed

- Fix `PathItem#getCrossing()` to not return overlaps (#1409).
- Fix regression in `Curve.getIntersections()` (#1638).
- Fix edge cases in `CurveLocation.isCrossing()` (#1419, #1263).
- Fix `SymbolItem#hitTestAll()` to return only one match per symbol item
  (#1680).
- Fix handling of negative `Shape` sizes (#1733).
- Fix parsing of RGB `Color` strings with percentages (#1736).
- Fix `Shape` bounds when passing position in constructor (#1686).
- Prevent nested group matrix from reset when transforming parent (#1711).
- Boolean: Fix edge cases in overlap detection (#1262).
- Boolean: Add check for paths with only one segment (#1351).
- Boolean: Correctly handle open filled paths (#1647).
- Boolean: Avoid winding number edge cases (#1619).
- Docs: Fix some documentation return types (#1679).

## `0.12.3`

### Added

- Add documentation for `Item#internalBounds`.

### Fixed

- Fix regression in `Color` change propagation (#1672, #1674).
- SVG Export: Fix viewport size of exported `Symbol` (#1668).
- Handle non-invertible matrices in `Item#contains()` (#1651).
- Improve documentation for `Item#clipMask` (#1673).
- Improve TypeScript definitions (#1659, #1663, #1664, #1667).

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
