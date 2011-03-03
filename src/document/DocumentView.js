var DocumentView = Base.extend({
	beans: true,

	initialize: function(document) {
		this.document = document;
		this._bounds = this.document.bounds.clone();
		this.matrix = new Matrix();
		this._zoom = 1;
		this._center = this._bounds.center;
	},
	
	// TODO: test this.
	getCenter: function() {
		return this._center;
	},
	
	setCenter: function() {
		var center = Point.read(arguments);
		if (center) {
			var delta = center.subtract(this._center);
			this.scrollBy(delta);
			this._center = center;
		}
	},
	
	getZoom: function() {
		return this._zoom;
	},
	
	setZoom: function(zoom) {
		// TODO: clamp the view between 1/32 and 64?
		var mx = new Matrix();
		mx.scale(zoom / this._zoom, this.center);
		this.transform(mx);
		this._zoom = zoom;
	},
	
	scrollBy: function() {
		var point = Point.read(arguments).negate();
		var mx = new Matrix().translate(point);
		this.transform(mx);
	},
	
	getBounds: function() {
		return this._bounds;
	},
	
	// TODO:
	// setBounds: function(rect) {
	// 
	// },
	
	// TODO: getInvalidBounds
	// TODO: invalidate(rect)
	// TODO: style: artwork / preview / raster / opaque / ink
	// TODO: getShowGrid
	// TODO: getMousePoint
	// TODO: artworkToView(rect)
	artworkToView: function(point) {
		return this.matrix.transform(point);
	},
	
	viewToArtwork: function(point) {
		// TODO: cache the inverse matrix:
		return this.matrix.createInverse().transform(point);
	},
	
	// TODO: inherit this code somehow?
	transform: function(matrix, flags) {
		var width = this.document.bounds.width;
		var height = this.document.bounds.height;
		var x = width * -0.5;
		var y = height * -0.5;
		var coords = [
			x, y,
			x + width, y,
			x + width, y + height,
			x, y + height];
		this.matrix.preConcatenate(matrix);
		this.matrix.createInverse().transform(coords, 0, coords, 0, 4);
		var xMin = coords[0], xMax = coords[0];
		var yMin = coords[1], yMax = coords[1];
		for (var i = 2; i < 8; i += 2) {
			var x = coords[i];
			var y = coords[i + 1];
			xMin = Math.min(x, xMin);
			xMax = Math.max(x, xMax);
			yMin = Math.min(y, yMin);
			yMax = Math.max(y, yMax);
		};
		var bounds = this._bounds;
		bounds.x = xMin;
		bounds.y = yMin;
		bounds.width = xMax - xMin;
		bounds.height = yMax - yMin;
	}
});
