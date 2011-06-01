var Operator = new function() {
	var operators = {
		add: '+', subtract: '-', multiply: '*', divide: '/', equals: '==',
		modulo: '%'
	};
	var operatorNames = {
		add: 'Addition', subtract: 'Subtraction', multiply: 'Multiplication',
		divide: 'Division', equals: 'Comparison', modulo: 'Modulo'
	};
	
	return {
		isOperator: function(symbol) {
			// As a convention, only add non static bean properties to
			// the documentation. static properties are all supposed to
			// be uppercase and constants.
			return symbol.params.length == 1 && !symbol.isStatic && (
					/^(add|subtract|multiply|divide|modulo)(\^[0-9])*$/.test(symbol.name)
					&& (symbol.operator != 'none')
				) || ( // equals
					symbol.name == 'equals'
					&& symbol.returns.length && symbol.returns[0].type == 'boolean'
				);
		},

		getOperator: function(symbol) {
			return operators[symbol.name.replace(/\^[0-9]$/,'')];
		}
	};
};