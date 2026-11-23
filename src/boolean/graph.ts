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

// The planar graph that the boolean operations trace their results from, see
// createGraph() and traceGraph(). It works on plain descriptions of paths,
// and only uses the basic types and the functions on curve values.
import {
  CURVETIME_EPSILON,
  GEOMETRIC_EPSILON,
  getEpsilon
} from '../util/numerical.ts'
import {
  findBoundsCollisions,
  findCurveBoundsCollisions
} from '../util/collisions.ts'
import { Point } from '../basic/Point.ts'
import * as Bezier from '../curve/index.ts'
import {
  getBounds,
  getSegments,
  getValues,
  hasHandles
} from '../data/region.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type {
  CurveValues,
  Intersection,
  SegmentValues
} from '../curve/index.ts'
import type { PathValues, RegionValues } from '../data/region.ts'

// A path of the result, with the part of an operand's curve that each of its
// segments starts: the curve by the indices of its operand, its path there
// and itself, and the times, the first one the later if it runs backwards:
export type TracedPath = {
  segments: [number[], number[], number[]][]
  sources: Source[]
}

export type Source = {
  operand: number
  path: number
  curve: number
  time1: number
  time2: number
}

export type Operator = (inside1: boolean, inside2: boolean) => boolean

// The paths of an operand: a region with its fill rule, whose open paths are
// filled as if closed by straight lines, or lines without one, which stay
// open, as splitGraph() splits them:
export type Operand = { paths: PathValues[]; fillRule?: string }

// The planar graph of createGraph(), with points stored by their index in its
// list of cut points, and vertices, edges and half-edges by their index:
type Cut = { time: number; point: number }

type Hit = { index: number; time: number; point: Point }

type Vertex = {
  x: number
  y: number
  isEnd: boolean
  point: number
  outgoing: number[]
}

// A piece of a curve between two of its cuts, by the index of the curve, as
// the edge that it became, with its times on the curve, and its values with
// the ends at the edge's vertices:
export type Piece = {
  curve: number
  edge: number
  time1: number
  time2: number
  values: number[]
}

type Edge = {
  values: number[]
  from: number
  to: number
  isStraight: boolean
  windings: number[]
  curve: number
  time1: number
  time2: number
  reversed?: number[]
  length?: number
}

type HalfEdge = {
  edge: Edge
  values: number[]
  from: number
  to: number
  directions?: { start: number; width: number }
  point?: Point
  angle?: number
  position?: number
  next?: number
  face?: Face
}

type Face = {
  halfEdges: number[]
  area: number
  windings: number[] | null
  component: Component | null
  isInside?: boolean
}

type Component = {
  edges: Edge[]
  bounds: number[]
  outside: Face
}

// A curve of the operands, with its neighbors on its path, where it comes
// from, and its index among all curves:
type GraphCurve = {
  next: GraphCurve
  previous: GraphCurve
  index: number
  operand: number
  path: number
  curve: number
  hasHandles: boolean
}

export type Graph = {
  curves: GraphCurve[]
  values: CurveValues[]
  pieces: Piece[][]
  vertices: Vertex[]
  edges: Edge[]
  halfEdges: HalfEdge[]
  faces: Face[]
  nonZeros: boolean[]
  epsilon: number
}

// The points where the curves are cut, while the graph is built: the cuts of
// each curve, the points by their index, and the union-find that merges
// close points into vertices, see mergeVertices():
type Points = {
  cuts: Cut[][]
  xs: number[]
  ys: number[]
  isEnds: boolean[]
  parents: number[]
  vertexIndices: Record<number, number>
}

const { min, max, abs } = Math

/**
 * Creates a planar graph of the operands' curves: All intersections become
 * vertices, the pieces of curves between them edges, and the edges bound
 * faces with a known winding for each operand.
 *
 * @param operands one or two operands
 * @return the graph's vertices, edges, half-edges and faces
 */
export function createGraph(operands: Operand[]): Graph {
  const graph: Graph = {
    ...readCurves(operands),
    pieces: [],
    vertices: [],
    edges: [],
    halfEdges: [],
    faces: []
  }
  const points: Points = {
    cuts: [],
    xs: [],
    ys: [],
    isEnds: [],
    parents: null,
    vertexIndices: null
  }
  const collisions = cutCurves(graph, points)
  mergeVertices(graph, points, collisions)
  createEdges(graph, points)
  sortHalfEdges(graph)
  collectFaces(graph)
  propagateWindings(graph)
  return graph
}

/**
 * Traces the outlines of the areas that the operator includes, along the
 * edges of the operands' graph that have the result on their left and not
 * on their right. At each vertex, we turn through the result until the
 * next of them, which keeps contours apart that only touch.
 *
 * @param operands one or two operands, with closed paths only
 * @param operator decides if a face is part of the result, from
 *     whether it is inside each of the operands
 * @return the traced paths
 */
