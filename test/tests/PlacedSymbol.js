module('Placed Symbol');

test('placedSymbol bounds', function() {
	var doc = new Document();
	var path = new Path.Circle([50, 50], 50);
	path.strokeWidth = 1;
	path.strokeCap = 'round';
	path.strokeJoin = 'round';
	compareRectangles(path.strokeBounds,
		{ x: -0.5, y: -0.5, width: 101, height: 101 },
		'Path initial bounds.');
	var symbol = new Symbol(path);
	var placedSymbol = new PlacedSymbol(symbol);
	
	// These tests currently fail because we haven't implemented
	// Item#strokeBounds yet.
	compareRectangles(placedSymbol.bounds,
		new Rectangle(-50.5, -50.5, 101, 101),
		'PlacedSymbol initial bounds.');
	
	placedSymbol.scale(0.5);
	compareRectangles(placedSymbol.bounds,
		{ x: -25.25, y: -25.25, width: 50.5, height: 50.5 },
		'Bounds after scale.');
	
	placedSymbol.rotate(40);
	compareRectangles(placedSymbol.bounds,
		{ x: -25.50049, y: -25.50049, width: 51.00098, height: 51.00098 },
		'Bounds after rotation.');
});