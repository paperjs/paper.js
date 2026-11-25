### Fixed

- Fix the declarations for apps that check them with strict settings and without `skipLibCheck`: they leave out the internal linked points, type the hit-tests of all items alike, and give the event handlers of items their own type, e.g. `this` in `raster.onLoad` is the Raster.
