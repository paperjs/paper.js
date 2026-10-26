### Changed

- Run the library in strict mode, which makes `Path#getNearestPoint()` about
  14% and `Item#hitTest()` about 6% faster. PaperScript code still runs in
  sloppy mode.
