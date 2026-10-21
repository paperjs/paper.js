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

    // Canvas supports its composite modes and the CSS blend modes natively,
    // and draws modes it doesn't support as 'normal', so only our own modes
    // are emulated:
    this.nativeModes = Base.each([
        'source-over', 'source-in', 'source-out', 'source-atop',
        'destination-over', 'destination-in', 'destination-out',
        'destination-atop', 'lighter', 'darker', 'copy', 'xor',
        'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
        'color-dodge', 'color-burn', 'darken', 'lighten', 'difference',
        'exclusion', 'hue', 'saturation', 'luminosity', 'color'
    ], function(mode) {
        this[mode] = true;
    }, Base.each(modes, function(process, mode) {
        this[mode] = false;
    }, {}));

    this.process = function(mode, srcContext, dstContext, alpha, offset) {
        var srcCanvas = srcContext.canvas,
            normal = mode === 'normal',
            process = modes[mode];
        // Leave all modes but our own to canvas:
        if (!process) {
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
