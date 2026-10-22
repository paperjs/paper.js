### Added

- Pass the import attributes of `import … with { … }`, `export … from … with
  { … }` and `import(specifier, { with: { … } })` in PaperScript on to the
  loader in `options.load` of `PaperScript.execute()`, as its third argument.
