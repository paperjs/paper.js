var TextField = this.TextField = Group.extend(
new function(){
	this.initialize = function( font, fontSize, bounds ){
		this.base();
		var frame = new Path.Rectangle( bounds );
		frame.strokeWidth = 1;
		frame.strokeColor = new RGBColor( 0, 255, 0 );
		this.addChild( frame );
		this._text = "ass";
		this._composer = new TextComposer( font, fontSize, bounds );
		this._font = font;
		this._fontSize = fontSize;
		this.bounds = bounds || new Rectangle();
	}

	this.getText = function(){
		return this._text;
	}

	this.setText = function( text ){
		this.removeChildren();
		this._text = text;
		this.addChildren( this._composer.composeText( this._text ) );
	}
});