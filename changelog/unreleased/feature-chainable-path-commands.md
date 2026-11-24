### Changed

- The drawing commands of paths and compound paths, such as `moveTo()`, `lineTo()`, `arcTo()` and `closePath()`, and `reverse()`, `flatten()` and `smooth()` return the path, so calls can be chained: `path.moveTo(0, 0).lineTo(10, 0).closePath()` (#605).
