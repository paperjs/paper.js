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

// The nodes and weights of the 15-point Gauss-Kronrod rule from the center
// out, as they are symmetric, and the weights of the 7-point Gauss rule
// that shares every other node with it:
const kronrodNodes = [
  0, 0.2077849550078984676006894, 0.4058451513773971669066064,
  0.5860872354676911302941448, 0.7415311855993944398638648,
  0.8648644233597690727897128, 0.9491079123427585245261897,
  0.9914553711208126392068547
]
const kronrodWeights = [
  0.2094821410847278280129992, 0.204432940075298892414162,
  0.1903505780647854099132564, 0.1690047266392679028265834,
  0.1406532597155259187451896, 0.1047900103222501838398763,
  0.0630920926299785532907007, 0.022935322010529224963732
]
const gaussWeights = [
  0.417959183673469387755102, 0.3818300505051189449503698,
  0.2797053914892766679014678, 0.1294849661688696932706114
]

// Math short-cuts for often used methods and values
const abs = Math.abs
const sqrt = Math.sqrt
const pow = Math.pow
const log2 = Math.log2
// The 15-point Gauss-Kronrod estimate of the integral of f from a to b,
// and of its error, by the difference to the Gauss rule within:
function getKronrod(f: (x: number) => number, a: number, b: number): number[] {
  const A = (b - a) * 0.5
  const B = A + a
  let fx = f(B)
  let kronrod = kronrodWeights[0] * fx
  let gauss = gaussWeights[0] * fx
  for (let i = 1; i < 8; i++) {
    const Ax = A * kronrodNodes[i]
    fx = f(B + Ax) + f(B - Ax)
    kronrod += kronrodWeights[i] * fx
    if (!(i & 1)) {
      gauss += gaussWeights[i >> 1] * fx
    }
  }
  return [A * kronrod, abs(A * (kronrod - gauss))]
}

// Halves the range until the estimates' errors stay within the tolerance,
// or the halves can't be told apart anymore:
function refineIntegral(
  f: (x: number) => number,
  a: number,
  b: number,
  estimate: number[],
  tolerance: number
): number {
  const m = (a + b) * 0.5
  return estimate[1] <= tolerance || m === a || m === b
    ? estimate[0]
    : refineIntegral(f, a, m, getKronrod(f, a, m), tolerance) +
      refineIntegral(f, m, b, getKronrod(f, m, b), tolerance)
}

/**
 * Returns a number whose value is clamped by the given range.
 *
 * @param value the value to be clamped
 * @param min the lower boundary of the range
 * @param max the upper boundary of the range
 * @return a number in the range of [min, max]
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

function getDiscriminant(a: number, b: number, c: number): number {
  // d = b^2 - a * c  computed accurately enough by a tricky scheme.
  // Ported from @hkrish's polysolve.c
  function split(v) {
    const x = v * 134217729
    const y = v - x
    const hi = y + x // Don't optimize y away!
    const lo = v - hi
    return [hi, lo]
  }

  let D = b * b - a * c
  const E = b * b + a * c
  if (abs(D) * 3 < E) {
    const ad = split(a)
    const bd = split(b)
    const cd = split(c)
    const p = b * b
    const dp = bd[0] * bd[0] - p + 2 * bd[0] * bd[1] + bd[1] * bd[1]
    const q = a * c
    const dq = (
      ad[0] * cd[0] -
      q +
      ad[0] * cd[1] +
      ad[1] * cd[0] +
      ad[1] * cd[1]
    )
    D = p - q + (dp - dq) // Don’t omit parentheses!
  }
  return D
}

function getNormalizationFactor(...values: number[]) {
  // Normalize coefficients à la Jenkins & Traub's RPOLY.
  // Normalization is done by scaling coefficients with a power of 2, so
  // that all the bits in the mantissa remain unchanged.
  // Use the infinity norm (max(sum(abs(a)…)) to determine the appropriate
  // scale factor. See @hkrish in #1087#issuecomment-231526156
  const norm = Math.max(...values)
  return norm && (norm < 1e-8 || norm > 1e8)
    ? pow(2, -Math.round(log2(norm)))
    : 0
}

/**
 * A very small absolute value used to check if a value is very close to
 * zero. The value should be large enough to offset any floating point
 * noise, but small enough to be meaningful in computation in a nominal
 * range (see MACHINE_EPSILON).
 *
 * http://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
 * http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
 */
