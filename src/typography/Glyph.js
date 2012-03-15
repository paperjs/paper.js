var Glyph = this.Glyph = Group.extend( new function(){

	this.initialize = function( unicode, glyphName ){
		if( !unicode || !typeof unicode == "string"){
			console.log( arguments );
			throw new Error( "Glyph::need unicode charackter" );
		}
		this.base();
		this.remove();

		this._horizontalAdvance = -1;

		this._verticalAdvance = -1;
		this._verticalOrigin = new Point( 0, 0 );

		this._unicode = unicode;
		this._name = glyphName || "";
		this._instances = [];
		this._font = "";
	}

	this.toString = function(){
		return this._unicode;
	}

	this.setFont = function( f ){
		this._font = f;
	}

	this.getFont = function(){
		return this._font;
	}

	this.setHorizontalAdvance = function( ha ){
		this._horizontalAdvance = ha;
	}

	this.getHorizontalAdvance = function(){
		return this._horizontalAdvance;
	}

	this.setVerticalAdvance = function( va ){
		this._verticalAdvance = va;
	}

	this.getVerticalAdvance = function(){
		return this._verticalAdvance;
	}

	this.setVerticalOrigin = function( vo ){
		this._verticalOrigin = vo;
	}

	this.getVerticalOrigin = function(){
		return this._verticalOrigin;
	}

	this.getInstance = function( size ){
		return GlyphInstance.create( this, size );
	}
});

var GlyphInstance = Group.extend(
new function(){
	this.statics = new function(){
		this.create = function( glyph, size ){
			var gi = new GlyphInstance();
			var font = glyph._font.unitsPerEM
			var scale = Font.EM / font * size;

			for( var i = 0; i < glyph.children.length; i++ ){
				gi.addChild( glyph.children[ i ].clone() );
			}

			gi.scale( scale );
			gi.position = new Point( 
				glyph.verticalOrigin.x * scale,
				glyph.verticalOrigin.y * scale );
			gi.apply();
			gi.remove();

			gi._verticalAdvance = glyph._verticalAdvance * scale;


			var ha = ( glyph.horizontalAdvance < 0 ) ? 
				font.horizontalAdvance * scale : 
				glyph.horizontalAdvance * scale

			gi._horizontalAdvance = ha;
			return gi;
		}
	}	
},
new function(){
	this.initialize = function(){
		this.base();
		this._verticalAdvance = 1;
		this._horizontalAdvance = 1;
	}

	this.clone = function(){
		var ni = this.base();
		ni._verticalAdvance = this._verticalAdvance;
		ni._horizontalAdvance = this._horizontalAdvance;
		return ni;
	}

	this.getVerticalAdvance = function(){
		return this._verticalAdvance;
	}

	this.getHorizontalAdvance = function(){
		return this._horizontalAdvance;
	}

	this.toString = function(){
		return "[Object GlyphInstance glyph="+glyph+"]";
	}
});