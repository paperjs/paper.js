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
	process: function(blendMode, sourceContext, destContext, opacity, offset) {
		var sourceCanvas = sourceContext.canvas,
			dstData = destContext.getImageData(offset.x, offset.y,
					sourceCanvas.width, sourceCanvas.height),
			dst  = dstData.data,
			src  = sourceContext.getImageData(0, 0,
					sourceCanvas.width, sourceCanvas.height).data,
			min = Math.min,
			sA, dA, rA, sM, dM, rM, sRA, sGA, sBA, dRA, dGA, dBA;

		// TODO: Some blend modes seem broken at the moment, e.g. dodge, burn
		var modes = {
			normal: function(i) {
				dst[i]     = (sRA + dRA - dRA * sA) * rM;
				dst[i + 1] = (sGA + dGA - dGA * sA) * rM;
				dst[i + 2] = (sBA + dBA - dBA * sA) * rM;
			},

			multiply: function(i) {
				dst[i]     = (sRA * dRA + sRA * (1 - dA) + dRA * (1 - sA)) * rM;
				dst[i + 1] = (sGA * dGA + sGA * (1 - dA) + dGA * (1 - sA)) * rM;
				dst[i + 2] = (sBA * dBA + sBA * (1 - dA) + dBA * (1 - sA)) * rM;
			},

			screen: function(i) {
				dst[i]     = (sRA + dRA - sRA * dRA) * rM;
				dst[i + 1] = (sGA + dGA - sGA * dGA) * rM;
				dst[i + 2] = (sBA + dBA - sBA * dBA) * rM;
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
				dst[i]     = src[i]     == 255 && dRA == 0 ? 255 : min(255, dst[i]     / (255 - src[i]    )) * rM;
				dst[i + 1] = src[i + 1] == 255 && dGA == 0 ? 255 : min(255, dst[i + 1] / (255 - src[i + 1])) * rM;
				dst[i + 2] = src[i + 2] == 255 && dBA == 0 ? 255 : min(255, dst[i + 2] / (255 - src[i + 2])) * rM;
			},

			'color-burn': function(i) {
				dst[i]     = src[i]     == 0 && dRA == 0 ? 0 : (1 - min(1, (1 - dRA) / sRA)) * rM;
				dst[i + 1] = src[i + 1] == 0 && dGA == 0 ? 0 : (1 - min(1, (1 - dGA) / sGA)) * rM;
				dst[i + 2] = src[i + 2] == 0 && dBA == 0 ? 0 : (1 - min(1, (1 - dBA) / sBA)) * rM;
			},

			darken: function(i) {
				dst[i]     = (sRA > dRA ? dRA : sRA) * rM;
				dst[i + 1] = (sGA > dGA ? dGA : sGA) * rM;
				dst[i + 2] = (sBA > dBA ? dBA : sBA) * rM;
			},

			lighten: function(i) {
				dst[i]     = (sRA < dRA ? dRA : sRA) * rM;
				dst[i + 1] = (sGA < dGA ? dGA : sGA) * rM;
				dst[i + 2] = (sBA < dBA ? dBA : sBA) * rM;
			},

			difference: function(i) {
				dst[i]     = (sRA + dRA - 2 * min(sRA * dA, dRA * sA)) * rM;
				dst[i + 1] = (sGA + dGA - 2 * min(sGA * dA, dGA * sA)) * rM;
				dst[i + 2] = (sBA + dBA - 2 * min(sBA * dA, dBA * sA)) * rM;
			},

			exclusion: function(i) {
				dst[i]     = (dRA + sRA - 2 * dRA * sRA) * rM;
				dst[i + 1] = (dGA + sGA - 2 * dGA * sGA) * rM;
				dst[i + 2] = (dBA + sBA - 2 * dBA * sBA) * rM;
			},

			// TODO: Missing: hue, saturation, color, luminosity

			// Not in Illustrator:
			
			'src-in': function(i) {
				// Only differs from Photoshop in low - opacity areas
				rA = sA * dA;
				rM = 255 / rA;
				dst[i]     = sRA * dA * rM;
				dst[i + 1] = sGA * dA * rM;
				dst[i + 2] = sBA * dA * rM;
			},

			add: function(i) {
				// Photoshop doesn't simply add the alpha channels,
				// this might be correct wrt SVG 1.2
				rA = min(1, sA + dA);
				rM = 255 / rA;
				dst[i]     = min(sRA + dRA, 1) * rM;
				dst[i + 1] = min(sGA + dGA, 1) * rM;
				dst[i + 2] = min(sBA + dBA, 1) * rM;
			}
		};

		var process = modes[blendMode];
		if (!process)
			return;
		opacity /= 255;
		for (var i = 0, l = dst.length; i < l; i += 4) {
			sA  = src[i + 3] * opacity;
			dA  = dst[i + 3] / 255;
			rA = sA + dA - sA * dA;
			sM = sA / 255;
			dM = dA / 255;
			sRA = src[i] * sM;
			dRA = dst[i] * dM;
			sGA = src[i + 1] * sM;
			dGA = dst[i + 1] * dM;
			sBA = src[i + 2] * sM;
			dBA = dst[i + 2] * dM;
			rM = 255 / rA;
			process(i);
			dst[i + 3] = rA * 255;
		}
		destContext.putImageData(dstData, offset.x, offset.y);
	}
};