export const EPSILON = 1e-12

/**
 * The machine epsilon for a double precision (Javascript Number) is
 * 2.220446049250313e-16. (try this in the js console:
 *     (function(){ for (var e = 1; 1 < 1+e/2;) e/=2; return e }())
 *
 * The constant MACHINE_EPSILON here refers to the constants δ and ε
 * such that, the error introduced by addition, multiplication on a
 * 64bit float (js Number) will be less than δ and ε. That is to say,
 * for all X and Y representable by a js Number object, S and P be their
 * 'exact' sum and product respectively, then
 * |S - (x+y)| <= δ|S|, and |P - (x*y)| <= ε|P|.
 * This amounts to about half of the actual machine epsilon.
 */
export const MACHINE_EPSILON = 1.12e-16

/**
 * The epsilon to be used when handling curve-time parameters. This
 * cannot be smaller, because errors add up to around 2e-7 in the bezier
 * fat-line clipping code as a result of recursive sub-division.
 */
export const CURVETIME_EPSILON = 1e-8

/**
 * The epsilon to be used when performing "geometric" checks, such as
 * distances between points and lines.
 */
export const GEOMETRIC_EPSILON = 1e-7

/**
 * The epsilon to be used when performing "trigonometric" checks, such
 * as examining cross products to check for collinearity.
 */
export const TRIGONOMETRIC_EPSILON = 1e-8

/**
 * The epsilon to be used when performing angular checks in degrees,
 * e.g. in `arcTo()`.
 */
export const ANGULAR_EPSILON = 1e-5

/**
 * Kappa is the value which which to scale the curve handles when
 * drawing a circle with bezier curves.
 *
 * http://whizkidtech.redprince.net/bezier/circle/kappa/
 */
export const KAPPA = 4 * (sqrt(2) - 1) / 3

/**
 * Returns the tolerance for comparing coordinates up to the given
 * magnitude: EPSILON or the optional epsilon if larger, or
 * two units in the last place where that is below the resolution of
 * the coordinates, so that touching values still compare as touching
 * (#1940).
 */
export function getEpsilon(magnitude: number, epsilon?: number): number {
  return Math.max(EPSILON, magnitude * 4 * MACHINE_EPSILON, epsilon || 0)
}

/**
 * Checks if the value is 0, within a tolerance defined by
 * EPSILON.
 */
export function isZero(value: number): boolean {
  return value >= -EPSILON && value <= EPSILON
}

export function isMachineZero(value: number): boolean {
  return value >= -MACHINE_EPSILON && value <= MACHINE_EPSILON
}

/**
 * Adaptive Gauss-Kronrod Numerical Integration, to the tolerance
 * relative to the integral.
 */
export function integrate(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance: number
): number {
  const estimate = getKronrod(f, a, b)
  return refineIntegral(f, a, b, estimate, abs(estimate[0]) * tolerance)
}

/**
 * Gauss-Legendre Numerical Integration with 7 points, for integrands
 * that are known to be smooth enough for it.
 */
export function gauss(f: (x: number) => number, a: number, b: number): number {
  const A = (b - a) * 0.5
  const B = A + a
  let gauss = gaussWeights[0] * f(B)
  for (let i = 2; i < 8; i += 2) {
    const Ax = A * kronrodNodes[i]
    gauss += gaussWeights[i >> 1] * (f(B + Ax) + f(B - Ax))
  }
  return A * gauss
}

/**
 * Root finding using Newton-Raphson Method combined with Bisection.
 */
