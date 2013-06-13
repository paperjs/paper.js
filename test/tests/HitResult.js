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

test('hitting a selected path', function() {
	var path = new Path.Circle([50, 50], 50);
	path.fillColor = 'red';
	
	var hitResult = paper.project.hitTest([75, 75], {
		selected: true
	});
	equals(function() {
		return hitResult == null;
	}, true, 'Since the path is not selected, the hit-test should return null');

	path.selected = true;
	hitResult = paper.project.hitTest([75, 75]);
	equals(function() {
		return hitResult.type == 'fill';
	}, true);
	equals(function() {
		return hitResult.item == path;
	}, true);
});

test('hitting path segments', function() {
	var path = new Path([0, 0], [10, 10], [20, 0]);

	var hitResult = paper.project.hitTest([10, 10]);
	
	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned.');
	
	if (hitResult) {
		equals(function() {
			return hitResult.type;
		}, 'segment');
	
		equals(function() {
			return hitResult.item == path;
		}, true);
	}
});

test('hitting the center of a path', function() {
	var path = new Path([0, 0], [100, 100], [200, 0]);
	path.closed = true;

	var hitResult = paper.project.hitTest(path.position, {
		center: true
	});

	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned.');
	
	if (hitResult) {
		equals(function() {
			return hitResult.point.toString();
		}, path.position.toString());

		equals(function() {
			return hitResult.type;
		}, 'center');
		equals(function() {
			return hitResult.item !== paper.project.activeLayer;
		}, true, 'We should not be hitting the active layer.');

		equals(function() {
			return hitResult.item == path;
		}, true, 'We should be hitting the path.');
	}
});

test('hitting the center of a path with tolerance', function() {
	var path = new Path([0, 0], [100, 100], [200, 0]);
	path.closed = true;
	var hitResult = paper.project.hitTest(path.position.add(1, 1), {
		center: true
	});

	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned.');
	
	if (hitResult) {
		equals(function() {
			return !!hitResult.point;
		}, true, 'HitResult#point should not be empty');
		
		if (hitResult.point) {
			equals(function() {
				return hitResult.point.toString();
			}, path.position.toString());
		}

		equals(function() {
			return hitResult.type;
		}, 'center');

		equals(function() {
			return hitResult.item !== paper.project.activeLayer;
		}, true, 'We should not be hitting the active layer.');

		equals(function() {
			return hitResult.item == path;
		}, true, 'We should be hitting the path.');
	}
});

