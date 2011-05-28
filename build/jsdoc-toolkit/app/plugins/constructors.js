JSDOC.PluginManager.registerPlugin(
	"JSDOC.constructors",
	{	
		beanSymbols: {},
		onSymbol: function(symbol) {
			// If the method name is 'initialize', or it is a static method
			// with a capitalized first character,  it is a constructor
			if (/(#initialize|\.[A-Z][a-z][^#.]+$)/.test(symbol.alias)) {
				symbol.isConstructor = true;
				symbol.isa = 'FUNCTION';
			}
		}
	}
);