// Let's be strict

function equals(actual, expected, message) {
	if (typeof actual === 'function') {
		if (!message) {
			message = actual.toString().match(
				/^\s*function[^\{]*\{([\s\S]*)\}\s*$/)[1]
					.replace(/    /g, '')
					.replace(/^\s+|\s+$/g, '');
			if (/^return /.test(message)) {
				message = message
					.replace(/^return /, '')
					.replace(/;$/, '');
			}
		}
		actual = actual();
	}
	return strictEqual(actual, expected, message);
}

function compareNumbers(number1, number2, message) {
	if (number1 !== 0)
		number1 = Math.round(number1 * 100) / 100;
	if (number2 !== 0)
		number2 = Math.round(number2 * 100) / 100;
	equals(number1, number2, message);
}

function comparePoints(point1, point2, message) {
	compareNumbers(point1.x, point2.x,
			(message || '') + ' x');
	compareNumbers(point1.y, point2.y,
			(message || '') + ' y');
}

function compareRectangles(rect1, rect2, message) {
	compareNumbers(rect1.x, rect2.x,
			(message || '') + ' x');
	compareNumbers(rect1.y, rect2.y,
			(message || '') + ' y');
	compareNumbers(rect1.width, rect2.width,
			(message || '') + ' width');
	compareNumbers(rect1.height, rect2.height,
			(message || '') + ' height');
}

function compareRGBColors(color1, color2, message) {
	color1 = new RGBColor(color1);
	color2 = new RGBColor(color2);
	
	compareNumbers(color1.red, color2.red,
			(message || '') + ' red');
	compareNumbers(color1.green, color2.green,
			(message || '') + ' green');
	compareNumbers(color1.blue, color2.blue,
			(message || '') + ' blue');
	compareNumbers(color1.alpha, color2.alpha,
			(message || '') + ' alpha');
}

function compareHSBColors(color1, color2, message) {
	color1 = new HSBColor(color1);
	color2 = new HSBColor(color2);
	
	compareNumbers(color1.hue, color2.hue,
			(message || '') + ' hue');
	compareNumbers(color1.saturation, color2.saturation,
			(message || '') + ' saturation');
	compareNumbers(color1.brightness, color2.brightness,
			(message || '') + ' brightness');
	compareNumbers(color1.alpha, color2.alpha,
			(message || '') + ' alpha');
}

function compareGrayColors(color1, color2, message) {
	color1 = new GrayColor(color1);
	color2 = new GrayColor(color2);
	
	compareNumbers(color1.gray, color2.gray,
			(message || '') + ' gray');
}