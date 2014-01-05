/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Path Drawing Commands');

test('path.lineTo(point);', function() {
	var path = new Path();
	path.moveTo([50, 50]);
	path.lineTo([100, 100]);
	equals(path.segments.toString(), '{ point: { x: 50, y: 50 } },{ point: { x: 100, y: 100 } }');
});

test('path.arcTo(from, through, to);', function() {
	var path = new Path();
	path.moveTo([0, 20]);
	path.arcTo([75, 75], [100, 0]);
	equals(path.segments.toString(), '{ point: { x: 0, y: 20 }, handleOut: { x: -2.62559, y: 23.01251 } },{ point: { x: 30.89325, y: 74.75812 }, handleIn: { x: -21.05455, y: -9.65273 }, handleOut: { x: 21.05455, y: 9.65273 } },{ point: { x: 92.54397, y: 62.42797 }, handleIn: { x: -15.72238, y: 17.00811 }, handleOut: { x: 15.72238, y: -17.00811 } },{ point: { x: 100, y: 0 }, handleIn: { x: 11.27458, y: 20.23247 } }');
});

test('path.arcTo(from, through, to); where from, through and to all share the same y position and through lies in between from and to', function() {
	var path = new Path();
	path.strokeColor = 'black';

	path.add([40, 75]);
	path.arcTo([50, 75], [100, 75]);
	equals(path.lastSegment.point.toString(), '{ x: 100, y: 75 }', 'We expect the last segment point to be at the position where we wanted to draw the arc to.');
});

test('path.arcTo(from, through, to); where from, through and to all share the same y position and through lies to the right of to', function() {
	var path = new Path();
	path.strokeColor = 'black';

	path.add([40, 75]);
	var error = null;
	try {
		path.arcTo([150, 75], [100, 75]);
	} catch (e) {
		error = e;
	}
	equals(error != null, true, 'We expect this arcTo() command to throw an error');
});

test('path.arcTo(from, through, to); where from, through and to all share the same y position and through lies to the left of to', function() {
	var path = new Path();
	path.strokeColor = 'black';

	path.add([40, 75]);
	var error = null;
	try {
		path.arcTo([10, 75], [100, 75]);
	} catch (e) {
		error = e;
	}
	equals(error != null, true, 'We expect this arcTo() command to throw an error');
});