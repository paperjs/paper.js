### Added

- Load the pixels of hosted rasters from their host on first access, through
  `host.getImage(key)`, which returns them as a canvas. Their size comes with
  their content, and they export without a source until their pixels load,
  see `Project#host`.
