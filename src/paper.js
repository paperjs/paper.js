this.document = null;
this.documents = [];

this.install = function(scope) {
	for (var i in this) {
		scope[i] = this[i];
	}
};
