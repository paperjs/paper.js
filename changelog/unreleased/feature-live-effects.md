### Added

- Add live effects, `Item#effects`: a stack of effects that derive what is
  drawn from an item without changing it. `new Effect({ type, label,
  category, parameters, onApply })` defines an effect and registers it under
  its type, replacing any effect registered there, so that hosts can replace
  the first effects `offset` and `outline`, and `Effect.get()`,
  `Effect.getAll()` and `Effect.remove()` look them up and remove them.
  Items use them through `EffectInstance` objects with the declared
  parameters as properties, created by `Item#addEffect()` and
  `#insertEffect()` from `{ type, parameters, visible }`, and removed by
  `#removeEffect()` and `#removeEffects()`. `Item#previewBounds` measures
  their output, and SVG export writes it, while hit testing, `bounds` and
  `strokeBounds` stay with the item itself.