export function findRoot(
  f: (x: number) => number, df: (x: number) => number,
  x: number, a: number, b: number,
  n: number, tolerance: number
): number {
  for (let i = 0; i < n; i++) {
    const fx = f(x)
    // Calculate a new candidate with the Newton-Raphson method.
    const dx = fx / df(x)
    const nx = x - dx
    // See if we can trust the Newton-Raphson result. If not we use
    // bisection to find another candidate for Newton's method.
    if (abs(dx) < tolerance) {
      x = nx
      break
    }
    // Update the root-bounding interval and test for containment of
    // the candidate. If candidate is outside the root-bounding
    // interval, use bisection instead, also where the function
    // falls and the tangent line points away from the root.
    if (fx > 0) {
      b = x
    } else {
      a = x
    }
    x = nx > a && nx < b ? nx : (a + b) * 0.5
  }
  // Return the best result even though we haven't gotten close
  // enough to the root... (In paper.js this never seems to happen).
  // But make sure, that it actually is within the given range [a, b]
  return clamp(x, a, b)
}

/**
 * Finds where the function changes its sign between `a` and `b`, given
 * its values `fa` and `fb` of opposite signs there, with the ITP
 * method, which converges as fast as the secant method where it can,
 * and never more slowly than bisection. After kurbo's solve_itp():
 * https://github.com/linebender/kurbo/blob/main/kurbo/src/common.rs
 *
 * @param f the function
 * @param a the start of the interval
 * @param b the end of the interval
 * @param fa the value of the function at `a`
 * @param fb the value of the function at `b`
 * @param tolerance the width of the interval to narrow it to
 * @return the position of the sign change
 */
export function findSignChange(
  f: (x: number) => number,
  a: number,
  b: number,
  fa: number,
  fb: number,
  tolerance: number
): number {
  // Search for the change from negative to positive values:
  const sign = fa < 0 ? 1 : -1
  const steps = Math.max(Math.ceil(log2((b - a) / tolerance)) - 1, 0)
  // Bound the steps to those of bisection plus one:
  let scaled = tolerance * Math.pow(2, steps + 1)
  const k1 = 0.2 / (b - a)
  fa *= sign
  fb *= sign
  while (b - a > 2 * tolerance) {
    const half = (a + b) / 2
    const r = scaled - (b - a) / 2
    // The secant, nudged towards the middle:
    const xf = (fb * a - fa * b) / (fb - fa)
    const sigma = half - xf
    const delta = k1 * (b - a) * (b - a)
    const xt =
      delta <= abs(sigma)
        ? xf + (sigma < 0 ? -delta : delta)
        : half
    const x =
      abs(xt - half) <= r
        ? xt
        : half - (sigma < 0 ? -r : r)
    const fx = sign * f(x)
    if (fx > 0) {
      b = x
      fb = fx
    } else if (fx < 0) {
      a = x
      fa = fx
    } else {
      return x
    }
    scaled /= 2
  }
  return (a + b) / 2
}

/**
 * Solve a quadratic equation in a numerically robust manner;
 * given a quadratic equation ax² + bx + c = 0, find the values of x.
 *
 * References:
 *  Kahan W. - "To Solve a Real Cubic Equation"
 *  http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
 *  Blinn J. - "How to solve a Quadratic Equation"
 *  Harikrishnan G.
 *  https://gist.github.com/hkrish/9e0de1f121971ee0fbab281f5c986de9
 *
 * @param a the quadratic term
 * @param b the linear term
 * @param c the constant term
 * @param roots the array to store the roots in
 * @param min the lower bound of the allowed roots
 * @param max the upper bound of the allowed roots
 * @return the number of real roots found, or -1 if there are
 * infinite solutions
 *
 * @author Harikrishnan Gopalakrishnan <hari.exeption@gmail.com>
 */
