### Changed

- `Item#pivot` is read and written in the coordinates of the item's parent, as `position` and `bounds` are, and keeps moving along with the item as it is transformed. Nothing changes for items that apply their matrix, such as paths and groups by default. Scripts that set the pivot of a `Shape`, `Raster`, `SymbolItem`, text or an item with `applyMatrix: false` in the item's own coordinates need to convert it with `localToGlobal()` (#1272).

### Fixed

- Fix `Path#toShape()` of paths with a pivot, which created the shape around the pivot instead of the path's center.
- Fix copies of items, results of boolean operations and other items built from one with a pivot, which kept it in the wrong coordinates where the item had a matrix.
