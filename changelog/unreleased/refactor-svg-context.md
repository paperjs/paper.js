### Fixed

- Fix `exportSVG()` called during another export, e.g. from `processNode()`, which cleared the state of the other export and made it fail.
