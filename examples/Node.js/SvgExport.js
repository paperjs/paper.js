// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import paper from 'paper/node'

const { Color, Path, Point, Size } = paper

paper.setup(new Size(300, 600))
const { project, view } = paper
const stops = [new Color(1, 1, 0, 0), 'red', 'black']

const radius = view.bounds.width * 0.4
let from = new Point(view.center.x)
let to = from.add(radius, 0)

const circle = new Path.Circle({
  center: from,
  radius,
  fillColor: {
    stops,
    radial: true,
    origin: from,
    destination: to
  },
  strokeColor: 'black'
})

from = view.bounds.leftCenter
to = view.bounds.bottomRight

const rect = new Path.Rectangle({
  from,
  to,
  fillColor: {
    stops,
    radial: false,
    origin: from,
    destination: to
  },
  strokeColor: 'black'
})

rect.rotate(45).scale(0.7)

const svg = project.exportSVG({ asString: true })
console.log(svg)

await writeFile(path.resolve('./out.svg'), svg)
console.log('Saved!')
