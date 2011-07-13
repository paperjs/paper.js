/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('HitResult');

test('hitting a filled shape', function() {
	var path = new Path.Circle([50, 50], 50);
	
	var hitResult = path.hitTest([75, 75]);
	equals(function() {
		return hitResult == null;
	}, true, 'Since the path is not filled, the hit-test should return null');

	path.fillColor = 'red';
	hitResult = path.hitTest([75, 75]);
	equals(function() {
		return hitResult.type == 'fill';
	}, true);
	equals(function() {
		return hitResult.item == path;
	}, true);
});

test('the item on top should be returned', function() {
	var path = new Path.Circle([50, 50], 50);
	path.fillColor = 'red';

	// The cloned path is lying above the path:
	var copy = path.clone();

	var hitResult = paper.project.hitTest([75, 75]);
	equals(function() {
		return hitResult.item == copy;
	}, true);
});

test('hitting a stroked path', function() {
	var path = new Path([0, 0], [50, 0]);
	
	// We are hit testing with an offset of 5pt on a path with a stroke width
	// of 10:

	var hitResult = paper.project.hitTest([25, 5]);
	equals(function() {
		return hitResult == null;
	}, true, 'Since the path is not stroked yet, the hit-test should return null');

	path.strokeColor = 'black';
	path.strokeWidth = 10;
	hitResult = path.hitTest([25, 5]);
	equals(function() {
		return hitResult.type == 'stroke';
	}, true);
	equals(function() {
		return hitResult.item == path;
	}, true);
});

test('hitting path handles', function() {
	var path = new Path(new Segment({
		point: [0, 0],
		handleIn: [-50, -50],
		handleOut: [50, 50]
	}));

	var hitResult = paper.project.hitTest([50, 50], {
		handles: true
	});
	
	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned (1)');
	
	if (hitResult) {
		equals(function() {
			return hitResult.type;
		}, 'handle-out');
	
		equals(function() {
			return hitResult.item == path;
		}, true);
	}

	var hitResult = paper.project.hitTest([-50, -50], {
		handles: true
	});

	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned (2)');

	if (hitResult) {
		equals(function() {
			return hitResult.type;
		}, 'handle-in');

		equals(function() {
			return hitResult.item == path;
		}, true);
	}
});