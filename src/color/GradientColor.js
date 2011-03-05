var GradientColor = this.GradientColor = Color.extend({
	beans: true,

	initialize: function(gradient, origin, destination, hilite) {
		this.gradient = gradient || new Gradient();
		this.setOrigin(origin);
		this.setDestination(destination);
		if (hilite)
			this.setHilite(hilite);
	},

	getOrigin: function() {
		return this._origin;
	},

	setOrigin: function() {
		this._origin = Point.read(arguments);
		if (this._destination)
			this._radius = this._destination.getDistance(this._origin);
	},

	getDestination: function() {
		return this._destination;
	},

	setDestination: function() {
		this._destination = Point.read(arguments);
		this._radius = this._destination.getDistance(this._origin);
	},

	getHilite: function() {
		return this._hilite;
	},

	setHilite: function() {
		var hilite = Point.read(arguments);
		var vector = hilite.subtract(this._origin);
		if (vector.length > this._radius) {
			this._hilite = this._origin.add(vector.normalize(
					this._radius - 0.1));
		} else {
			this._hilite = hilite;
		}
	},

	getCanvasStyle: function(ctx) {
		var gradient;
		if (this.gradient.type == 'linear') {
			gradient = ctx.createLinearGradient(this._origin.x, this._origin.y,
				this.destination.x, this.destination.y);
		} else {
			var origin = this._hilite || this._origin;
			gradient = ctx.createRadialGradient(origin.x, origin.y,
				0, this._origin.x, this._origin.y, this._radius);
		}
		for (var i = 0, l = this.gradient._stops.length; i < l; i++) {
			var stop = this.gradient._stops[i];
			gradient.addColorStop(stop._rampPoint, stop.color.toCssString());
		}
		return gradient;
	}
});
