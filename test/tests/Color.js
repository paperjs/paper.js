/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Color');

test('Set named color', function() {
    var path = new Path();
    path.fillColor = 'red';
    compareColors(path.fillColor, new Color(1, 0, 0));
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)');
});

test('Set color to hex', function() {
    var path = new Path();
    path.fillColor = '#ff0000';
    compareColors(path.fillColor, new Color(1, 0, 0));
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)');

    var path = new Path();
    path.fillColor = '#f00';
    compareColors(path.fillColor, new Color(1, 0, 0));
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)');
});

test('Set color to object', function() {
    var path = new Path();
    path.fillColor = { red: 1, green: 0, blue: 1};
    compareColors(path.fillColor, new Color(1, 0, 1));
    equals(path.fillColor.toCSS(), 'rgb(255,0,255)');

    var path = new Path();
    path.fillColor = { gray: 0.2 };
    compareColors(path.fillColor, new Color(0.2));
    equals(path.fillColor.toCSS(), 'rgb(51,51,51)');
});

test('Set color to array', function() {
    var path = new Path();
    path.fillColor = [1, 0, 0];
    compareColors(path.fillColor, new Color(1, 0, 0));
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)');
});

test('Creating Colors', function() {
    compareColors(new Color(), new Color(0, 0, 0),
            'Color with no arguments should be black');

    compareColors(new Color('black'), new Color(0, 0, 0),
            'Color from name (black)');

    compareColors(new Color('red'), new Color(1, 0, 0),
            'Color from name (red)');

    compareColors(new Color('#ff0000'), new Color(1, 0, 0),
            'Color from hex code');

    compareColors(new Color('rgb(255, 0, 0)'), new Color(1, 0, 0),
            'Color from RGB code');

    compareColors(new Color('rgba(255, 0, 0, 0.5)'), new Color(1, 0, 0, 0.5),
            'Color from RGBA code');

    compareColors(new Color({ red: 1, green: 0, blue: 1}),
            new Color(1, 0, 1), 'Color from rgb object literal');

    compareColors(new Color({ gray: 0.2 }),
            new Color(0.2), 'Color from gray object literal');

    compareColors(new Color({ hue: 0, saturation: 1, brightness: 1}),
            new Color(1, 0, 0).convert('hsb'), 'Color from hsb object literal');

    compareColors(new Color([1, 0, 0]), new Color(1, 0, 0),
            'RGB Color from array');

    compareColors(new Color([1]), new Color(1),
            'Gray Color from array');
});

test('Deprecated Colors Constructors', function() {

    compareColors(new paper.RgbColor('#ff0000'), new Color(1, 0, 0),
            'Color from hex code');

    compareColors(new paper.RgbColor(1, 0, 1),
            new Color(1, 0, 1), 'Color from rgb object literal');

    compareColors(new paper.GrayColor(0.2),
            new Color(0.2), 'Color from gray object literal');

    compareColors(new paper.HsbColor(0, 1, 1),
            new Color(1, 0, 0).convert('hsb'), 'Color from hsb object literal');

    compareColors(new paper.RgbColor([1, 0, 0]), new Color(1, 0, 0),
            'Rgb Color from array');

    compareColors(new paper.GrayColor([1]), new Color(1),
            'Gray Color from array');
});

test('Get gray from RGB Color', function() {
    var color = new Color(1, 0.5, 0.2);
    equals(color.gray, 0.6152);

    var color = new Color(0.5, 0.2, 0.1);
    equals(color.gray, 0.27825);
});

test('Get gray from HSB Color', function() {
    var color = new Color({hue: 0, saturation: 0, brightness: 0.2 });
    equals(color.gray, 0.19998);
});

test('Get red from HSB Color', function() {
    var color = new Color({hue: 0, saturation: 1, brightness: 1 });
    equals(color.red, 1);
});

test('Get hue from RGB Color', function() {
    var color = new Color(1, 0, 0);
    equals(color.hue, 0);
    equals(color.saturation, 1);
});

test('Gray Color', function() {
    var color = new Color(1);
    equals(color.gray, 1, 'color.gray');
    equals(color.red, 1, 'color.red');
    equals(color.blue, 1, 'color.blue');

    color.red = 0.5;
    equals(color.gray, 0.85045, 'color.gray');

    color.green = 0.2;

    equals(color.red, 0.5, 'color.red');
    equals(color.green, 0.2, 'color.green');
    equals(color.blue, 1, 'color.blue');

    equals(color.gray, 0.38085, 'color.gray');
});

test('Converting Colors', function() {
    var rgbColor = new Color(1, 0.5, 0.2);
    equals(rgbColor.gray, 0.6152);
    var grayColor = new Color(0.2);
    compareColors(grayColor.convert('rgb'), new Color(0.2, 0.2, 0.2));
    compareColors(grayColor.convert('hsb'), { hue: 0, saturation: 0, brightness: 0.2 });
    compareColors(new Color(1, 0, 0).convert('hsb'), { hue: 0, saturation: 1, brightness: 1 });
});

test('Setting Color#gray', function() {
    var color = new Color(1, 0.5, 0.2);
    color.gray = 0.1;
    compareColors(color, new Color(0.1));
});

test('Setting Color#red', function() {
    var color = new Color({ hue: 180, saturation: 0, brightness: 0 });
    color.red = 1;
    compareColors(color, new Color(1, 0, 0));
});

test('Setting Color#gray', function() {
    var color = new Color({ hue: 180, saturation: 0, brightness: 0 });
    color.gray = 0.5;
    compareColors(color, new Color(0.5));
});

test('Color.read(channels)', function() {
    var color = Color.read([0, 0, 1]);
    compareColors(color, new Color(0, 0, 1));
});

test('Cloning colors', function() {
    var color = new Color(0, 0, 0);
    equals(function() {
        return color.clone() != color;
    }, true);

    equals(function() {
        return new Color(color) != color;
    }, true);
});

test('Color#convert', function() {
    var color = new Color(0, 0, 0);
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
        return new Color(0, 0, 0).saturation === 0;
    }, true);
});

test('Color#add', function() {
    var color = new Color(0, 1, 1);
    compareColors(color.add([1, 0, 0]), [1, 1, 1]);
    compareColors(color.add([1, 0.5, 0]), [1, 1.5, 1]);
    var color = new Color(0, 0.5, 0);
    compareColors(color.add(0.5), [0.5, 1, 0.5]);
});

test('Color#subtract', function() {
    var color = new Color(0, 1, 1);
    compareColors(color.subtract([0, 1, 1]), [0, 0, 0]);
    compareColors(color.subtract([0, 0.5, 1]), [0, 0.5, 0]);
    var color = new Color(1, 1, 1);
    compareColors(color.subtract(0.5), [0.5, 0.5, 0.5]);
});

test('Color#multiply', function() {
    var color = new Color(1, 0.5, 0.25);
    compareColors(color.multiply([0.25, 0.5, 1]), [0.25, 0.25, 0.25]);
    var color = new Color(1, 1, 1);
    compareColors(color.multiply(0.5), [0.5, 0.5, 0.5]);
    var color = new Color(0.5, 0.5, 0.5);
    compareColors(color.multiply(2), [1, 1, 1]);
});

test('Color#divide', function() {
    var color = new Color(1, 1, 1);
    compareColors(color.divide([1, 2, 4]), [1, 0.5, 0.25]);
    var color = new Color(1, 0.5, 0.25);
    compareColors(color.divide(0.25), [4, 2, 1]);
    var color = new Color(1, 1, 1);
    compareColors(color.divide(4), [0.25, 0.25, 0.25]);
});



