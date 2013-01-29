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

/** @scope _global_ */ {

// DOCS: Find a way to put this description into _global_

/**
 * In a PaperScript context, the global scope is populated with all
 * fields of the currently active {@link PaperScope} object. In a JavaScript
 * context, it only contains the {@link #paper} reference to the currently
 * active {@link PaperScope} object, which also exposes all Paper classes.
 */

/**
 * A reference to the currently active {@link PaperScope} object.
 *
 * @name paper
 * @property
 * @type PaperScope
 */

// DOCS: This does not work: @borrows PaperScope#version as _global_#version,
// so we're repeating documentation here form PaperScope:
/**
 * {@grouptitle Global PaperScope Properties (for PaperScript)}
 *
 * The currently active project.
 * @name project
 * @type Project
 */

/**
 * The list of all open projects within the current Paper.js context.
 * @name projects
 * @type Project[]
 */

/**
 * The reference to the active project's view.
 * @name view
 * @type View
 */

/**
 * The reference to the active tool.
 * @name tool
 * @type Tool
 */

/**
 * The list of available tools.
 * @name tools
 * @type Tool[]
 */

/**
 * {@grouptitle View Event Handlers (for PaperScript)}
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
 * {@grouptitle Mouse Event Handlers (for PaperScript)}
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
 * {@grouptitle Keyboard Event Handlers (for PaperScript)}
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
}