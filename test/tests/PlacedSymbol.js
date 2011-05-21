module('Placed Symbol');

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
