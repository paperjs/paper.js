### Fixed

- `new Rectangle({ right: 100, width: 50 })` and other object literals that describe a rectangle through its sides, corners or center with a width or height keep them, in any order, instead of ignoring them.
- Gradient stops given as objects without an `offset` spread evenly, as the other forms of stops do, instead of all lying at 0.
- `Gradient#equals()` compares `radial` too.
- `Segment#reverse()` returns the segment, as documented.
- `Curve#getPointAt()` and the other evaluators of curves take locations, as documented, not only offsets.
