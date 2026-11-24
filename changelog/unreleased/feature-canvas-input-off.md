### Added

- Add the canvas attribute `input="off"`, also as `data-paper-input="off"`, for views that don't handle the user's input: they install no listeners for the pointer and the keyboard, never take the keyboard's focus, and leave the browser's selection and touch callouts on the canvas as they are (#1491).
