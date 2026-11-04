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

import { Base, Change, serialize } from '../internal.ts'
import type { Path } from './Path.ts'

/**
 * The properties that a stroke profile stop can be created from.
 */
export type StrokeProfileStopProps = {
  offset?: number
  width?: number | null
  aspect?: number | null
  angle?: number | null
  smooth?: boolean
  // JSON stores the index instead of the offset, see Path#strokeProfile:
  index?: number | null
}

/**
 * A stop of the stroke profile of a path, see {@link Path#strokeProfile}: the
 * pen that draws its stroke at an offset along the path, an ellipse with a
 * width, an aspect and an angle. Between the stops, each of them changes along
 * the path, easing into and out of smooth stops and in straight lines from the
 * others, see {@link #smooth}. A stop can set only some of them, and leave the
 * others to the stops around it.
 */
export class StrokeProfileStop extends Base {
  // All read and written by Path:
  _path: Path | null
  // The index of the segment before the stop plus the fraction of the arc
  // length to the next segment, once the stop is on a path. JSON stores it
  // instead of the offset, see Path#strokeProfile:
  _index: number | null
  _offset: number
  // The values that the stop doesn't set are null:
  _width: number | null
  _aspect: number | null
  _angle: number | null
  _smooth: boolean
  // JSON writes the stops of paths as plain objects, see the prototype:
  declare _compactSerialize: boolean

  /**
   * Creates a stroke profile stop.
   *
   * @param object the properties of the stop, its `offset`, `width`,
   *     `aspect`, `angle` and `smooth`
   *
   * @example
   * var path = Path.line([20, 50], [180, 50]);
   * path.strokeColor = 'black';
   * path.strokeWidth = 10;
   * path.strokeProfile = [
   *     new StrokeProfileStop({ offset: 0, width: 0.5 }),
   *     new StrokeProfileStop({ offset: 160, width: 2 })
   * ];
   */
  constructor(object?: StrokeProfileStopProps) {
    super()
    const { index, offset, width, aspect, angle, smooth } = object ?? {}
    this._path = null
    this._index = index ?? null
    this._offset = offset || 0
    this._width = width ?? null
    this._aspect = aspect ?? null
    this._angle = angle ?? null
    this._smooth = smooth !== false
  }

  /**
   * @return a copy of the stop, without a path
   */
  clone(): StrokeProfileStop {
    return new StrokeProfileStop({
      offset: this.offset,
      width: this._width,
      aspect: this._aspect,
      angle: this._angle,
      smooth: this._smooth
    })
  }

  _serialize(options: any, dictionary: any) {
    const props: StrokeProfileStopProps = { index: this._index }
    for (const key of ['width', 'aspect', 'angle']) {
      const value = this[`_${key}`]
      if (value != null) {
        props[key] = value
      }
    }
    if (!this._smooth) {
      props.smooth = false
    }
    return serialize(props, options, true, dictionary)
  }

  #changed() {
    this._path?._changed(Change.STROKE)
  }

  /**
   * The path whose stroke profile the stop is part of.
   */
  get path(): Path | null {
    return this._path
  }

  /**
   * The offset of the stop along its path, as in
   * {@link Path#getPointAt(offset)}. Unlike the offset of gradient stops, it
   * is a length, not a fraction. The stop stays between the same segments
   * when they move, so its offset changes with the lengths of the curves
   * before it.
   */
  get offset(): number {
    const path = this._path
    return path?._getOffsetAtIndex(this._index) ?? this._offset
  }

  set offset(offset: number) {
    const path = this._path
    if (path) {
      this._index = path._getIndexAt(offset)
      path._sortStrokeProfile()
      this.#changed()
    } else {
      this._offset = offset
    }
  }

  /**
   * The width of the pen at the stop, as a factor of the path's
   * {@link Style#strokeWidth}: `1` for the stroke width, `2` for twice
   * as wide. Stops without a width leave it to the stops around them, and
   * without any, it is `1`.
   */
  get width(): number | null {
    return this._width
  }

  set width(width: number | null) {
    this._width = width
    this.#changed()
  }

  /**
   * The aspect of the pen at the stop: its height as a factor of its width,
   * `1` for a round pen, less for a flat nib. Stops without an aspect leave
   * it to the stops around them, and without any, it is `1`.
   */
  get aspect(): number | null {
    return this._aspect
  }

  set aspect(aspect: number | null) {
    this._aspect = aspect
    this.#changed()
  }

  /**
   * The angle of the pen at the stop, in degrees, in the path's coordinates.
   * Angles aren't wrapped: from `0` at one stop to `720` at the next, the
   * pen turns twice. Stops without an angle leave it to the stops around
   * them, and without any, it is `0`.
   */
  get angle(): number | null {
    return this._angle
  }

  set angle(angle: number | null) {
    this._angle = angle
    this.#changed()
  }

  /**
   * Whether the values ease into and out of the stop: they arrive at it and
   * leave it flat, and between two smooth stops, a value follows a cubic
   * from one to the other, without overshooting them. As the slopes don't
   * depend on other stops, changing a stop only changes the values up to the
   * stops on either side of it. Without smoothing, the values change in
   * straight lines to the stops on either side.
   *
   * @default true
   */
  get smooth(): boolean {
    return this._smooth
  }

  set smooth(smooth: boolean) {
    this._smooth = !!smooth
    this.#changed()
  }

  /**
   * Checks whether the stop is equal to the supplied one.
   *
   * @param stop
   * @return {@true if they are equal}
   */
  equals(stop: StrokeProfileStop): boolean {
    return !!(
      stop === this || (
        stop instanceof StrokeProfileStop &&
        this._width === stop._width &&
        this._aspect === stop._aspect &&
        this._angle === stop._angle &&
        this._smooth === stop._smooth && (
          this._path
            ? this._index === stop._index
            : this._offset === stop._offset
        )
      )
    )
  }

  static {
    this.prototype._compactSerialize = true
  }
}
