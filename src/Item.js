Item = Base.extend({
	beans: true,
	initialize: function() {
		this.parent = Paper.document.activeLayer;
		this.parent.children.push(this);
	},
	
	/**
	 * Specifies whether the item is locked.
	 * 
	 * Sample code:
	 * <code>
	 * var path = new Path();
	 * print(path.locked) // false
	 * path.locked = true; // Locks the path
	 * </code>
	 * 
	 * @return {@true if the item is locked}
	 */
	
	locked: false,
	
	/**
	 * Specifies whether the item is visible.
	 * 
	 * Sample code:
	 * <code>
	 * var path = new Path();
	 * print(path.visible) // true
	 * path.visible = false; // Hides the path
	 * </code>
	 * 
	 * @return {@true if the item is visible}
	 */
	
	visible: true,
	
	/**
	 * The opacity of the item.
	 * 
	 * Sample code:
	 * <code>
	 * // Create a circle at position { x: 10, y: 10 } 
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * 
	 * // Change the opacity of the circle to 50%:
	 * circle.opacity = 0.5;
	 * </code>
	 * 
	 * @return the opacity of the item as a value between 0 and 1.
	 */
	
	opacity: 1,
	
	/**
	 * Specifies whether the item is hidden.
	 * 
	 * Sample code:
	 * <code>
	 * var path = new Path();
	 * print(path.hidden); // false
	 * path.hidden = true; // Hides the path
	 * </code>
	 * 
	 * @return {@true if the item is hidden}
	 * 
	 * @jshide
	 */
	
	isHidden: function() {
		return !this.visible;
	},
	
	setHidden: function(hidden) {
		this.setVisible(!hidden);
	},
	
	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 * 
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * group.appendChild(path);
	 * group.clipped = true;
	 * path.clipMask = true;
	 * </code>
	 * 
	 * @return {@true if the item defines a clip mask}
	 */
	isClipMask: function() {
		return this.clipMask;
	},
	
	setClipMask: function(clipMask) {
		this.clipMask = clipMask;
		if(this.clipMask) {
			this.fillColor = null;
			this.strokeColor = null;
		}
	},
	
	/**
	 * The first item contained within this item.
	 */
	getFirstChild: function() {
		if(this.children.length > 0)
			return this.children[0];
	},

	/**
	 * The last item contained within this item.
	 */
	getLastChild: function() {
		if(this.children.length > 0)
			return this.children[this.children.length - 1];
	},
	
	/**
	 * The next item on the same level as this item.
	 */
	getNextSibling: function() {
		if(this.parent) {
			var index = this.index + 1;
			if(index < this.parent.children.length)	
				return this.parent.children[index];
		}
	},

	/**
	 * The previous item on the same level as this item.
	 */
	getPreviousSibling: function() {
		if(this.parent) {
			var index = this.index - 1;
			if(index <= 0)	
				return this.parent.children[index];
		}
	},

	/**
	 * The index of this item within the list of it's parent's children.
	 */
	getIndex: function() {
		return this.parent.children.indexOf(this);
	},
	
	/**
	* Removes the item from its parent's children list.
	*/
	removeFromParent: function() {
		if(this.parent)
			this.parent.children.splice(this.index, 1);
	},
	
	/**
	* Removes the item.
	*/	
	remove: function() {
		this.removeFromParent();
	},
	
	/**
	 * {@grouptitle Hierarchy Operations}
	 * 
	 * Inserts the specified item as a child of the item by appending it to the
	 * list of children and moving it above all other children. You can use this
	 * function for groups, compound paths and layers.
	 * 
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * var path = new Path();
	 * group.appendTop(path);
	 * print(path.isDescendant(group)); // true
	 * </code>
	 * 
	 * @param item The item that will be appended as a child
	 */
	appendTop: function(item) {
		item.removeFromParent();
		this.children.push(item);
		item.parent = this;
		item.document = this.document;
	},
	
	/**
	 * Inserts the specified item as a child of this item by appending it to the
	 * list of children and moving it below all other children. You can use this
	 * function for groups, compound paths and layers.
	 * 
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * var path = new Path();
	 * group.appendBottom(path);
	 * print(path.isDescendant(group)); // true
	 * </code>
	 * 
	 * @param item The item that will be appended as a child
	 */
	appendBottom: function(item) {
		item.removeFromParent();
		this.children.splice(0, 0, item);
		item.parent = this;
		item.document = this.document;
	},
	
	/**
	 * A link to {@link #appendTop}
	 * 
	 * @deprecated use {@link #appendTop} or {@link #appendBottom} instead.
	 */
	appendChild: function(item) {
		return this.appendTop(item);
	},
	
	/**
	 * Moves this item above the specified item.
	 * 
	 * Sample code:
	 * <code>
	 * var firstPath = new Path();
	 * var secondPath = new Path();
	 * print(firstPath.isAbove(secondPath)); // false
	 * firstPath.moveAbove(secondPath);
	 * print(firstPath.isAbove(secondPath)); // true
	 * </code>
	 * 
	 * @param item The item above which it should be moved
	 * @return true if it was moved, false otherwise
	 */
	moveAbove: function(item) {
		// first remove the item from its parent's children list
		this.removeFromParent();
		item.parent.children.splice(item.index + 1, 0, this);
		this.parent = item.parent;
		this.document = item.document;
		return true;
	},
	
	/**
	 * Moves the item below the specified item.
	 * 
	 * Sample code:
	 * <code>
	 * var firstPath = new Path();
	 * var secondPath = new Path();
	 * print(secondPath.isBelow(firstPath)); // false
	 * secondPath.moveBelow(firstPath);
	 * print(secondPath.isBelow(firstPath)); // true
	 * </code>
	 * 
	 * @param item the item below which it should be moved
	 * @return true if it was moved, false otherwise
	 */
	moveBelow: function(item) {
		// first remove the item from its parent's children list
		this.removeFromParent();
		item.parent.children.splice(item.index - 1, 0, this);
		this.parent = item.parent;
		this.document = item.document;
		return true;
	},
	
	
	// TODO: this is confusing the beans
	// isParent: function(item) {
	// 	return this.parent == item;
	// },
	
	isChild: function(item) {
		return item.parent == this;
	},
	
	/**
	 * Checks if the item is contained within the specified item.
	 * 
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * var path = new Path();
	 * group.appendTop(path);
	 * print(path.isDescendant(group)); // true
	 * </code>
	 * 
	 * @param item The item to check against
	 * @return {@true if it is inside the specified item}
	 */
	isDescendant: function(item) {
		var parent = this, isDescendant = false;
		while(parent = parent.parent) {
			if(parent.children.indexOf(item) != -1) {
				isDescendant = true;
				break;
			}
		}
		return isDescendant;
	}
});