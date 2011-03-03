var paper = {
	document: null,
	documents: [],

	install: function(scope) {
		for (var i in paper) {
			if (!scope[i])
				scope[i] = paper[i];
		}
	}
};
