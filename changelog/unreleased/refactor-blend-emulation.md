### Changed

- Draw the CSS blend modes as `'normal'` in old browsers whose canvas doesn't
  support them, such as Internet Explorer and the old Edge, instead of
  emulating them pixel by pixel. Paper.js's own modes, such as `'add'`, are
  still emulated (#2350).

### Fixed

- Test which blend modes canvas supports natively the first time they're
  needed, rather than when Paper.js loads, so that hosts providing their canvas
  afterwards, such as an `OffscreenCanvas`, get their native modes.
