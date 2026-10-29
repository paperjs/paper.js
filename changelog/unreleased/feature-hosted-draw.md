### Added

- Call `Item#onDraw` and `Item#onDrawSelection` in hosted projects: hosts that
  draw the items themselves call `Project#draw()` to draw what the handlers
  draw, and ask `Project#hasDrawHandlers()` whether there are any.