export function traceGraph(
  operands: RegionValues[],
  operator: Operator
): TracedPath[] {
  const graph = createGraph(operands)
  const { halfEdges, faces } = graph
  for (const face of faces) {
    face.isInside = !!operator(
      isFilled(graph, face.windings, 0),
      isFilled(graph, face.windings, 1)
    )
  }

  function isBoundary(index: number): boolean {
    return (
      halfEdges[index].face.isInside &&
      !halfEdges[index ^ 1].face.isInside
    )
  }

  // The curve times along a half-edge, and if the next one continues
  // it along the same curve:
  function getTimes(index: number): number[] {
    const { edge } = halfEdges[index]
    return index & 1 ? [edge.time2, edge.time1] : [edge.time1, edge.time2]
  }

  function isContinued(index: number, next: number): boolean {
    return (
      halfEdges[index].edge.curve === halfEdges[next].edge.curve &&
      getTimes(index)[1] === getTimes(next)[0]
    )
  }

  const paths: TracedPath[] = []
  const isVisited: boolean[] = []
  for (let i = 0, l = halfEdges.length; i < l; i++) {
    if (!isVisited[i] && isBoundary(i)) {
      const contour = []
      let index = i
      do {
        isVisited[index] = true
        contour.push(index)
        index = halfEdges[index].next
        while (!isBoundary(index)) {
          index = halfEdges[index ^ 1].next
        }
      } while (index !== i)
      // Start where a piece doesn't continue the one before it, as
      // the pieces of a closed curve don't continue across its end:
      const { length } = contour
      let start = 0
      while (
        start < length &&
        isContinued(contour[(start || length) - 1], contour[start])
      ) {
        start++
      }
      const { segments, parts } = joinPieces(
        graph,
        Array.from({ length }, (_, j) => {
          const index = contour[(start + j) % length]
          const [time1, time2] = getTimes(index)
          const { edge, values } = halfEdges[index]
          return { curve: edge.curve, edge: index >> 1, time1, time2, values }
        })
      )
      // The contour ends where it starts:
      segments[0][1] = segments.pop()[1]
      paths.push({
        segments,
        sources: parts.map(({ curve, time1, time2 }) => {
          const { operand, path, curve: index } = graph.curves[curve]
          return { operand, path, curve: index, time1, time2 }
        })
      })
    }
  }
  return paths
}

// Whether the windings fill the operand by its fill rule:
export function isFilled(
  graph: Graph,
  windings: number[],
  operand: number
): boolean {
  const winding = windings[operand]
  return graph.nonZeros[operand] ? !!winding : !!(winding & 1)
}

// Returns the segments along the pieces, from the start of the first one to the
// end of the last one, with the pieces of the same curve that follow each
// other joined back into one part of it, and these parts:
export function joinPieces(graph: Graph, pieces: Piece[]) {
  const segments: SegmentValues[] = []
  const parts: { curve: number; time1: number; time2: number }[] = []
  let handleIn = [0, 0]
  for (let i = 0, l = pieces.length; i < l;) {
    const first = pieces[i]
    let last = first
    while (
      ++i < l &&
      pieces[i].curve === first.curve &&
      pieces[i].time1 === last.time2
    ) {
      last = pieces[i]
    }
    const { curve, time1 } = first
    const { time2 } = last
    const { hasHandles } = graph.curves[curve]
    const v =
      first === last
        ? first.values
        : getPart(
            graph.values[curve],
            hasHandles,
            time1,
            time2,
            { x: first.values[0], y: first.values[1] },
            { x: last.values[6], y: last.values[7] }
          )
    segments.push([
      [v[0], v[1]],
      handleIn,
      hasHandles ? [v[2] - v[0], v[3] - v[1]] : [0, 0]
    ])
    handleIn = hasHandles ? [v[4] - v[6], v[5] - v[7]] : [0, 0]
    parts.push({ curve, time1, time2 })
    if (i === l) {
      segments.push([[v[6], v[7]], handleIn, [0, 0]])
    }
  }
  return { segments, parts }
}

// Read the curves of the operands' paths as their values, each with its
// neighbors and where it comes from, along with the fill rules, and the
// distance under which points count as the same:
function readCurves(
  operands: Operand[]
): Pick<Graph, 'curves' | 'values' | 'nonZeros' | 'epsilon'> {
  const curves: GraphCurve[] = []
  const values: CurveValues[] = []
  const nonZeros: boolean[] = []
  let bounds: Rectangle = null
  for (let i = 0, l = operands.length; i < l; i++) {
    const operand = operands[i]
    const { paths } = operand
    nonZeros.push(operand.fillRule === 'nonzero')
    bounds = bounds ? bounds.unite(getBounds(operand)) : getBounds(operand)
    for (let j = 0, k = paths.length; j < k; j++) {
      // Open paths of regions are filled as if closed by a straight line:
      const isClosing = !paths[j].closed && !!operand.fillRule
      const closed = paths[j].closed || isClosing
      const segments = getSegments(paths[j])
      const count = segments.length
      const first = curves.length
      for (let m = 0, n = closed ? count : count - 1; m < n; m++) {
        const segment1 = segments[m]
        const segment2 = segments[(m + 1) % count]
        const straight = isClosing && m === count - 1
        values.push(getValues(segment1, segment2, straight))
        curves.push({
          next: null,
          previous: null,
          index: curves.length,
          operand: i,
          path: j,
          curve: m,
          hasHandles: !straight && hasHandles(segment1, segment2)
        })
      }
      // The curves of closed paths follow each other around their ends:
      for (let m = first, n = curves.length; m < n; m++) {
        const curve = curves[m]
        curve.next = m + 1 < n ? curves[m + 1] : closed ? curves[first] : null
        curve.previous =
          m > first ? curves[m - 1] : closed ? curves[n - 1] : null
      }
    }
  }
  // Points closer than epsilon are one vertex. It is relative to the size
  // of the operands, but not below the resolution of their coordinates:
  const epsilon = getEpsilon(
    max(
      abs(bounds.left), abs(bounds.right),
      abs(bounds.top), abs(bounds.bottom)
    ),
    bounds.topLeft.getDistance(bounds.bottomRight) * GEOMETRIC_EPSILON
  )
  return { curves, values, nonZeros, epsilon }
}

