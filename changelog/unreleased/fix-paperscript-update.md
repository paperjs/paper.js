### Fixed

- Compile `++` and `--` in PaperScript to valid expressions wherever they
  appear, with the old value as the result of `a++` and `a--`, and update
  properties such as `a[f()]++` with their object and key evaluated once.
