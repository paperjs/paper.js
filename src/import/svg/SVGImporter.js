var SVGImporter = this.SVGImporter = Importer.extend(

	new function(){

		var importMap = { 
			"fonts" : { 
				"tagName" : "font", 
				"clazz" : SVGImportFontItem }, 

			"items" : {
			 	"tagName" : "svg", 
			 	"clazz" : SVGImportPaperItem }
		}

		this.statics = {
			"SVG_NS" : "http://www.w3.org/2000/svg"
		}

		this.initialize = function( url, onDone, project ) {
			this.base( url, onDone, project );
		}

		this.toString = function(){
			return "[Object SVGImporter]";
		}

		this.load = function(){
			var request = this.base();
			request.setRequestHeader( "content-type", 
				"image/svg+xml" );
			request.send();
		}

		this.onSuccess = function( request, e ){
			this.base();
			var text = request.responseText;
			var parser = new DOMParser();
			var doc;
			
			try{
				doc = parser.parseFromString( text, 
					"image/svg+xml" );
				
			} catch( parseError ){
				this.onDone.call( this, "parseError" );
			}

			//try{
				importSVG.call( this, doc );
				this.onDone.call( this, this.imports );
			//} catch( importError ){
			//	console.error( importError );
			//	this.onDone.call( this, "import Error" );	
			//}
		}

		/*
			this is the main import function. Walks iterativly
			through the SVG DOM and sorts the elements into
			the pre import result. If we find nestet shapes
			in the svg (i.e.: <rect><rect /></rect>) then
			all inner shapes are ignored just like the
			svg specification says. cool 
		*/		
		function importSVG( root ){
			var tagName, clazz, item, defParent, def, defs, svg, nodes, node;
		
			for( var imp in importMap ){
				this.imports[ imp ] = [];
				tagName = importMap[ imp ].tagName;
				clazz = importMap[ imp ].clazz;

				if( tagName === "svg" ){
					svg = new clazz( root.documentElement, this );
					this.imports[ imp ].push( svg );
				
				} else {

					nodes = root.getElementsByTagName( tagName );
					for( var i = 0; i < nodes.length; i++ ) {
						node = nodes[ i ];
						item = new clazz( node, this )
						this.imports[ imp ].push( item );	
					}
				}
			}

			defs = root.getElementsByTagName( "defs" );
			for( var d = 0; d < defs.length; d++ ){
				def = defs[ d ];
				defParent = def.parentNode;
				defParent.removeChild( def );
			}
			
			for( var imp in this.imports ){
				if( this.imports[ imp ].length > 0 ){
					for (var i = 0; i < this.imports[ imp ].length; i++) {
						this.imports[ imp ][ i ].traverse();
						this.imports[ imp ][ i ] = this.imports[ imp ][ i ].getImports();
					};
				} else {
					delete this.imports[ imp ];
				}
			}
		}
});