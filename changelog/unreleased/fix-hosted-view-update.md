### Fixed

- Turn off `View#autoUpdate` when setting `Project#host`, as the host draws its
  items: drawing them would load them all in full on the first change.
