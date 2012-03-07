/*
	author philipp schmidt
	@CLASS Importer
	base class for imports of external files
	needs to constructed with a project and an item to 
	import data into.
	Symbols and Font are importet into the project and
	all graphical stuff is imported into the given item
	as children
*/
var Importer = this.Importer = Base.extend( new function(){
	/*
		the supported formats. keys refer to the file extension
		the value returns the constructor of the importer-
		class
	*/
	var formats = {
		"svg" : function(){ return SVGImporter }
	}

	this.initialize = function( url, onDone, project ) {
		this.url = url;
		this.onDone = onDone;
		this.project = project;
		this.imports = {};
		this.status = "initial"
		this.load();
	}

	this.load = function(){
		this.status = "loading";
		var that = this;
		var request = new Request({
			url : this.url,
			onError : function( e ){
				that.onLoadError.call( that, this, e );
			},
			success : function( e ){
				that.onSuccess.call( that, this, e );
			},
			autoSend : false
		});
		return request;
	}

	this.onLoadError = function( request, e ){
		this.status = "load error";
		this.onDone.call( this, "load error" );
	}

	this.onSuccess = function( request, e ){
		this.status = "load success";
	}

	this.statics = {
		getImporter : function( url, onDone, project ){
			var pattern = /\/?([A-Za-z0-9\-]+)\.([A-Za-z0-9]+)($|#|\?)/gm;
			var result = pattern.exec( url );
			var importer = null;
			var importerClass = null;

			if( result && 
					result[ 2 ] != "undefined" && 
					formats.hasOwnProperty( result[ 2 ] )){
					importerClass = formats[ result[ 2 ] ].call();
					importer = new importerClass( url, 
							onDone, project );
			}
			return importer;
		}
	}
});