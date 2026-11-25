// The types of paper/boolean and paper/offset, on plain paths:
import { contains, subtract, unite } from 'paper/boolean'
import type { RegionValues } from 'paper/boolean'
import { offset, outline } from 'paper/offset'

const square = (x: number): RegionValues => ({
  paths: [
    { segments: [[x, 0], [x + 10, 0], [x + 10, 10], [x, 10]], closed: true }
  ],
  fillRule: 'nonzero'
})
const union: RegionValues = unite([square(0), square(5)])
const difference = subtract(square(0), [square(5)])
const inside: boolean = contains(union, [1, 1])
const grown = offset(difference, 2, { join: 'round' })
// @ts-expect-error: not a join
offset(difference, 2, { join: 'rounded' })
const stroke = outline([{ segments: [[0, 0], [10, 0]], closed: false }], {
  width: 4,
  cap: 'square'
})
console.log(inside, grown.paths.length, stroke.paths.length)
