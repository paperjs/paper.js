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

var BlendMode = new function() {
    var min = Math.min,
        max = Math.max,
        abs = Math.abs,
        sr, sg, sb, sa, // source
        br, bg, bb, ba, // backdrop
        dr, dg, db;     // destination

    // Emulate Paper.js's own blend modes, which canvas doesn't have:
    var modes = {
        add: function() {
            dr = min(br + sr, 255);
            dg = min(bg + sg, 255);
            db = min(bb + sb, 255);
        },

        subtract: function() {
            dr = max(br - sr, 0);
            dg = max(bg - sg, 0);
            db = max(bb - sb, 0);
        },

        average: function() {
            dr = (br + sr) / 2;
            dg = (bg + sg) / 2;
            db = (bb + sb) / 2;
        },

        'pin-light': function() {
            dr = sr < 128 ? min(br, 2 * sr) : max(br, 2 * sr - 255);
            dg = sg < 128 ? min(bg, 2 * sg) : max(bg, 2 * sg - 255);
            db = sb < 128 ? min(bb, 2 * sb) : max(bb, 2 * sb - 255);
        },

        negation: function() {
            dr = 255 - abs(255 - sr - br);
            dg = 255 - abs(255 - sg - bg);
            db = 255 - abs(255 - sb - bb);
        }
    };

    // The canvas composite modes are always natively supported:
    var nativeModes = Base.each([
            'source-over', 'source-in', 'source-out', 'source-atop',
            'destination-over', 'destination-in', 'destination-out',
            'destination-atop', 'lighter', 'darker', 'copy', 'xor'
        ], function(mode) {
            this[mode] = true;
        }, {}),
        tested = false;

    // Returns the lookup table of the natively supported composite and blend
    // modes. The CSS blend modes and our own are tested the first time a canvas
    // is available, as hosts may only provide one after Paper.js loads. Just
    // seeing if globalCompositeOperation is sticky is not enough, as Chrome 27
    // pretends for blend-modes to work, but does not actually apply them.
    function getNativeModes() {
        var ctx = !tested && CanvasProvider.getContext(1, 1,
                { willReadFrequently: true });
        if (ctx) {
            tested = true;
            Base.each([
                'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
                'color-dodge', 'color-burn', 'darken', 'lighten', 'difference',
                'exclusion', 'hue', 'saturation', 'luminosity', 'color'
            ].concat(Object.keys(modes)), function(mode) {
                // Blend #333300 (51) and #aa0000 (170):
                // Multiplying should lead to #220000 (34). The green gives the
                // source a hue of its own, which the non-separable modes need.
                var darken = mode === 'darken',
                    ok = false;
                ctx.save();
                // FF 3.6 throws exception when setting
                // globalCompositeOperation to unsupported values.
                try {
                    // For darken we need to reverse color parameters in order
                    // to test mode.
                    ctx.fillStyle = darken ? '#330' : '#a00';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.globalCompositeOperation = mode;
                    if (ctx.globalCompositeOperation === mode) {
                        ctx.fillStyle = darken ? '#a00' : '#330';
                        ctx.fillRect(0, 0, 1, 1);
                        ok = ctx.getImageData(0, 0, 1, 1).data[0] !==
                                (darken ? 170 : 51);
                    }
                } catch (e) {}
                ctx.restore();
                nativeModes[mode] = ok;
            });
            CanvasProvider.release(ctx);
        }
        return nativeModes;
    }

    this.getNativeModes = getNativeModes;

    this.process = function(mode, srcContext, dstContext, alpha, offset) {
        var srcCanvas = srcContext.canvas,
            normal = mode === 'normal',
            process = modes[mode];
        // Use native blend-modes if supported, and emulate our own. Canvas
        // ignores the modes it doesn't support, and draws them as 'normal'.
        if (getNativeModes()[mode] || !process) {
            dstContext.save();
            // Reset transformations, since we're blitting and pixel scale and
            // with a given offset.
            dstContext.setTransform(1, 0, 0, 1, 0, 0);
            dstContext.globalAlpha = alpha;
            if (!normal)
                dstContext.globalCompositeOperation = mode;
            dstContext.drawImage(srcCanvas, offset.x, offset.y);
            dstContext.restore();
        } else {
            var dstData = dstContext.getImageData(offset.x, offset.y,
                    srcCanvas.width, srcCanvas.height),
                dst = dstData.data,
                src = srcContext.getImageData(0, 0,
                    srcCanvas.width, srcCanvas.height).data;
            for (var i = 0, l = dst.length; i < l; i += 4) {
                sr = src[i];
                br = dst[i];
                sg = src[i + 1];
                bg = dst[i + 1];
                sb = src[i + 2];
                bb = dst[i + 2];
                sa = src[i + 3];
                ba = dst[i + 3];
                process();
                var a1 = sa * alpha / 255,
                    a2 = 1 - a1;
                dst[i] = a1 * dr + a2 * br;
                dst[i + 1] = a1 * dg + a2 * bg;
                dst[i + 2] = a1 * db + a2 * bb;
                dst[i + 3] = sa * alpha + a2 * ba;
            }
            dstContext.putImageData(dstData, offset.x, offset.y);
        }
    };
};
