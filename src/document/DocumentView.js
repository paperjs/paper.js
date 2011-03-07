/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved. See LICENSE file for details.
 */

var DocumentView = this.DocumentView = Base.extend({
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
		mx.scale(zoom / this._zoom, this._center);
		this.transform(mx);
		this._zoom = zoom;
	},

	scrollBy: function() {
		var point = Point.read(arguments).negate();
		var mx = new Matrix().translate(point);
		this.transform(mx);
	},

	transform: function(matrix, flags) {
		this.matrix.preConcatenate(matrix);
		this._bounds = null;
	},

	getBounds: function() {
		if (!this._bounds) {
			this._bounds = this.matrix.transformBounds(this.document.bounds);
		}
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
	}
});
