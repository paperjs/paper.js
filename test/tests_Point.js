module('Point');
test('new Point(10, 20)', function(){
	var point = new Point(10, 20);
    equals(point.x, 10);
    equals(point.y, 20);
});

test('new Point([10, 20])', function(){
	var point = new Point([10, 20]);
    equals(point.x, 10);
    equals(point.y, 20);
});

test('new Point({x: 10, y: 20})', function(){
	var point = new Point({x: 10, y: 20});
    equals(point.x, 10);
    equals(point.y, 20);
});

test('new Point(new Size(10, 20))', function(){
	var point = new Point(new Size(10, 20));
    equals(point.x, 10);
    equals(point.y, 20);
});

test('new Point({ width: 10, height: 20})', function(){
	var point = new Point({width: 10, height: 20});
    equals(point.x, 10);
    equals(point.y, 20);
});

module('Point vector operations');

test('new Point(0, 10).normalize(20)', function(){
	var point = new Point(0, 10).normalize(20)
    equals(point.x, 0);
    equals(point.y, 20);
});

test('new Point(0, 10).setLength(20)', function(){
	var point = new Point(0, 10);
	point.setLength(20)
    equals(point.x, 0);
    equals(point.y, 20);
});

test('new Point(0, 10).getAngle()', function(){
	var angle = new Point(0, 10).getAngle();
    equals(angle, 90);
});

test('new Point(0, 10).getAngle([10, 10])', function(){
	var angle = new Point(0, 10).getAngle([10, 10]);
    equals(Math.round(angle), 45);
});

test('new Point(100, 50).rotate(90)', function(){
	var point = new Point(100, 50).rotate(90);
    equals(Math.round(point.x), -50);
    equals(Math.round(point.y), 100);
});

test('setAngle(20)', function(){
	var point = new Point(10, 20);
	point.setAngle(92);
    equals(point.getAngle(), 92);
});

test('setAngle(20)', function(){
	var point = new Point(10, 20);
	point.setAngle(92);
    equals(point.getAngle(), 92);
});

test('new Point().getDirectedAngle(new Point(10, 10))', function() {
	var angle = new Point().getDirectedAngle(new Point(10, 10));
	equals(angle, -45);
});