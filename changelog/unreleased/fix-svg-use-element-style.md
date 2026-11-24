### Fixed

- Fix importing SVG `<use>` elements of an element with styles of its own, which the `<use>`'s styles replaced. As in SVG, the element now inherits them only where it sets none.