// Cut the curves at their ends and at all intersections, including
// those within the same operand and the ends of overlaps:
function cutCurves(graph: Graph, points: Points): number[][] {
  const { curves, values, epsilon } = graph
  const { cuts } = points
  for (let i = 0, l = curves.length; i < l; i++) {
    const v = values[i]
    cuts.push([])
    addCut(points, i, 0, new Point(v[0], v[1]), true)
    addCut(points, i, 1, new Point(v[6], v[7]), true)
  }
  // The curves whose bounds come within 2 epsilon of each other, for the
  // intersections and the hot pixels of mergeVertices():
  const collisions = findCurveBoundsCollisions(values, values, 2 * epsilon)
  // Cut both curves wherever two of them intersect, and those with a loop
  // where they cross themselves. An intersection that is found again, at
  // the same points of the same two curves, only cuts them once:
  const hits: Hit[] = []
  const pairs: Record<number, Hit[][]> = {}
  const count = curves.length
  const addHits = (
    curve1: GraphCurve,
    curve2: GraphCurve,
    intersections: Intersection[]
  ) => {
    for (const [time1, time2] of intersections) {
      const hit1 = getHit(graph, curve1, time1)
      const hit2 = getHit(graph, curve2, time2)
      const others = (pairs[
        min(hit1.index, hit2.index) * count + max(hit1.index, hit2.index)
      ] ??= [])
      const isSame = (hit: Hit, other: Hit) => (
        hit.index === other.index &&
        hit.point.isClose(other.point, GEOMETRIC_EPSILON)
      )
      const isNew = !others.some(
        ([other1, other2]) => (
          isSame(hit1, other1) && isSame(hit2, other2) ||
          isSame(hit1, other2) && isSame(hit2, other1)
        )
      )
      if (isNew) {
        others.push([hit1, hit2])
        hits.push(hit1, hit2)
      }
    }
  }
  for (let i = 0; i < count; i++) {
    const curve1 = curves[i]
    addHits(
      curve1,
      curve1,
      Bezier.getSelfIntersection(values[i], curve1.previous === curve1)
    )
    for (const j of collisions[i] ?? []) {
      if (j > i) {
        const curve2 = curves[j]
        addHits(
          curve1,
          curve2,
          Bezier.getIntersections(values[i], values[j], {
            sharesStart: curve1.previous === curve2,
            sharesEnd: curve1.next === curve2,
            tolerance: epsilon
          })
        )
      }
    }
  }
  // In their order along the curves, as the first of the points that merge
  // into a vertex gives it its position:
  hits.sort((hit1, hit2) => hit1.index - hit2.index || hit1.time - hit2.time)
  for (const { index, time, point } of hits) {
    addCut(points, index, time, point, false)
  }
  // Curves whose control points lie along a line can reverse along it,
  // and overlap themselves and the other curves along it. Cut them where
  // they reverse, so that their pieces run in one direction, and the
  // hot pixels of mergeVertices() cut the curves they overlap at the same
  // vertices:
  for (let i = 0, l = curves.length; i < l; i++) {
    const times = Bezier.getReversals(values[i], epsilon)
    for (let j = 0, k = times.length; j < k; j++) {
      addCut(points, i, times[j], Bezier.getPoint(values[i], times[j]), false)
    }
  }
  return collisions
}

