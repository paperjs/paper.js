### Added

- Add `Group#buffered`, also on layers: when a view draws a buffered group, it
  draws its content into a canvas that it keeps, and only draws into it again
  when something in the group changes or the view shows another part of it, so
  large groups that rarely change, such as a complex background below animated
  items, cost little to draw. Buffered groups are always isolated (#377).

