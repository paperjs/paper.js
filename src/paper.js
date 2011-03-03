var paper = new Base().inject({
	document: null,
	documents: [],

	install: function(scope) {
		for (var i in paper) {
			scope[i] = paper[i];
		}
	}
});
