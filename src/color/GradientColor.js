var GradientColor = this.GradientColor = Color.extend({
	beans: true,

	initialize: function(gradient, origin, destination, hilite) {
		this.gradient = gradient || new Gradient();
		this.origin = origin;
		this.destination = destination;
		if (hilite)
			this.hilite = hilite;
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
		var vector = hilite.subtract(this.origin);
		if (vector.length > this._radius) {
			this._hilite = this.origin.add(vector.normalize(
					this._radius - 0.1));
		} else {
			this._hilite = hilite;
		}
	},

	getCanvasStyle: function(ctx) {
		var gradient;
		if (this.gradient.type == 'linear') {
			gradient = ctx.createLinearGradient(this.origin.x, this.origin.y,
				this.destination.x, this.destination.y);
		} else {
			var origin = this.hilite || this.origin;
			gradient = ctx.createRadialGradient(origin.x, origin.y,
				0, this.origin.x, this.origin.y, this._radius);
		}
		for (var i = 0, l = this.gradient.stops.length; i < l; i++) {
			var stop = this.gradient.stops[i];
			gradient.addColorStop(stop.rampPoint, stop.color.toCssString());
		}
		return gradient;
	}
});