// Merge points closer than epsilon into vertices, through union-find
// on the points sorted by x. A vertex takes the position of a curve end
// if it has one, so the operands' own vertices stay where they are:
function mergeVertices(graph: Graph, points: Points, collisions: number[][]) {
  const { curves, values, epsilon } = graph
  const { cuts, xs, ys } = points
  const count = xs.length
  const parents = (points.parents = new Array(count))
  const order = new Array(count)
  for (let i = 0; i < count; i++) {
    parents[i] = order[i] = i
  }

  order.sort((a, b) => xs[a] - xs[b])
  for (let i = 0; i < count; i++) {
    const a = order[i]
    for (let j = i + 1; j < count && xs[order[j]] - xs[a] <= epsilon; j++) {
      const b = order[j]
      const dx = xs[b] - xs[a]
      const dy = ys[b] - ys[a]
      if (dx * dx + dy * dy <= epsilon * epsilon) {
        parents[getRoot(parents, a)] = getRoot(parents, b)
      }
    }
  }
  createVertices(graph, points)

  // The last curve that tested each vertex in getHotPixels(), to test
  // each only once per curve:
  let marks: number[]

  // Cut the curves where they pass within epsilon of a vertex, the
  // hot pixels of snap rounding. Moving the pieces to their vertices
  // can bring them within epsilon of further ones, or carry them across
  // them, so the pieces of each cut are tested again, until none passes
  // a vertex. As cuts only use existing vertices, this ends:
  // The vertices that may cut curve i, as the ones within 2 epsilon of
  // its bounds, since its pieces stay within epsilon of it. Each vertex
  // lies on a curve that it cuts, so we find it among the cuts of the
  // curves whose bounds come that close:
  function getHotPixels(i: number): number[] {
    const v = values[i]
    const left = min(v[0], v[2], v[4], v[6]) - 2 * epsilon
    const top = min(v[1], v[3], v[5], v[7]) - 2 * epsilon
    const right = max(v[0], v[2], v[4], v[6]) + 2 * epsilon
    const bottom = max(v[1], v[3], v[5], v[7]) + 2 * epsilon
    const indices = collisions[i]
    const hotPixels = []
    for (let j = 0, k = indices.length; j < k; j++) {
      const list = cuts[indices[j]]
      for (let m = 0, n = list.length; m < n; m++) {
        const index = getVertex(points, list[m].point)
        if (marks[index] !== i) {
          const vertex = graph.vertices[index]
          marks[index] = i
          if (
            vertex.x >= left &&
            vertex.x <= right &&
            vertex.y >= top &&
            vertex.y <= bottom
          ) {
            hotPixels.push(index)
          }
        }
      }
    }
    return hotPixels.sort((a, b) => a - b)
  }

  // A piece of a curve between two cuts, moved to their vertices, with
  // its bounds grown by epsilon, and the part of the curve that it was
  // before, where one of its ends moved by more than epsilon, which its
  // bounds then include:
  type MovedPiece = {
    values: number[]
    part: number[] | null
    bounds: number[]
    cut1: Cut
    cut2: Cut
  }

  // The pieces of a curve that a vertex may cut, as the ones that don't
  // end in it, and whose bounds contain it:
  function isNearPiece(
    piece: MovedPiece,
    index: number,
    vertex: Vertex
  ): boolean {
    const [left, top, right, bottom] = piece.bounds
    const { x, y } = vertex
    return (
      getVertex(points, piece.cut1.point) !== index &&
      getVertex(points, piece.cut2.point) !== index &&
      x >= left &&
      x <= right &&
      y >= top &&
      y <= bottom
    )
  }

  // Whether the cut's point moved to its vertex by more than epsilon in a
  // merge. A piece whose ends moved less passes within epsilon of all the
  // vertices that it moved over:
  function isMoved({ point }: Cut): boolean {
    const vertex = graph.vertices[getVertex(points, point)]
    const dx = vertex.x - xs[point]
    const dy = vertex.y - ys[point]
    return dx * dx + dy * dy > epsilon * epsilon
  }

  // Whether the piece passed over the point as it moved to its vertices:
  function isPassed({ values: v, part }: MovedPiece, point: Point): boolean {
    return (
      !!part &&
      getSide(v, point, epsilon) * getSide(part, point, epsilon) < 0
    )
  }

  function addPiece(pieces: MovedPiece[], i: number, cut1: Cut, cut2: Cut) {
    const v = getPiece(graph, points, i, cut1, cut2)
    const part =
      isMoved(cut1) || isMoved(cut2)
        ? Bezier.getPart(values[i], cut1.time, cut2.time)
        : null
    const p = part ?? v
    pieces.push({
      values: v,
      part,
      bounds: [
        min(v[0], v[2], v[4], v[6], p[0], p[2], p[4], p[6]) - epsilon,
        min(v[1], v[3], v[5], v[7], p[1], p[3], p[5], p[7]) - epsilon,
        max(v[0], v[2], v[4], v[6], p[0], p[2], p[4], p[6]) + epsilon,
        max(v[1], v[3], v[5], v[7], p[1], p[3], p[5], p[7]) + epsilon
      ],
      cut1,
      cut2
    })
  }

  function cutAtHotPixels(i: number) {
    const candidates = getHotPixels(i)
    if (candidates.length) {
      const list = sortCuts(cuts[i])
      const pieces: MovedPiece[] = []
      for (let j = 1, k = list.length; j < k; j++) {
        addPiece(pieces, i, list[j - 1], list[j])
      }
      while (pieces.length) {
        const piece = pieces.pop()
        for (let j = 0, k = candidates.length; j < k; j++) {
          const index = candidates[j]
          const vertex = graph.vertices[index]
          if (isNearPiece(piece, index, vertex)) {
            const point = new Point(vertex.x, vertex.y)
            const t = Bezier.getNearestTime(piece.values, point, epsilon)
            // Cut where the piece passes within epsilon of the vertex, or
            // where it passed over it, as it moved to its vertices:
            if (
              t > 0 &&
              t < 1 && (
                point.isClose(Bezier.getPoint(piece.values, t), epsilon) ||
                isPassed(piece, point)
              )
            ) {
              const { cut1, cut2 } = piece
              const cut = {
                time: curves[i].hasHandles
                  ? cut1.time + (cut2.time - cut1.time) * t
                  : Bezier.getNearestTime(values[i], point, epsilon),
                point: vertex.point
              }
              cuts[i].push(cut)
              addPiece(pieces, i, cut1, cut)
              addPiece(pieces, i, cut, cut2)
              break
            }
          }
        }
      }
    }
  }

  // Merge the vertices that pieces shorter than 4 epsilon join: As
  // the hot pixels reach 2 epsilon, the order of the edges around such
  // vertices can't be told apart. Merged vertices span up to about 5
  // epsilon, the precision of the result. Returns true if it merged
  // any, as moving vertices can bring pieces within epsilon of others:
  function mergeShortPieces(): boolean {
    const pieces: number[][] = []
    let isMerged = false
    for (let i = 0, l = curves.length; i < l; i++) {
      const list = sortCuts(cuts[i])
      for (let j = 1, k = list.length; j < k; j++) {
        const cut1 = list[j - 1]
        const cut2 = list[j]
        if (getVertex(points, cut1.point) !== getVertex(points, cut2.point)) {
          // The pieces are at least as long as their ends are
          // apart, so we only measure them if close:
          const v = getPiece(graph, points, i, cut1, cut2)
          const dx = v[6] - v[0]
          const dy = v[7] - v[1]
          if (
            dx * dx + dy * dy < 16 * epsilon * epsilon &&
            Bezier.getLength(v) < 4 * epsilon
          ) {
            pieces.push([cut1.point, cut2.point])
          }
        }
      }
    }
    for (let i = 0, l = pieces.length; i < l; i++) {
      const root1 = getRoot(parents, pieces[i][0])
      const root2 = getRoot(parents, pieces[i][1])
      if (root1 !== root2) {
        parents[root1] = root2
        isMerged = true
      }
    }
    if (isMerged) {
      createVertices(graph, points)
    }
    return isMerged
  }

  // Cut at the hot pixels and merge, until no vertices move any more,
  // which ends as each merge leaves fewer of them:
  do {
    marks = new Array(graph.vertices.length)
    for (let i = 0, l = curves.length; i < l; i++) {
      cutAtHotPixels(i)
    }
  } while (mergeShortPieces())
}

