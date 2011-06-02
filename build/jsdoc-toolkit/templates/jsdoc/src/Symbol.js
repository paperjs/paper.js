JSDOC.Symbol.prototype.getId = function() {
	var id = this.isConstructor
			? [this.alias.replace(/([#].+$|[\^][0-9])/g, '').toLowerCase()
					.replace(/[.]/, '-')]
			: [this.name.toLowerCase().replace(/[\^][0-9]/g, '')];
	if (this.params) {
		for (var i = 0, l = this.params.length; i < l; i++) {
			var param = this.params[i];
			if (!param.isOptional)
				id.push(param.name);
		}
	}
	return id.join('-');
};

JSDOC.Symbol.prototype.getOwnMethods = function(param) {
	if (!param)
		param = {};
	return this.methods.filter(function($) {
		return $.memberOf == this.alias  && !$.isNamespace
				&& (param.operators ? $.isOperator : !$.isOperator)
				&& (param.constructors ? $.isConstructor : !$.isConstructor)
				&& (param.statics ? $.isStatic : !$.isStatic);
	}, this);
};

JSDOC.Symbol.prototype.getOperators = function() {
	return this.getOwnMethods({
		operators: true
	});
};

JSDOC.Symbol.prototype.getStaticMethods = function() {
	return this.getOwnMethods({
		statics: true
	});
};

JSDOC.Symbol.prototype.getConstructors = function() {
	return [this].concat(this.getOwnMethods({
		constructors: true
	}));
};

JSDOC.Symbol.prototype.getProperties = function(param) {
	if (!param)
		param = {};
	return this.properties.filter(function($) {
		return $.memberOf == this.alias && !$.isNamespace && !$.isConstructor
				&& (param.statics ? $.isStatic : !$.isStatic);
	}, this);
};

JSDOC.Symbol.prototype.getStaticProperties = function() {
	return this.getProperties({
		statics: true
	});
};

JSDOC.Symbol.prototype.getInheritedClasses = function() {
	var inheritedClasses = {};
	var addInherited = function(symbol) {
		if (symbol.memberOf != this.alias) {
			var _class = inheritedClasses[symbol.memberOf];
			if (!_class) {
				_class = inheritedClasses[symbol.memberOf] = {
					className: symbol.memberOf,
					properties: [],
					methods: []
				};
			}
			_class[symbol.isa == "OBJECT" ? 'properties' : 'methods'].push(symbol);
		}
	};
	this.properties.map(addInherited, this);
	this.methods.map(addInherited, this);
	return inheritedClasses;
};