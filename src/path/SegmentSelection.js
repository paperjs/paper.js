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

// Path#_segmentSelection is the addition of all segment's states, and is
// compared with SegmentSelection.ALL, the combination of all
// SegmentSelection values to see if all segments are fully selected.
var SegmentSelection = {
    POINT: 1,
    HANDLE_IN: 2,
    HANDLE_OUT: 4,
    ALL: 1 | 2 | 4 // POINT | HANDLE_IN | HANDLE_OUT
};
