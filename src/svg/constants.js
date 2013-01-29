/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * To shrink code, we automatically replace the long SVGPathSeg constants with
 * their actual numeric values on preprocessing time, using prepro statements.
 * To do so, we need their values defined, which happens here.
 */

// http://dxr.mozilla.org/mozilla-central/dom/interfaces/svg/nsIDOMSVGPathSeg.idl.html
var SVGPathSeg = {
	PATHSEG_UNKNOWN: 0,
	PATHSEG_CLOSEPATH: 1,
	PATHSEG_MOVETO_ABS: 2,
	PATHSEG_MOVETO_REL: 3,
	PATHSEG_LINETO_ABS: 4,
	PATHSEG_LINETO_REL: 5,
	PATHSEG_CURVETO_CUBIC_ABS: 6,
	PATHSEG_CURVETO_CUBIC_REL: 7,
	PATHSEG_CURVETO_QUADRATIC_ABS: 8,
	PATHSEG_CURVETO_QUADRATIC_REL: 9,
	PATHSEG_ARC_ABS: 10,
	PATHSEG_ARC_REL: 11,
	PATHSEG_LINETO_HORIZONTAL_ABS: 12,
	PATHSEG_LINETO_HORIZONTAL_REL: 13,
	PATHSEG_LINETO_VERTICAL_ABS: 14,
	PATHSEG_LINETO_VERTICAL_REL: 15,
	PATHSEG_CURVETO_CUBIC_SMOOTH_ABS: 16,
	PATHSEG_CURVETO_CUBIC_SMOOTH_REL: 17,
	PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS: 18,
	PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL: 19
};
