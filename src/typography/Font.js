var Font = this.Font = Base.extend(
	new function(){

		var formats = {
			"svg" : 
				{	"initFunction" : initFromSVG,
					"requestHeaders" : [
						{ "content-type" : "text/xml" } ] }
		}

		/*
		@param String url the url of the font file to load.
		*/
		this.initialize = function( url ){

			if( !url ){
					throw new Error( "Font::no url given" );	
			}
			
			var urlTestPattern = /([A-Za-z]+:\/\/)?(([A-Za-z0-9-_.]+\/)*)([A-Za-z0-9-_.]+)\.([A-Za-z0-9]+)$/gm;
			var result = urlTestPattern.exec( url );

			if( result == null ) {
				throw new Error( "Font::not valid Font-url given" )	
			}

			if( !formats.hasOwnProperty( result[ 5 ] ) ){
				throw new Error( "Font::Format: "+result[ 5 ]+
						" not supported!" );
			}

			var that = this;
			this.url = url;
			this.extension = result[ 5 ];
			this.filename = result[ 4 ] + "." + 
						this.extension;

			this.path = result[ 2 ];

			this.glyphs = [];

			var request = new Request({
				"url" : this.url,
				"headers" : 
					formats[ this.extension ].requestHeaders,
				"onError" : function( e ){
					throw new Error( "Font::Error loading: "+
							that.url );
				},

				"success" : function( e ){
					formats[ that.extension ].
						initFunction.call( that, this.responseText );
				}
			});
		};

		function initFromSVG( data ){
			var parser = new DOMParser();
				console.log( parser.parseFromString( data, "image/svg+xml" ) );
		}
	}
);