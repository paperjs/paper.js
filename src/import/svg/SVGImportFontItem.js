/*
	@author Philipp Schmidt
	this class is a import wrapper for SVG-Font-Elements
*/
var SVGImportFontItem = SVGImportItem.extend( new function(){
	this.initialize = function( element, importer ){
		this.base( element, importer );
		this.font = new Font();
		this.glyphs = [];
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
		//	switch( c.e.nodeName ){
		/*
			case "font-face" :
				this.fontFace = c;
				ret = c;
				break;
		*/		 
		//	case "glyph" :
				//this.glyphs.push( c );
				//ret = c;
		//		console.log( c.e );
		//		break;
		/*
			case "missing-glyph" :
				this.missingGlyph = c;
				ret = c;
		
			case "vkern" :
				this.vkern.push( c );
				break;

			case "hkern" :
				this.hkern.push( c );
				break;
		*/
		//	}
		}
		
		
		return ret;
	}

	this.getNextItem = function( e ){
		var ret = null;
		if( this.isOfCategory( e ) ){
			switch( e.nodeName.toLowerCase() ){
				case "glyph" :
					ret = this.processGlyph( e );
					break;

				default :
					ret = this;
					break;
			}
		}
		return ret;
	}

	this.getImports = function(){
		return this;
	}

	this.finalize = function(){
		
	}
},
new function(){
	this.processAltGlyph = function(){
		return new Glyph();
	}
	this.processFont = function(){
		return new Font();
	}
	this.processFontFace = function(){}
	this.processFontFaceFormat = function(){}
	this.processFontFaceName = function(){}
	this.processFontFaceSrc = function(){}
	this.processFontFaceUri  = function(){}

	this.processGlyph = function( e ){
		var path, importItem;
		var outer = document.createElementNS( 
			SVGImporter.SVG_NS, "g" );

		var inner = document.createElementNS( 
			SVGImporter.SVG_NS, "g" );

		outer.appendChild( inner );

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

		importItem = new SVGImportPaperItem( outer, this.importer );
		importItem.traverse();
		this.glyphs.push( importItem );
		return importItem;
	}

	this.processHKern = function(){}
	this.processMissingGlyph = function(){}
	this.processVKern = function(){}
});