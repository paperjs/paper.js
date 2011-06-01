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
			sA, dA, rA, sM, dM, demultiply;

		// TODO: Some blend modes seem broken at the moment, e.g.
		// dodge, burn
		var modes = {
			normal: function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = (s + d * (1 - sA)) * demultiply;
			},

			multiply: function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = (s * d + s * (1 - dA) + d * (1 - sA)) * demultiply;
			},

			screen: function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = (s * (1 - d) + d) * demultiply;
			},

			overlay: function(i) {
				// Correct for 100% opacity case; colors get clipped as opacity falls
				var s = src[i], d = dst[i] * dM; // src is unmultiplied
				dst[i] = d <= 0.5 ? (2 * s * d / dA) : 255 - (2 - 2 * d / dA) * (255 - s);
			},

			// TODO: Missing: soft-light

			'hard-light': function(i) {
				var s = src[i] * sM, d = dst[i]; // dst is unmultiplied
				dst[i] = s <= 0.5 ? (2 * d * s / dA) : 255 - (2 - 2 * s / sA) * (255 - d);
			},

			'color-dodge': function(i) {
				var s = src[i], d = dst[i]; // both unmultiplied
				dst[i] = s == 255 && d * dM == 0 ? 255 : min(255, d / (255 - s)) * demultiply;
			},

			'color-burn': function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = src[i] == 0 && d == 0 ? 0 : (1 - min(1, (1 - d) / s)) * demultiply;
			},

			darken: function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = (s > d ? d : s) * demultiply;
			},

			lighten: function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = (s < d ? d : s) * demultiply;
			},

			difference: function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = (s + d - 2 * min(s * dA, d * sA)) * demultiply;
			},

			exclusion: function(i) {
				var s = src[i] * sM, d = dst[i] * dM;
				dst[i] = (d + s - 2 * d * s) * demultiply;
			},

			// TODO: Missing: hue, saturation, color, luminosity

			// TODO: Not in Illustrator. Remove these?
			'src-in': function(i) {
				// Only differs from Photoshop in low - opacity areas
				dst[i] = sRA * dA * demultiply;
			},

			add: function(i) {
				// Photoshop doesn't simply add the alpha channels,
				// this might be correct wrt SVG 1.2
				dst[i] = min(sRA + dRA, 1) * demultiply;
			}
		};

		var alphas = {
			'src-in': function(sA, dA) {
				return sA * dA;
			},

			add: function(sA, dA) {
				return min(1, sA + dA);
			}
		};

		var process = modes[blendMode];
		var alpha = alphas[blendMode];
		if (!process)
			return;
		// Divide opacity by 255 so it can be multiplied straight into pixel
		// values to get 0 .. 1 range.
		opacity /= 255;
		for (var i = 0, l = dst.length; i < l; i += 4) {
			sA  = src[i + 3] * opacity;
			dA  = dst[i + 3] / 255;
			// Result alpha:
			rA = alpha ? alpha(sA, dA) : sA + dA - sA * dA;
			demultiply = 255 / rA;
			// Multipliers:
			sM = sA / 255;
			dM = dA / 255;
			process(i);
			process(i + 1);
			process(i + 2);
			dst[i + 3] = rA * 255;
		}
		destContext.putImageData(dstData, offset.x, offset.y);
	}
};
