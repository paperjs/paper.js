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
test('Decomposition: rotate()', function() {
	function testAngle(angle, expected) {
		equals(new Matrix().rotate(angle).getRotation(),
				Base.pick(expected, angle),
				'new Matrix().rotate(' + angle + ').getRotation()',
				Numerical.TOLERANCE);
		equals(new Matrix().rotate(angle).getScaling(),
				new Point(1, 1),
				'new Matrix().rotate(' + angle + ').getScaling()');
	}

	testAngle(0);
	testAngle(1);
	testAngle(45);
	testAngle(90);
	testAngle(135);
	testAngle(180);
	testAngle(270, -90);
	testAngle(-1);
	testAngle(-45);
	testAngle(-90);
	testAngle(-135);
	testAngle(-180);
	testAngle(-270, 90);
});

test('Decomposition: scale()', function() {
	function testScale(sx, sy) {
		var flipped = sx < 0 && sy < 0;
		equals(new Matrix().scale(sx, sy).getScaling(),
				new Point(flipped ? -sx : sx, flipped ? -sy : sy),
				'new Matrix().scale(' + sx + ', ' + sy + ').getScaling()');
		equals(new Matrix().scale(sx, sy).getRotation(),
				flipped ? 180 : 0,
				'new Matrix().scale(' + sx + ', ' + sy + ').getRotation()',
				Numerical.TOLERANCE);
	}

	testScale(1, 1);
	testScale(1, -1);
	testScale(-1, 1);
	testScale(-1, -1);
	testScale(2, 4);
	testScale(2, -4);
	testScale(4, 2);
	testScale(-4, 2);
	testScale(-4, -4);
});

test('Decomposition: rotate() & scale()', function() {
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

	equals(function() {
		return new Matrix().scale(-2, 4).rotate(45).getScaling();
	}, new Point(-2, 4));

	equals(function() {
		return new Matrix().scale(-2, 4).rotate(45).getRotation();
	}, 45);

	equals(function() {
		return new Matrix().scale(-2, -4).rotate(45).getScaling();
	}, new Point(-2, -4));

	equals(function() {
		return new Matrix().scale(-2, -4).rotate(45).getRotation();
	}, 45);
});
