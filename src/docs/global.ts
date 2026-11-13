/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * When code is executed as PaperScript, the script's scope is populated with
 * all fields of the currently active {@link PaperScope} object, which within
 * the script appear to be global.
 *
 * In a JavaScript context, only the {@link paper} variable is added to the
 * global scope, referencing the currently active {@link PaperScope} object,
 * through which all properties and Paper.js classes can be accessed.
 *
 * @module Global Scope
 */
// The globals that PaperScript code sees, declared for the reference's Global
// Scope page only: nothing imports this module.
import type { PaperScope } from '../scope/PaperScope.ts'
import type { Project } from '../item/Project.ts'
import type { View } from '../view/View.ts'
import type { Tool } from '../tool/Tool.ts'

type Handler = (event: any) => void

/**
 * A reference to the currently active {@link PaperScope} object.
 */
export declare const paper: PaperScope

// DOCS: These repeat the documentation of PaperScope's members:
/**
 * {@grouptitle Global PaperScript Properties}
 *
 * The project for which the PaperScript is executed.
 *
 * Note that when working with multiple projects, this does not necessarily
 * reflect the currently active project. For this, use
 * {@link PaperScope#project} instead.
 */
export declare const project: Project

/**
 * The list of all open projects within the current Paper.js context.
 */
export declare const projects: Project[]

/**
 * The reference to the project's view.
 *
 * Note that when working with multiple projects, this does not necessarily
 * reflect the view of the currently active project. For this, use
 * {@link PaperScope#view} instead.
 *
 * @readonly
 */
export declare const view: View

/**
 * The reference to the tool object which is automatically created when global
 * tool event handlers are defined.
 *
 * Note that when working with multiple tools, this does not necessarily
 * reflect the currently active tool. For this, use {@link PaperScope#tool}
 * instead.
 */
export declare const tool: Tool

/**
 * The list of available tools.
 */
export declare const tools: Tool[]

/**
 * {@grouptitle PaperScript View Event Handlers}
 * A global reference to the {@link View#onFrame} handler function.
 */
export declare let onFrame: Handler

/**
 * A reference to the {@link View#onResize} handler function.
 */
export declare let onResize: Handler

/**
 * {@grouptitle PaperScript Tool Event Handlers}
 * A reference to the {@link Tool#onMouseDown} handler function.
 */
export declare let onMouseDown: Handler

/**
 * A reference to the {@link Tool#onMouseDrag} handler function.
 */
export declare let onMouseDrag: Handler

/**
 * A reference to the {@link Tool#onMouseMove} handler function.
 */
export declare let onMouseMove: Handler

/**
 * A reference to the {@link Tool#onMouseUp} handler function.
 */
export declare let onMouseUp: Handler

/**
 * {@grouptitle Keyboard Event Handlers (for PaperScript)}
 * A reference to the {@link Tool#onKeyDown} handler function.
 */
export declare let onKeyDown: Handler

/**
 * A reference to the {@link Tool#onKeyUp} handler function.
 */
export declare let onKeyUp: Handler
