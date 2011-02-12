module('Document');

test('activate()', function() {
	var doc = new Doc();
	var secondDoc = new Doc();
	doc.activate();
	var path = new Path();
	equals(doc.activeLayer.children[0] == path, true);
	equals(secondDoc.activeLayer.children.length == 0, true);
});