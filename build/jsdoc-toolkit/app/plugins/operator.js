JSDOC.PluginManager.registerPlugin(
	"JSDOC.operator",
	{
		onSymbol: function(symbol) {
			var operators = symbol.comment.getTag('operator');
			if (operators.length) {
				symbol.operator = operators[0].desc;
			}
		}
	}
);