// Create the edges between the vertices along each curve, with the
// change in winding of each operand when crossing them from right to
// left. Coincident pieces become one edge that adds up their changes:
function createEdges(graph: Graph, points: Points) {
  const { curves, edges, pieces, epsilon } = graph
  const { cuts } = points
  const edgesByVertex: number[][] = []

  function getCoincidence(edge1: Edge, edge2: Edge): number {
    // Compare points along edge2 to edge1, and return the direction
    // of edge2 relative to edge1 if they coincide, or 0:
    const v1 = edge1.values
    const v2 = edge2.values
    const times = []
    for (let i = 1; i <= 3; i++) {
      const point = Bezier.getPoint(v2, i / 4)
      const time = Bezier.getNearestTime(v1, point, epsilon)
      if (!point.isClose(Bezier.getPoint(v1, time), epsilon)) return 0
      times.push(time)
    }
    return times[0] < times[2] ? 1 : -1
  }

  // Adds the edge, or merges it into one that it coincides with, and returns
  // the index of the edge that it became:
  function addEdge(edge: Edge): number {
    // Look up the edges between the same vertices by the first one:
    const first = min(edge.from, edge.to)
    const last = max(edge.from, edge.to)
    const list = (edgesByVertex[first] ??= [])
    for (let i = 0, l = list.length; i < l; i++) {
      const other = edges[list[i]]
      const direction = (
        max(other.from, other.to) === last &&
        getCoincidence(other, edge)
      )
      if (direction) {
        for (let j = 0; j < 2; j++) {
          other.windings[j] += direction * edge.windings[j]
        }
        return list[i]
      }
    }
    list.push(edges.length)
    edges.push(edge)
    return edges.length - 1
  }

  for (let i = 0, l = curves.length; i < l; i++) {
    const list = cuts[i] // Sorted in mergeVertices().
    const isStraight = !curves[i].hasHandles
    pieces[i] = []
    let prev = list[0]
    for (let j = 1, k = list.length; j < k; j++) {
      const cut = list[j]
      const from = getVertex(points, prev.point)
      const to = getVertex(points, cut.point)
      const part = getPiece(graph, points, i, prev, cut)
      // Drop pieces that start and end in the same vertex, unless
      // they form a loop that is longer than the pieces that vertices
      // merge, see mergeVertices():
      if (from !== to || Bezier.getLength(part) >= 4 * epsilon) {
        const windings = [0, 0]
        windings[curves[i].operand] = 1
        const edge = addEdge({
          values: part,
          from,
          to,
          isStraight,
          windings,
          curve: i,
          time1: prev.time,
          time2: cut.time
        })
        pieces[i].push({
          curve: i,
          edge,
          time1: prev.time,
          time2: cut.time,
          values: part
        })
      }
      prev = cut
    }
  }
}

