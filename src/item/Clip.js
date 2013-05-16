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
 * @name Clip
 *
 * @class A Clip is a collection of items, similar to a Group. But instead of
 * automatically passing on transformations to its children by calling
 * {@link Item#applyMatrix()}, the transformations are stored in the internal
 * matrix.
 *
 * @extends Group
 */
var Clip = this.Clip = Group.extend(/** @lends Clip# */{
	_class: 'Clip',
	_applyMatrix: false
});
