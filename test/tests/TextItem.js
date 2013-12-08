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
		fontFamily: 'Arial',
		fontWeight: 'Regular',
		fontSize: 14,
		point: [100, 100],
		content: 'Hello World!'
	});
	equals(text.fillColor, { red: 0, green: 0, blue: 0 }, 'text.fillColor should be black by default');
	equals(text.point, { x: 100, y: 100 });
	equals(text.bounds.point, { x: 100, y: 87.4 });
	equals(function() {
		return text.hitTest(text.bounds.center) != null;
	}, true);
});
