var Glyph = this.Glyph = Group.extend( new function(){

	this.initialize = function( unicode, glyphName ){
		if( !unicode || !typeof unicode == "string"){
			console.log( arguments );
			throw new Error( "Glyph::need unicode charackter" );
		}
		this.base();
		this.remove();

		this._horizontalAdvance = null;

		this._verticalAdvance = null;
		this._verticalOrigin = new Point( 0, 0 );

		this._unicode = unicode;
		this._name = glyphName || "";
		this._instances = [];
		this._font = "";

		this._origin = new Point();

		this._debug = {};
		this._debug.hadv = new Path.Line( new Point(), new Point() );
		this._debug.center = new Path.Circle( new Point(), 10 );


		var de;
		for( var d in this._debug ){
			de = this._debug[ d ];
			de.strokeWidth = 1;
			de.strokeColor = new RGBColor( 255, 0, 0 );
			this.addChild( de );
		}
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
		this._debug.hadv.segments[1].point.x = ha;
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

	this.transform = function( matrix, apply ){
		this._origin = this._origin.transform( matrix )
		this.base( matrix, apply );
	}

	this.compile = function(){
		var r = new Rectangle( this.bounds );
		this._debug.c = new Path.Circle( r.center.clone(), 10 );
		this._debug.c.style = { strokeColor : new RGBColor( 255,0,0 ), strokeWidth : 3 };
		this.addChild( this._debug.c );

		this._origin = r.center.clone();

		this.scale( 1, -1 );
		this.apply();

		//if( this._unicode == "J" ){
		//console.log( r.center );
		//}
	/*
		var check = new Path.Rectangle( this.bounds );
		check.strokeWidth = 1;
		check.strokeColor = new RGBColor( 255, 0, 0 );
		this.addChild( check );

		var nc = new Path.Circle( this.position.clone(), 3 );
			nc.style = this._debug.center.style;
			this.addChild( nc );
*/
		//this.fitBounds( new Rectangle( new Point( 0, 0 ), new Point( this.bounds.width, this.bounds.height ) ) );

	}
});

var GlyphInstance = Group.extend(
new function(){
	this.statics = new function(){
		this.create = function( glyph, size ){
			var gi = new GlyphInstance();
			var font = glyph._font;
			var scale = Font.EM / font.unitsPerEM * size;
			

			for( var i = 0; i < glyph.children.length; i++ ){
				gi.addChild( glyph.children[ i ].clone() );
			}
			
			gi.scale( scale );
			gi.apply();
			gi.remove();

			gi._origin = new Point(
				glyph._origin.x * scale,
				glyph._origin.y * scale )

			gi._verticalAdvance = glyph._verticalAdvance * scale;


			var ha = ( glyph.horizontalAdvance == null ) ? 
				font.horizontalAdvance * scale : 
				glyph.horizontalAdvance * scale

			gi._horizontalAdvance = ha;

			var ho = new Point(
				font.horizontalOrigin.x * scale,
				font.horizontalOrigin.y * scale )

			gi._horizontalOrigin = ho;

			return gi;
		}
	}	
},
new function(){
	this.initialize = function(){
		this.base();
		this._verticalAdvance = 1;
		this._horizontalAdvance = 1;
		this._origin = new Point();
	}

	this.clone = function(){
		var ni = this.base();
		ni._verticalAdvance = this._verticalAdvance;
		ni._horizontalAdvance = this._horizontalAdvance;
		ni._horizontalOrigin = this._horizontalOrigin;
		ni._origin = this._origin;
		return ni;
	}

	this.getVerticalAdvance = function(){
		return this._verticalAdvance;
	}

	this.setPosition = function( point ){
		var nx = point.x + this._origin.x;
		var ny = point.y - this._origin.y;
		point = new Point( nx, ny );
		this.base( point )
	}

	this.getPosition = function(){
		return this.base();
	}

	this.getHorizontalAdvance = function(){
		return this._horizontalAdvance;
	}

	this.toString = function(){
		return "[Object GlyphInstance]";
	}
});