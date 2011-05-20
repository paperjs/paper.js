test('Path#clone()', function() {
	var proj = paper.project;
	var path = new Path([10, 20], [30, 40]);
	path.closed = true;
	path.name = 'test';
	path.style = {
		strokeCap: 'round',
		strokeJoin: 'round',
		dashOffset: 10,
		dashArray: [10, 2, 10],
		fillColor: new RGBColor(0, 0, 1),
		strokeColor: new RGBColor(0, 0, 1),
		miterLimit: 5
	};
	path.clockwise = false;
	path.opacity = 0.5;
	path.locked = true;
	path.visible = false;
	path.blendMode = 'blend';
	path._clipMask = true;
	path.selected = true;
	cloneAndCompare(path);
});

test('CompoundPath#clone()', function() {
	var path1 = new Path.Rectangle([200, 200], [100, 100]);
	var path2 = new Path.Rectangle([50, 50], [200, 200]);
	var compound = new CompoundPath(path1, path2);
	cloneAndCompare(compound);
});

test('Layer#clone()', function() {
	var path = new Path.Rectangle([200, 200], [100, 100]);
	cloneAndCompare(paper.project.activeLayer);
});

test('Group#clone()', function() {
	var path = new Path.Circle([150, 150], 60);
	path.style = {
		strokeCap: 'round',
		strokeJoin: 'round',
		dashOffset: 10,
		dashArray: [10, 2, 10],
		fillColor: new RGBColor(0, 0, 1),
		strokeColor: new RGBColor(0, 0, 1),
		miterLimit: 5
	};
	var secondPath = new Path.Circle([175, 175], 85);
	var group = new Group([path, secondPath]);
	cloneAndCompare(group);
});

test('PointText#clone()', function() {
	var pointText = new PointText(new Point(50, 50));
	pointText.content = 'test';
	pointText.position += 100;
	pointText.characterStyle = {
		font: 'serif',
		fontSize: 20
	};
	pointText.paragraphStyle.justification = 'center';
	cloneAndCompare(pointText);
});

test('PlacedSymbol#clone()', function() {
	var path = new Path.Circle([150, 150], 60);
	var symbol = new Symbol(path);
	var placedSymbol = new PlacedSymbol(symbol);
	placedSymbol.position = [100, 100];
	placedSymbol.rotate(90);
	cloneAndCompare(placedSymbol);
});

test('Symbol#clone()', function() {
	var path = new Path.Circle([150, 150], 60);
	path.style = {
		strokeCap: 'round',
		strokeJoin: 'round',
		dashOffset: 10,
		dashArray: [10, 2, 10],
		fillColor: new RGBColor(0, 0, 1),
		strokeColor: new RGBColor(0, 0, 1),
		miterLimit: 5
	};
	path.selected = true;
	var symbol = new Symbol(path);
	var copy = symbol.clone();
	compareItems(symbol.definition, copy.definition);
	equals(function() {
		return symbol.project == copy.project;
	}, true);
	equals(function() {
		return paper.project.symbols.length == 2;
	}, true);
});