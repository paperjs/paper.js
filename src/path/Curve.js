var Curve = Base.extend({
	initialize: function() {
	},

	statics: {
		read: function(args, index, length) {
			var index = index || 0, length = length || args.length - index;
			if (length == 1 && args[index] instanceof Curve) {
				return args[index];
			} else if (length != 0) {
				var curve = new Curve(Curve.dont);
				curve.initialize.apply(curve, index > 0
						? Array.prototype.slice.call(args, index) : args);
				return curve;
			}
			return null;
		}
	}
});