export function solveQuadratic(
  a: number, b: number, c: number,
  roots: number[],
  min?: number, max?: number
): number {
  let x1
  let x2 = Infinity
  if (abs(a) < EPSILON) {
    // This could just be a linear equation
    if (abs(b) < EPSILON) return abs(c) < EPSILON ? -1 : 0
    x1 = -c / b
  } else {
    // a, b, c are expected to be the coefficients of the equation:
    // Ax² - 2Bx + C == 0, so we take b = -b/2:
    b *= -0.5
    let D = getDiscriminant(a, b, c)
    // If the discriminant is very small, we can try to normalize
    // the coefficients, so that we may get better accuracy.
    if (D && abs(D) < MACHINE_EPSILON) {
      const f = getNormalizationFactor(abs(a), abs(b), abs(c))
      if (f) {
        a *= f
        b *= f
        c *= f
        D = getDiscriminant(a, b, c)
      }
    }
    if (D >= -MACHINE_EPSILON) {
      // No real roots if D < 0
      const Q = D < 0 ? 0 : sqrt(D)
      const R = b + (b < 0 ? -Q : Q)
      // Try to minimize floating point noise.
      if (R === 0) {
        x1 = c / a
        x2 = -x1
      } else {
        x1 = R / a
        x2 = c / R
      }
    }
  }
  let count = 0
  const boundless = min == null
  const minB = min - EPSILON
  const maxB = max + EPSILON
  // We need to include EPSILON in the comparisons with min / max,
  // as some solutions are ever so lightly out of bounds.
  if (isFinite(x1) && (boundless || x1 > minB && x1 < maxB)) {
    roots[count++] = boundless ? x1 : clamp(x1, min, max)
  }
  if (x2 !== x1 && isFinite(x2) && (boundless || x2 > minB && x2 < maxB)) {
    roots[count++] = boundless ? x2 : clamp(x2, min, max)
  }
  return count
}

/**
 * Solve a cubic equation, using numerically stable methods,
 * given an equation of the form ax³ + bx² + cx + d = 0.
 *
 * This algorithm avoids the trigonometric/inverse trigonometric
 * calculations required by the "Italins"' formula. Cardano's method
 * works well enough for exact computations, this method takes a
 * numerical approach where the double precision error bound is kept
 * very low.
 *
 * References:
 *  Kahan W. - "To Solve a Real Cubic Equation"
 *   http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
 *  Harikrishnan G.
 *  https://gist.github.com/hkrish/9e0de1f121971ee0fbab281f5c986de9
 *
 * W. Kahan's paper contains inferences on accuracy of cubic
 * zero-finding methods. Also testing methods for robustness.
 *
 * @param a the cubic term (x³ term)
 * @param b the quadratic term (x² term)
 * @param c the linear term (x term)
 * @param d the constant term
 * @param roots the array to store the roots in
 * @param min the lower bound of the allowed roots
 * @param max the upper bound of the allowed roots
 * @return the number of real roots found, or -1 if there are
 * infinite solutions
 *
 * @author Harikrishnan Gopalakrishnan <hari.exeption@gmail.com>
 */
export function solveCubic(
  a: number, b: number, c: number, d: number,
  roots: number[],
  min?: number, max?: number
): number {
  const f = getNormalizationFactor(abs(a), abs(b), abs(c), abs(d))
  let x
  let b1
  let c2
  let qd
  let q
  if (f) {
    a *= f
    b *= f
    c *= f
    d *= f
  }

  function evaluate(x0) {
    x = x0
    // Evaluate q, q', b1 and c2 at x
    const tmp = a * x
    b1 = tmp + b
    c2 = b1 * x + c
    qd = (tmp + b1) * x + c2
    q = c2 * x + d
  }

  // If a or d is zero, we only need to solve a quadratic, so we set
  // the coefficients appropriately.
  if (abs(a) < EPSILON) {
    a = b
    b1 = c
    c2 = d
    x = Infinity
  } else if (abs(d) < EPSILON) {
    b1 = b
    c2 = c
    x = 0
  } else {
    // Here onwards we iterate for the leftmost root. Proceed to
    // deflate the cubic into a quadratic (as a side effect to the
    // iteration) and solve the quadratic.
    evaluate(-(b / a) / 3)
    // Get a good initial approximation.
    const t = q / a
    const r = pow(abs(t), 1 / 3)
    const s = t < 0 ? -1 : 1
    const td = -qd / a
    // See Kahan's notes on why 1.324718*... works.
    const rd = td > 0 ? 1.324717957244746 * Math.max(r, sqrt(td)) : r
    let x0 = x - s * rd
    if (x0 !== x) {
      do {
        evaluate(x0)
        // Newton's. Divide by 1 + MACHINE_EPSILON (1.000...002)
        // to avoid x0 crossing over a root.
        x0 = qd === 0 ? x : x - q / qd / (1 + MACHINE_EPSILON)
      } while (s * x0 > s * x)
      // Adjust the coefficients for the quadratic.
      if (abs(a) * x * x > abs(d / x)) {
        c2 = -d / x
        b1 = (c2 - c) / x
      }
    }
  }
  // The cubic has been deflated to a quadratic.
  let count = solveQuadratic(a, b1, c2, roots, min, max)
  const boundless = min == null
  if (
    isFinite(x) &&
    (count === 0 || count > 0 && x !== roots[0] && x !== roots[1]) &&
    (boundless || x > min - EPSILON && x < max + EPSILON)
  ) {
    roots[count++] = boundless ? x : clamp(x, min, max)
  }
  return count
}

