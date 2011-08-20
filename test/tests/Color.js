/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Color');

test('Set named color', function() {
	var path = new Path();
	path.fillColor = 'red';
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.toCssString(), 'rgba(255, 0, 0, 1)');
});

test('Set color to hex', function() {
	var path = new Path();
	path.fillColor = '#ff0000';
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.toCssString(), 'rgba(255, 0, 0, 1)');

	var path = new Path();
	path.fillColor = '#f00';
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.toCssString(), 'rgba(255, 0, 0, 1)');
});

test('Set color to object', function() {
	var path = new Path();
	path.fillColor = { red: 1, green: 0, blue: 1};
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 1));
	equals(path.fillColor.toCssString(), 'rgba(255, 0, 255, 1)');

	var path = new Path();
	path.fillColor = { gray: 0.2 };
	compareRGBColors(path.fillColor, new RGBColor(0.8, 0.8, 0.8));
	equals(path.fillColor.toCssString(), 'rgba(204, 204, 204, 1)');
});

test('Set color to array', function() {
	var path = new Path();
	path.fillColor = [1, 0, 0];
	compareRGBColors(path.fillColor, new RGBColor(1, 0, 0));
	equals(path.fillColor.toCssString(), 'rgba(255, 0, 0, 1)');
});

test('Creating colors', function() {

	compareRGBColors(new RGBColor('#ff0000'), new RGBColor(1, 0, 0),
			'RGBColor from hex code');

	compareRGBColors(new RGBColor({ red: 1, green: 0, blue: 1}),
			new RGBColor(1, 0, 1), 'RGBColor from rgb object literal');

	compareRGBColors(new RGBColor({ gray: 0.2 }),
			new RGBColor(0.8, 0.8, 0.8), 'RGBColor from gray object literal');

	compareRGBColors(new RGBColor({ hue: 0, saturation: 1, brightness: 1}),
			new RGBColor(1, 0, 0), 'RGBColor from hsb object literal');

	compareRGBColors(new RGBColor([1, 0, 0]), new RGBColor(1, 0, 0),
			'RGBColor from array');

	compareHSBColors(new HSBColor('#000000'), new HSBColor(0, 0, 0),
			'HSBColor from hex code');

	compareHSBColors(new HSBColor({ red: 1, green: 0, blue: 0}),
			new HSBColor(0, 1, 1), 'HSBColor from rgb object literal');

	compareHSBColors(new HSBColor({ gray: 0.8 }),
			new HSBColor(0, 0, 0.2), 'RGBColor from gray object literal');

	compareHSBColors(new HSBColor([1, 0, 0]), new HSBColor(1, 0, 0),
			'HSBColor from array');

	compareGrayColors(new GrayColor('#000000'), new GrayColor(1),
			'GrayColor from hex code');

	compareGrayColors(new GrayColor('#ffffff'), new GrayColor(0),
			'GrayColor from hex code');

	compareGrayColors(new GrayColor({ red: 1, green: 1, blue: 1}),
			new GrayColor(0), 'GrayColor from rgb object literal');

	compareGrayColors(new GrayColor({ gray: 0.2 }),
			new GrayColor(0.2), 'GrayColor from gray object literal');

	compareGrayColors(new GrayColor({ hue: 0, saturation: 0, brightness: 0.8}),
			new GrayColor(0.2), 'GrayColor from hsb object literal');

	compareGrayColors(new GrayColor([1]), new GrayColor(1),
			'GrayColor from array');
});

test('Get gray from RGBColor', function() {
	var color = new RGBColor(1, 0.5, 0.2);
	compareNumbers(color.gray, 0.38458251953125);

	var color = new RGBColor(0.5, 0.2, 0.1);
	compareNumbers(color.gray, 0.72137451171875);
});

test('Get gray from HSBColor', function() {
	var color = new HSBColor(0, 0, 0.2);
	compareNumbers(color.gray, 0.8);
});

test('Get red from HSBColor', function() {
	var color = new HSBColor(0, 1, 1);
	compareNumbers(color.red, 1);
});

test('Get hue from RGBColor', function() {
	var color = new RGBColor(1, 0, 0);
	compareNumbers(color.hue, 0);
	compareNumbers(color.saturation, 1);
});

test('Gray Color', function() {
	var color = new GrayColor(1);
	compareNumbers(color.gray, 1);
	compareNumbers(color.red, 0);

	color.red = 0.5;
	compareNumbers(color.gray, '0.84999');

	color.green = 0.2;
	compareNumbers(color.gray, '0.82051');
});

test('Converting Colors', function() {
	var rgbColor = new RGBColor(1, 0.5, 0.2);
	compareNumbers(new GrayColor(rgbColor).gray, 0.38299560546875);

	var grayColor = new GrayColor(0.2);
	var rgbColor = new RGBColor(grayColor);
	compareRGBColors(rgbColor, [ 0.8, 0.8, 0.8, 1]);

	var hsbColor = new HSBColor(grayColor);
	compareHSBColors(hsbColor, [ 0, 0, 0.8, 1]);

	var rgbColor = new RGBColor(1, 0, 0);
	compareHSBColors(new HSBColor(rgbColor), [0, 1, 1, 1]);
});

test('Setting RGBColor#gray', function() {
	var color = new RGBColor(1, 0.5, 0.2);
	color.gray = 0.1;
	compareRGBColors(color, [ 0.9, 0.9, 0.9, 1]);
});

test('Setting HSBColor#red', function() {
	var color = new HSBColor(180, 0, 0);
	color.red = 1;
	compareHSBColors(color, [0, 1, 1, 1]);
});

test('Setting HSBColor#gray', function() {
	var color = new HSBColor(180, 0, 0);
	color.gray = 0.5;
	compareHSBColors(color, [0, 0, 0.5, 1]);
});

test('Color.read(channels)', function() {
	var color = Color.read([0, 0, 1]);
	compareRGBColors(color, [0, 0, 1, 1]);
});

test('Cloning colors', function() {
	var color = new RGBColor(0, 0, 0);
	equals(function() {
		return color.clone() != color;
	}, true);

	equals(function() {
		return new RGBColor(color) != color;
	}, true);
});

test('Color#convert', function() {
	var color = new RGBColor(0, 0, 0);
	var converted = color.convert('rgb');
	equals(function() {
		return converted !== color;
	}, true);
	equals(function() {
		return converted.equals(color);
	}, true);
});

test('Saturation from black rgb', function() {
	equals(function() {
		return new RGBColor(0, 0, 0).saturation == 0;
	}, true);
});