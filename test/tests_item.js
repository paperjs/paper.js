module('Item');

test('appendChild(item)', function() {
	var doc = new Doc();
	var path = new Path();
	doc.activeLayer.appendChild(path);
	equals(doc.activeLayer.children.length, 1);
});

test('item.parent / item.isChild', function() {
	var doc = new Doc();
	var secondDoc = new Doc();
	var path = new Path();
	doc.activeLayer.appendChild(path);
	equals(doc.activeLayer.children.indexOf(path) != -1, true);
	secondDoc.activeLayer.appendTop(path);
	equals(doc.activeLayer.isChild(path), false);
	equals(secondDoc.activeLayer.isChild(path), true);
	equals(doc.activeLayer.children.indexOf(path) == -1, true);
	equals(secondDoc.activeLayer.children.indexOf(path) == 0, true);
});

test('item.lastChild / item.firstChild', function() {
	var doc = new Doc();
	var path = new Path();
	var secondPath = new Path();
	equals(doc.activeLayer.firstChild == path, true);
	equals(doc.activeLayer.lastChild == secondPath, true);
});

test('appendBottom(item)', function() {
	var doc = new Doc();
	var path = new Path();
	var secondPath = new Path();
	doc.activeLayer.appendBottom(secondPath);
	equals(secondPath.index < path.index, true);
});

test('moveAbove(item)', function() {
	var doc = new Doc();
	var path = new Path();
	var secondPath = new Path();
	path.moveAbove(secondPath);
	equals(doc.activeLayer.lastChild == path, true);
});

test('moveBelow(item)', function() {
	var doc = new Doc();
	var firstPath = new Path();
	var secondPath = new Path();
	equals(secondPath.index > firstPath.index, true);
	secondPath.moveBelow(firstPath);
	equals(secondPath.index < firstPath.index, true);
});

test('isDescendant(item) / isAncestor(item)', function() {
	var doc = new Doc();
	var path = new Path();
	equals(path.isDescendant(doc.activeLayer), true);
	equals(doc.activeLayer.isDescendant(path), false);

	equals(path.isAncestor(doc.activeLayer), false);
	equals(doc.activeLayer.isAncestor(path), true);
});

test('getPreviousSibling() / getNextSibling()', function() {
	var doc = new Doc();
	var firstPath = new Path();
	var secondPath = new Path();
	equals(firstPath.nextSibling == secondPath, true);
	equals(secondPath.previousSibling == firstPath, true);
	equals(secondPath.nextSibling == null, true);
});

test('hidden', function() {
	var doc = new Doc();
	var firstPath = new Path();
	firstPath.visible = false;
	equals(firstPath.hidden, true);
});