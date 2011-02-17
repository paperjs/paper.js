PathStyle = Base.extend(new function() {
	var keys = ['windingRule', 'resolution', 'strokeColor', 'strokeWidth',
			'strokeCap', 'strokeJoin', 'dashOffset','dashArray', 'miterLimit',
			'strokeOverprint', 'fillColor', 'fillOverprint'];

	var fields = {
		beans: true,

		initialize: function(item, style) {
			this.item = item;
			if(style) {
				for (var i = 0, l = keys.length; i < l; i++) {
					var key = keys[i];
					if(style[key])
						this[key] = style[key];
				}
			}
		},

		_setChildrenStyle: function(name, value) {
			for (var i = 0, l = this.item.children.length; i < l; i++) {
				this.item.children[i].style[name] = value;
			}
		},

		_getChildrenStyle: function(name) {
			var style;
			for (var i = 0, l = this.item.children.length; i < l; i++) {
				if(!style) {
					style = this.item.children[i].style[name];
				} else if(style != this.item.children[i].style[name]) {
					// If there is another item with a different style:
					return null;
				}
			}
			return style;
		}
	}

	var itemProps = { beans: true };

	Base.each(keys, function(key) {

		fields['set' + key.capitalize()] = function(value) {
			if(this.item && this.item.children) {
				this._setChildrenStyle(key, value);
			} else {
				this['_' + key] = value;
			}
		};

		fields['get' + key.capitalize()] = function() {
			if(this.item && this.item.children) {
				return this._getChildrenStyle(key);
			} else {
				return this['_' + key];
			}
		};

		itemProps['set' + key.capitalize()] = function(value) {
			this.style[key] = value;
		};

		itemProps['get' + key.capitalize()] = function() {
			return this.style[key];
		};
	});

	Item.inject(itemProps);

	return fields;
});