test('hitting path handles', function() {
	var path = new Path.Circle(new Point(), 10);
	path.firstSegment.handleIn = [-50, 0];
	path.firstSegment.handleOut = [50, 0];
	var firstPoint = path.firstSegment.point;
	var hitResult = paper.project.hitTest(firstPoint.add(50, 0), {
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

	var hitResult = paper.project.hitTest(firstPoint.add(-50, 0), {
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

test('hitting path handles (2)', function() {
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

test('hit testing stroke on segment point of a path', function() {
	var path = new Path([0, 0], [50, 50], [100, 0]);
	path.strokeColor = 'black';
	path.closed = true;

	var error = null;
	try {
		var hitResult = paper.project.hitTest(path.firstSegment.point, {
			stroke: true
		});
	} catch (e) {
		error = e;
	}
	var description = 'This hit test should not throw an error';
	if (error)
		description += ': ' + error;
	equals(error == null, true, description);
});

test('Hit testing a point that is extremely close to a curve', function() {
	var path = new Path.Rectangle([0, 0], [100, 100]);
	// A point whose x value is extremely close to 0:
	var point = new Point(2.842 / Math.pow(10, 14), 0);
	var error;
	try {
		var hitResult = path.hitTest(point, {
			stroke: true
		});
	} catch(e) {
		error = e;
	}
	var description = 'This hit test should not throw an error';
	if (error)
		description += ': ' + error;
	equals(error == null, true, description);
});

test('hitting path ends', function() {
	var path = new Path([0, 0], [50, 50], [100, 0]);
	path.closed = true;

	equals(function() {
		return !paper.project.hitTest(path.firstSegment.point, {
			ends: true
		});
	}, true, 'No hitresult should be returned, because the path is closed.');

	path.closed = false;

	var hitResult = paper.project.hitTest(path.lastSegment.point, {
		ends: true
	});

	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned (1)');
	
	if (hitResult) {
		equals(function() {
			return hitResult.type;
		}, 'segment');
	
		equals(function() {
			return hitResult.segment == path.lastSegment;
		}, true);
	}

	equals(function() {
		return !paper.project.hitTest(path.segments[1].point, {
			ends: true
		});
	}, true, 'No HitResult should be returned, since the second segment is not an end');
});

test('When a path is closed, the end of a path cannot be hit.', function() {
	var path = new Path([0, 0], [50, 50], [100, 0]);
	path.closed = true;

	var hitResult = paper.project.hitTest([0, 0], {
		ends: true
	});
	equals(function() {
		return !hitResult;
	}, true, 'When a path is closed, the end of a path cannot be hit.');
});

test('hitting path bounding box', function() {
	var path = new Path.Circle(new Point(100, 100), 50);

	var hitResult = paper.project.hitTest(path.bounds.topLeft, {
		bounds: true
	});

	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned (1)');
	
	if (hitResult) {
		equals(function() {
			return hitResult.type;
		}, 'bounds');

		equals(function() {
			return hitResult.name;
		}, 'top-left');

		equals(function() {
			return hitResult.point.toString();
		}, path.bounds.topLeft.toString());
	}
});

test('hitting guides', function() {
	var path = new Path.Circle(new Point(100, 100), 50);
	path.fillColor = 'red';

	var copy = path.clone();

	var hitResult = paper.project.hitTest(path.position);

	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned (1)');
	
	if (hitResult) {
		equals(function() {
			return hitResult.item == copy;
		}, true, 'The copy is returned, because it is on top.');
	}
	
	path.guide = true;
	
	var hitResult = paper.project.hitTest(path.position, {
		guides: true,
		fill: true
	});
	
	equals(function() {
		return !!hitResult;
	}, true, 'A HitResult should be returned (2)');
	
	if (hitResult) {
		equals(function() {
			return hitResult.item == path;
		}, true, 'The path is returned, because it is a guide.');
	}
});

test('hitting raster items', function() {
	// Create a path, rasterize it and then remove the path:
	var path = new Path.Rectangle(new Point(), new Size(320, 240));
	path.fillColor = 'red';
	var raster = path.rasterize();
	
	var hitResult = paper.project.hitTest(new Point(160, 120));

	equals(function() {
		return hitResult && hitResult.item == raster;
	}, true, 'Hit raster item before moving');
	
	// Move the raster:
	raster.translate(100, 100);
	
	var hitResult = paper.project.hitTest(new Point(160, 120));

	equals(function() {
		return hitResult && hitResult.item == raster;
	}, true, 'Hit raster item after moving');	
});

test('hitting path with a text item in the project', function() {
    var path = new Path.Rectangle(new Point(50, 50), new Point(100, 100));
    path.fillColor = 'blue';
	
	var hitResult = paper.project.hitTest(new Point(75, 75));

	equals(function() {
		return hitResult && hitResult.item == path;
	}, true, 'Hit path item before adding text item');

	var text1 = new PointText(30, 30);
	text1.content = "Text 1";

	var hitResult = paper.project.hitTest(new Point(75, 75));
	
	equals(function() {
		return !!hitResult;
	}, true, 'A hitresult should be returned.');

	equals(function() {
		return !!hitResult && hitResult.item == path;
	}, true, 'We should have hit the path');
	
});

test('Check hit testing of items that come after a transformed group.', function() {
	paper.project.currentStyle.fillColor = 'black';
	var point1 = new Point(100, 100);
	var point2 = new Point(140, 100);
	var delta = new Point(250, 0);

	var path1 = new Path.Circle(point1, 20);
	var path2 = new Path.Circle(point2, 20);

	var group = new Group(path2);

	var hitResult = paper.project.hitTest(point1);
	equals(function() {
		return hitResult && hitResult.item == path1;
	}, true, 'Hit testing project for point1 should give us path1.');

	hitResult = paper.project.hitTest(point2);
	equals(function() {
		return hitResult && hitResult.item == path2;
	}, true, 'Hit testing project for point2 should give us path2.');

	hitResult = paper.project.hitTest(point2);
	equals(function() {
		return hitResult && hitResult.item == path2;
	}, true, 'Hit testing project for point2 should give us path2.');

	group.translate(delta)

	hitResult = paper.project.hitTest(point1);
	equals(function() {
		return hitResult && hitResult.item == path1;
	}, true, 'After translating group, hit testing project for point1 should give us path1.');

	hitResult = paper.project.hitTest(point2.add(delta));
	equals(function() {
		return hitResult && hitResult.item == path2;
	}, true, 'After translating group, hit testing project for point2 + delta should give us path2.');

	hitResult = path1.hitTest(point1);
	equals(function() {
		return hitResult && hitResult.item == path1;
	}, true, 'After translating group, hit testing path1 for point1 should give us path1.');

	group.moveBelow(path1);

	hitResult = paper.project.hitTest(point1);
	equals(function() {
		return hitResult && hitResult.item == path1;
	}, true, 'After moving group before path1, hit testing project for point1 should give us path1.');

	hitResult = paper.project.hitTest(point2.add(delta));
	equals(function() {
		return hitResult && hitResult.item == path2;
	}, true, 'After moving group before path1, hit testing project for point2 + delta should give us path2.');

	hitResult = path1.hitTest(point1);
	equals(function() {
		return hitResult && hitResult.item == path1;
	}, true, 'After moving group before path1, hit testing path1 for point1 should give us path1.');
});

test('Check hit testing of placed symbols.', function() {
	var point = new Point(100, 100);

	var path = new Path.Circle([0, 0], 20);
	path.fillColor = 'black';
	var symbol = new Symbol(path);
	var placedItem = symbol.place(point);
	var hitResult = placedItem.hitTest(point);
	equals(function() {
		return hitResult && hitResult.item == placedItem;
	}, true, 'hitResult.item should be placedItem');

});

test('Hit testing the corner of a rectangle with miter stroke.', function() {
	var rect = new Path.Rectangle({
	    rectangle: [100, 100, 300, 200],
	    fillColor: '#f00',
	    strokeColor: 'blue',
	    strokeJoin: 'miter',
	    strokeWidth: 20
	});
	equals(function() {
		return rect.hitTest(rect.strokeBounds.topRight) != null;
	}, true);
});

// TODO: project.hitTest(point, {type: AnItemType});