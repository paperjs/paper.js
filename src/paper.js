var paper = {
	document: null,
	documents: [],

	populate: function() {
		// Inject all prototypes from the paper scope into the paper object.
		// return this so build.js can use 'return paper.populate()'.
		return Base.each(['Point', 'Size', 'Rectangle', 'Matrix', 'DocumentView',
			'Doc', 'Symbol', 'Item', 'Group', 'Layer', 'Raster', 'PlacedSymbol',
			'PathStyle', 'Segment', 'Curve', 'PathItem', 'Path', 'CompoundPath',
			'Color', 'RGBColor', 'GrayColor', 'GradientColor', 'Gradient',
			'GradientStop', 'ToolEvent', 'ToolHandler', 'Tool'],
			function(name) {
				this[name] = eval(name);
			}, this);
	},

	install: function(scope) {
		for (var i in paper) {
			if (!scope[i])
				scope[i] = paper[i];
		}
	}
};
