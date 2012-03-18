var Font = this.Font = Base.extend(
new function(){
	this.statics = new function(){

	this.EM = 16;
	(function(){
		window.onload = function(){
			var d = document.createElement( "div" );
			d.innerHTML = "M";
			d.setAttribute( "style", 
				"font-size:1em;"+
				"line-height:1;"+
				"position:absolute;"+
				"top:0px;"+
				"left:0px;"+
				"color:#00ff00;"+
				"padding:0px;"+
				"margin:0px;"+
				"visibility:hidden;" );
			document.getElementsByTagName( "body" )[ 0 ]
				.appendChild( d );

			EM = d.offsetHeight;
			document.getElementsByTagName( "body" )[ 0 ]
				.removeChild( d );
		}
	})();

	}
},
new function(){

	this.initialize = function(){
		this._glyphs = {};
		this._altGlyphs = {};
		this._missingGlyph = null;
		this._glyphCount = 0;
		this._name = "";
		this._family = "";
		this._kerning = {};
		this._unitsPerEm = 1000;
		this._ascent = 1;
		this._descend = 1;

		this._horizontalOrigin = new Point( 0, 0 );
		this._horizontalAdvance = 1;

		this._verticalOrigin = new Point( 0, 0 );
		this._verticalAdvance = 1;

		this._cache = {};
	};

	this.toString = function(){
		return "[Object Font name="+this.name+"]";
	}

	this.setName = function( name ){
		this._name = name;
	}

	this.getName = function(){
		return this._name;
	}

	this.setFamily = function( family ){
		this._family = family;
	}

	this.getFamily = function( ){
		return this._family;
	}

	this.addGlyph = function( glyph ){
		if( !this._glyphs.hasOwnProperty( glyph ) ){
			this._glyphs[ glyph ] = glyph;
			glyph.font = this;
			this._glyphCount++;
		}
		return glyph;
	}

	this.setMissingGlyph = function( mGlyph ){
		this._missingGlyph = mGlyph;
		mGlyph.font = this;
		this._glyphCount++
		return mGlyph;
	}

	this.getMissingGlyph = function(){
		return this._missingGlyph;
	}

	this.addAltGlyph = function( altGlyph ){
		console.log( "code needed here" );
	}

	this.setHorizontalAdvance = function( ha ){
		this._horizontalAdvance = ha;
	}

	this.getHorizontalAdvance = function(){
		return this._horizontalAdvance;
	}


	this.setHorizontalOrigin = function( point ){
		if( !point instanceof Point ){
			throw new Error( "Font::horizontal origin must "+
				"be of type Point" );
		}
		this._horizontalOrigin = point;
	}

	this.getHorizontalOrigin = function(){
		return this._horizontalOrigin;
	}

	this.setVerticalAdvance = function( va ){
		this._verticalAdvance = va;
	}

	this.getVerticalAdvance = function(){
		return this._verticalAdvance;
	}

	this.setVerticalOrigin = function( vo ){
		if( !vo instanceof Point ){
			throw new Error( "Font::Vertical Origin must be "+
				"of type Point" );
		}
		this._verticalOrigin = vo;
	}

	this.getVerticalOrigin = function(){
		return this._verticalOrigin;
	}

	this.setUnitsPerEM = function( upem ){
		this._unitsPerEm = upem;
	}

	this.getUnitsPerEM = function(){
		return this._unitsPerEm;
	}

	this.setAscent = function( a ){
		this._ascent = a;
	}

	this.getAscent = function( a ){
		return this._ascent;
	}

	this.setDescent = function( d ){
		this._descend = d;
	}

	this.getDescent = function(){
		return this._descend;
	}

	this.addKerningPair = function( glyphA, glyphB, value ){
		if( !this._kerning.hasOwnProperty( glyphA.unicode ) ){
			this._kerning[ glyphA.unicode ] = [];
		}

		this._kerning[ glyphA.unicode ].push({ 
			"glyphB" : glyphB.unicode,
			"k" : value } );
	}

	this.getGlyphcount = function(){
		return this._glyphCount;
	}

	this.getGlyph = function( unicode, size ){
		var g, unicode;
		if( this._glyphs.hasOwnProperty( unicode ) ){
			g = this._glyphs[ unicode ];
		
		} else {
			g = this._missingGlyph;

		}
		if( !this._cache.hasOwnProperty( unicode ) ){
			this._cache[ unicode ] = {};
		}
		if( !this._cache[ unicode ].hasOwnProperty( size ) ){
			this._cache[ unicode ][ size ] = g.getInstance( size );
		}
		return this._cache[ unicode ][ size ].clone();
	}

	this.getGlyphsFromString = function( string, size ){
		var index = 0;
		var g = [];
		var s;
		var isLigature = true;

		for( var i = 0; i < string.length; i++ ){
			s = string[ i ];
			isLigature = true;
			while( isLigature ){
				if( this._glyphs.hasOwnProperty( ( s + string[ i + 1 ] ) ) ){
					s += string[ ++i ];
				
				} else {
					isLigature = false;
				}
			}
			g.push( this.getGlyph( s, size ) );
		}
		return g;
	}

	this.compile = function(){
		for( var g in this._glyphs ){
			this._glyphs[ g ].compile();
		}
	}
});