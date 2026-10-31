### Added

- Add `ToolEffect`, a live effect that draws paths with a mouse tool, as if
  by hand along them, with a speed that slows down in turns and changes with
  an acceleration, and with the same random numbers each time it applies.
  `new ToolEffect({ type, parameters, tool })` takes a `Tool` or its
  handlers, whose events also have the `path` and the `effect` instance.
