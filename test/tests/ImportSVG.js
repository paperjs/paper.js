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
*
* This test file created by Stetson-Team-Alpha
*/

module('ImportSVG');

test('Make a circle', function() 
{
	var svgDocument = evt.target.ownerDocument;
	var svgcircle = svgDocument.createElementNS(svgns, "circle");
	svgCircle.setAttributeNS(null, "cx", 25);
	svgCircle.setAttributeNS(null, "cy", 25);
	svgCircle.setAttributeNS(null, "r",  20);
	svgCircle.setAttributeNS(null, "fill", "green");
	var circle = new ImportSVG(svgCircle)
	equals(circle);
});
/
