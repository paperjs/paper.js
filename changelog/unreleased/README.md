# Unreleased changes

Each pull request adds its changelog entries here, in a file of its own named
after its branch, e.g. `fix-2344.md`, under the headings of their kind in the
format of [`CHANGELOG.md`](../../CHANGELOG.md):

```md
### Fixed

- Fix `Curve#strokeBounds` of curves without a path, which threw (#2344).
```

The kinds are `Added`, `Changed`, `Deprecated`, `Removed` and `Fixed`, and
rarely `News` and `Security`. On release, `gulp publish` collects the files
into the section of the new version and deletes them, so that pull requests
don't conflict in `CHANGELOG.md`.
