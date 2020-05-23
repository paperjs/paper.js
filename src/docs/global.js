/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name _global_
 * @namespace
 *
 * When code is executed as PaperScript, the script's scope is populated with
 * all fields of the currently active {@link PaperScope} object, which within
 * the script appear to be global.
 *
 * In a JavaScript context, only the {@link paper} variable is added to the
 * global scope, referencing the currently active {@link PaperScope} object,
 * through which all properties and Paper.js classes can be accessed.
 */
/** @scope _global_ */{

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
 * {@grouptitle Global PaperScript Properties}
 *
 * The project for which the PaperScript is executed.
 *
 * Note that when working with multiple projects, this does not necessarily
 * reflect the currently active project. For this, use
 * {@link PaperScope#project} instead.
 *
 * @name project
 * @type Project
 */

/**
 * The list of all open projects within the current Paper.js context.
 *
 * @name projects
 * @type Project[]
 */

/**
 * The reference to the project's view.
 *
 * Note that when working with multiple projects, this does not necessarily
 * reflect the view of the currently active project. For this, use
 * {@link PaperScope#view} instead.
 *
 * @name view
 * @type View
 * @readonly
 */

/**
 * The reference to the tool object which is automatically created when global
 * tool event handlers are defined.
 *
 * Note that when working with multiple tools, this does not necessarily
 * reflect the currently active tool. For this, use {@link PaperScope#tool}
 * instead.
 *
 * @name tool
 * @type Tool
 */

/**
 * The list of available tools.
 *
 * @name tools
 * @type Tool[]
 */

/**
 * {@grouptitle PaperScript View Event Handlers}
 * A global reference to the {@link View#onFrame} handler function.
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
 * {@grouptitle PaperScript Tool Event Handlers}
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
