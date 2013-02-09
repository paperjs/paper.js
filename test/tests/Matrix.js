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

module('Matrix');
test('getRotation()', function() {
	equals(function() {
		return new Matrix().rotate(45).getRotation();
	}, 45);

	equals(function() {
		return new Matrix().rotate(90).getRotation();
	}, 90);

	equals(function() {
		return new Matrix().rotate(180).getRotation();
	}, 180);

	equals(function() {
		return new Matrix().rotate(270).getRotation();
	}, -90, null, Numerical.TOLERANCE);

	equals(function() {
		return new Matrix().rotate(-45).getRotation();
	}, -45);

	equals(function() {
		return new Matrix().rotate(-90).getRotation();
	}, -90);

	equals(function() {
		return new Matrix().rotate(-180).getRotation();
	}, -180);

	equals(function() {
		return new Matrix().rotate(-270).getRotation();
	}, 90, null, Numerical.TOLERANCE);
});

test('getScaling()', function() {
	equals(function() {
		return new Matrix().scale(1, 1).getScaling();
	}, new Point(1, 1));

	equals(function() {
		return new Matrix().scale(1, -1).getScaling();
	}, new Point(1, -1));

	equals(function() {
		return new Matrix().scale(-1, 1).getScaling();
	}, new Point(-1, 1));

	equals(function() {
		return new Matrix().scale(2, -4).getScaling();
	}, new Point(2, -4));

	equals(function() {
		return new Matrix().scale(-4, 2).getScaling();
	}, new Point(-4, 2));

	equals(function() {
		return new Matrix().scale(-4, -4).getScaling();
	}, new Point(-4, -4));
});

test('getRotation() & getScaling()', function() {
	equals(function() {
		return new Matrix().scale(2, 4).rotate(45).getScaling();
	}, new Point(2, 4));

	equals(function() {
		return new Matrix().scale(2, 4).rotate(45).getRotation();
	}, 45);

	equals(function() {
		return new Matrix().scale(2, -4).rotate(45).getScaling();
	}, new Point(2, -4));

	equals(function() {
		return new Matrix().scale(2, -4).rotate(45).getRotation();
	}, 45);

});
