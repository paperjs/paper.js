/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// The stroke profiles of paths, see Path#strokeProfile. Each stop keeps its
// position as the index of the segment before it plus the fraction of the arc
// length to the next segment, so that it stays between the same segments when
// they move. The methods that insert, remove or reverse segments update the
// indices, and those that keep the shape of the path, splitAt() and join(),
// move the stops by their offsets.
Path.inject(
  new (function () {
    const tMin = /*#=*/ Numerical.CURVETIME_EPSILON
    const tMax = 1 - tMin
    // The values of the pen, with their defaults where no stop sets them:
    const defaults = { width: 1, aspect: 1, angle: 0 }

    // Returns the stops of the path as { offset, width, aspect, angle,
    // smooth } entries in order:
    function getEntries(path) {
      const profile = path._strokeProfile || []
      return profile.map(function (stop) {
        return {
          offset: stop.getOffset(),
          width: stop._width,
          aspect: stop._aspect,
          angle: stop._angle,
          smooth: stop._smooth
        }
      })
    }

    // Returns the value of the entries that set it at the offset, with its
    // first and second derivatives along the path, as [value, d1, d2], or null
    // if none sets it. Between two entries, it follows the cubic with their
    // values and slopes, see StrokeProfileStop#smooth. It wraps around the end
    // of closed paths, and stays as the nearest entry beyond the ends of open
    // ones. Where a step lies at the offset, `after` picks the side after it:
    function getValue(entries, key, offset, length, closed, after) {
      const stops = entries.filter(function (entry) {
        return entry[key] != null
      })
      const count = stops.length
      let index = -1

      // The stop at the index, also beyond the ends of closed paths:
      function getStop(index) {
        const turns = Math.floor(index / count)
        const stop = stops[index - turns * count]
        return {
          offset: stop.offset + turns * length,
          value: stop[key],
          smooth: stop.smooth
        }
      }

      // The slope at the stop, towards the next stop or the previous one:
      // flat at smooth stops, so that each stop only shapes the curves on
      // either side of it, and straight on to the other stop otherwise:
      function getSlope(index, forward) {
        const stop = getStop(index)
        const other = getStop(forward ? index + 1 : index - 1)
        return stop.smooth
          ? 0
          : (other.value - stop.value) / (other.offset - stop.offset)
      }

      if (count) {
        for (let i = 0; i < count; i++) {
          const stopOffset = stops[i].offset
          if (stopOffset < offset || stopOffset === offset && after) index = i
        }
        if (closed || index >= 0 && index < count - 1) {
          // The cubic Hermite curve between the stops around the offset:
          const stop1 = getStop(index)
          const stop2 = getStop(index + 1)
          const h = stop2.offset - stop1.offset
          const t = (offset - stop1.offset) / h
          const v1 = stop1.value
          const v2 = stop2.value
          const m1 = getSlope(index, true) * h
          const m2 = getSlope(index + 1, false) * h
          return [
            ((2 * t - 3) * t * t + 1) * v1 +
            ((t - 2) * t + 1) * t * m1 +
              (3 - 2 * t) * t * t * v2 +
              (t - 1) * t * t * m2,
            (
              6 * (t - 1) * t * (v1 - v2) +
              ((3 * t - 4) * t + 1) * m1 +
              (3 * t - 2) * t * m2
            ) /
            h,
            ((12 * t - 6) * (v1 - v2) + (6 * t - 4) * m1 + (6 * t - 2) * m2) /
            (h * h)
          ]
        }
        return [stops[index < 0 ? 0 : count - 1][key], 0, 0]
      }
      return null
    }

    // Returns the values of the entries at the offset, as an entry:
    function getValues(entries, offset, length, closed, after) {
      const values = { offset: offset }
      for (const key in defaults) {
        const value = getValue(entries, key, offset, length, closed, after)
        values[key] = value && value[0]
      }
      return values
    }

    // Returns the entries from one offset to another, relative to the first,
    // wrapping around closed paths. Where the part ends within the path, its
    // values there are added as entries, so that the part keeps them, with
    // the fallbacks for the ones that it doesn't set. These entries are as
    // smooth as a stop there, and otherwise not, so that values in straight
    // lines stay as they are:
    function getPart(
      entries,
      from,
      to,
      length,
      closed,
      hasStart,
      hasEnd,
      fallbacks
    ) {
      function getEnd(offset, after) {
        const values = getValues(entries, offset, length, closed, after)
        for (const key in fallbacks) {
          if (values[key] == null) values[key] = fallbacks[key]
        }
        let stop = null
        for (let i = 0, l = entries.length; i < l; i++) {
          if (entries[i].offset === offset && (after || !stop))
            stop = entries[i]
        }
        values.smooth = !!stop && stop.smooth
        return values
      }

      const part = []
      for (let i = 0, l = entries.length; i < l; i++) {
        const entry = entries[i]
        let offset = entry.offset
        if (closed && offset < from) offset += length
        if (
          (offset > from || offset === from && !hasStart) &&
          (offset < to || offset === to && !hasEnd)
        )
          part.push(Base.set({}, entry, { offset: offset - from }))
      }
      part.sort(function (a, b) {
        return a.offset - b.offset
      })
      if (hasStart) part.unshift(Base.set(getEnd(from, true), { offset: 0 }))
      if (hasEnd) {
        part.push(
          Base.set(getEnd(closed ? to % length : to), { offset: to - from })
        )
      }
      return part
    }

    // Returns the index at the fraction of the length of the curves from the
    // one at start on, wrapping around closed paths:
    function getSpanIndex(path, start, count, fraction) {
      let i

      const curves = path.getCurves()
      const lengths = []
      let total = 0
      for (i = 0; i < count; i++) {
        const length = curves[(start + i) % curves.length].getLength()
        lengths.push(length)
        total += length
      }
      let rest = fraction * total
      i = 0
      while (i < count - 1 && rest >= lengths[i]) rest -= lengths[i++]
      const index = (
        start +
        i +
        (lengths[i] ? Math.min(rest / lengths[i], 1) : 0)
      )
      return path._closed ? index % curves.length : index
    }

    return /** @lends Path# */ {
      _strokeProfile: null,

      /**
       * The stroke profile of the path: the stops along it that set the pen
       * that draws its stroke, an ellipse with a width, as a factor of its
       * {@link Style#strokeWidth}, an aspect and an angle, see
       * {@link StrokeProfileStop}. The stops are sorted by their offsets.
       * Between the stops that set a value, it changes along the path,
       * easing into and out of smooth stops and in straight lines from the
       * others, see {@link StrokeProfileStop#smooth}, and beyond the ends
       * of open paths, it stays as at the first and last of them. Two stops
       * at the same offset make a step. The stops stay between the same
       * segments when they move. Without a stroke profile, the stroke is
       * drawn with a round pen of the stroke width all along.
       *
       * It is a property of the path, not of its style, as it is tied to
       * its segments. It can be set to stops or plain objects describing
       * them, `{ offset, width, aspect, angle, smooth }`, and JSON stores
       * them with the indices that tie them to the segments instead of
       * their offsets, `{ index, width, aspect, angle, smooth }`. Changing
       * the returned array directly isn't tracked, as with
       * {@link #segments}.
       *
       * The path draws its stroke as the area that the pens sweep, filled
       * with the stroke color, as {@link PathItem#outline()} returns it,
       * and {@link Item#strokeBounds} and hit-testing measure that area.
       * The children of compound paths are drawn with the stroke of their
       * parent, without their profiles. With {@link Style#strokeScaling}
       * off, the profile scales with the view. {@link PathItem#offset()},
       * the boolean operations, {@link PathItem#interpolate()} and SVG
       * export return paths without the profile.
       *
       * @bean
       * @type ?StrokeProfileStop[]
       *
       * @example
       * var path = new Path.Line([20, 50], [180, 50]);
       * path.strokeColor = 'black';
       * path.strokeWidth = 10;
       * // Taper the stroke from half its width to twice its width:
       * path.strokeProfile = [
       *     { offset: 0, width: 0.5 },
       *     { offset: path.length, width: 2 }
       * ];
       * console.log(path.getStrokeProfileAt(80).width); // 1.25
       */
      getStrokeProfile: function () {
        return this._strokeProfile
      },

      setStrokeProfile: function (stops) {
        let i
        let l
        let stop

        const previous = this._strokeProfile
        let profile = null
        if (stops && stops.length) {
          profile = []
          for (i = 0, l = stops.length; i < l; i++) {
            stop = stops[i]
            if (!(stop instanceof StrokeProfileStop)) {
              stop = new StrokeProfileStop(stop)
            } else if (stop._path && stop._path !== this) {
              stop = stop.clone()
            }
            if (stop._path !== this) {
              if (stop._index == null)
                stop._index = this._getIndexAt(stop._offset)
              stop._path = this
            }
            profile.push(stop)
          }
        }
        // The stops that the path no longer has keep their offsets:
        for (i = 0, l = previous ? previous.length : 0; i < l; i++) {
          stop = previous[i]
          if (!profile || profile.indexOf(stop) === -1) {
            stop._offset = stop.getOffset()
            stop._index = stop._path = null
          }
        }
        this._strokeProfile = profile
        if (profile) this._sortStrokeProfile()
        this._changed(/*#=*/ Change.STROKE)
      },

      /**
       * Returns the pen of the {@link #strokeProfile} at the given offset
       * along the path, as a stop that isn't on the path, with all its
       * values: its width as a factor of the {@link Style#strokeWidth}, its
       * aspect and its angle, `1`, `1` and `0` where no stop sets them.
       * Where the profile has a step, it returns the values after it. Adding
       * the stop to the profile keeps the values at the offset, and where
       * they change in straight lines, also around it if the stop isn't
       * smooth. As a smooth stop, the values ease into it and out of it.
       *
       * @param {Number} offset the offset on the path, where `0` is at the
       *     beginning of the path and {@link Path#length} at the end
       * @return {StrokeProfileStop} the pen at the offset
       *
       * @example
       * var path = new Path.Line([20, 50], [180, 50]);
       * path.strokeProfile = [
       *     { offset: 0, width: 0.5 },
       *     { offset: path.length, width: 2, angle: 90 }
       * ];
       * // Add a stop halfway, with the values there:
       * var stop = path.getStrokeProfileAt(path.length / 2);
       * console.log(stop.width, stop.aspect, stop.angle); // 1.25 1 90
       * path.strokeProfile = path.strokeProfile.concat(stop);
       */
      getStrokeProfileAt: function (offset) {
        const values = getValues(
          getEntries(this),
          offset,
          this.getLength(),
          this._closed,
          true
        )
        for (const key in defaults) {
          if (values[key] == null) values[key] = defaults[key]
        }
        return new StrokeProfileStop(values)
      },

      // Returns the pens all along the path, as entries with all values at
      // its ends and at the offsets of the stops, where the curves of the
      // values change. Steps have two entries at the same offset. See
      // PathItem#outline():
      _getStrokeProfilePens: function () {
        const entries = getEntries(this)
        const length = this.getLength()
        const closed = this._closed
        const pens = []

        function getPen(offset, after) {
          const values = getValues(entries, offset, length, closed, after)
          for (const key in defaults) {
            if (values[key] == null) values[key] = defaults[key]
          }
          return values
        }

        const offsets = [0].concat(
          entries.map(function (entry) {
            return entry.offset
          }),
          length
        )
        for (let i = 0, l = offsets.length; i < l; i++) {
          const offset = offsets[i]
          if (!i || offset > offsets[i - 1]) {
            if (offset > 0) pens.push(getPen(offset, false))
            if (offset < length) {
              const pen = getPen(offset, true)
              if (!offset || !Base.equals(pen, pens[pens.length - 1]))
                pens.push(pen)
            }
          }
        }
        return pens
      },

      // Returns a function that returns the values of the pen at an offset
      // with their first and second derivatives, as { width: [value, d1,
      // d2], aspect, angle }, see PathItem#outline():
      _getStrokeProfileValues: function () {
        const entries = getEntries(this)
        const length = this.getLength()
        const closed = this._closed
        return function (offset, after) {
          const values = {}
          for (const key in defaults) {
            values[key] = getValue(
              entries,
              key,
              offset,
              length,
              closed,
              after
            ) || [
              defaults[key],
              0,
              0
            ]
          }
          return values
        }
      },

      // Returns the index of the stop at the offset: the index of the
      // segment before it plus the fraction of the arc length to the next
      // segment. Offsets wrap around closed paths, and stay within open
      // ones:
      _getIndexAt: function (offset) {
        const length = this.getLength()
        offset = this._closed
          ? length
            ? (offset % length + length) % length
            : 0
          : Math.min(Math.max(offset, 0), length)
        const loc = this.getLocationAt(offset)
        if (loc) {
          const time = loc.getTime()
          const curveLength = loc.getCurve().getLength()
          return (
            loc.getIndex() + (
              time < tMin || !curveLength
                ? 0
                : time > tMax
                  ? 1
                  : loc.getCurveOffset() / curveLength
            )
          )
        }
        return this.getCurves().length
      },

      _getOffsetAtIndex: function (index) {
        const curves = this.getCurves()
        const i = Math.floor(index)
        let offset = 0
        for (let j = 0, l = Math.min(i, curves.length); j < l; j++)
          offset += curves[j].getLength()
        return i < curves.length
          ? offset + (index - i) * curves[i].getLength()
          : offset
      },

      _sortStrokeProfile: function () {
        this._strokeProfile.sort(function (a, b) {
          return a._index - b._index
        })
      },

      // Keeps the stops that the callback returns true for, and lets go of
      // the others:
      _filterStrokeProfile: function (callback) {
        const profile = this._strokeProfile.filter(callback)
        this.setStrokeProfile(profile)
      },

      // Moves the stops after segments were inserted at the index, keeping
      // the ones on the curve that the segments divide at the same fraction
      // of its length, see #_add():
      _insertStrokeProfile: function (index, amount) {
        const profile = this._strokeProfile
        const count = this._segments.length - amount
        const closed = this._closed
        // The curve that the segments divide, if any:
        const divided = closed
          ? (index + count - 1) % count
          : index > 0 && index < count
            ? index - 1
            : -1
        // Its first segment's index after the insertion:
        const start = divided < index ? divided : divided + amount
        if (count) {
          for (let i = 0, l = profile.length; i < l; i++) {
            const stop = profile[i]
            const x = stop._index
            if (divided >= 0 && x > divided && x < divided + 1) {
              stop._index = getSpanIndex(this, start, amount + 1, x - divided)
            } else if (x >= index) {
              stop._index = x + amount
            }
          }
          this._sortStrokeProfile()
        }
      },

      // Moves the stops before the segments from start to end are removed,
      // keeping the ones between the segments that remain around them at the
      // same fraction of the length there, which becomes one curve. The ones
      // beyond the new ends of open paths go. See #removeSegments():
      _removeStrokeProfile: function (start, end) {
        const count = this._segments.length
        const closed = this._closed
        const amount = end - start
        const curves = this.getCurves()
        // The segment before the removed ones, and its index after:
        const before = closed ? (start + count - 1) % count : start - 1
        const index = before < start ? before : before - amount
        const span = amount + 1

        function isKept(stop) {
          const x = stop._index
          return closed
            ? amount < count
            : start
              ? end < count || x <= before
              : x >= end
        }

        this._filterStrokeProfile(isKept)
        const profile = this._strokeProfile || []
        for (let i = 0, l = profile.length; i < l; i++) {
          const stop = profile[i]
          const x = stop._index
          // How far the stop lies from the segment before:
          const d = closed ? (x - before + count) % count : x - before
          if (before >= 0 && d > 0 && d < span) {
            let position = 0
            let total = 0
            for (let j = 0; j < span; j++) {
              const length =
                curves[(before + j) % curves.length]
                  .getLength()
              if (j < Math.floor(d)) {
                position += length
              } else if (j === Math.floor(d)) {
                position += (d - j) * length
              }
              total += length
            }
            stop._index = index + (total ? position / total : d / span)
          } else if (x >= end) {
            stop._index = x - amount
          }
        }
        if (profile.length) this._sortStrokeProfile()
      },

      // Moves the stops after the segments were reversed, see #reverse():
      _reverseStrokeProfile: function () {
        const profile = this._strokeProfile
        const count = this._segments.length
        for (let i = 0, l = profile.length; i < l; i++) {
          const stop = profile[i]
          stop._index = this._closed
            ? (2 * count - 1 - stop._index) % count
            : count - 1 - stop._index
        }
        // Keep the order of steps reversed too:
        profile.reverse()
        this._sortStrokeProfile()
      },

      // Takes the stroke profile off the path, as entries by offset, for
      // methods that move it by offsets, see #_setStrokeProfileParts():
      _takeStrokeProfile: function () {
        const part = {
          entries: getEntries(this),
          length: this.getLength(),
          closed: this._closed
        }
        if (this._strokeProfile) this.setStrokeProfile(null)
        return part
      },

      // Sets the stroke profile from parts taken off paths, see
      // #_takeStrokeProfile(), which now follow each other along the path,
      // the first at its start and the last at its end. Where they meet,
      // each keeps its values there as a stop:
      _setStrokeProfileParts: function (parts) {
        const length = this.getLength()
        const closed = this._closed
        const entries = []
        // Where the parts meet, the values that only some of them set
        // are the defaults in the others:
        const fallbacks = {}
        parts.forEach(function (part) {
          part.entries.forEach(function (entry) {
            for (const key in defaults) {
              if (entry[key] != null) fallbacks[key] = defaults[key]
            }
          })
        })
        for (let i = 0, l = parts.length; i < l; i++) {
          const part = parts[i]
          const start = i ? length - part.length : 0
          const hasStart = closed || i > 0
          const hasEnd = closed || i < l - 1
          if (part.entries.length || l > 1 || closed) {
            const shifted = getPart(
              part.entries,
              0,
              part.length,
              part.length,
              part.closed,
              hasStart,
              hasEnd,
              fallbacks
            )
            for (let j = 0, m = shifted.length; j < m; j++) {
              const entry = shifted[j]
              entry.offset += start
              entries.push(entry)
            }
          }
        }
        // On closed paths, the values before the end come first:
        if (closed && entries.length) entries.unshift(entries.pop())
        this.setStrokeProfile(entries)
      },

      // Sets the stroke profile from a part of a profile taken off the path,
      // see #_takeStrokeProfile(), between two offsets on it:
      _setStrokeProfilePart: function (part, from, to) {
        const length = part.length
        this.setStrokeProfile(
          getPart(
            part.entries,
            from,
            to,
            length,
            part.closed,
            part.closed || from > 0,
            part.closed || to < length
          )
        )
      }
    }
  })()
)