// Sort the half-edges leaving each vertex by angle. Edge i has the
// half-edges 2 * i, leaving from its start, and 2 * i + 1, leaving
// from its end. Their angles are measured to points a short distance
// along them, where tangent curves already separate, but no other
// vertex is reached yet:
function sortHalfEdges(graph: Graph) {
  const { vertices, edges, halfEdges, epsilon } = graph
  // The point at the distance along the half-edge. Straight edges keep
  // their handles at their ends, so their times don't run evenly:
  function getPointAt(halfEdge: HalfEdge, distance: number): Point {
    const v = halfEdge.values
    const { edge } = halfEdge
    const t = distance / edge.length
    return edge.isStraight
      ? new Point(v[0] + (v[6] - v[0]) * t, v[1] + (v[7] - v[1]) * t)
      : Bezier.getPoint(v, Bezier.getTimeAt(v, distance))
  }

  // Half-edges that leave a vertex tangentially and can't be told apart
  // where their angles are measured: Tell on which side of the first one
  // the second one runs, half way along the shorter one, as they don't
  // cross before they end, or return 0 if it doesn't run alongside the
  // first one there:
  function getOrder(halfEdge1: HalfEdge, halfEdge2: HalfEdge): number {
    const point = getPointAt(
      halfEdge2,
      min(halfEdge1.edge.length, halfEdge2.edge.length) / 2
    )
    return -getSide(halfEdge1.values, point, epsilon)
  }

  // The range of angles of a half-edge's control polygon, which contains
  // all directions in which it leaves its vertex, or null if the range
  // isn't within a half-plane:
  function getDirections(v: number[]): { start: number; width: number } {
    const angles = []
    for (let i = 0; i < 6; i += 2) {
      const dx = v[i + 2] - v[i]
      const dy = v[i + 3] - v[i + 1]
      if (dx || dy) {
        angles.push(Math.atan2(dy, dx))
      }
    }
    const first = angles[0]
    let from = 0
    let to = 0
    for (let i = 1, l = angles.length; i < l; i++) {
      const difference = (
        ((angles[i] - first + 3 * Math.PI) % (2 * Math.PI)) -
        Math.PI
      )
      from = min(from, difference)
      to = max(to, difference)
    }
    return to - from < Math.PI
      ? {
          start: (first + from + 2 * Math.PI) % (2 * Math.PI),
          width: to - from
        }
      : null
  }

  // Sort the half-edges by their ranges of directions and return true,
  // if these are apart far enough that the points where their angles
  // are measured below lie over 2 epsilon apart: These points lie within
  // the ranges, at least half the shortest chord along the half-edges,
  // and so at least cos(width / 2) times that away from the vertex:
  function sortByDirections(outgoing: number[]): boolean {
    let distance = Infinity
    for (let j = 0, k = outgoing.length; j < k; j++) {
      const halfEdge = halfEdges[outgoing[j]]
      const v = halfEdge.values
      halfEdge.directions = getDirections(v)
      if (!halfEdge.directions) return false
      distance = min(
        distance,
        Math.sqrt(
          (v[6] - v[0]) * (v[6] - v[0]) +
          (v[7] - v[1]) * (v[7] - v[1])
        ) / 2
      )
    }
    const sorted = outgoing
      .slice()
      .sort(
        (a, b) => halfEdges[a].directions.start - halfEdges[b].directions.start
      )
    let gap = Infinity
    let width = 0
    for (let j = 0, k = sorted.length; j < k; j++) {
      const directions1 = halfEdges[sorted[j]].directions
      const directions2 = halfEdges[sorted[(j + 1) % k]].directions
      gap = min(
        gap,
        directions2.start -
        directions1.start -
        directions1.width +
        (j + 1 < k ? 0 : 2 * Math.PI)
      )
      width = max(width, directions1.width)
    }
    if (
      gap > 0 && (
        distance * Math.cos(width / 2) * Math.sin(min(gap, Math.PI / 2)) >
        2 * epsilon
      )
    ) {
      for (let j = 0, k = sorted.length; j < k; j++) {
        outgoing[j] = sorted[j]
      }
      return true
    }
    return false
  }

  for (let i = 0, l = edges.length; i < l; i++) {
    const edge = edges[i]
    const v = edge.values
    edge.reversed = [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]]
    halfEdges.push(
      { edge, values: v, from: edge.from, to: edge.to },
      { edge, values: edge.reversed, from: edge.to, to: edge.from }
    )
    vertices[edge.from].outgoing.push(2 * i)
    vertices[edge.to].outgoing.push(2 * i + 1)
  }
  for (let i = 0, l = vertices.length; i < l; i++) {
    const vertex = vertices[i]
    const { outgoing } = vertex
    // Up to two half-edges are in the same cyclic order either way,
    // and where their ranges of directions are apart far enough,
    // these give the order already:
    if (outgoing.length > 2 && !sortByDirections(outgoing)) {
      let distance = Infinity
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const { edge } = halfEdges[outgoing[j]]
        edge.length = edge.length || Bezier.getLength(edge.values)
        distance = min(distance, edge.length / 2)
      }
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const halfEdge = halfEdges[outgoing[j]]
        const point = getPointAt(halfEdge, distance)
        halfEdge.point = point
        halfEdge.angle = Math.atan2(point.y - vertex.y, point.x - vertex.x)
      }
      // Start the order after the largest gap between the angles,
      // so that half-edges which are hard to tell apart are not
      // separated by the turn from pi to -pi:
      outgoing.sort((a, b) => halfEdges[a].angle - halfEdges[b].angle)
      let start = -Math.PI
      let gap = 0
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const { angle } = halfEdges[outgoing[j]]
        const previous = halfEdges[outgoing[(j || k) - 1]].angle
        const difference = (
          (angle - previous + 2 * Math.PI) % (2 * Math.PI) ||
          2 * Math.PI
        )
        if (difference > gap) {
          gap = difference
          start = angle
        }
      }
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const halfEdge = halfEdges[outgoing[j]]
        halfEdge.angle = (halfEdge.angle - start + 2 * Math.PI) % (2 * Math.PI)
      }
      outgoing.sort((a, b) => {
        const halfEdge1 = halfEdges[a]
        const halfEdge2 = halfEdges[b]
        return (
          (
            halfEdge1.point.isClose(halfEdge2.point, epsilon) &&
            getOrder(halfEdge1, halfEdge2)
          ) ||
          halfEdge1.angle - halfEdge2.angle
        )
      })
    }
    for (let j = 0, k = outgoing.length; j < k; j++) {
      halfEdges[outgoing[j]].position = j
    }
  }
  // Walking along a face with the face on the left, the next half-edge
  // leaves the reached vertex right before the one we came back on, in
  // counter-clockwise order:
  for (let i = 0, l = halfEdges.length; i < l; i++) {
    const { outgoing } = vertices[halfEdges[i].to]
    const { position } = halfEdges[i ^ 1]
    halfEdges[i].next = outgoing[(position || outgoing.length) - 1]
  }
}

