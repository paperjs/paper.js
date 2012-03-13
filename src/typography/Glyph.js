var Glyph = this.Glyph = CompoundPath.extend( new function(){
	this.initialize = function(){
		this.metrics = null;
		this.unicode = null;
	}

	this.toString = function(){
		return "[Object Glyph]";
	}
});