/**
 * Finds the roots in [0, 1] of a polynomial in Bernstein form, by
 * subdividing it until each part has at most one sign change among its
 * coefficients: A part without sign changes has no root, and a part
 * with one has exactly one, as the Bernstein form diminishes
 * variation. Coefficients within their rounding error count as zero:
 * A part with only such coefficients counts as one root, as does a
 * part narrower than the given width that may still have one.
 *
 * @param coefficients the Bernstein coefficients
 * @param errors the bounds of the rounding errors of the
 *     coefficients
 * @param roots the array to store the roots in
 * @param width the width of the parts in which a possible root
 *     counts as one
 * @return the number of roots found
 */
export function solveBernstein(
  coefficients: number[], errors: number[],
  roots: number[],
  width: number
): number {
  let count = 0

  // Splits the coefficients at the middle through the algorithm of
  // de Casteljau, and their errors with them, plus the rounding of
  // each step:
  function subdivide(values, bounds) {
    const left = []
    const right = []
    const leftBounds = []
    const rightBounds = []
    const v = values.slice()
    const e = bounds.slice()
    for (let n = v.length; n > 0; n--) {
      left.push(v[0])
      right.unshift(v[n - 1])
      leftBounds.push(e[0])
      rightBounds.unshift(e[n - 1])
      for (let i = 0; i < n - 1; i++) {
        v[i] = (v[i] + v[i + 1]) / 2
        e[i] = (
          (e[i] + e[i + 1]) / 2 +
          MACHINE_EPSILON * abs(v[i])
        )
      }
    }
    return [left, right, leftBounds, rightBounds]
  }

  function evaluate(values, t) {
    const v = values.slice()
    for (let n = v.length - 1; n > 0; n--) {
      for (let i = 0; i < n; i++) {
        v[i] = v[i] + (v[i + 1] - v[i]) * t
      }
    }
    return v[0]
  }

  function solve(values, bounds, from, to) {
    let changes = 0
    let zeros = 0
    let sign = 0
    for (let i = 0, l = values.length; i < l; i++) {
      const value = values[i]
      if (abs(value) <= bounds[i]) {
        zeros++
      } else {
        const s = value > 0 ? 1 : -1
        if (sign && s !== sign) {
          changes++
        }
        sign = s
      }
    }
    if (
      zeros === values.length ||
      (changes || zeros) && to - from <= width
    ) {
      roots[count++] = (from + to) / 2
    } else if (changes === 1 && !zeros) {
      // Exactly one root, between the ends of opposite signs,
      // which bisection refines to the precision of the numbers:
      let a = 0
      let b = 1
      const isNegative = values[0] < 0
      while (
        from + (to - from) * a < from + (to - from) * b &&
        (a + b) / 2 > a &&
        (a + b) / 2 < b
      ) {
        const t = (a + b) / 2
        if (evaluate(values, t) < 0 === isNegative) {
          a = t
        } else {
          b = t
        }
      }
      roots[count++] = from + (to - from) * (a + b) / 2
    } else if (changes || zeros) {
      const parts = subdivide(values, bounds)
      const middle = (from + to) / 2
      solve(parts[0], parts[2], from, middle)
      solve(parts[1], parts[3], middle, to)
    }
  }

  solve(coefficients, errors, 0, 1)
  return count
}
