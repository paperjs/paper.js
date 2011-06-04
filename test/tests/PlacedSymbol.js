module('Symbol & Placed Symbol');

test('placedSymbol bounds', function() {
	var path = new Path.Circle([50, 50], 50);
	path.strokeColor = 'black';
	path.strokeWidth = 1;
	path.strokeCap = 'round';
	path.strokeJoin = 'round';
	compareRectangles(path.strokeBounds,
		{ x: -0.5, y: -0.5, width: 101, height: 101 },
		'Path initial bounds.');
	var symbol = new Symbol(path);
	var placedSymbol = new PlacedSymbol(symbol);

	compareRectangles(placedSymbol.bounds,
		new Rectangle(-50.5, -50.5, 101, 101),
		'PlacedSymbol initial bounds.');

	placedSymbol.scale(1, 0.5);
	compareRectangles(placedSymbol.bounds,
		{ x: -50.5, y: -25.25, width: 101, height: 50.5 },
		'Bounds after scale.');

	placedSymbol.rotate(40);
	compareRectangles(placedSymbol.bounds,
		{ x: -42.04736, y: -37.91846, width: 84.09473, height: 75.83691 },
		'Bounds after rotation.');
});

test('Symbol definition selection', function() {
	var path = new Path.Circle([50, 50], 50);
	path.selected = true;
	var symbol = new Symbol(path);
	equals(function() {
		return symbol.definition.selected == false;
	}, true);
	equals(function() {
		return paper.project.selectedItems.length == 0;
	}, true);
});

test('Symbol#place()', function() {
	var path = new Path.Circle([50, 50], 50);
	var symbol = new Symbol(path);
	var placedSymbol = symbol.place();
	equals(function() {
		return placedSymbol.parent == paper.project.activeLayer;
	}, true);

	equals(function() {
		return placedSymbol.symbol == symbol;
	}, true);

	equals(function() {
		return placedSymbol.position.toString();
	}, '{ x: 0, y: 0 }');
});

test('Symbol#place(position)', function() {
	var path = new Path.Circle([50, 50], 50);
	var symbol = new Symbol(path);
	var placedSymbol = symbol.place(new Point(100, 100));
	equals(function() {
		return placedSymbol.position.toString();
	}, '{ x: 100, y: 100 }');
});