// Collect the faces, each on the left of its half-edges, and their
// signed areas, which are negative for the outside of each connected
// component of the graph:
function collectFaces(graph: Graph) {
  const { halfEdges, faces } = graph
  for (let i = 0, l = halfEdges.length; i < l; i++) {
    if (halfEdges[i].face === undefined) {
      const face: Face = {
        halfEdges: [],
        area: 0,
        windings: null,
        component: null
      }
      let index = i
      do {
        const halfEdge = halfEdges[index]
        halfEdge.face = face
        face.halfEdges.push(index)
        face.area += Bezier.getArea(halfEdge.values)
        index = halfEdge.next
      } while (index !== i)
      faces.push(face)
    }
  }
}

// Propagate the windings from the outside of each connected
// component of the graph across its edges. A component that lies
// within others gets the windings of its outside from a ray cast
// against their edges:
function propagateWindings(graph: Graph) {
  const { vertices, edges, halfEdges, faces } = graph
  const components: Component[] = []
  const rays: number[][] = []
  const componentBounds: number[][] = []
  for (let i = 0, l = faces.length; i < l; i++) {
    const face = faces[i]
    if (!face.component) {
      const component: Component = {
        edges: [],
        bounds: [Infinity, Infinity, -Infinity, -Infinity],
        outside: face
      }
      const list = [face]
      face.component = component
      for (let j = 0; j < list.length; j++) {
        const indices = list[j].halfEdges
        if (list[j].area < component.outside.area) {
          component.outside = list[j]
        }
        for (let k = 0, n = indices.length; k < n; k++) {
          const other = halfEdges[indices[k] ^ 1].face
          if (!other.component) {
            other.component = component
            list.push(other)
          }
        }
      }
      const vertex = vertices[halfEdges[component.outside.halfEdges[0]].from]
      components.push(component)
      rays.push([vertex.x, vertex.y, Infinity, vertex.y])
      componentBounds.push(component.bounds)
    }
  }
  // Collect the edges and bounds of each component, to cast each ray
  // only against the components whose bounds it reaches:
  for (let i = 0, l = edges.length; i < l; i++) {
    const edge = edges[i]
    const v = edge.values
    const { component } = halfEdges[2 * i].face
    const b = component.bounds
    component.edges.push(edge)
    b[0] = min(b[0], v[0], v[2], v[4], v[6])
    b[1] = min(b[1], v[1], v[3], v[5], v[7])
    b[2] = max(b[2], v[0], v[2], v[4], v[6])
    b[3] = max(b[3], v[1], v[3], v[5], v[7])
  }
  const rayCollisions = findBoundsCollisions(rays, componentBounds, 0, true)
  for (let i = 0, l = components.length; i < l; i++) {
    const { outside } = components[i]
    const point = new Point(rays[i][0], rays[i][1])
    const indices = rayCollisions[i]
    const windings = [0, 0]
    for (let j = 0, k = indices.length; j < k; j++) {
      if (indices[j] !== i) {
        const list = components[indices[j]].edges
        for (let m = 0, n = list.length; m < n; m++) {
          const edge = list[m]
          const winding = Bezier.getRayWinding(edge.values, point)
          windings[0] += winding * edge.windings[0]
          windings[1] += winding * edge.windings[1]
        }
      }
    }
    outside.windings = windings
    const queue = [outside]
    for (let j = 0; j < queue.length; j++) {
      const face = queue[j]
      const indices = face.halfEdges
      for (let k = 0, n = indices.length; k < n; k++) {
        const index = indices[k]
        const other = halfEdges[index ^ 1].face
        if (!other.windings) {
          // The face on the left of a half-edge has the higher
          // winding when the half-edge runs along its edge:
          const edgeWindings = halfEdges[index].edge.windings
          const sign = index & 1 ? -1 : 1
          other.windings = [
            face.windings[0] - sign * edgeWindings[0],
            face.windings[1] - sign * edgeWindings[1]
          ]
          queue.push(other)
        }
      }
    }
  }
}

