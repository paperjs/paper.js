module('Group');

test('new Group()', function() {
	var doc = new Doc();
	var group = new Group();
	equals(doc.activeLayer.children[0] == group, true);
});

test('new Group([item])', function() {
	var doc = new Doc();
	var path = new Path();
	var group = new Group([path]);
	equals(doc.activeLayer.children.length == 1, true);
	equals(group.children[0] == path, true);
});