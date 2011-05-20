module('Project');

test('activate()', function() {
	var project = new Project();
	var secondDoc = new Project();
	project.activate();
	var path = new Path();
	equals(function() {
		return project.activeLayer.children[0] == path;
	}, true);
	equals(function() {
		return secondDoc.activeLayer.children.length == 0;
	}, true);
});