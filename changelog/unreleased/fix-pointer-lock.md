### Fixed

- Fix mouse moves not being reported while the pointer is locked to a view's canvas with `requestPointerLock()`: the point then moves by the pointer's movement, also beyond the view (#1802).
