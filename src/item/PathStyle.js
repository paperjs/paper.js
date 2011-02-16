new function() {
	var keys = ['windingRule', 'resolution', 'strokeColor',
		'strokeWidth', 'strokeCap', 'strokeJoin', 'dashOffset','dashArray',
		'miterLimit', 'strokeOverprint', 'fillColor', 'fillOverprint'];

	PathStyle = Base.extend({
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
			for(var i = 0, l = this.item.children.length; i < l; i++) {
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
	});

	var pathStyleProps = { beans: true };
	var itemProps = { beans: true };

	function addStyleBean(key) {
		pathStyleProps['set' + key.capitalize()] = function(value) {
			if(this.item && this.item.children) {
				this._setChildrenStyle(key, value);
			} else {
				this['_' + key] = value;
			}
		};
		pathStyleProps['get' + key.capitalize()] = function() {
			if(this.item && this.item.children) {
				return this._getChildrenStyle(key);
			} else {
				return this['_' + key];
			}
		};
	}

	function addItemBean(key) {
		itemProps['set' + key.capitalize()] = function(value) {
			this.style[key] = value;
		};
		itemProps['get' + key.capitalize()] = function() {
			return this.style[key];
		};
	}

	for (var i = 0, l = keys.length; i < l; i++) {
		var key = keys[i];
		addStyleBean(key);
		addItemBean(key);
	}
	PathStyle.inject(pathStyleProps);
	Item.inject(itemProps);
};