### Changed

- `Curve#getCurvatureAtTime()` and `Curve#getCurvatureAt()` return `null` outside the curve, as the other `get…AtTime()` and `get…At()` methods do, instead of throwing.
- `Tool#minDistance`, `#maxDistance` and `#eventInterval` are `null` when not set, as documented, rather than `undefined`.
- Removed projects and tools keep their `scope`, but still can't be activated again.
- The load events of rasters whose image or canvas was loaded already are of type `'load'`, as the others are.
