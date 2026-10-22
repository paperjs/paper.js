### Added

- Share pattern and symbol definitions between the items of hosted projects:
  the JSON of hosted items refers to them as `['@key']`, which
  `host.getDefinition(key)` loads once, items export them as references to
  their keys again, and `Project#invalidate()` reloads the ones listed in
  `columns.definitions` into the same objects, see `Project#host`.

### Changed

- Write the definition of symbol items to JSON as `definition` instead of
  `symbol`. JSON that writes it as `symbol` still loads.
