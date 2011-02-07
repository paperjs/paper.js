SegmentList = Array.extend({
	initialize: function(path) {
		this.length = 0;
		this.path = path;
	},
	push: function() {
		this.base.apply(this, arguments);
		this.path.listChanged();
	}
});