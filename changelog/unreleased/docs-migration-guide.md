### Added

- Add `MIGRATION.md`, which lists the changes in 1.0 that can break existing code, with the old and the new form side by side.

### Removed

- Remove the getter and setter methods without arguments, such as `item.getPosition()` and `item.setPosition()`: use the properties, such as `item.position`. Getters with arguments, such as `item.getBounds(options)`, and predicates, such as `point.isZero()`, stay methods.
- Remove `paper.Symbol` and `paper.PlacedSymbol`, deprecated since 0.10: use `SymbolDefinition` and `SymbolItem`.
