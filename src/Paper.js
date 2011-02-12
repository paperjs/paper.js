Paper = Base.extend({
	statics: {
		documents: [],
		activateDocument: function(doc) {
			var index = this.documents.indexOf(doc);
			if(index != -1)
				this.document = this.documents[index];
		}
	}
});