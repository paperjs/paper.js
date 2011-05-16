module('Project');

test('activate()', function() {
	var proj = new Project();
	var secondDoc = new Project();
	proj.activate();
	var path = new Path();
	equals(function() {
		return proj.activeLayer.children[0] == path;
	}, true);
	equals(function() {
		return secondDoc.activeLayer.children.length == 0;
	}, true);
});