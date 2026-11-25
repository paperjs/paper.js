### Changed

- `Item#children` is `null` for items without children, as `Item#firstChild` and `Item#lastChild` are, rather than `undefined`.

### Fixed

- `TextStory#replace()` without an `end` inserts the content at `start`, as documented.
