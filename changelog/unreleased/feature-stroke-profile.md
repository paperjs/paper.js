### Added

- Add stroke profiles to paths, `Path#strokeProfile`: stops along the path
  that set the pen of its stroke, an ellipse with a width as a factor of the
  stroke width, an aspect and an angle, with `StrokeProfileStop` and
  `Path#getStrokeProfileAt(offset)`. The stops stay between the same segments
  when the path is edited, and `splitAt()` and `join()` keep the pens of the
  parts. Drawing, bounds and hit-testing don't follow the profile yet.
