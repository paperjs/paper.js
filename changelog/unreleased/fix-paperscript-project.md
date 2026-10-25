### Changed

- Make `PaperScope#project` an accessor, so that PaperScript uses the global
  `project` that `PaperScope#install()` defines, as it does with `view`, and
  both follow the active project when a script activates another one.
