JSDOC.PluginManager.registerPlugin(
	"JSDOC.ignore",
	{	
		onSymbol: function(symbol) {
			if (symbol.comment.getTag('ignore').length) {
				symbol.ignore = true;
			}
		}
	}
);