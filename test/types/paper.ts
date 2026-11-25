// The types of the entries, as apps use them:
import paper, { Color, Path, Point, Project, Raster, Rectangle } from 'paper'
import type { BlendMode, HitTestOptions, StrokeCap } from 'paper'

new Project(new paper.Size(100, 100))
const path = Path.circle({ center: [50, 50], radius: 20, fillColor: 'red' })
const point: Point = path.position.add(10)
const bounds: Rectangle = path.bounds
const cap: StrokeCap = 'round'
path.strokeCap = cap
// @ts-expect-error: not a cap
path.strokeCap = 'rounded'
const mode: BlendMode = 'multiply'
path.blendMode = mode
// @ts-expect-error: not a blend mode
path.blendMode = 'mix'
const options: HitTestOptions = { fill: true, tolerance: 2 }
const hit = path.hitTest(point, options)
const color: Color | null = path.fillColor
console.log(bounds.width, hit?.type, color?.type)
// Handlers are called on their item, with its own type:
path.onMouseDown = function () {
  console.log(this.segments.length)
}
const raster = new Raster()
raster.onLoad = function () {
  console.log(this.size.width)
}
