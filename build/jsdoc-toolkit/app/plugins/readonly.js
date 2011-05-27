JSDOC.PluginManager.registerPlugin(
	"JSDOC.readonly",
	{	
		onSymbol: function(symbol) {
			if (symbol.comment.getTag('readonly').length) {
				symbol.readOnly = symbol.comment.getTag('readonly')[0] != 'false';
			}
		}
	}
);