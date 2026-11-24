### Changed

- Hosted projects list the items whose `data` a script changed in `Project#takeChanges()`, as attribute changes, also where it changed the object in place, so that hosts can write the data back. Only items whose data scripts reached are compared.
