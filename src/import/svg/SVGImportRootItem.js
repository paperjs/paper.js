var SVGImportRootItem = SVGImportItem.extend(new function(){
	this.initialize = function( element, importer ){
		this.base( element, importer );
		this.canAppend = true;
		this.parent = this;
		this.context = "root";
	}

	this.toString = function(){
		return "[Object SVGImportRootItem]";
	}
})