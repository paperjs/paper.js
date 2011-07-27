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
 * @class The {@code PaperScope} class represents the scope associated with a
 * Paper context. When working with PaperScript, these scopes are automatically
 * created, and through clever scoping the fields and methods of the active
 * scope seem to become part of the global scope. When working with normal
 * JavaScript code, {@code PaperScope} objects need to be manually created and
 * handled.
 * Paper classes can only be accessed through {@code PaperScope} objects. Thus
 * in PaperScript they are global, while in JavaScript, they are available on
 * the global {@link paper} object, which is simply a reference to the currently
 * active {@code PaperScope}.
 */
var PaperScope = this.PaperScope = Base.extend(/** @lends PaperScope# */{

	/**
	 * Creates a PaperScope object and an empty {@link Project} for it. If a
	 * canvas is provided, it also creates a {@link View} for it.
	 * Both project and view are linked to this scope.
	 *
	 * @param {HTMLCanvasElement} canvas The canvas this scope should be
	 *        associated with.
	 */
	initialize: function(canvas, script) {
		// script is only used internally, when creating scopes for PaperScript.
		// Whenever a PaperScope is created, it automatically becomes the active
		// one.
		paper = this;
		this.views = [];
		this.view = null;
		this.projects = [];
		// Since the global paper variable points to this PaperScope, the
		// created project and view are automatically associated with it.
		this.project = new Project();
		this.tool = null;
		this.tools = [];
		var obj = script || canvas;
		this._id = obj && obj.getAttribute('id')
				|| script && script.src
				|| ('paperscope-' + (PaperScope._id++));
		// Make sure the script tag also has this id now. If it already had an
		// id, we're not changing it, since it's the first option we're
		// trying to get an id from above.
		if (script)
			script.setAttribute('id', this._id);
		PaperScope._scopes[this._id] = this;
		if (canvas) {
			// Create a view for the canvas.
			this.view = new View(canvas);
		}
	},

	/**
	 * The version of Paper.js, as a float number.
	 *
	 * @type Number
	 */
	version: /*#=*/ options.version,

	/**
	 * The currently active project.
	 * @name PaperScope#project
	 * @type Project
	 */

	/**
	 * The list of all open projects within the current Paper.js context.
	 * @name PaperScope#projects
	 * @type Project[]
	 */

	/**
	 * The active view of the active project.
	 * @name PaperScope#view
	 * @type View
	 */

	/**
	 * The list of view of the active project.
	 * @name PaperScope#views
	 * @type View[]
	 */

	/**
	 * The reference to the active tool.
	 * @name PaperScope#tool
	 * @type Tool
	 */

	/**
	 * The list of available tools.
	 * @name PaperScope#tools
	 * @type Tool[]
	 */

	evaluate: function(code) {
		var res = PaperScript.evaluate(code, this);
		View.updateFocus();
		return res;
	},

	/**
	 * Injects the paper scope into any other given scope. Can be used for
	 * examle to inject the currently active PaperScope into the window's global
	 * scope, to emulate PaperScript-style globally accessible Paper classes and
	 * objects:
	 *
	 * @example
	 * paper.install(window);
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
		delete PaperScope._scopes[this._id];
	},

	_needsRedraw: function() {
		// Make sure we're not looping through the view list each time...
		if (!this._redrawNotified) {
			for (var i = this.views.length - 1; i >= 0; i--)
				this.views[i]._redrawNeeded = true;
			this._redrawNotified = true;
		}
	},

	statics: /** @lends PaperScope */{
		_scopes: {},
		_id: 0,

		/**
		 * Retrieves a PaperScope object with the given id or associated with
		 * the passed canvas element.
		 *
		 * @param id
		 */
		get: function(id) {
			// If a script tag is passed, get the id from it.
			if (typeof id === 'object')
				id = id.getAttribute('id');
			return this._scopes[id] || null;
		},

		/**
		 * Iterates over all active scopes and calls the passed iterator
		 * function for each of them.
		 *
		 * @param iter the iterator function.
		 */
		each: function(iter) {
			Base.each(this._scopes, iter);
		}
	}
});
