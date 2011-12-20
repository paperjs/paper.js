// Override equals to convert functions to message and execute them as tests()
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
	// Let's be strict
	return strictEqual(actual, expected, message);
}

function test(testName, expected) {
	return QUnit.test(testName, function() {
		var project = new Project();
		expected();
		project.remove();
	});
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

function compareRgbColors(color1, color2, message) {
	color1 = new RgbColor(color1);
	color2 = new RgbColor(color2);

	compareNumbers(color1.red, color2.red,
			(message || '') + ' red');
	compareNumbers(color1.green, color2.green,
			(message || '') + ' green');
	compareNumbers(color1.blue, color2.blue,
			(message || '') + ' blue');
	compareNumbers(color1.alpha, color2.alpha,
			(message || '') + ' alpha');
}

function compareHsbColors(color1, color2, message) {
	color1 = new HsbColor(color1);
	color2 = new HsbColor(color2);

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

function compareGradientColors(gradientColor, gradientColor2, checkIdentity) {
	Base.each(['origin', 'destination', 'hilite'], function(key) {
		if (checkIdentity) {
			equals(function() {
				return gradientColor[key] != gradientColor2[key];
			}, true, 'Strict compare GradientColor#' + key);
		}
		equals(gradientColor[key].toString(), gradientColor2[key].toString(),
			'Compare GradientColor#' + key);
	});
	equals(function() {
		return gradientColor.gradient.equals(gradientColor2.gradient);
	}, true);
}

function comparePathStyles(style, style2, checkIdentity) {
	if (checkIdentity) {
		equals(function() {
			return style != style2;
		}, true);
	}
	Base.each(['fillColor', 'strokeColor'], function(key) {
		if (style[key]) {
			// The color should not point to the same color object:
			if (checkIdentity) {
				equals(function() {
					return style[key] !== style2[key];
				}, true, 'The ' + key + ' should not point to the same color object:');
			}
			if (style[key] instanceof GradientColor) {
				if (checkIdentity) {
					equals(function() {
						return style[key].gradient == style2[key].gradient;
					}, true, 'The ' + key + '.gradient should point to the same object:');
				}
				compareGradientColors(style[key], style2[key], checkIdentity);
			} else {
				equals(style[key].toString(), style2[key].toString(),
						'Compare PathStyle#' + key);
			}
		}
	});

	Base.each(['strokeCap', 'strokeJoin', 'dashOffset', 'miterLimit',
			'strokeOverprint', 'fillOverprint'], function(key) {
		if (style[key]) {
			equals(function() {
				return style[key] == style2[key];
			}, true, 'Compare PathStyle#' + key);
		}
	});

	if (style.dashArray) {
		equals(style.dashArray.toString(), style2.dashArray.toString(),
			'Compare CharacterStyle#dashArray');
	}
}

function compareObjects(name, keys, obj, obj2, checkIdentity) {
	if (checkIdentity) {
		equals(function() {
			return obj != obj2;
		}, true);
	}
	Base.each(keys, function(key) {
		equals(obj[key], obj2[key], 'Compare ' + name + '#' + key);
	});
}

function compareCharacterStyles(characterStyle, characterStyle2, checkIdentity) {
	compareObjects('CharacterStyle', ['fontSize', 'font'],
			characterStyle, characterStyle2, checkIdentity);
}

function compareParagraphStyles(paragraphStyle, paragraphStyle2, checkIdentity) {
	compareObjects('ParagraphStyle', ['justification'],
			paragraphStyle, paragraphStyle2, checkIdentity);
}

function compareSegmentPoints(segmentPoint, segmentPoint2, checkIdentity) {
	compareObjects('SegmentPoint', ['x', 'y', 'selected'],
			segmentPoint, segmentPoint2, checkIdentity);
}

function compareSegments(segment, segment2, checkIdentity) {
	if (checkIdentity) {
		equals(function() {
			return segment !== segment2;
		}, true);
	}
	equals(function() {
		return segment.selected == segment2.selected;
	}, true);
	Base.each(['handleIn', 'handleOut', 'point'], function(key) {
		compareSegmentPoints(segment[key], segment2[key]);
	});
}

function compareSegmentLists(segmentList, segmentList2, checkIdentity) {
	if (checkIdentity) {
		equals(function() {
			return segmentList !== segmentList2;
		}, true);
	}
	equals(segmentList.toString(), segmentList2.toString(),
			'Compare Item#segments');
	if (checkIdentity) {
		for (var i = 0, l = segmentList.length; i < l; i++) {
			var segment = segmentList[i],
				segment2 = segmentList2[i];
			compareSegments(segment, segment2, checkIdentity);
		}
	}
}

function compareItems(item, item2, checkIdentity) {
	if (checkIdentity) {
		equals(function() {
			return item != item2;
		}, true);

		equals(function() {
			return item.id != item2.id;
		}, true);
	}

	equals(function() {
		return item.constructor == item2.constructor;
	}, true);

	var itemProperties = ['opacity', 'locked', 'visible', 'blendMode', 'name',
	 		'selected', 'clipMask'];
	Base.each(itemProperties, function(key) {
		equals(item[key], item2[key], 'compare Item#' + key);
	});

	if (checkIdentity) {
		equals(function() {
			return item.bounds != item2.bounds;
		}, true);
	}

	equals(item.bounds.toString(), item2.bounds.toString(),
			'Compare Item#bounds');

	if (checkIdentity) {
		equals(function() {
			return item.position != item2.position;
		}, true);
	}

	equals(item.position.toString(), item2.position.toString(),
			'Compare Item#position');

	if (item.matrix) {
		if (checkIdentity) {
			equals(function() {
				return item.matrix != item2.matrix;
			}, true);
		}
		equals(item.matrix.toString(), item2.matrix.toString(),
				'Compare Item#matrix');
	}

	// Path specific
	if (item2 instanceof Path) {
		var keys = ['closed', 'fullySelected', 'clockwise', 'length'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			equals(item[key], item2[key], 'Compare Path#' + key);
		}
		compareSegmentLists(item.segments, item2.segments, checkIdentity);
	}

	// Group specific
	if (item instanceof Group) {
		equals(function() {
			return item.clipped == item2.clipped;
		}, true);
	}

	// Layer specific
	if (item instanceof Layer) {
		equals(function() {
			return item.project == item2.project;
		}, true);
	}

	// PlacedSymbol specific
	if (item instanceof PlacedSymbol) {
		equals(function() {
			return item.symbol == item2.symbol;
		}, true);
	}

	// Raster specific
	if (item instanceof Raster) {
		// TODO: remove access of private fields:
		if (item._canvas) {
			if (checkIdentity) {
				equals(function() {
					return item._canvas != item2._canvas;
				}, true);
			}
		}
		if (item._image) {
			equals(function() {
				return item._image == item2._image;
			}, true);
		}
		equals(item._size.toString(), item2._size.toString(),
				'Compare Item#size');
	}

	// TextItem specific:
	if (item instanceof TextItem) {
		equals(item.content, item2.content, 'Compare Item#content');
		compareCharacterStyles(item.characterStyle, item2.characterStyle,
				checkIdentity);
	}

	// PointText specific:
	if (item instanceof PointText) {
		if (checkIdentity) {
			equals(function() {
				return item.point != item2.point;
			}, true);
		}
		equals(item.point.toString(), item2.point.toString(),
				'Compare Item#point');
	}

	if (item.style) {
		// Path Style
		comparePathStyles(item.style, item2.style, checkIdentity);
	}

	// Check length of children and recursively compare them:
	if (item.children) {
		equals(function() {
			return item.children.length == item2.children.length;
		}, true);
		for (var i = 0, l = item.children.length; i < l; i++) {
			compareItems(item.children[i], item2.children[i], checkIdentity);
		}
	}
}
