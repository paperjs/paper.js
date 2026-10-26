### Changed

- Let hosted linked text that moves into a project with another host bring a
  copy of its story along, which flows on through the items that stay, and let
  each insertion or copy into such a project bring its own copies of the host's
  definitions (#2462, #2463).

### Fixed

- Leave items that moved to another project out of `Project#takeChanges()`,
  which listed their earlier changes.
