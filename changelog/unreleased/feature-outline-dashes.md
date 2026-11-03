### Added

- Add `PathItem#dash(options)`, which cuts the stroke of a path item into its
  dashes as the canvas draws them, from its `dashArray` and `dashOffset` or
  those of the options, and returns them as a group of open paths that keep
  the parts of their stroke profiles.
