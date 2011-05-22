JSDOC.PluginManager.registerPlugin(
	"JSDOC.bean",
	{	
		beanSymbols: {},
		onSymbol: function(symbol) {
			if (symbol.comment.getTag('bean').length) {
				var bean = symbol.name.match(/([^#]+#)(get|is)(([A-Z])(.*))$/);
				symbol.alias  = bean[1] + bean[4].toLowerCase() + bean[5];
				symbol.isa = "OBJECT";
				symbol.readOnly = true;
				this.beanSymbols[symbol.alias] = symbol;
			}
			var setter = symbol.name.match(/([^#]+#)(set)(([A-Z])(.*))$/);
			if (setter) {
				var getterName = setter[1] + setter[4].toLowerCase() + setter[5];
				var getter = this.beanSymbols[getterName];
				if (getter && getter.readOnly) {
					getter.readOnly = false;
				}
			}
		}
	}
);