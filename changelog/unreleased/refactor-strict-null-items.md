### Changed

- `Item#name` is `null` once cleared, as it is without a name, rather than `undefined`.

### Fixed

- `Item#addChildren()` and `Item#insertChildren()` insert all internal items they get, not only the first one, as these have no ids.
