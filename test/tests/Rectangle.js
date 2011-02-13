module('Rectangle');
test('new Rectangle(new Point(10, 20), new Size(30, 40));', function() {
	var rect = new Rectangle(new Point(10, 20), new Size(30, 40));
	compareRectangles(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle([10, 20], [30, 40]);', function() {
	var rect = new Rectangle([10, 20], [30, 40]);
	compareRectangles(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle(new Point(10, 20), new Point(30, 40));', function() {
	var rect = new Rectangle(new Point(10, 20), new Point(30, 40));
	compareRectangles(rect, { x: 10, y: 20, width: 20, height: 20 });
});

test('new Rectangle(10, 20, 30, 40);', function() {
	var rect = new Rectangle(10, 20, 30, 40);
	compareRectangles(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('new Rectangle({x: 10, y: 20, width: 30, height: 40});', function() {
	var rect = new Rectangle({x: 10, y: 20, width: 30, height: 40});
	compareRectangles(rect, { x: 10, y: 20, width: 30, height: 40 });
});

test('get size', function() {
	var rect = new Rectangle(10, 10, 20, 30);
	equals(rect.size.equals([20, 30]), true);
});

test('set size', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.size = new Size(30, 30);
	compareRectangles(rect, { x: 10, y: 10, width: 30, height: 30 });
});

test('topLeft', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.topLeft;
	comparePoints(point, { x: 10, y: 10 });
});

test('set topLeft', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.topLeft = [10, 15];
	var point = rect.topLeft;
	comparePoints(point, { x: 10, y: 15 });
});

test('get topRight', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.topRight;
	comparePoints(point, { x: 30, y: 10 });
});

test('set topRight', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.topRight = [10, 15];
	var point = rect.topRight;
	comparePoints(point, { x: 10, y: 15 });
});

test('get bottomLeft', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.bottomLeft;
	comparePoints(point, { x: 10, y: 30 });
});

test('set bottomLeft', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.bottomLeft = [10, 15];
	var point = rect.bottomLeft;
	comparePoints(point, { x: 10, y: 15 });
});

test('get bottomRight', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.bottomRight;
	comparePoints(point, { x: 30, y: 30 });
});

test('set bottomRight', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.bottomRight = [10, 15];
	var point = rect.bottomRight;
	comparePoints(point, { x: 10, y: 15 });
});

test('get bottomCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.bottomCenter;
	comparePoints(point, { x: 20, y: 30 });
});

test('set bottomCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.bottomCenter = [10, 15];
	var point = rect.bottomCenter;
	comparePoints(point, { x: 10, y: 15 });
});

test('get topCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.topCenter;
	comparePoints(point, { x: 20, y: 10 });
});

test('set topCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.topCenter = [10, 15];
	var point = rect.topCenter;
	comparePoints(point, { x: 10, y: 15 });
});

test('get leftCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.leftCenter;
	comparePoints(point, { x: 10, y: 20 });
});

test('set leftCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.leftCenter = [10, 15];
	var point = rect.leftCenter;
	comparePoints(point, { x: 10, y: 15 });
});

test('get rightCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.rightCenter;
	comparePoints(point, { x: 30, y: 20 });
});

test('set rightCenter', function() {
	var rect = new Rectangle(10, 10, 20, 20);
	rect.rightCenter = [10, 15];
	var point = rect.rightCenter;
	comparePoints(point, { x: 10, y: 15 });
});

test('intersects(rect)', function() {
	var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
	var rect2 = { x: 195, y: 301, width: 19, height: 19 };
	equals(rect1.intersects(rect2), false);

	rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
	rect2 = { x: 170.5, y: 280.5, width: 19, height: 19 };
	equals(rect1.intersects(rect2), true);
});

test('contains(rect)', function() {
	var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
	var rect2 = { x: 195, y: 301, width: 19, height: 19 };
	equals(rect1.contains(rect2), false);

	rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
	rect2 = new Rectangle({ x: 170.5, y: 280.5, width: 19, height: 19 });
	equals(rect1.contains(rect2), false);
	
	rect1 = new Rectangle({ x: 299, y: 161, width: 137, height: 129 });
	rect2 = new Rectangle({ x: 340, y: 197, width: 61, height: 61 });
	equals(rect1.contains(rect2), true);
	equals(rect2.contains(rect1), false);
});

test('contains(point)', function() {
	var rect = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
	var point = new Point(166, 280);
	equals(rect.contains(point), true);

	var point = new Point(30, 30);
	equals(rect.contains(point), false);
});

test('intersect(rect)', function() {
	var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
	var rect2 = { x: 170.5, y: 280.5, width: 19, height: 19 };
	var intersected = rect1.intersect(rect2);
	equals(intersected.equals({ x: 170.5, y: 280.5, width: 9.5, height: 9.5 }), true);
});

test('unite(rect)', function() {
	var rect1 = new Rectangle({ x: 160, y: 270, width: 20, height: 20 });
	var rect2 = { x: 170.5, y: 280.5, width: 19, height: 19 };
	var united = rect1.unite(rect2);
	equals(united.equals({ x: 160, y: 270, width: 29.5, height: 29.5 }), true);
});

test('include(point)', function() {
	var rect1 = new Rectangle({ x: 95, y: 151, width: 20, height: 20 });
	var included = rect1.include([50, 50]);
	equals(included.equals({ x: 50, y: 50, width: 65, height: 121 }), true);
});

test('toString()', function() {
	var string = new Rectangle(10, 20, 30, 40).toString();
	equals(string, '{ x: 10, y: 20, width: 30, height: 40 }');
});