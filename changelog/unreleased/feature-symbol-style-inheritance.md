### Added

- Symbol items pass their style on to what their definition's content leaves unset, when drawing, measuring and hit-testing it, as SVG's `<use>` elements do: one definition can be placed in several colors (#1329). `SymbolItem#embed()` keeps these values in the copy.

### Fixed

- Fix importing SVG `<use>` elements of a `<symbol>`, whose style didn't reach the symbol's content, and export the content of symbols without the styles it leaves to its `<use>` elements (#1329).
