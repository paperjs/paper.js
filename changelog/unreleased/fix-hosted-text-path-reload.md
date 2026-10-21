### Fixed

- Keep the text path of hosted `PathText` and `AreaText` items when the host
  changes them: `Project#invalidate()` loads its new geometry into the path
  that scripts hold, which it replaced before.
