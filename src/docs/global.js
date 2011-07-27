/** @scope _global_ */ {

/**
 * In a PaperScript context, the global scope is populated with all
 * fields of the currently active {@link PaperScope} object. In a JavaScript
 * context, it only contains the {@link #paper} reference to the currently
 * active {@link PaperScope} object, which also exposes all Paper classes.
 *
 * {@grouptitle PaperScript Global Properties}
 *
 * @borrows PaperScope#version as _global_#version
 */

/**
 * A reference to the currently active {@link PaperScope} object.
 *
 * @name paper
 * @property
 * @type PaperScope
 */

/**
 * {@grouptitle PaperScript View Event Handlers}
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
 * {@grouptitle PaperScript Mouse Event Handlers}
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
 * {@grouptitle PaperScript Keyboard Event Handlers}
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