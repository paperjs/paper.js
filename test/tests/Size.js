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