// The place where a curve is hit by another one, as the index of the curve
// with the time and the point on it. At the end of a curve, that is the
// start of the next one, where its segment lies:
function getHit(graph: Graph, curve: GraphCurve, time: number): Hit {
  if (time >= 1 - CURVETIME_EPSILON && curve.next) {
    curve = curve.next
    time = 0
  }
  const { index } = curve
  return { index, time, point: Bezier.getPoint(graph.values[index], time) }
}

function addCut(
  points: Points,
  index: number,
  time: number,
  point: Point,
  isEnd: boolean
) {
  points.cuts[index].push({ time, point: points.xs.length })
  points.xs.push(point.x)
  points.ys.push(point.y)
  points.isEnds.push(isEnd)
}

function sortCuts(list: Cut[]): Cut[] {
  return list.sort((a, b) => a.time - b.time)
}

function getRoot(parents: number[], i: number): number {
  while (parents[i] !== i) {
    i = parents[i] = parents[parents[i]]
  }
  return i
}

function getVertex(points: Points, point: number): number {
  return points.vertexIndices[getRoot(points.parents, point)]
}

// Create the vertices of the points as they are merged so far, each at the
// position of a curve end if it has one:
function createVertices(graph: Graph, points: Points) {
  const { xs, ys, isEnds, parents } = points
  const vertexIndices: Record<number, number> = {}
  const vertices: Vertex[] = []
  for (let i = 0, l = xs.length; i < l; i++) {
    const root = getRoot(parents, i)
    const index = vertexIndices[root]
    if (index === undefined || isEnds[i] && !vertices[index].isEnd) {
      vertices[(vertexIndices[root] ??= vertices.length)] = {
        x: xs[i],
        y: ys[i],
        isEnd: isEnds[i],
        point: i,
        outgoing: []
      }
    }
  }
  points.vertexIndices = vertexIndices
  graph.vertices = vertices
}

// The piece of curve i between two cuts, with its ends moved to their
// vertices, along with their handles:
function getPiece(
  graph: Graph,
  points: Points,
  i: number,
  cut1: Cut,
  cut2: Cut
): number[] {
  return getPart(
    graph.values[i],
    graph.curves[i].hasHandles,
    cut1.time,
    cut2.time,
    graph.vertices[getVertex(points, cut1.point)],
    graph.vertices[getVertex(points, cut2.point)]
  )
}

/*
 * Returns the part of the curve values v between the curve times, with its
 * ends moved to the given points, along with their handles. Straight
 * curves remain straight.
 */
function getPart(
  v: number[],
  hasHandles: boolean,
  time1: number,
  time2: number,
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number[] {
  let part: number[]
  if (hasHandles) {
    part = Bezier.getPart(v, time1, time2).slice()
    const dx1 = point1.x - part[0]
    const dy1 = point1.y - part[1]
    const dx2 = point2.x - part[6]
    const dy2 = point2.y - part[7]
    part[0] += dx1
    part[1] += dy1
    part[2] += dx1
    part[3] += dy1
    part[4] += dx2
    part[5] += dy2
    part[6] += dx2
    part[7] += dy2
  } else {
    part = [
      point1.x,
      point1.y,
      point1.x,
      point1.y,
      point2.x,
      point2.y,
      point2.x,
      point2.y
    ]
  }
  return part
}

// The side of the curve that the point lies on, as the sign of its distance,
// or 0 beyond the curve's ends:
function getSide(v: number[], point: Point, epsilon: number): number {
  const t = Bezier.getNearestTime(v, point, epsilon)
  return t > 0 && t < 1
    ? Math.sign(
        Bezier.getTangent(v, t).cross(point.subtract(Bezier.getPoint(v, t)))
      )
    : 0
}
