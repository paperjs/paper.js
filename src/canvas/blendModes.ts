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

import type { Point } from '../basic/Point.ts'
import type { Size } from '../basic/Size.ts'

const { min, max, abs } = Math
let sr: number
let sg: number
let sb: number
let sa: number // source
let br: number
let bg: number
let bb: number
let ba: number // backdrop
let dr: number
let dg: number
let db: number // destination

// Emulate Paper.js's own blend modes, which canvas doesn't have:
const modes = {
  'add'() {
    dr = min(br + sr, 255)
    dg = min(bg + sg, 255)
    db = min(bb + sb, 255)
  },

  'subtract'() {
    dr = max(br - sr, 0)
    dg = max(bg - sg, 0)
    db = max(bb - sb, 0)
  },

  'average'() {
    dr = (br + sr) / 2
    dg = (bg + sg) / 2
    db = (bb + sb) / 2
  },

  'pin-light'() {
    dr = sr < 128 ? min(br, 2 * sr) : max(br, 2 * sr - 255)
    dg = sg < 128 ? min(bg, 2 * sg) : max(bg, 2 * sg - 255)
    db = sb < 128 ? min(bb, 2 * sb) : max(bb, 2 * sb - 255)
  },

  'negation'() {
    dr = 255 - abs(255 - sr - br)
    dg = 255 - abs(255 - sg - bg)
    db = 255 - abs(255 - sb - bb)
  }
}

/**
 * The blend modes by name, `true` for those that canvas supports natively.
 * Canvas supports its composite modes and the CSS blend modes, and draws modes
 * it doesn't support as 'normal', so only our own modes are emulated.
 *
 * @private
 */
export const nativeBlendModes: Record<string, boolean> = Object.fromEntries([
  ...Object.keys(modes).map(mode => [mode, false]),
  ...[
    'source-over', 'source-in', 'source-out', 'source-atop',
    'destination-over', 'destination-in', 'destination-out',
    'destination-atop', 'lighter', 'darker', 'copy', 'xor',
    'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
    'color-dodge', 'color-burn', 'darken', 'lighten', 'difference',
    'exclusion', 'hue', 'saturation', 'luminosity', 'color'
  ].map(mode => [mode, true])
])

/**
 * Composites the part of the source canvas that size covers onto the
 * destination at the offset, with the blend mode and alpha.
 *
 * @private
 */
export function blend(
  mode: string,
  srcContext: CanvasRenderingContext2D,
  dstContext: CanvasRenderingContext2D,
  alpha: number,
  offset: Point,
  size: Size
) {
  const { width, height } = size
  const process = modes[mode]
  // Leave all modes but our own to canvas:
  if (!process) {
    dstContext.save()
    // Reset transformations, since we're blitting and pixel scale and with a
    // given offset.
    dstContext.setTransform(1, 0, 0, 1, 0, 0)
    dstContext.globalAlpha = alpha
    if (mode !== 'normal') {
      dstContext.globalCompositeOperation = mode as GlobalCompositeOperation
    }
    dstContext.drawImage(
      srcContext.canvas, 0, 0, width, height, offset.x, offset.y, width, height
    )
    dstContext.restore()
  } else {
    const dstData = dstContext.getImageData(offset.x, offset.y, width, height)
    const dst = dstData.data
    const src = srcContext.getImageData(0, 0, width, height).data
    for (let i = 0, l = dst.length; i < l; i += 4) {
      sr = src[i]
      br = dst[i]
      sg = src[i + 1]
      bg = dst[i + 1]
      sb = src[i + 2]
      bb = dst[i + 2]
      sa = src[i + 3]
      ba = dst[i + 3]
      process()
      const a1 = sa * alpha / 255
      const a2 = 1 - a1
      dst[i] = a1 * dr + a2 * br
      dst[i + 1] = a1 * dg + a2 * bg
      dst[i + 2] = a1 * db + a2 * bb
      dst[i + 3] = sa * alpha + a2 * ba
    }
    dstContext.putImageData(dstData, offset.x, offset.y)
  }
}
