var TextComposer = this.TextComposer = Base.extend(
new function(){
	this.initialize = function( font, fontSize, frame ){
		this._cursor = new Point( 0, 100 );
		this._font = font;
		this._fontSize = fontSize;
		this._frame = frame;
	}

	this.composeText = function( text ){
		var glyphInstances = 
			this._font.getGlyphsFromString( text, this._fontSize );

		var gi;
		for( var i = 0; i < glyphInstances.length; i++ ){
			gi = glyphInstances[ i ];
			gi.position = this._cursor.clone();
			//gi.position.y = 100;
			this._cursor = this._cursor.add( new Point( gi.horizontalAdvance, 0 ) );
		}
		return glyphInstances;
	}
});