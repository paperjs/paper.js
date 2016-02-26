/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Path#_segmentSelection is the addition of all segment's states, and is
// compared with SegmentSelection.SEGMENT, the combination of all
// SegmentSelection values to see if all segments are fully selected.
var SegmentSelection = {
    HANDLE_IN: 1,
    HANDLE_OUT: 2,
    POINT: 4,
    SEGMENT: 7 // HANDLE_IN | HANDLE_OUT | POINT
};
