/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('TextItem');

test('PointText', function() {
	var text = new PointText({
		point: [100, 100],
		content: 'Hello World!'
	});
	equals(text.point, { x: 100, y: 100 });
	equals(text.fillColor, { red: 0, green: 0, blue: 0 }, 'text.fillColor should be black by default');
});
