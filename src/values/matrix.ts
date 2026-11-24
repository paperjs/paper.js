/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// The transformations that Matrix shares with the code that transforms
// points without the class, as functions on the values of a matrix. They
// read the values by their indices: Destructuring them is several times
// slower here.
import { Point } from '../basic/Point.ts'

// The values of a matrix, as Matrix#values has them:
export type MatrixValues = [
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number
]

// Returns the values of the matrix that transforms nothing:
export function createMatrix(): MatrixValues {
  return [1, 0, 0, 1, 0, 0]
}

export function setMatrix(
  v: MatrixValues,
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number
) {
  v[0] = a
  v[1] = b
  v[2] = c
  v[3] = d
  v[4] = tx
  v[5] = ty
}

export function resetMatrix(v: MatrixValues) {
  setMatrix(v, 1, 0, 0, 1, 0, 0)
}

// Multiplies the values by those of m, as (v) * (m):
export function appendMatrix(v: MatrixValues, m: MatrixValues) {
  const a1 = v[0]
  const b1 = v[1]
  const c1 = v[2]
  const d1 = v[3]
  const a2 = m[0]
  const b2 = m[2]
  const c2 = m[1]
  const d2 = m[3]
  const tx2 = m[4]
  const ty2 = m[5]
  v[0] = a2 * a1 + c2 * c1
  v[2] = b2 * a1 + d2 * c1
  v[1] = a2 * b1 + c2 * d1
  v[3] = b2 * b1 + d2 * d1
  v[4] += tx2 * a1 + ty2 * c1
  v[5] += tx2 * b1 + ty2 * d1
}

// Multiplies the values by those of m from the other side, as (m) * (v):
export function prependMatrix(v: MatrixValues, m: MatrixValues) {
  const a1 = v[0]
  const b1 = v[1]
  const c1 = v[2]
  const d1 = v[3]
  const tx1 = v[4]
  const ty1 = v[5]
  const a2 = m[0]
  const b2 = m[2]
  const c2 = m[1]
  const d2 = m[3]
  const tx2 = m[4]
  const ty2 = m[5]
  v[0] = a2 * a1 + b2 * b1
  v[2] = a2 * c1 + b2 * d1
  v[1] = c2 * a1 + d2 * b1
  v[3] = c2 * c1 + d2 * d1
  v[4] = a2 * tx1 + b2 * ty1 + tx2
  v[5] = c2 * tx1 + d2 * ty1 + ty2
}

export function translateMatrix(v: MatrixValues, x: number, y: number) {
  v[4] += x * v[0] + y * v[2]
  v[5] += x * v[1] + y * v[3]
}

export function scaleMatrix(v: MatrixValues, x: number, y: number) {
  v[0] *= x
  v[1] *= x
  v[2] *= y
  v[3] *= y
}

// Rotates by the angle in degrees, around the point (x, y):
export function rotateMatrix(v: MatrixValues, angle: number, x = 0, y = 0) {
  angle *= Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const tx = x - x * cos + y * sin
  const ty = y - x * sin - y * cos
  const a = v[0]
  const b = v[1]
  const c = v[2]
  const d = v[3]
  v[0] = cos * a + sin * c
  v[1] = cos * b + sin * d
  v[2] = -sin * a + cos * c
  v[3] = -sin * b + cos * d
  v[4] += tx * a + ty * c
  v[5] += tx * b + ty * d
}

// Transforms the point, into `dest` if given, see Point#_set():
export function transformPoint(
  v: MatrixValues,
  { x, y }: Point,
  dest?: Point
): Point {
  return (dest ?? new Point())._set(
    x * v[0] + y * v[2] + v[4],
    x * v[1] + y * v[3] + v[5]
  )
}

// Transforms the point back, for values that can be inverted:
export function inverseTransformPoint(v: MatrixValues, point: Point): Point {
  const a = v[0]
  const b = v[1]
  const c = v[2]
  const d = v[3]
  const det = a * d - b * c
  const x = point.x - v[4]
  const y = point.y - v[5]
  return new Point((x * d - y * c) / det, (y * a - x * b) / det)
}
