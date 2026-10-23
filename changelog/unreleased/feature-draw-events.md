### Added

- Add `Item#onDraw` and `Item#onDrawSelection`, which are called right before
  an item, or its selection, is drawn, and draw beneath it with the canvas API
  or replace it by returning `false`.
