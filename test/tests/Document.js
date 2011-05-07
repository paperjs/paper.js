module('Document');

test('activate()', function() {
	var doc = new Document();
	var secondDoc = new Document();
	doc.activate();
	var path = new Path();
	equals(function() {
		return doc.activeLayer.children[0] == path;
	}, true);
	equals(function() {
		return secondDoc.activeLayer.children.length == 0;
	}, true);
});