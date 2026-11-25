// The types of paper/core, with its features added through use():
import { Path, Point, Project, use } from 'paper/core'
import { boolean } from 'paper/boolean'
import { offset } from 'paper/offset'
import { svg } from 'paper/svg'

use(boolean, offset, svg)
new Project()
const a = Path.rectangle({ point: [0, 0], size: [10, 10] })
const b = Path.rectangle({ point: new Point(5, 0), size: [10, 10] })
const area: number = a.unite(b).area
// @ts-expect-error: not a feature
use({ feature: { name: 'colors' } })
console.log(area)
