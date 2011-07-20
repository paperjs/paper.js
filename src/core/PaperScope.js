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

/**
 * @name PaperScope
 *
 * @class Internal PaperScope class that handles all the fields available on the
 * global paper object, which simply is a pointer to the currently active scope.
 *
 * @private
 */
var PaperScope = this.PaperScope = Base.extend(/** @scope _global_ */{
	/**
	 * The version of Paper.js, as a float number.
	 *
	 * @type Number
	 */
	version: VERSION,

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
		var res = PaperScript.evaluate(code, this);
		View.updateFocus();
		return res;
	},

	/**
	 * Sets up the scope for a standard project, by creating an empty
	 * {@link Project} object for us, along with a {@link View} for the passed
	 * canvas, both linked to this scope.
	 */
	setup: function(canvas) {
		// We need to set the global paper reference to this scope,
		// since that will be used in the Project constructor to set
		// internal references.
		paper = this;
		new Project();
		if (canvas) {
			// Activate the newly created view straight away
			new View(canvas).activate();
		}
	},

	/**
	 * Injects the paper scope into any other given scope. Can be used for
	 * examle to inject the currently active PaperScope into the window's global
	 * scope, to emulate PaperScript-style globally accessible Paper classes and
	 * objects:
	 *
	 * @example
	 * paper.install(window);
	 *
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

		/**
		 * Retrieves a PaperScope object with the given id or associated with
		 * the passed canvas element.
		 *
		 * @param id
		 * @ignore
		 */
		get: function(id) {
			// If a script tag is passed, get the id from it.
			if (typeof id === 'object')
				id = id.getAttribute('id');
			return this._scopes[id] || null;
		},

		/**
		 * A way to iterate over all active scopes without accessing _scopes
		 *
		 * @param iter
		 * @ignore
		 */
		each: function(iter) {
			Base.each(this._scopes, iter);
		}
	}
});
