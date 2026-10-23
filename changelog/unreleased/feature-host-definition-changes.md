### Added

- Log the changes of symbol and pattern definitions in
  `Project#takeChanges()`, as `{ definition, flags }`.
- Add `SymbolDefinition#name` and `PatternDefinition#name`, which JSON keeps.
- Add `Project#patternDefinitions`, the patterns that the items use.
- Let scripts create definitions in hosted projects: `takeChanges()` lists the
  new ones that items use first, the host gives them their `key`, and
  `symbolDefinitions` and `patternDefinitions` list all of the host's
  definitions through `host.getDefinitionKeys(type)`, see `Project#host`.
