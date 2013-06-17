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

module('Curve');

test('Curve#getPointAt()', function() {
	var curve = new Path.Circle({
		center: [100, 100],
		radius: 100
	}).getFirstCurve();

	var points = [
		[0, new Point(0, 100)],
		[0.25, new Point(7.8585, 61.07549)],
		[0.5, new Point(29.28932, 29.28932)],
		[0.75, new Point(61.07549, 7.8585)],
		[1, new Point(100, 0)]
	];

	for (var i = 0; i < points.length; i++) {
		var entry = points[i];
		comparePoints(curve.getPointAt(entry[0], true), entry[1],
				'curve.getPointAt(' + entry[0] + ', true);');
	}
});
