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
// createGraph() and tracePaths().
import {
  Curve,
  CurveLocation,
  GEOMETRIC_EPSILON,
  Item,
  Path,
  Point,
  Segment,
  findBoundsCollisions,
  findCurveBoundsCollisions,
  getEpsilon,
  getRayWinding,
  getStrokeProfilePart,
  setStrokeProfileRuns
} from '../internal.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { PathItem } from './PathItem.ts'
import type { ProfilePart, ProfileRun } from './StrokeProfile.ts'

export type Operator = (inside1: boolean, inside2: boolean) => boolean

// The planar graph of createGraph(), with points stored by their index in its
// list of cut points, and vertices, edges and half-edges by their index:
type Cut = { time: number; point: number }

type Vertex = {
  x: number
  y: number
  isEnd: boolean
  point: number
  outgoing: number[]
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

export type Graph = {
  curves: Curve[]
  values: number[][]
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
 * @param operands the operands, with closed paths only
 * @return the graph's vertices, edges, half-edges and faces
 */
export function createGraph(operands: PathItem[]): Graph {
  const curves: Curve[] = []
  const curveOperands: number[] = []
  const offsets: Record<number, number> = {}
  const nonZeros: boolean[] = []
  let bounds: Rectangle = null
  for (let i = 0, l = operands.length; i < l; i++) {
    const operand = operands[i]
    const paths = (operand._children ?? [operand]) as Path[]
    nonZeros.push(operand.fillRule === 'nonzero')
    bounds = bounds ? bounds.unite(operand.bounds) : operand.bounds
    for (let j = 0, k = paths.length; j < k; j++) {
      const pathCurves = paths[j].curves
      offsets[paths[j]._id] = curves.length
      for (let m = 0, n = pathCurves.length; m < n; m++) {
        curves.push(pathCurves[m])
        curveOperands.push(i)
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
  const graph: Graph = {
    curves,
    values: [],
    vertices: [],
    edges: [],
    halfEdges: [],
    faces: [],
    nonZeros,
    epsilon
  }
  const points: Points = {
    cuts: [],
    xs: [],
    ys: [],
    isEnds: [],
    parents: null,
    vertexIndices: null
  }
  const collisions = cutCurves(graph, points, offsets)
  mergeVertices(graph, points, collisions)
  createEdges(graph, points, curveOperands)
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
 * @param operands the operands, with closed paths only
 * @param operator decides if a face is part of the result, from
 *     whether it is inside each of the operands
 * @return the traced paths
 */
export function tracePaths(operands: PathItem[], operator: Operator): Path[] {
  const graph = createGraph(operands)
  const { halfEdges, faces, nonZeros } = graph
  for (let i = 0, l = faces.length; i < l; i++) {
    const face = faces[i]
    const { windings } = face
    face.isInside = !!operator(
      nonZeros[0] ? !!windings[0] : !!(windings[0] & 1),
      nonZeros[1] ? !!windings[1] : !!(windings[1] & 1)
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

  const profiles = getProfiles(graph.curves)
  const paths: Path[] = []
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
      const length = contour.length
      let start = 0
      while (
        start < length &&
        isContinued(contour[(start || length) - 1], contour[start])
      ) {
        start++
      }
      // Join the pieces of the same curve that follow each other
      // back into one part of it:
      const segments: Segment[] = []
      const runs: ProfileRun[] = []
      let handleIn: Point = null
      for (let j = 0; j < length;) {
        const first = contour[(start + j) % length]
        let last = first
        while (
          ++j < length &&
          isContinued(last, contour[(start + j) % length])
        ) {
          last = contour[(start + j) % length]
        }
        const { edge } = halfEdges[first]
        const { isStraight } = edge
        const v =
          first === last
            ? halfEdges[first].values
            : getPart(
                graph.values[edge.curve],
                !isStraight,
                getTimes(first)[0],
                getTimes(last)[1],
                graph.vertices[halfEdges[first].from],
                graph.vertices[halfEdges[last].to]
              )
        segments.push(
          new Segment(
            new Point(v[0], v[1]),
            handleIn,
            isStraight ? null : new Point(v[2] - v[0], v[3] - v[1])
          )
        )
        handleIn = isStraight ? null : new Point(v[4] - v[6], v[5] - v[7])
        if (profiles) {
          // The part of the curve's stroke profile along the pieces:
          const time1 = getTimes(first)[0]
          const time2 = getTimes(last)[1]
          const reversed = time1 > time2
          const from = reversed ? time2 : time1
          const curve = graph.curves[edge.curve]
          const { part, offset } = profiles[edge.curve]
          runs.push({
            part,
            start: offset + curve.getPartLength(0, from),
            length: curve.getPartLength(from, reversed ? time1 : time2),
            reversed
          })
        }
      }
      if (handleIn) {
        segments[0].handleIn = handleIn
      }
      const path = new Path(Item.NO_INSERT)
      path.segments = segments
      path.closed = true
      if (profiles) {
        setStrokeProfileRuns(path, runs)
      }
      // Only add paths that cover an area to the result.
      if (path.area !== 0) {
        paths.push(path)
      }
    }
  }
  return paths
}

// Returns the stroke profile of each curve's path with the curve's offset on
// it, if any of the paths has one, for the paths that are traced along them:
function getProfiles(
  curves: Curve[]
): { part: ProfilePart; offset: number }[] | null {
  let profiles = null
  if (curves.some(curve => curve._path._strokeProfile)) {
    let path: Path = null
    let part: ProfilePart = null
    let offset = 0
    profiles = curves.map(curve => {
      if (curve._path !== path) {
        path = curve._path
        part = getStrokeProfilePart(path)
        offset = 0
      }
      const profile = { part, offset }
      offset += curve.length
      return profile
    })
  }
  return profiles
}

// Cut the curves at their ends and at all intersections, including
// those within the same operand and the ends of overlaps:
function cutCurves(
  graph: Graph,
  points: Points,
  offsets: Record<number, number>
): number[][] {
  const { curves, values, epsilon } = graph
  const { cuts } = points
  for (let i = 0, l = curves.length; i < l; i++) {
    const curve = curves[i]
    values.push(curve.getValues())
    cuts.push([])
    addCut(points, i, 0, curve._segment1._point, true)
    addCut(points, i, 1, curve._segment2._point, true)
  }
  // The curves whose bounds come within 2 epsilon of each other, for the
  // intersections and the hot pixels of mergeVertices():
  const collisions = findCurveBoundsCollisions(values, values, 2 * epsilon)
  const locations = CurveLocation.expand(
    Curve.getIntersections(
      curves,
      null,
      null,
      null,
      null,
      false,
      epsilon,
      collisions
    )
  )
  for (let i = 0, l = locations.length; i < l; i++) {
    const location = locations[i]
    const { curve } = location
    addCut(
      points,
      offsets[curve._path._id] + curve.index,
      location.time,
      location.point,
      false
    )
  }
  // Curves whose control points lie along a line can reverse along it,
  // and overlap themselves and the other curves along it. Cut them where
  // they reverse, so that their pieces run in one direction, and the
  // hot pixels of mergeVertices() cut the curves they overlap at the same
  // vertices:
  for (let i = 0, l = curves.length; i < l; i++) {
    const times = Curve.getReversals(values[i], epsilon)
    for (let j = 0, k = times.length; j < k; j++) {
      addCut(points, i, times[j], Curve.getPoint(values[i], times[j]), false)
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
  // can bring them within epsilon of further ones, so the pieces of each
  // cut are tested again, until none passes a vertex. As cuts only use
  // existing vertices, this ends:
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

  type Piece = { values: number[]; cut1: Cut; cut2: Cut }

  // The pieces of a curve that a vertex may cut, as the ones that don't
  // end in it, and whose bounds come within epsilon of it:
  function isNearPiece(piece: Piece, index: number, vertex: Vertex): boolean {
    const v = piece.values
    const { x, y } = vertex
    return (
      getVertex(points, piece.cut1.point) !== index &&
      getVertex(points, piece.cut2.point) !== index &&
      x >= min(v[0], v[2], v[4], v[6]) - epsilon &&
      x <= max(v[0], v[2], v[4], v[6]) + epsilon &&
      y >= min(v[1], v[3], v[5], v[7]) - epsilon &&
      y <= max(v[1], v[3], v[5], v[7]) + epsilon
    )
  }

  function addPiece(pieces: Piece[], i: number, cut1: Cut, cut2: Cut) {
    pieces.push({
      values: getPiece(graph, points, i, cut1, cut2),
      cut1,
      cut2
    })
  }

  function cutAtHotPixels(i: number) {
    const candidates = getHotPixels(i)
    if (candidates.length) {
      const list = sortCuts(cuts[i])
      const pieces: Piece[] = []
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
            const t = Curve.getNearestTime(piece.values, point)
            if (
              t > 0 &&
              t < 1 &&
              point.isClose(Curve.getPoint(piece.values, t), epsilon)
            ) {
              const { cut1, cut2 } = piece
              const cut = {
                time: curves[i].hasHandles()
                  ? cut1.time + (cut2.time - cut1.time) * t
                  : Curve.getNearestTime(values[i], point),
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
            Curve.getLength(v) < 4 * epsilon
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
function createEdges(graph: Graph, points: Points, curveOperands: number[]) {
  const { curves, edges, epsilon } = graph
  const { cuts } = points
  const edgesByVertex: Edge[][] = []

  function getCoincidence(edge1: Edge, edge2: Edge): number {
    // Compare points along edge2 to edge1, and return the direction
    // of edge2 relative to edge1 if they coincide, or 0:
    const v1 = edge1.values
    const v2 = edge2.values
    const times = []
    for (let i = 1; i <= 3; i++) {
      const point = Curve.getPoint(v2, i / 4)
      const time = Curve.getNearestTime(v1, point)
      if (!point.isClose(Curve.getPoint(v1, time), epsilon)) return 0
      times.push(time)
    }
    return times[0] < times[2] ? 1 : -1
  }

  function addEdge(edge: Edge) {
    // Look up the edges between the same vertices by the first one:
    const first = min(edge.from, edge.to)
    const last = max(edge.from, edge.to)
    const list = (edgesByVertex[first] ??= [])
    for (let i = 0, l = list.length; i < l; i++) {
      const other = list[i]
      const direction = (
        max(other.from, other.to) === last &&
        getCoincidence(other, edge)
      )
      if (direction) {
        for (let j = 0; j < 2; j++) {
          other.windings[j] += direction * edge.windings[j]
        }
        return
      }
    }
    list.push(edge)
    edges.push(edge)
  }

  for (let i = 0, l = curves.length; i < l; i++) {
    const list = cuts[i] // Sorted in mergeVertices().
    const isStraight = !curves[i].hasHandles()
    let prev = list[0]
    for (let j = 1, k = list.length; j < k; j++) {
      const cut = list[j]
      const from = getVertex(points, prev.point)
      const to = getVertex(points, cut.point)
      const part = getPiece(graph, points, i, prev, cut)
      // Drop pieces that start and end in the same vertex, unless
      // they form a loop that is longer than the pieces that vertices
      // merge, see mergeVertices():
      if (from !== to || Curve.getLength(part) >= 4 * epsilon) {
        const windings = [0, 0]
        windings[curveOperands[i]] = 1
        addEdge({
          values: part,
          from,
          to,
          isStraight,
          windings,
          curve: i,
          time1: prev.time,
          time2: cut.time
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
      : Curve.getPoint(v, Curve.getTimeAt(v, distance))
  }

  function getSide(halfEdge1: HalfEdge, halfEdge2: HalfEdge): number {
    // Half-edges that leave a vertex tangentially and can't be told
    // apart where their angles are measured: Tell on which side of the
    // first one the second one runs, half way along the shorter one,
    // as they don't cross before they end, or return 0 if it doesn't
    // run alongside the first one there:
    const v1 = halfEdge1.values
    const point = getPointAt(
      halfEdge2,
      min(halfEdge1.edge.length, halfEdge2.edge.length) / 2
    )
    const time = Curve.getNearestTime(v1, point)
    return time > 0 && time < 1
      ? (
          Curve.getTangent(v1, time).cross(
            point.subtract(Curve.getPoint(v1, time))
          ) > 0
        )
        ? -1
        : 1
      : 0
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
        edge.length = edge.length || Curve.getLength(edge.values)
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
        const angle = halfEdges[outgoing[j]].angle
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
            getSide(halfEdge1, halfEdge2)
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
        face.area += Curve.getArea(halfEdge.values)
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
          const winding = getRayWinding(point, edge.values)
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
    if (index === undefined) {
      vertexIndices[root] = vertices.length
      vertices.push({
        x: xs[i],
        y: ys[i],
        isEnd: isEnds[i],
        point: i,
        outgoing: []
      })
    } else if (isEnds[i] && !vertices[index].isEnd) {
      vertices[index] = {
        x: xs[i],
        y: ys[i],
        isEnd: true,
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
    graph.curves[i].hasHandles(),
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
    part = Curve.getPart(v, time1, time2).slice()
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
