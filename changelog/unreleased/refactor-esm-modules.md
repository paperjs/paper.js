### Changed

- Ship the ES modules as one file per module, so that bundlers leave out what an app doesn't use of `paper/core`, e.g. 15 KB for `Point` alone (#1844).
