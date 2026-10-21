### Changed

- Drop the code for browsers without current DOM APIs, which only old IE, Edge
  and WebKit needed: MS pointer events, `srcElement`, `toElement`,
  `keyIdentifier`, `backingStorePixelRatio`, and the exception of
  `getBoundingClientRect()` for nodes outside the DOM (#2350).
