### Added

- Add live effects, `Item#effects`: a stack of effects that derive what is
  drawn from an item without changing it, with `Effect` and its first types
  `OffsetEffect` and `OutlineEffect`, registered by type in `Effect.types`
  so that hosts can replace them. `Item#addEffect()`, `#insertEffect()`,
  `#removeEffect()` and `#removeEffects()` change them, `Item#previewBounds`
  measures their output, and SVG export writes it, while hit testing,
  `bounds` and `strokeBounds` stay with the item itself.
