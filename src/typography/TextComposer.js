var TextComposer = this.TextComposer = Base.extend(
new function(){
	this.initialize = function( font, fontSize, frame ){
		this._cursor = new Point();
		this._font = font;
		this._fontSize = fontSize;
		this._frame = frame;
	}

	this.composeText = function( text ){
		this._cursor = new Point( 0, 0 );
		var glyphInstances = [];
		var gi;
		for( var i = 0; i < text.length; i++ ){
			gi = this._font.getGlyph( 
				text[ i ], this._fontSize );

			gi.position = this._cursor.clone();
			console.log( gi.horizontalAdvance );
			this._cursor = this._cursor.add( new Point( gi.horizontalAdvance, 0 ) );


			glyphInstances.push( gi );
		}
		return glyphInstances;
	}
});