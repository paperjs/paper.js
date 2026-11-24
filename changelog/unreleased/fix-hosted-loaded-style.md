### Fixed

- Fix hosted items taking the project's current style when their content loads from the host: items had it for the properties the host's JSON leaves out, and a container that loaded after a script added items to it set it on them, as on new text with `currentTextStyle`.
