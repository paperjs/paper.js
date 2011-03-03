var paper = {
	document: null,
	documents: [],

	populate: function() {
		// Inject all prototypes from the paper scope into the paper object.
		Base.each(['Point', 'Size', 'Rectangle', 'Matrix', 'DocumentView',
			'Doc', 'Symbol', 'Item', 'Group', 'Layer', 'Raster', 'PlacedSymbol',
			'PathStyle', 'Segment', 'Curve', 'PathItem', 'Path', 'CompoundPath',
			'Color', 'RGBColor', 'GrayColor', 'GradientColor', 'Gradient',
			'GradientStop', 'ToolEvent', 'ToolHandler', 'Tool'],
			function(name) {
				paper[name] = eval(name);
			}
		);
	},

	install: function(scope) {
		for (var i in paper) {
			scope[i] = paper[i];
		}
	}
};
