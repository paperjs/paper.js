function compareSegmentLists(list1, list2) {
	equals(list1.length, list2.length, 'segment count');
	if (list1.length == list2.length) {
		for (var i = 0, l = list1.length; i < l; i++) {
			compareSegments(list1[i], list2[i]);
		}
	}
}

function compareSegments(segment1, segment2) {
	// Convert comparison value through Segment.read, to not have to provide
	// all handles all the time.
	segment2 = Segment.read([segment2]);
	var points = ['point', 'handleIn', 'handleOut'];
	for (var i = 0; i < 3; i++) {
		equals(!!segment1[points[i]], !!segment2[points[i]],
				'have ' + points[i]);
		if (segment1[points[i]] && segment2[points[i]])
			comparePoints(segment1[points[i]], segment2[points[i]], points[i]);
	}
}

function compareNumbers(number1, number2, message) {
	if(number1 !== 0)
		number1 = Math.round(number1 * 100) / 100;
	if(number2 !== 0)
		number2 = Math.round(number2 * 100) / 100;
	equals(number1, number2, message);
}

function comparePoints(point1, point2, message) {
	compareNumbers(point1.x, point2.x, message ? message + ' x' : undefined);
	compareNumbers(point1.y, point2.y, message ? message + ' y' : undefined);
}

function compareRectangles(rect1, rect2, message) {
	compareNumbers(rect1.x, rect2.x, message ? message + ' x' : undefined);
	compareNumbers(rect1.y, rect2.y, message ? message + ' y' : undefined);
	compareNumbers(rect1.width, rect2.width,
				message ? message + ' width' : undefined);
	compareNumbers(rect1.height, rect2.height,
				message ? message + ' height' : undefined);
}

function compareRGBColors(color1, color2, message) {
	color1 = new RGBColor(color1);
	color2 = new RGBColor(color2);
	
	compareNumbers(color1.red, color2.red,
				message ? message + ' red' : undefined);
	compareNumbers(color1.green, color2.green,
				message ? message + ' green' : undefined);
	compareNumbers(color1.blue, color2.blue,
				message ? message + ' blue' : undefined);
	compareNumbers(color1.alpha, color2.alpha,
				message ? message + ' alpha' : undefined);
}

function compareHSBColors(color1, color2, message) {
	color1 = new HSBColor(color1);
	color2 = new HSBColor(color2);
	
	compareNumbers(color1.hue, color2.hue,
			message ? message + ' hue' : undefined);
	compareNumbers(color1.saturation, color2.saturation,
			message ? message + ' saturation' : undefined);
	compareNumbers(color1.brightness, color2.brightness,
			message ? message + ' brightness' : undefined);
	compareNumbers(color1.alpha, color2.alpha,
			message ? message + ' alpha' : undefined);
}

function compareGrayColors(color1, color2, message) {
	color1 = new GrayColor(color1);
	color2 = new GrayColor(color2);
	
	compareNumbers(color1.gray, color2.gray,
			message ? message + ' gray' : undefined);
}