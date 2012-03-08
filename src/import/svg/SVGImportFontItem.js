var SVGImportFontItem = SVGImportItem.extend(function(){
	this.initialize = function( element, importer ){
		this.base( element, importer );
		this.context = "font";
	}
}, new function(){
	this.processAltGlyph = function(){}
	this.processFont = function(){}
	this.processFontFace = function(){}
	this.processFontFaceFormat = function(){}
	this.processFontFaceName = function(){}
	this.processFontFaceSrc = function(){}
	this.processFontFaceUri  = function(){}
	this.processGlyph = function(){}
	this.processHKern = function(){}
	this.processMissingGlyph = function(){}
	this.processVKern = function(){}
});