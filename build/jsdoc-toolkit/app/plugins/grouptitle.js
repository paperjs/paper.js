JSDOC.PluginManager.registerPlugin(
	"JSDOC.grouptitle",
	{	
		beanSymbols: {},
		onSymbol: function(symbol) {
			var matches = symbol.desc.match(/\{@grouptitle ([^}]+)\}/),
				groupTitle;
			if (matches) {
				symbol.groupTitle = matches[1];
				symbol.desc = symbol.desc.replace(/\{@grouptitle ([^}]+)\}/, '');
			}
		}
	}
);