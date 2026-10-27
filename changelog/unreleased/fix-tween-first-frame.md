### Fixed

- Count the duration of `Item#tween()` from the first frame, which tweens
  skipped when its time was 0, so they took one frame longer.
