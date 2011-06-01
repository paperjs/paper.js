/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

/*
 * BlendMode code ported from Context Blender JavaScript Library
 * 
 * Copyright © 2010 Gavin Kistner
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var BlendMode = {
	// TODO: Should we remove the blend modes that are not in Scriptographer?
	// TODO: Add missing blendmodes like hue / saturation / color / luminosity
	// TODO: Clean up codespacing of original code, or keep it as is, so 
	// we can easily encorporate changes?
	process: function(blendMode, sourceContext, destContext, opacity, offset) {
		var sourceCanvas = sourceContext.canvas,
			dstData = destContext.getImageData(offset.x, offset.y,
					sourceCanvas.width, sourceCanvas.height),
			dst  = dstData.data,
			src  = sourceContext.getImageData(0, 0,
					sourceCanvas.width, sourceCanvas.height).data,
			min = Math.min,
			opacity = opacity / 255,
			sA, dA, sAM, dAM, dA2, sRA, sGA, sBA, dRA, dGA, dBA, demultiply;

		// TODO: Some blend modes seem broken at the moment, e.g.
		// dodge, burn
		// TODO: This could be optimised by not diving everything by 255 and
		// keeping it integer instead, with one divide at the end.
		var modes = {
			unsupported: function(i) {
				// Render checker pattern
				dst[i] = dst[i + 3] = 255;
				dst[i + 1] = i % 8 == 0 ? 255 : 0;
				dst[i + 2] = i % 8 == 0 ? 0 : 255;
			},

			normal: function(i) {
				dst[i]     = (sRA + dRA - dRA * sA) * demultiply;
				dst[i + 1] = (sGA + dGA - dGA * sA) * demultiply;
				dst[i + 2] = (sBA + dBA - dBA * sA) * demultiply;
			},

			multiply: function(i) {
				dst[i]     = (sRA * dRA + sRA * (1 - dA) + dRA * (1 - sA)) * demultiply;
				dst[i + 1] = (sGA * dGA + sGA * (1 - dA) + dGA * (1 - sA)) * demultiply;
				dst[i + 2] = (sBA * dBA + sBA * (1 - dA) + dBA * (1 - sA)) * demultiply;
			},

			screen: function(i) {
				dst[i]     = (sRA + dRA - sRA * dRA) * demultiply;
				dst[i + 1] = (sGA + dGA - sGA * dGA) * demultiply;
				dst[i + 2] = (sBA + dBA - sBA * dBA) * demultiply;
			},

			overlay: function(i) {
				// Correct for 100% opacity case; colors get clipped as opacity falls
				dst[i]     = dRA <= 0.5 ? (2 * src[i]     * dRA / dA) : 255 - (2 - 2 * dRA / dA) * (255 - src[i]);
				dst[i + 1] = dGA <= 0.5 ? (2 * src[i + 1] * dGA / dA) : 255 - (2 - 2 * dGA / dA) * (255 - src[i + 1]);
				dst[i + 2] = dBA <= 0.5 ? (2 * src[i + 2] * dBA / dA) : 255 - (2 - 2 * dBA / dA) * (255 - src[i + 2]);
			},

			// TODO: Missing: soft-light

			'hard-light': function(i) {
				dst[i]     = sRA <= 0.5 ? (2 * dst[i]     * sRA / dA) : 255 - (2 - 2 * sRA / sA) * (255 - dst[i]);
				dst[i + 1] = sGA <= 0.5 ? (2 * dst[i + 1] * sGA / dA) : 255 - (2 - 2 * sGA / sA) * (255 - dst[i + 1]);
				dst[i + 2] = sBA <= 0.5 ? (2 * dst[i + 2] * sBA / dA) : 255 - (2 - 2 * sBA / sA) * (255 - dst[i + 2]);
			},

			'color-dodge': function(i) {
				dst[i]     = src[i]     == 255 && dRA == 0 ? 255 : min(255, dst[i]     / (255 - src[i]    )) * demultiply;
				dst[i + 1] = src[i + 1] == 255 && dGA == 0 ? 255 : min(255, dst[i + 1] / (255 - src[i + 1])) * demultiply;
				dst[i + 2] = src[i + 2] == 255 && dBA == 0 ? 255 : min(255, dst[i + 2] / (255 - src[i + 2])) * demultiply;
			},

			'color-burn': function(i) {
				dst[i]     = src[i]     == 0 && dRA == 0 ? 0 : (1 - min(1, (1 - dRA) / sRA)) * demultiply;
				dst[i + 1] = src[i + 1] == 0 && dGA == 0 ? 0 : (1 - min(1, (1 - dGA) / sGA)) * demultiply;
				dst[i + 2] = src[i + 2] == 0 && dBA == 0 ? 0 : (1 - min(1, (1 - dBA) / sBA)) * demultiply;
			},

			darken: function(i) {
				dst[i]     = (sRA > dRA ? dRA : sRA) * demultiply;
				dst[i + 1] = (sGA > dGA ? dGA : sGA) * demultiply;
				dst[i + 2] = (sBA > dBA ? dBA : sBA) * demultiply;
			},

			lighten: function(i) {
				dst[i]     = (sRA < dRA ? dRA : sRA) * demultiply;
				dst[i + 1] = (sGA < dGA ? dGA : sGA) * demultiply;
				dst[i + 2] = (sBA < dBA ? dBA : sBA) * demultiply;
			},

			difference: function(i) {
				dst[i]     = (sRA + dRA - 2 * min(sRA * dA, dRA * sA)) * demultiply;
				dst[i + 1] = (sGA + dGA - 2 * min(sGA * dA, dGA * sA)) * demultiply;
				dst[i + 2] = (sBA + dBA - 2 * min(sBA * dA, dBA * sA)) * demultiply;
			},

			exclusion: function(i) {
				dst[i]     = (dRA + sRA - 2 * dRA * sRA) * demultiply;
				dst[i + 1] = (dGA + sGA - 2 * dGA * sGA) * demultiply;
				dst[i + 2] = (dBA + sBA - 2 * dBA * sBA) * demultiply;
			},

			// TODO: Missing: hue, saturation, color, luminosity

			// Not in Illustrator:
			
			'src-in': function(i) {
				// Only differs from Photoshop in low - opacity areas
				dA2 = sA * dA;
				demultiply = 255 / dA2;
				dst[i]     = sRA * dA * demultiply;
				dst[i + 1] = sGA * dA * demultiply;
				dst[i + 2] = sBA * dA * demultiply;
			},

			add: function(i) {
				// Photoshop doesn't simply add the alpha channels,
				// this might be correct wrt SVG 1.2
				dA2 = min(1, sA + dA);
				demultiply = 255 / dA2;
				dst[i]     = min(sRA + dRA, 1) * demultiply;
				dst[i + 1] = min(sGA + dGA, 1) * demultiply;
				dst[i + 2] = min(sBA + dBA, 1) * demultiply;
			}
		};

		var process = modes[blendMode] || modes.unsupported;

		for (var i = 0, l = dst.length; i < l; i += 4) {
			sA  = src[i + 3] * opacity;
			dA  = dst[i + 3] / 255;
			dA2 = sA + dA - sA * dA;
			sAM = sA / 255;
			dAM = dA / 255;
			sRA = src[i] * sAM;
			dRA = dst[i] * dAM;
			sGA = src[i + 1] * sAM;
			dGA = dst[i + 1] * dAM;
			sBA = src[i + 2] * sAM;
			dBA = dst[i + 2] * dAM;
			demultiply = 255 / dA2;
			process(i);
			dst[i + 3] = dA2 * 255;
		}
		destContext.putImageData(dstData, offset.x, offset.y);
	}
};
