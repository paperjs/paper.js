/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

/**
 * Define internal PaperScope class that handles all the fields available on the
 * global paper object, which simply is a pointer to the currently active scope.
 * @ignore
 */
var PaperScope = this.PaperScope = Base.extend(/** @scope _global_ */{
	/**
	 * The version of Paper.js, as a float number.
	 *
	 * @type Number
	 */
	version: 0.1,

	initialize: function(id) {
		/** @lends _global_# */

		/**
		 * The currently active project.
		 * @type Project
		 */
		this.project = null;

		/**
		 * The list of all open projects within the current Paper.js context.
		 * @type Project[]
		 */
		this.projects = [];

		/**
		 * The active view of the active project.
		 * @type View
		 */
		this.view = null;

		/**
		 * The active view of the active project.
		 * @type View
		 */
		this.views = [];

		/**
		 * The reference to the tool object.
		 * @type Tool
		 */
		this.tool = null;
		this.tools = [];
		this.id = id;
		PaperScope._scopes[id] = this;

		// DOCS: should the different event handlers be in here?
		/**
		 * {@grouptitle View Event Handlers}
		 * A reference to the {@link View#onFrame} handler function.
		 * 
		 * @name onFrame
		 * @property
		 * @type Function
		 */

		/**
		 * A reference to the {@link View#onResize} handler function.
		 * 
		 * @name onResize
		 * @property
		 * @type Function
		 */

		/**
		 * {@grouptitle Mouse Event Handlers}
		 * A reference to the {@link Tool#onMouseDown} handler function.
		 * @name onMouseDown
		 * @property
		 * @type Function
		 */

		/**
		 * A reference to the {@link Tool#onMouseDrag} handler function.
		 * 
		 * @name onMouseDrag
		 * @property
		 * @type Function
		 */

		/**
		 * A reference to the {@link Tool#onMouseMove} handler function.
		 * 
		 * @name onMouseMove
		 * @property
		 * @type Function
		 */

		/**
		 * A reference to the {@link Tool#onMouseUp} handler function.
		 * 
		 * @name onMouseUp
		 * @property
		 * @type Function
		 */

		/**
		 * {@grouptitle Keyboard Event Handlers}
		 * A reference to the {@link Tool#onKeyDown} handler function.
		 * 
		 * @name onKeyDown
		 * @property
		 * @type Function
		 */

		/**
		 * A reference to the {@link Tool#onKeyUp} handler function.
		 * 
		 * @name onKeyUp
		 * @property
		 * @type Function
		 */
	},

	evaluate: function(code) {
		return PaperScript.evaluate(code, this);
	},

	/**
	 * Installs the paper scope into any other given scope. Can be used for
	 * examle to inject the currently active PaperScope into the window's global
	 * scope, to emulate PaperScript-style globally accessible Paper classes:
	 * 
	 * paper.install(window);
	 * @ignore
	 */
	install: function(scope) {
		// Use scope as side-car (= 'this' inside iterator), and have it
		// returned at the end.
		return Base.each(this, function(value, key) {
			this[key] = value;
		}, scope);
	},

	clear: function() {
		// Remove all projects, views and tools.
		for (var i = this.projects.length - 1; i >= 0; i--)
			this.projects[i].remove();
		// This also removes the installed event handlers.
		for (var i = this.views.length - 1; i >= 0; i--)
			this.views[i].remove();
		for (var i = this.tools.length - 1; i >= 0; i--)
			this.tools[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this.id];
	},

	_needsRedraw: function() {
		// Make sure we're not looping through the view list each time...
		if (!this._redrawNotified) {
			for (var i = this.views.length - 1; i >= 0; i--)
				this.views[i]._redrawNeeded = true;
			this._redrawNotified = true;
		}
	},

	statics: {
		_scopes: {},

		get: function(id) {
			// If a script tag is passed, get the id from it.
			if (typeof id === 'object')
				id = id.getAttribute('id');
			return this._scopes[id] || null;
		}
	}
});
