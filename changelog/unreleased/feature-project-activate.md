### Added

- Add `Project#onActivate` and `Project#onDeactivate`, as tools have them,
  for the events that `Project#activate()` emits, and `Project.onActivate`
  and `Project.onDeactivate` for those of all projects, including new ones.

### Changed

- Emit `deactivate` when the active project or tool is removed.
