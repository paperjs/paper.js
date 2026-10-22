### Changed

- Draw items with opacity, blend modes or shadows about twice as fast, by
  reusing small temporary canvases that are large enough without resizing
  them, which reallocates their pixels (#377).
