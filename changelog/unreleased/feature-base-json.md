### Added

- Keep `Base.exportJSON(value, options)` and `Base.importJSON(json)` from 0.x, for values that aren't items, such as plain objects holding points and colors. Items that `Base.importJSON()` creates aren't inserted, except for layers.
