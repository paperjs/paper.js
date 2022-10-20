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

    // Conversion methods for HSL modes, as described by
    // http://www.aiim.org/documents/standards/pdf/blend_modes.pdf
    // The setters modify the variables dr, dg, db directly.

    function getLum(r, g, b) {
        return 0.2989 * r + 0.587 * g + 0.114 * b;
    }

    function setLum(r, g, b, l) {
        var d = l - getLum(r, g, b);
        dr = r + d;
        dg = g + d;
        db = b + d;
        var l = getLum(dr, dg, db),
            mn = min(dr, dg, db),
            mx = max(dr, dg, db);
        if (mn < 0) {
            var lmn = l - mn;
            dr = l + (dr - l) * l / lmn;
            dg = l + (dg - l) * l / lmn;
            db = l + (db - l) * l / lmn;
        }
        if (mx > 255) {
            var ln = 255 - l,
                mxl = mx - l;
            dr = l + (dr - l) * ln / mxl;
            dg = l + (dg - l) * ln / mxl;
            db = l + (db - l) * ln / mxl;
        }
    }

    function getSat(r, g, b) {
        return max(r, g, b) - min(r, g, b);
    }

    function setSat(r, g, b, s) {
        var col = [r, g, b],
            mx = max(r, g, b), // max
            mn = min(r, g, b), // min
            md; // mid
        // Determine indices for min and max in col:
        mn = mn === r ? 0 : mn === g ? 1 : 2;
        mx = mx === r ? 0 : mx === g ? 1 : 2;
        // Determine the index in col that is not used yet by min and max,
        // and assign it to mid:
        md = min(mn, mx) === 0 ? max(mn, mx) === 1 ? 2 : 1 : 0;
        // Now perform the actual algorithm
        if (col[mx] > col[mn]) {
            col[md] = (col[md] - col[mn]) * s / (col[mx] - col[mn]);
            col[mx] = s;
        } else {
            col[md] = col[mx] = 0;
        }
        col[mn] = 0;
        // Finally write out the values
        dr = col[0];
        dg = col[1];
        db = col[2];
    }

    var modes = {
        // B(Cb, Cs) = Cb x Cs
        multiply: function() {
            dr = br * sr / 255;
            dg = bg * sg / 255;
            db = bb * sb / 255;
        },

        // B(Cb, Cs) = 1 - [(1 - Cb) x (1 - Cs)] = Cb + Cs -(Cb x Cs)
        screen: function() {
            dr = br + sr - (br * sr / 255);
            dg = bg + sg - (bg * sg / 255);
            db = bb + sb - (bb * sb / 255);
        },

        // B(Cb, Cs) = HardLight(Cs, Cb)
        overlay: function() {
            // = Reverse of hard-light
            dr = br < 128 ? 2 * br * sr / 255 : 255 - 2 * (255 - br) * (255 - sr) / 255;
            dg = bg < 128 ? 2 * bg * sg / 255 : 255 - 2 * (255 - bg) * (255 - sg) / 255;
            db = bb < 128 ? 2 * bb * sb / 255 : 255 - 2 * (255 - bb) * (255 - sb) / 255;
        },

        'soft-light': function() {
            var t = sr * br / 255;
            dr = t + br * (255 - (255 - br) * (255 - sr) / 255 - t) / 255;
            t = sg * bg / 255;
            dg = t + bg * (255 - (255 - bg) * (255 - sg) / 255 - t) / 255;
            t = sb * bb / 255;
            db = t + bb * (255 - (255 - bb) * (255 - sb) / 255 - t) / 255;
        },

        // if (Cs <= 0.5) B(Cb, Cs) = Multiply(Cb, 2 x Cs)
        // else B(Cb, Cs) = Screen(Cb, 2 x Cs -1)
        'hard-light': function() {
            dr = sr < 128 ? 2 * sr * br / 255 : 255 - 2 * (255 - sr) * (255 - br) / 255;
            dg = sg < 128 ? 2 * sg * bg / 255 : 255 - 2 * (255 - sg) * (255 - bg) / 255;
            db = sb < 128 ? 2 * sb * bb / 255 : 255 - 2 * (255 - sb) * (255 - bb) / 255;
        },

        // if (Cb == 0) B(Cb, Cs) = 0
        // else if (Cs == 1) B(Cb, Cs) = 1
        // else B(Cb, Cs) = min(1, Cb / (1 - Cs))
        'color-dodge': function() {
            dr = br === 0 ? 0 : sr === 255 ? 255 : min(255, 255 * br / (255 - sr));
            dg = bg === 0 ? 0 : sg === 255 ? 255 : min(255, 255 * bg / (255 - sg));
            db = bb === 0 ? 0 : sb === 255 ? 255 : min(255, 255 * bb / (255 - sb));
        },

        // if (Cb == 1) B(Cb, Cs) = 1
        // else if (Cs == 0) B(Cb, Cs) = 0
        // else B(Cb, Cs) = 1 - min(1, (1 - Cb) / Cs)
        'color-burn': function() {
            dr = br === 255 ? 255 : sr === 0 ? 0 : max(0, 255 - (255 - br) * 255 / sr);
            dg = bg === 255 ? 255 : sg === 0 ? 0 : max(0, 255 - (255 - bg) * 255 / sg);
            db = bb === 255 ? 255 : sb === 0 ? 0 : max(0, 255 - (255 - bb) * 255 / sb);
        },

        //  B(Cb, Cs) = min(Cb, Cs)
        darken: function() {
            dr = br < sr ? br : sr;
            dg = bg < sg ? bg : sg;
            db = bb < sb ? bb : sb;
        },

        // B(Cb, Cs) = max(Cb, Cs)
        lighten: function() {
            dr = br > sr ? br : sr;
            dg = bg > sg ? bg : sg;
            db = bb > sb ? bb : sb;
        },

        // B(Cb, Cs) = | Cb - Cs |
        difference: function() {
            dr = br - sr;
            if (dr < 0)
                dr = -dr;
            dg = bg - sg;
            if (dg < 0)
                dg = -dg;
            db = bb - sb;
            if (db < 0)
                db = -db;
        },

        //  B(Cb, Cs) = Cb + Cs - 2 x Cb x Cs
        exclusion: function() {
            dr = br + sr * (255 - br - br) / 255;
            dg = bg + sg * (255 - bg - bg) / 255;
            db = bb + sb * (255 - bb - bb) / 255;
        },

        // HSL Modes:
        hue: function() {
            setSat(sr, sg, sb, getSat(br, bg, bb));
            setLum(dr, dg, db, getLum(br, bg, bb));
        },

        saturation: function() {
            setSat(br, bg, bb, getSat(sr, sg, sb));
            setLum(dr, dg, db, getLum(br, bg, bb));
        },

        luminosity: function() {
            setLum(br, bg, bb, getLum(sr, sg, sb));
        },

        color: function() {
            setLum(sr, sg, sb, getLum(br, bg, bb));
        },

        // TODO: Not in Illustrator:
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

        negation: function() {
            dr = 255 - abs(255 - sr - br);
            dg = 255 - abs(255 - sg - bg);
            db = 255 - abs(255 - sb - bb);
        }
    };

    // Build a lookup table for natively supported CSS composite- & blend-modes.
    // The canvas composite modes are always natively supported:
    var nativeModes = this.nativeModes = Base.each([
        'source-over', 'source-in', 'source-out', 'source-atop',
        'destination-over', 'destination-in', 'destination-out',
        'destination-atop', 'lighter', 'darker', 'copy', 'xor'
    ], function(mode) {
        this[mode] = true;
    }, {});

    // Now test for the new blend modes. Just seeing if globalCompositeOperation
    // is sticky is not enough, as Chrome 27 pretends for blend-modes to work,
    // but does not actually apply them.
    var ctx = CanvasProvider.getContext(1, 1, { willReadFrequently: true });
    if (ctx) {
        Base.each(modes, function(func, mode) {
            // Blend #330000 (51) and #aa0000 (170):
            // Multiplying should lead to #220000 (34)
            var darken = mode === 'darken',
                ok = false;
            ctx.save();
            // FF 3.6 throws exception when setting globalCompositeOperation to
            // unsupported values.
            try {
                // For darken we need to reverse color parameters in order to
                // test mode.
                ctx.fillStyle = darken ? '#300' : '#a00';
                ctx.fillRect(0, 0, 1, 1);
                ctx.globalCompositeOperation = mode;
                if (ctx.globalCompositeOperation === mode) {
                    ctx.fillStyle = darken ? '#a00' : '#300';
                    ctx.fillRect(0, 0, 1, 1);
                    ok = ctx.getImageData(0, 0, 1, 1).data[0] !== darken
                            ? 170 : 51;
                }
            } catch (e) {}
            ctx.restore();
            nativeModes[mode] = ok;
        });
        CanvasProvider.release(ctx);
    }

    this.process = function(mode, srcContext, dstContext, alpha, offset) {
        var srcCanvas = srcContext.canvas,
            normal = mode === 'normal';
        // Use native blend-modes if supported, and fall back to emulation.
        if (normal || nativeModes[mode]) {
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
            var process = modes[mode];
            if (!process)
                return;
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
