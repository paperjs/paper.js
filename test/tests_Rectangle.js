module('Rectangle');
test('new Rectangle(new Point(10, 20), new Size(30, 40));', function(){
	var rect = new Rectangle(new Point(10, 20), new Size(30, 40));
	equals(rect.x, 10);
	equals(rect.y, 20);
	equals(rect.width, 30);
	equals(rect.height, 40);
});

test('new Rectangle([10, 20], [30, 40]);', function(){
	var rect = new Rectangle([10, 20], [30, 40]);
	equals(rect.x, 10);
	equals(rect.y, 20);
	equals(rect.width, 30);
	equals(rect.height, 40);
});

test('new Rectangle(new Point(10, 20), new Point(30, 40));', function(){
	var rect = new Rectangle(new Point(10, 20), new Point(30, 40));
	equals(rect.x, 10);
	equals(rect.y, 20);
	equals(rect.width, 20);
	equals(rect.height, 20);
});

test('new Rectangle(10, 20, 30, 40);', function(){
	var rect = new Rectangle(10, 20, 30, 40);
	equals(rect.x, 10);
	equals(rect.y, 20);
	equals(rect.width, 30);
	equals(rect.height, 40);
});

test('new Rectangle({x: 10, y: 20, width: 30, height: 40});', function(){
	var rect = new Rectangle({x: 10, y: 20, width: 30, height: 40});
	equals(rect.x, 10);
	equals(rect.y, 20);
	equals(rect.width, 30);
	equals(rect.height, 40);
});

test('getSize()', function(){
	var rect = new Rectangle(10, 10, 20, 30);
	equals(rect.getSize().equals([20, 30]), true);
});

test('setSize()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setSize(new Size(30, 30))
	equals(rect.width, 30);
	equals(rect.height, 30);
});

test('getTopLeft()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getTopLeft();
	equals(point.x, 10);
	equals(point.y, 10);
});

test('setTopLeft()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setTopLeft(10, 15);
	var point = rect.getTopLeft();
	equals(point.x, 10);
	equals(point.y, 15);
});

test('getTopRight()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getTopRight();
	equals(point.x, 30);
	equals(point.y, 10);
});

test('setTopRight()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setTopRight(10, 15);
	var point = rect.getTopRight();
	equals(point.x, 10);
	equals(point.y, 15);
});

test('getBottomLeft()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getBottomLeft();
	equals(point.x, 10);
	equals(point.y, 30);
});

test('setBottomLeft()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setBottomLeft(10, 15);
	var point = rect.getBottomLeft();
	equals(point.x, 10);
	equals(point.y, 15);
});

test('getBottomRight()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getBottomRight();
	equals(point.x, 30);
	equals(point.y, 30);
});

test('setBottomRight()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setBottomRight(10, 15);
	var point = rect.getBottomRight();
	equals(point.x, 10);
	equals(point.y, 15);
});

test('getBottomCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getBottomCenter();
	equals(point.x, 20);
	equals(point.y, 30);
});

test('setBottomCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setBottomCenter(10, 15);
	var point = rect.getBottomCenter();
	equals(point.x, 10);
	equals(point.y, 15);
});

test('getTopCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getTopCenter();
	equals(point.x, 20);
	equals(point.y, 10);
});

test('setTopCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setTopCenter(10, 15);
	var point = rect.getTopCenter();
	equals(point.x, 10);
	equals(point.y, 15);
});

test('getLeftCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getLeftCenter();
	equals(point.x, 10);
	equals(point.y, 20);
});

test('setLeftCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setLeftCenter(10, 15);
	var point = rect.getLeftCenter();
	equals(point.x, 10);
	equals(point.y, 15);
});

test('getRightCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	var point = rect.getRightCenter();
	equals(point.x, 30);
	equals(point.y, 20);
});

test('setRightCenter()', function(){
	var rect = new Rectangle(10, 10, 20, 20);
	rect.setRightCenter(10, 15);
	var point = rect.getRightCenter();
	equals(point.x, 10);
	equals(point.y, 15);
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