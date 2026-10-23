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
Path.inject(new function() {
    var tMin = /*#=*/Numerical.CURVETIME_EPSILON,
        tMax = 1 - tMin,
        // The values of the pen, with their defaults where no stop sets them:
        defaults = { width: 1, aspect: 1, angle: 0 };

    // Returns the stops of the path as { offset, width, aspect, angle }
    // entries in order:
    function getEntries(path) {
        var profile = path._strokeProfile || [];
        return profile.map(function(stop) {
            return {
                offset: stop.getOffset(),
                width: stop._width,
                aspect: stop._aspect,
                angle: stop._angle
            };
        });
    }

    // Returns the value of the entries that set it at the offset, interpolated
    // between the ones around it, around the end of closed paths, and as the
    // nearest one beyond the ends of open paths, or null if none sets it.
    // Where a step lies at the offset, `after` picks the value after it:
    function getValue(entries, key, offset, length, closed, after) {
        var before = null,
            at = null,
            next = null,
            first = null,
            last = null;
        for (var i = 0, l = entries.length; i < l; i++) {
            var entry = entries[i];
            if (entry[key] != null) {
                first = first || entry;
                last = entry;
                if (entry.offset < offset) {
                    before = entry;
                } else if (entry.offset === offset) {
                    if (after || !at)
                        at = entry;
                } else if (!next) {
                    next = entry;
                }
            }
        }
        if (at)
            return at[key];
        if (closed && first) {
            before = before || { offset: last.offset - length };
            before[key] = before[key] != null ? before[key] : last[key];
            next = next || { offset: first.offset + length };
            next[key] = next[key] != null ? next[key] : first[key];
        }
        return before && next
                ? before[key] + (next[key] - before[key])
                    * (offset - before.offset) / (next.offset - before.offset)
                : before ? before[key] : next ? next[key] : null;
    }

    // Returns the values of the entries at the offset, as an entry:
    function getValues(entries, offset, length, closed, after) {
        var values = { offset: offset };
        for (var key in defaults)
            values[key] = getValue(entries, key, offset, length, closed, after);
        return values;
    }

    // Returns the entries from one offset to another, relative to the first,
    // wrapping around closed paths. Where the part ends within the path, its
    // values there are added as entries, so that the part keeps them, with
    // the fallbacks for the ones that it doesn't set:
    function getPart(entries, from, to, length, closed, hasStart, hasEnd,
            fallbacks) {

        function getEnd(offset, after) {
            var values = getValues(entries, offset, length, closed, after);
            for (var key in fallbacks) {
                if (values[key] == null)
                    values[key] = fallbacks[key];
            }
            return values;
        }

        var part = [];
        for (var i = 0, l = entries.length; i < l; i++) {
            var entry = entries[i],
                offset = entry.offset;
            if (closed && offset < from)
                offset += length;
            if ((offset > from || offset === from && !hasStart)
                    && (offset < to || offset === to && !hasEnd))
                part.push(Base.set({}, entry, { offset: offset - from }));
        }
        part.sort(function(a, b) {
            return a.offset - b.offset;
        });
        if (hasStart)
            part.unshift(Base.set(getEnd(from, true), { offset: 0 }));
        if (hasEnd) {
            part.push(Base.set(getEnd(closed ? to % length : to),
                    { offset: to - from }));
        }
        return part;
    }

    // Returns the index at the fraction of the length of the curves from the
    // one at start on, wrapping around closed paths:
    function getSpanIndex(path, start, count, fraction) {
        var curves = path.getCurves(),
            lengths = [],
            total = 0;
        for (var i = 0; i < count; i++) {
            var length = curves[(start + i) % curves.length].getLength();
            lengths.push(length);
            total += length;
        }
        var rest = fraction * total,
            i = 0;
        while (i < count - 1 && rest >= lengths[i])
            rest -= lengths[i++];
        var index = start + i + (lengths[i] ? Math.min(rest / lengths[i], 1)
                : 0);
        return path._closed ? index % curves.length : index;
    }

    return /** @lends Path# */{
        _strokeProfile: null,

        /**
         * The stroke profile of the path: the stops along it that set the pen
         * that draws its stroke, an ellipse with a width, as a factor of its
         * {@link Style#strokeWidth}, an aspect and an angle, see
         * {@link StrokeProfileStop}. The stops are sorted by their offsets.
         * Between the stops that set a value, it changes linearly along the
         * path, and beyond the ends of open paths, it stays as at the first
         * and last of them. Two stops at the same offset make a step. The
         * stops stay between the same segments when they move. Without a
         * stroke profile, the stroke is drawn with a round pen of the stroke
         * width all along.
         *
         * It is a property of the path, not of its style, as it is tied to
         * its segments. It can be set to stops or plain objects describing
         * them, `{ offset, width, aspect, angle }`, and JSON stores them with
         * the indices that tie them to the segments instead of their offsets,
         * `{ index, width, aspect, angle }`. Changing the returned array
         * directly isn't tracked, as with {@link #segments}.
         *
         * {@link PathItem#outline()} follows the profile, but the path is
         * still drawn, measured and hit-tested with its stroke width.
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
        getStrokeProfile: function() {
            return this._strokeProfile;
        },

        setStrokeProfile: function(stops) {
            var previous = this._strokeProfile,
                profile = null;
            if (stops && stops.length) {
                profile = [];
                for (var i = 0, l = stops.length; i < l; i++) {
                    var stop = stops[i];
                    if (!(stop instanceof StrokeProfileStop)) {
                        stop = new StrokeProfileStop(stop);
                    } else if (stop._path && stop._path !== this) {
                        stop = stop.clone();
                    }
                    if (stop._path !== this) {
                        if (stop._index == null)
                            stop._index = this._getIndexAt(stop._offset);
                        stop._path = this;
                    }
                    profile.push(stop);
                }
            }
            // The stops that the path no longer has keep their offsets:
            for (var i = 0, l = previous ? previous.length : 0; i < l; i++) {
                var stop = previous[i];
                if (!profile || profile.indexOf(stop) === -1) {
                    stop._offset = stop.getOffset();
                    stop._index = stop._path = null;
                }
            }
            this._strokeProfile = profile;
            if (profile)
                this._sortStrokeProfile();
            this._changed(/*#=*/Change.STROKE);
        },

        /**
         * Returns the pen of the {@link #strokeProfile} at the given offset
         * along the path, as a stop that isn't on the path, with all its
         * values: its width as a factor of the {@link Style#strokeWidth}, its
         * aspect and its angle, `1`, `1` and `0` where no stop sets them.
         * Where the profile has a step, it returns the values after it. Adding
         * the stop to the profile doesn't change it.
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
        getStrokeProfileAt: function(offset) {
            var values = getValues(getEntries(this), offset, this.getLength(),
                    this._closed, true);
            for (var key in defaults) {
                if (values[key] == null)
                    values[key] = defaults[key];
            }
            return new StrokeProfileStop(values);
        },

        // Returns the pens all along the path, as entries with all values at
        // its ends and at the offsets of the stops, between which the values
        // change linearly. Steps have two entries at the same offset. See
        // PathItem#outline():
        _getStrokeProfilePens: function() {
            var entries = getEntries(this),
                length = this.getLength(),
                closed = this._closed,
                pens = [];

            function getPen(offset, after) {
                var values = getValues(entries, offset, length, closed, after);
                for (var key in defaults) {
                    if (values[key] == null)
                        values[key] = defaults[key];
                }
                return values;
            }

            var offsets = [0].concat(entries.map(function(entry) {
                return entry.offset;
            }), length);
            for (var i = 0, l = offsets.length; i < l; i++) {
                var offset = offsets[i];
                if (!i || offset > offsets[i - 1]) {
                    if (offset > 0)
                        pens.push(getPen(offset, false));
                    if (offset < length) {
                        var pen = getPen(offset, true);
                        if (!offset || !Base.equals(pen, pens[pens.length - 1]))
                            pens.push(pen);
                    }
                }
            }
            return pens;
        },

        // Returns the index of the stop at the offset: the index of the
        // segment before it plus the fraction of the arc length to the next
        // segment. Offsets wrap around closed paths, and stay within open
        // ones:
        _getIndexAt: function(offset) {
            var length = this.getLength();
            offset = this._closed
                    ? length ? (offset % length + length) % length : 0
                    : Math.min(Math.max(offset, 0), length);
            var loc = this.getLocationAt(offset);
            if (loc) {
                var time = loc.getTime(),
                    curveLength = loc.getCurve().getLength();
                return loc.getIndex() + (time < tMin || !curveLength ? 0
                        : time > tMax ? 1
                        : loc.getCurveOffset() / curveLength);
            }
            return this.getCurves().length;
        },

        _getOffsetAtIndex: function(index) {
            var curves = this.getCurves(),
                i = Math.floor(index),
                offset = 0;
            for (var j = 0, l = Math.min(i, curves.length); j < l; j++)
                offset += curves[j].getLength();
            return i < curves.length
                    ? offset + (index - i) * curves[i].getLength()
                    : offset;
        },

        _sortStrokeProfile: function() {
            this._strokeProfile.sort(function(a, b) {
                return a._index - b._index;
            });
        },

        // Keeps the stops that the callback returns true for, and lets go of
        // the others:
        _filterStrokeProfile: function(callback) {
            var profile = this._strokeProfile.filter(callback);
            this.setStrokeProfile(profile);
        },

        // Moves the stops after segments were inserted at the index, keeping
        // the ones on the curve that the segments divide at the same fraction
        // of its length, see #_add():
        _insertStrokeProfile: function(index, amount) {
            var profile = this._strokeProfile,
                count = this._segments.length - amount,
                closed = this._closed,
                // The curve that the segments divide, if any:
                divided = closed ? (index + count - 1) % count
                    : index > 0 && index < count ? index - 1 : -1,
                // Its first segment's index after the insertion:
                start = divided < index ? divided : divided + amount;
            if (count) {
                for (var i = 0, l = profile.length; i < l; i++) {
                    var stop = profile[i],
                        x = stop._index;
                    if (divided >= 0 && x > divided && x < divided + 1) {
                        stop._index = getSpanIndex(this, start, amount + 1,
                                x - divided);
                    } else if (x >= index) {
                        stop._index = x + amount;
                    }
                }
                this._sortStrokeProfile();
            }
        },

        // Moves the stops before the segments from start to end are removed,
        // keeping the ones between the segments that remain around them at the
        // same fraction of the length there, which becomes one curve. The ones
        // beyond the new ends of open paths go. See #removeSegments():
        _removeStrokeProfile: function(start, end) {
            var count = this._segments.length,
                closed = this._closed,
                amount = end - start,
                curves = this.getCurves(),
                // The segment before the removed ones, and its index after:
                before = closed ? (start + count - 1) % count : start - 1,
                index = before < start ? before : before - amount,
                span = amount + 1;

            function isKept(stop) {
                var x = stop._index;
                return closed ? amount < count
                        : start ? end < count || x <= before
                        : x >= end;
            }

            this._filterStrokeProfile(isKept);
            var profile = this._strokeProfile || [];
            for (var i = 0, l = profile.length; i < l; i++) {
                var stop = profile[i],
                    x = stop._index,
                    // How far the stop lies from the segment before:
                    d = closed ? (x - before + count) % count : x - before;
                if (before >= 0 && d > 0 && d < span) {
                    var position = 0,
                        total = 0;
                    for (var j = 0; j < span; j++) {
                        var length = curves[(before + j) % curves.length]
                                .getLength();
                        if (j < Math.floor(d)) {
                            position += length;
                        } else if (j === Math.floor(d)) {
                            position += (d - j) * length;
                        }
                        total += length;
                    }
                    stop._index = index + (total ? position / total
                            : d / span);
                } else if (x >= end) {
                    stop._index = x - amount;
                }
            }
            if (profile.length)
                this._sortStrokeProfile();
        },

        // Moves the stops after the segments were reversed, see #reverse():
        _reverseStrokeProfile: function() {
            var profile = this._strokeProfile,
                count = this._segments.length;
            for (var i = 0, l = profile.length; i < l; i++) {
                var stop = profile[i];
                stop._index = this._closed
                        ? (2 * count - 1 - stop._index) % count
                        : count - 1 - stop._index;
            }
            // Keep the order of steps reversed too:
            profile.reverse();
            this._sortStrokeProfile();
        },

        // Takes the stroke profile off the path, as entries by offset, for
        // methods that move it by offsets, see #_setStrokeProfileParts():
        _takeStrokeProfile: function() {
            var part = {
                entries: getEntries(this),
                length: this.getLength(),
                closed: this._closed
            };
            if (this._strokeProfile)
                this.setStrokeProfile(null);
            return part;
        },

        // Sets the stroke profile from parts taken off paths, see
        // #_takeStrokeProfile(), which now follow each other along the path,
        // the first at its start and the last at its end. Where they meet,
        // each keeps its values there as a stop:
        _setStrokeProfileParts: function(parts) {
            var length = this.getLength(),
                closed = this._closed,
                entries = [],
                // Where the parts meet, the values that only some of them set
                // are the defaults in the others:
                fallbacks = {};
            parts.forEach(function(part) {
                part.entries.forEach(function(entry) {
                    for (var key in defaults) {
                        if (entry[key] != null)
                            fallbacks[key] = defaults[key];
                    }
                });
            });
            for (var i = 0, l = parts.length; i < l; i++) {
                var part = parts[i],
                    start = i ? length - part.length : 0,
                    hasStart = closed || i > 0,
                    hasEnd = closed || i < l - 1;
                if (part.entries.length || l > 1 || closed) {
                    var shifted = getPart(part.entries, 0, part.length,
                            part.length, part.closed, hasStart, hasEnd,
                            fallbacks);
                    for (var j = 0, m = shifted.length; j < m; j++) {
                        var entry = shifted[j];
                        entry.offset += start;
                        entries.push(entry);
                    }
                }
            }
            // On closed paths, the values before the end come first:
            if (closed && entries.length)
                entries.unshift(entries.pop());
            this.setStrokeProfile(entries);
        },

        // Sets the stroke profile from a part of a profile taken off the path,
        // see #_takeStrokeProfile(), between two offsets on it:
        _setStrokeProfilePart: function(part, from, to) {
            var length = part.length;
            this.setStrokeProfile(getPart(part.entries, from, to, length,
                    part.closed, part.closed || from > 0,
                    part.closed || to < length));
        }
    };
});
