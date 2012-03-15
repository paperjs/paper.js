var SVGImportPaperItem = SVGImportItem.extend( new function(){
	this.initialize = function( element, importer ){
		this.base( element, importer );

		this.paperitem = 
			this[ this.list[ this.e.nodeName ][ "processor" ] ].call( this );

		//this.paperitem.remove();

		if( this.transform != null ){
			this.paperitem.transform( this.transform );
		}

		this.paperitem.style = 
			this.getPathStyle( this.e );
	}

	this.toString = function(){
		return "[Object SVGImportPaperItem]";
	}

	this.getCategory = function(){
		return "item";
	}

	this.addChild = function( c ){
		if( this.canAppend ){
			this.base( c );
			this.paperitem.addChild( c.paperitem );
			return c;
		}
		return this;
	}
/*
	this.getNextItem = function( e ){
		if( this.isOfCategory( e ) ){
			return new SVGImportPaperItem( e, this.importer );
		}
		return null;
	}
*/

	this.getImports = function(){
		return this.paperitem;
	}
});