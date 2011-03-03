var PathStyle = Base.extend(new function() {
	var keys = ['windingRule', 'resolution', 'strokeColor', 'strokeWidth',
			'strokeCap', 'strokeJoin', 'dashOffset','dashArray', 'miterLimit',
			'strokeOverprint', 'fillColor', 'fillOverprint'];

	var fields = {
		beans: true,

		initialize: function(item, style) {
			this.item = item;
			if (style) {
				for (var i = 0, l = keys.length; i < l; i++) {
					var key = keys[i];
					if (style[key] !== undefined)
						this[key] = style[key];
				}
			}
		}
	};

	Item.inject(Base.each(keys, function(key) {

		var isColor = !!(key.match(/Color$/));
		fields['set' + key.capitalize()] = function(value) {
			if (this.item && this.item.children) {
				for (var i = 0, l = this.item.children.length; i < l; i++) {
					this.item.children[i].style[key] = value;
				}
			} else {
				this['_' + key] = isColor ? Color.read(arguments) : value;
			}
		};

		fields['get' + key.capitalize()] = function() {
			if (this.item && this.item.children) {
				var style;
				for (var i = 0, l = this.item.children.length; i < l; i++) {
					if (!style) {
						style = this.item.children[i].style[key];
					} else if (style != this.item.children[i].style[key]) {
						// If there is another item with a different style:
						// TODO: Shouldn't this be undefined instead? null often
						// has meaning for styles.
						return null;
					}
				}
				return style;
			} else {
				return this['_' + key];
			}
		};

		this['set' + key.capitalize()] = function(value) {
			this.style[key] = value;
		};

		this['get' + key.capitalize()] = function() {
			return this.style[key];
		};
	}, { beans: true }));

	return fields;
});