### Changed

- Views handle the DOM's pointer events, instead of touch and mouse events picked by the browser's user agent, so a mouse or pen works on touch devices too (#1959). The events' names stay `mousedown`, `mousedrag` and so on.
- The native event of mouse and tool events, `event.event`, is a `PointerEvent`, with `pointerType`, `pressure`, `button` and `buttons` (#1354). Scripts that read its `touches` need to change.
- Views listen on their own element and capture the pointer while it is pressed, instead of listening on the document.
- Items and views receive `mouseleave` when a touch on them ends.

### Fixed

- Fix views receiving `mouseenter` again after every press and release.
- Fix drags ending when a second mouse button is released while the first one is still down (#1355).
