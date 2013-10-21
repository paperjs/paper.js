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

module('Multiple Projects View');

test('Two projects, same view', function() {
	var canvas = document.createElement("canvas");
	
	var view = new View(canvas);
	
	var first_project = new Project(view);
	var second_project = new Project(view);
	
	equals( second_project.view , first_project.view );
	
	equals( first_project.remove() , true );
	equals( second_project.remove() , true );
	equals( view.remove() , false );
});

