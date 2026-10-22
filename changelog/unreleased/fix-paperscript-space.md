### Fixed

- Keep keywords apart from the expressions that PaperScript replaces right
  after them, as in minified code such as `return-1!=i`, which compiled to
  `return__$__(…)`.
