test('Item Order', function() {
	var line = new Path();
	line.add([0, 0], [100, 100]);
	line.name = 'line';

	var circle = new Path.Circle([50, 50], 50);
	circle.name = 'circle';

	var group = new Group([circle]);
	group.name = 'group';

	equals(function() {
		return circle.isAbove(line);
	}, true);
	equals(function() {
		return line.isBelow(circle);
	}, true);

	equals(function() {
		return group.isAbove(line);
	}, true);
	equals(function() {
		return line.isBelow(group);
	}, true);


	equals(function() {
		return group.isAncestor(circle);
	}, true);

	equals(function() {
		return circle.isDescendant(group);
	}, true);


	equals(function() {
		return group.isAbove(circle);
	}, false);

	equals(function() {
		return group.isBelow(circle);
	}, false);
});
