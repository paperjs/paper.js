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

/**
 * @name PathFlattener
 * @class
 * @private
 */
var PathFlattener = Base.extend({
    _class: 'PathFlattener',

    /**
     * Creates a path flattener for the given path. The flattener converts
     * curves into a sequence of straight lines by the use of curve-subdivision
     * with an allowed maximum error to create a lookup table that maps curve-
     * time to path offsets, and can be used for efficient iteration over the
     * full length of the path, and getting points / tangents / normals and
     * curvature in path offset space.
     *
     * @param {Path} path the path to create the flattener for
     * @param {Number} [flatness=0.25] the maximum error allowed for the
     *     straight lines to deviate from the original curves
     * @param {Number} [maxRecursion=32] the maximum amount of recursion in
     *     curve subdivision when mapping offsets to curve parameters
     * @param {Boolean} [ignoreStraight=false] if only interested in the result
     *     of the sub-division (e.g. for path flattening), passing `true` will
     *     protect straight curves from being subdivided for curve-time
     *     translation
     * @param {Matrix} [matrix] the matrix by which to transform the path's
     *     coordinates without modifying the actual path.
     * @return {PathFlattener} the newly created path flattener
     */
    initialize: function(path, flatness, maxRecursion, ignoreStraight, matrix) {
        // Instead of relying on path.curves, we only use segments here and
        // get the curve values from them.
        var curves = [], // The curve values as returned by getValues()
            parts = [], // The calculated, subdivided parts of the path
            length = 0, // The total length of the path
            // By default, we're not subdividing more than 32 times.
            minSpan = 1 / (maxRecursion || 32),
            segments = path._segments,
            segment1 = segments[0],
            segment2;

        // Iterate through all curves and compute the parts for each of them,
        // by recursively calling computeParts().
        function addCurve(segment1, segment2) {
            var curve = Curve.getValues(segment1, segment2, matrix);
            curves.push(curve);
            computeParts(curve, segment1._index, 0, 1);
        }

        function computeParts(curve, index, t1, t2) {
            // Check if the t-span is big enough for subdivision.
            if ((t2 - t1) > minSpan
                    && !(ignoreStraight && Curve.isStraight(curve))
                    // After quite a bit of testing, a default flatness of 0.25
                    // appears to offer a good trade-off between speed and
                    // precision for display purposes.
                    && !Curve.isFlatEnough(curve, flatness || 0.25)) {
                var halves = Curve.subdivide(curve, 0.5),
                    tMid = (t1 + t2) / 2;
                // Recursively subdivide and compute parts again.
                computeParts(halves[0], index, t1, tMid);
                computeParts(halves[1], index, tMid, t2);
            } else {
                // Calculate the length of the curve interpreted as a line.
                var dx = curve[6] - curve[0],
                    dy = curve[7] - curve[1],
                    dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    length += dist;
                    parts.push({
                        offset: length,
                        curve: curve,
                        index: index,
                        time: t2,
                    });
                }
            }
        }

        for (var i = 1, l = segments.length; i < l; i++) {
            segment2 = segments[i];
            addCurve(segment1, segment2);
            segment1 = segment2;
        }
        if (path._closed)
            addCurve(segment2 || segment1, segments[0]);
        this.curves = curves;
        this.parts = parts;
        this.length = length;
        // Keep a current index from the part where we last where in
        // _get(), to optimise for iterator-like usage of flattener.
        this.index = 0;
    },

    _get: function(offset) {
        // Make sure we're not beyond the requested offset already. Search the
        // start position backwards from where to then process the loop below.
        var parts = this.parts,
            length = parts.length,
            start,
            i, j = this.index;
        for (;;) {
            i = j;
            if (!j || parts[--j].offset < offset)
                break;
        }
        // Find the part that succeeds the given offset, then interpolate
        // with the previous part
        for (; i < length; i++) {
            var part = parts[i];
            if (part.offset >= offset) {
                // Found the right part, remember current position
                this.index = i;
                // Now get the previous part so we can linearly interpolate
                // the curve parameter
                var prev = parts[i - 1],
                    // Make sure we only use the previous parameter value if its
                    // for the same curve, by checking index. Use 0 otherwise.
                    prevTime = prev && prev.index === part.index ? prev.time : 0,
                    prevOffset = prev ? prev.offset : 0;
                return {
                    index: part.index,
                    // Interpolate
                    time: prevTime + (part.time - prevTime)
                        * (offset - prevOffset) / (part.offset - prevOffset)
                };
            }
        }
        // If we're still here, return last one
        return {
            index: parts[length - 1].index,
            time: 1
        };
    },

    drawPart: function(ctx, from, to) {
        var start = this._get(from),
            end = this._get(to);
        for (var i = start.index, l = end.index; i <= l; i++) {
            var curve = Curve.getPart(this.curves[i],
                    i === start.index ? start.time : 0,
                    i === end.index ? end.time : 1);
            if (i === start.index)
                ctx.moveTo(curve[0], curve[1]);
            ctx.bezierCurveTo.apply(ctx, curve.slice(2));
        }
    }
}, Base.each(Curve._evaluateMethods,
    function(name) {
        this[name + 'At'] = function(offset) {
            var param = this._get(offset);
            return Curve[name](this.curves[param.index], param.time);
        };
    }, {})
);

