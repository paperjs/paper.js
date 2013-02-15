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

module('Size');
test('new Size(10, 20)', function() {
	var size = new Size(10, 20);
	equals(size.toString(), '{ width: 10, height: 20 }');
});

test('new Size([10, 20])', function() {
	var size = new Size([10, 20]);
	equals(size.toString(), '{ width: 10, height: 20 }');
});

test('new Size({width: 10, height: 20})', function() {
	var size = new Size({width: 10, height: 20});
	equals(size.toString(), '{ width: 10, height: 20 }');
});

test('new Size(new Point(10, 20))', function() {
	var size = new Size(new Point(10, 20));
	equals(size.toString(), '{ width: 10, height: 20 }');
});

test('new Size({ x: 10, y: 20})', function() {
	var size = new Size({x: 10, y: 20});
	equals(size.toString(), '{ width: 10, height: 20 }');
});