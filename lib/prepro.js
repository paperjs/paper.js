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

// Since loading prepro.js is also used further down to prevent inline scripts
// from executing right away, check that its actual code is only executed once.
if (!window.include) {
	// Determine the source of prepro.js, so we can use it to prevent inline
	// scripts from loading straight away.
	var scripts = document.getElementsByTagName('script');
	var script = scripts[scripts.length - 1];
	var src = script.getAttribute('src');
	var root = src.match(/^(.*\/)/)[1];

	window.include = function(url) {
		url = root + url;
		var newRoot = url.match(/^(.*\/)/)[1];
		// Load prepro.js again, just to prevent the setting of newRoot frome
		// executing straight away, and delaying it until right before the 
		// script at 'url' is loaded.
		document.write([
			'<script type="text/javascript" src="', src, '"></script>',
			// Set newRoot, so include() from 'url' load from the right place
			'<script type="text/javascript">root = "', newRoot, '";</script>',
			// Load the actual script
			'<script type="text/javascript" src="', url, '"></script>',
			// Set root back to the root before
			'<script type="text/javascript">root = "',  root, '";</script>'
		].join(''));
	}
}
