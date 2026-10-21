### Added

- Add the `processNode` option to `#exportSVG()` and the `processItem` option
  to `#importSVG()`: callbacks that receive `{ item, node }` for each exported
  item with its SVG node and each imported SVG element with its item, and can
  return a replacement, e.g. to keep the SVG `class` attribute in `Item#data`
  (#1843).

### Changed

- Apply the `data-*` attributes of imported SVG elements to `Item#data` before
  calling the `processItem` callback of `#importSVG()`, so that it can extend
  the data, instead of after it, which replaced the data that it stored. Items
  that the callback returns as replacements no longer receive the data.

### Deprecated

- The undocumented `onExport(item, node, options)` and
  `onImport(node, item, options)` options of `#exportSVG()` and
  `#importSVG()`, replaced by `processNode` and `processItem`.

### Fixed

- Only call the import callback of `#importSVG()` for SVG elements, not also
  for the document of SVG strings, which received the item of its root element
  a second time.
