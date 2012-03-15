/*
	@author Philipp Schmidt
	this class is a import wrapper for SVG-Font-Elements
*/
var SVGImportFontItem = SVGImportItem.extend( new function(){
	this.initialize = function( element, importer ){
		this.base( element, importer );
		this.font = this.processFont();
		this.glyphs = [];
		this.glyphItems = {};
	}

	this.toString = function(){
		return "[Object SVGImportFontItem]"
	}

	this.getCategory = function(){
		return "font";
	}

	this.addChild = function( c ) {
		var ret = this;

		if( c === this ){
			return this;
		}

		if( this.canAppend ){
			this.base( c );
			ret = c;
		}
		
		
		return ret;
	}

	this.getNextItem = function( e ){
		var ret = null;
		if( this.isOfCategory( e ) ){
			switch( e.nodeName.toLowerCase() ){
				case "font-face" :
					this.processFontFace( e );
					break;

				case "glyph" :
					ret = this.processGlyph( e );
					break;
			
				case "missing-glyph":
					ret = this.processMissingGlyph( e );
					break;

				default :
					ret = this;
					break;
			}
		}
		return ret;
	}

	this.getImports = function(){
		return this.font;
	}

	this.finalize = function(){
		
	}
},
new function(){
	this.processAltGlyph = function(){
		return new Glyph();
	}

	this.processFont = function(){
		var font = new Font();
		var e = this.e;

		try{

			font.horizontalAdvance = 
				SVGImportItem.getAttr( 
					e, "horiz-adv-x", "float", 1 );

			var hox = SVGImportItem.getAttr( 
				e, "horiz-origin-x", "float", 0 );

			var hoy = SVGImportItem.getAttr(
				e, "horiz-origin-x", "float", 0 )
		
			font.horizontalOrigin = new Point( hox, hoy );

			font.verticalAdvance = SVGImportItem.getAttr(
				e, "vert-adv-y", "float", 1 );

			var vox = SVGImportItem.getAttr( 
				e, "ver-origin-x", "float", 
					font.horizontalAdvance / 2 );

			var voy = SVGImportItem.getAttr( 
				e, "ver-origin-y", "float", font.ascent );

			font.verticalOrigin = new Point( vox, voy );


		} catch( err ){
			throw new Error( "FontImport::import Error of Font tag" );
		}

		return font;
	}

	this.processFontFace = function( e ){
		try {
			this.font.unitsPerEM = SVGImportItem.getAttr( 
				e, "units-per-em", "float", 1000 );
	

			this.font.setAscent( SVGImportItem.getAttr( 
				e, "ascent", "float", 
					this.font.unitsPerEM - this.font.verticalOrigin.y ) );
		
			this.font.descent = SVGImportItem.getAttr(
				e, "dscent", "float", this.font.verticalOrigin.y );

			this.font.family = SVGImportItem.getAttr(
				e, "font-family", "string", this.importer.url );

		} catch( err ){
			throw new Error( "FontImport::import Error "+
				"of font-face tag" );
		}
	}

	this.processFontFaceFormat = function(){}
	this.processFontFaceName = function(){}
	this.processFontFaceSrc = function(){}
	this.processFontFaceUri  = function(){}

	this.processGlyph = function( e, missing ){
		var glyph, name, unicode, importItem;

		name = e.getAttribute( "glyph-name" );
		unicode = e.getAttribute( "unicode" );
		glyph = new Glyph( unicode, name );
		configureGlyph.call( this, e, glyph );
		importItem = makeGlyphGraphics.call( this, e );
		
		try{
			glyph.insertChild( 0, importItem.getImports() );
		}catch( err ){
			console.log( err.message+" @unicode: "+unicode );
		}

		this.glyphs.push( importItem );
		this.font.addGlyph( glyph );
		return importItem;
	}

	this.processHKern = function(){}

	this.processMissingGlyph = function( e ){
		var glyph = new Glyph( "missing", "missing" );
		var importItem = makeGlyphGraphics.call( this, e );
		configureGlyph.call( this, e, glyph );
		this.font.missingGlyph = glyph;
		try{
			glyph.insertChild( 0, importItem.getImports() );
		} catch( err ){
			console.log( "hallo" );
		}
		return importItem;
	}
	this.processVKern = function(){}

	function makeGlyphGraphics( e ){
		var inner, outer, path, importItem;

		outer = document.createElementNS( 
			SVGImporter.SVG_NS, "g" );
		
		if( this.e.hasAttribute( "transform" ) ){
			outer.setAttribute( 
				"transform", this.e.getAttribute( "transform" ) );
		}

		inner = document.createElementNS(
			SVGImporter.SVG_NS, "g" );
		
		if( e.hasAttribute( "transform" ) ){
			inner.setAttribute( 
				"transform", e.getAttribute( "transform" ) );
		}

		if( e.hasAttribute( "d" ) ){
			path = document.createElementNS( 
			SVGImporter.SVG_NS, "path" );

			path.setAttribute( "d", e.getAttribute( "d" ) );

			inner.appendChild( path );
		}

		if( e.childNodes.length > 0 ){
			for( var i = 0; i < e.childNodes.length; i++ ){
				inner.appendChild( e.childNodes[ i ] );
			}
		}
		
		outer.appendChild( inner );

		importItem = new SVGImportPaperItem( 
			outer, this.importer );
			
		importItem.traverse();
		importItem.paperitem.scale( 1, -1 );
		return importItem;
	}

	function configureGlyph( e, glyph ){
		glyph.horizontalAdvance = SVGImportItem.getAttr( 
			e, "horiz-adv-x", "float", 
				this.font.horizontalAdvance );

		var vox = SVGImportItem.getAttr(
			e, "vertical-origin-x", "float", 
				this.font.verticalOrigin.x );
		
		var voy = SVGImportItem.getAttr(
			e, "vertical-origin-y", "float",
				this.font.verticalOrigin.y );

		glyph.verticalOrigin = new Point( vox, voy );

		return glyph;
	}

});