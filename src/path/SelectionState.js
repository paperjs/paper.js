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

// These values are ordered so that SelectionState.POINT has the highest value.
// As Path#_selectedSegmentState is the addition of all segment's states, and is
// used to see if all segments are fully selected, meaning they are set to
// SelectionState.POINT.
var SelectionState = {
	HANDLE_IN: 1,
	HANDLE_OUT: 2,
	POINT: 4
};
