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
		var sourceCanvas = sourceContext.canvas;
		var dstD = destContext.getImageData(
			offset.x, offset.y,
			sourceCanvas.width, sourceCanvas.height
		);

		var srcD = sourceContext.getImageData(
			0, 0,
			sourceCanvas.width, sourceCanvas.height
		);

		var src  = srcD.data;
		var dst  = dstD.data;
		var sA, dA, len=dst.length;
		var sRA, sGA, sBA, dRA, dGA, dBA, dA2;
		var demultiply;

		for (var px=0;px<len;px+=4) {
			sA  = src[px+3]/255 * opacity;
			dA  = dst[px+3]/255;
			dA2 = (sA + dA - sA*dA);
			dst[px+3] = dA2*255;

			sRA = src[px  ]/255*sA;
			dRA = dst[px  ]/255*dA;
			sGA = src[px+1]/255*sA;
			dGA = dst[px+1]/255*dA;
			sBA = src[px+2]/255*sA;
			dBA = dst[px+2]/255*dA;

			demultiply = 255 / dA2;

			switch(blendMode) {
				// ******* Very close match to Photoshop
				case 'normal':
				case 'src-over':
					dst[px  ] = (sRA + dRA - dRA*sA) * demultiply;
					dst[px+1] = (sGA + dGA - dGA*sA) * demultiply;
					dst[px+2] = (sBA + dBA - dBA*sA) * demultiply;
				break;

				case 'screen':
					dst[px  ] = (sRA + dRA - sRA*dRA) * demultiply;
					dst[px+1] = (sGA + dGA - sGA*dGA) * demultiply;
					dst[px+2] = (sBA + dBA - sBA*dBA) * demultiply;
				break;

				case 'multiply':
					dst[px  ] = (sRA*dRA + sRA*(1-dA) + dRA*(1-sA)) * demultiply;
					dst[px+1] = (sGA*dGA + sGA*(1-dA) + dGA*(1-sA)) * demultiply;
					dst[px+2] = (sBA*dBA + sBA*(1-dA) + dBA*(1-sA)) * demultiply;
				break;

				case 'difference':
					dst[px  ] = (sRA + dRA - 2 * Math.min( sRA*dA, dRA*sA )) * demultiply;
					dst[px+1] = (sGA + dGA - 2 * Math.min( sGA*dA, dGA*sA )) * demultiply;
					dst[px+2] = (sBA + dBA - 2 * Math.min( sBA*dA, dBA*sA )) * demultiply;
				break;

				// ******* Slightly different from Photoshop, where alpha is concerned
				case 'src-in':
					// Only differs from Photoshop in low-opacity areas
					dA2 = sA*dA;
					demultiply = 255 / dA2;
					dst[px+3] = dA2*255;
					dst[px  ] = sRA*dA * demultiply;
					dst[px+1] = sGA*dA * demultiply;
					dst[px+2] = sBA*dA * demultiply;
				break;

				case 'plus':
				case 'add':
					// Photoshop doesn't simply add the alpha channels; this might be correct wrt SVG 1.2
					dA2 = Math.min(1,sA+dA);
					dst[px+3] = dA2*255;
					demultiply = 255 / dA2;
					dst[px  ] = Math.min(sRA + dRA,1) * demultiply;
					dst[px+1] = Math.min(sGA + dGA,1) * demultiply;
					dst[px+2] = Math.min(sBA + dBA,1) * demultiply;
				break;

				case 'overlay':
					// Correct for 100% opacity case; colors get clipped as opacity falls
					dst[px  ] = (dRA<=0.5) ? (2*src[px  ]*dRA/dA) : 255 - (2 - 2*dRA/dA) * (255-src[px  ]);
					dst[px+1] = (dGA<=0.5) ? (2*src[px+1]*dGA/dA) : 255 - (2 - 2*dGA/dA) * (255-src[px+1]);
					dst[px+2] = (dBA<=0.5) ? (2*src[px+2]*dBA/dA) : 255 - (2 - 2*dBA/dA) * (255-src[px+2]);

					// http://dunnbypaul.net/blends/
					// dst[px  ] = ( (dRA<=0.5) ? (2*sRA*dRA) : 1 - (1 - 2*(dRA-0.5)) * (1-sRA) ) * demultiply;
					// dst[px+1] = ( (dGA<=0.5) ? (2*sGA*dGA) : 1 - (1 - 2*(dGA-0.5)) * (1-sGA) ) * demultiply;
					// dst[px+2] = ( (dBA<=0.5) ? (2*sBA*dBA) : 1 - (1 - 2*(dBA-0.5)) * (1-sBA) ) * demultiply;

					// http://www.barbato.us/2010/12/01/blimageblending-emulating-photoshops-blending-modes-opencv/#toc-blendoverlay
					// dst[px  ] = ( (sRA<=0.5) ? (sRA*dRA + sRA*(1-dA) + dRA*(1-sA)) : (sRA + dRA - sRA*dRA) ) * demultiply;
					// dst[px+1] = ( (sGA<=0.5) ? (sGA*dGA + sGA*(1-dA) + dGA*(1-sA)) : (sGA + dGA - sGA*dGA) ) * demultiply;
					// dst[px+2] = ( (sBA<=0.5) ? (sBA*dBA + sBA*(1-dA) + dBA*(1-sA)) : (sBA + dBA - sBA*dBA) ) * demultiply;

					// http://www.nathanm.com/photoshop-blending-math/
					// dst[px  ] = ( (sRA < 0.5) ? (2 * dRA * sRA) : (1 - 2 * (1 - sRA) * (1 - dRA)) ) * demultiply;
					// dst[px+1] = ( (sGA < 0.5) ? (2 * dGA * sGA) : (1 - 2 * (1 - sGA) * (1 - dGA)) ) * demultiply;
					// dst[px+2] = ( (sBA < 0.5) ? (2 * dBA * sBA) : (1 - 2 * (1 - sBA) * (1 - dBA)) ) * demultiply;
				break;

				case 'hard-light':
					dst[px  ] = (sRA<=0.5) ? (2*dst[px  ]*sRA/dA) : 255 - (2 - 2*sRA/sA) * (255-dst[px  ]);
					dst[px+1] = (sGA<=0.5) ? (2*dst[px+1]*sGA/dA) : 255 - (2 - 2*sGA/sA) * (255-dst[px+1]);
					dst[px+2] = (sBA<=0.5) ? (2*dst[px+2]*sBA/dA) : 255 - (2 - 2*sBA/sA) * (255-dst[px+2]);
				break;

				case 'color-dodge':
				case 'dodge':
					if ( src[px  ] == 255 && dRA==0) dst[px  ] = 255;
					else dst[px  ] = Math.min(255, dst[px  ]/(255 - src[px  ])) * demultiply;

					if ( src[px+1] == 255 && dGA==0) dst[px+1] = 255;
					else dst[px+1] = Math.min(255, dst[px+1]/(255 - src[px+1])) * demultiply;

					if ( src[px+2] == 255 && dBA==0) dst[px+2] = 255;
					else dst[px+2] = Math.min(255, dst[px+2]/(255 - src[px+2])) * demultiply;
				break;

				case 'color-burn':
				case 'burn':
					if ( src[px  ] == 0 && dRA==0) dst[px  ] = 0;
					else dst[px  ] = (1 - Math.min(1, (1 - dRA)/sRA)) * demultiply;

					if ( src[px+1] == 0 && dGA==0) dst[px+1] = 0;
					else dst[px+1] = (1 - Math.min(1, (1 - dGA)/sGA)) * demultiply;

					if ( src[px+2] == 0 && dBA==0) dst[px+2] = 0;
					else dst[px+2] = (1 - Math.min(1, (1 - dBA)/sBA)) * demultiply;
				break;

				case 'darken':
				case 'darker':
					dst[px  ] = (sRA>dRA ? dRA : sRA) * demultiply;
					dst[px+1] = (sGA>dGA ? dGA : sGA) * demultiply;
					dst[px+2] = (sBA>dBA ? dBA : sBA) * demultiply;
				break;

				case 'lighten':
				case 'lighter':
					dst[px  ] = (sRA<dRA ? dRA : sRA) * demultiply;
					dst[px+1] = (sGA<dGA ? dGA : sGA) * demultiply;
					dst[px+2] = (sBA<dBA ? dBA : sBA) * demultiply;
				break;

				case 'exclusion':
					dst[px  ] = (dRA+sRA - 2*dRA*sRA) * demultiply;
					dst[px+1] = (dGA+sGA - 2*dGA*sGA) * demultiply;
					dst[px+2] = (dBA+sBA - 2*dBA*sBA) * demultiply;
				break;

				// ******* UNSUPPORTED
				default:
					dst[px] = dst[px+3] = 255;
					dst[px+1] = px%8==0 ? 255 : 0;
					dst[px+2] = px%8==0 ? 0 : 255;
			}
		}
		destContext.putImageData(dstD, offset.x, offset.y);
	}
};
