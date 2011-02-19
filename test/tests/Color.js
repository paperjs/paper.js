module('RGB Color');

test('Set named color', function() {
	var doc = new Doc();
	var path = new Path();
	path.fillColor = 'red';
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.getCssString(), 'rgba(255, 0, 0, 1)');
});

test('Set color to hex', function() {
	var doc = new Doc();
	var path = new Path();
	path.fillColor = '#ff0000';
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.getCssString(), 'rgba(255, 0, 0, 1)');

	var path = new Path();
	path.fillColor = '#f00';
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.getCssString(), 'rgba(255, 0, 0, 1)');
});

test('Set color to object', function() {
	var doc = new Doc();
	var path = new Path();
	path.fillColor = { red: 1, green: 0, blue: 1};
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 1));
	equals(path.fillColor.getCssString(), 'rgba(255, 0, 255, 1)');

	var path = new Path();
	path.fillColor = { gray: 0.2 };
	compareRGBColors(path.fillColor, new RGBColor(0.8, 0.8, 0.8));
	equals(path.fillColor.getCssString(), 'rgba(204, 204, 204, 1)');
});

test('Set color to array', function() {
	var doc = new Doc();
	var path = new Path();
	path.fillColor = [1, 0, 0];
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.getCssString(), 'rgba(255, 0, 0, 1)');
});

test('Get gray from RGBColor', function() {
	var color = new RGBColor(1, 0.5, 0.2);
	compareNumbers(color.gray, 0.38458251953125);

	var color = new RGBColor(0.5, 0.2, 0.1);
	compareNumbers(color.gray, 0.72137451171875);
});

test('Gray Color', function() {
	var color = new GrayColor(1);
	compareNumbers(color.gray, 1);
	compareNumbers(color.red, 1);
	
	color.red = 0.5;
	compareNumbers(color.gray, '0.84999');

	color.green = 0.2;
	compareNumbers(color.gray, '0.82051');
});

test('Converting Colors', function() {
	var color = new RGBColor(1, 0.5, 0.2);
	compareNumbers(new GrayColor(color).gray, 0.38299560546875);
	
	var color = new GrayColor(0.2);
	var rgbColor = new RGBColor(color);
	compareRGBColors(rgbColor, [ 0.8, 0.8, 0.8, 1 ]);
});