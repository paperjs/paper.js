var SVGImporter = this.SVGImporter = Importer.extend(
	new function(){

/*
	this maps the processing function to every element.
	Every listed element is of interest
	the function is called with the SVGImporter Object as
	this Object and the element as first parameter
*/
		var elements = {
			"defs" : processDefs,
			"g" : processGroup,
			"circle" : function( e ){},
			"ellipse" : function( e ){},
			"line" : function( e ){},
			"path" : processPath,
			"polyline" : function( e ){},
			"polygon" : function( e ){},
			"rect" : processRect,
			"svg" : function( e ){}
		/*
			.
			.
			"linear-gradient :"
			"symbol : "
			.
			.
			and so far
		*/
		}


	/*
		this enumeration decribes all shapes.
		These elements allow no child elements even
		if there are elements given in the svg
	*/
		var shape = { 
			"circle" : 1, 
			"ellipse" : 2, 
			"line" : 3,
			"path" : 4,	
			"polyline" : 5, 
			"polygon" : 6, 
			"rect" : 7 }
	
	/*
		this all container elements. they allow children
		to append.
	*/
		var container = { 
			"defs" : 2, 
			"g"	 : 3,/*,
			"a",  
			"glyph",
			"marker",
			"mask",
			"missing-glyph",
			"pattern",
			*/
			"svg" : 4
			/*
			"switch",
			"symbol" */
			};

	/*
		all gradient
	*/	
		var gradient = {};

	/*
		all symbols
	*/
		var symbol = {};

	/*
		here all elements which can become paper.Items in
		the paper dom are listed
	*/
		var item = {
			"g" : 1,
			"rect" : 2,
			"path" : 3 };
	/*
		enumeration of all categories an element can belong to
	*/
	/*
		TODO: callback for category -> generic what to do with.
	*/
		var categories = {
			"container" : container, 
			"shape" : shape, 
			"gradient" : gradient,
			"symbol" : symbol,
			"item" : item 
		};

	/*
		this is the final import list with the form:
		{
			<nodeName> : 
				{	
					"method" : <function>,
					"categories" : 
						{
							<property of categories> : Boolean	//later function	
						} 
				}
		}
	*/
		var list = {};

		for( var e in elements ){
			if( !list.hasOwnProperty( e ) ){
				list[ e ] = { 
					"method" : elements[ e ],
					"categories" : {} };
			}

			for( var c in categories ){
				list[ e ][ "categories" ][ c ] = 
					categories[ c ].hasOwnProperty( e );
			}
		}

		this.initialize = function( url, onDone, project ) {
			this.base( url, onDone, project );
			this.transformList = [];
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
				importSVG.call( this, doc.documentElement );
			//} catch( importError ){
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
			var stack = [root];
			var c, i;
			var item = new Item( root );
				item.parent = item;
			var transformList = [];

			while( stack.length > 0 ){
				i = null;
				c = stack[ stack.length - 1 ];

				if( Item.isItem( c ) && item.canAppend ){
					i = new Item( c );
					item.addChild( i );
				}


				if( c.nodeType == 1 && c.childNodes.length > 0 ){
					stack.push( c.firstChild );
					transformList.push( 
						getTransformMatrix.call( this, c ) );

					if( i != null ){
						item = i;
					}
				
				} else if( c.nextSibling != null ){
					stack.pop();
					stack.push( c.nextSibling );
				
				}	else {
					while( stack.length > 0 ){
						c = stack.pop();
						transformList.pop();
						if( c === item.e ){
							item = item.parent;
						}
			
						if( c.nextSibling != null ){
							stack.push( c.nextSibling );
							break;
						}
					}
				}
			}
		}

		function Item( e ) {
			this.e = e;
			this.children = [];
			this.parent = null;

			this.canAppend = list[ e.nodeName ][ "categories" ]
					[ "container" ];

			this.paperitem = 
				list[ e.nodeName ][ "method" ].call( this, this.e );
		}

		Item.prototype.addChild = function( c ){
			this.children.push( c );
			c.setParent( this );
			return c;
		}

		Item.prototype.setParent = function( p ){
			this.parent = p;
			return p;
		}

		Item.isItem = function( e ){
			if( list.hasOwnProperty( e.nodeName ) &&
					list[ e.nodeName ][ "categories" ][ "item" ]
					 == true ){
					return true;
				}
			return false;	
		}

		function getTransformMatrix( e ){
			var eTransform = ( e.transform == null ) ? 
					null : e.transform.baseVal;
			
			var matrix = null;
			var cm, ct;

			if( eTransform != null ){

				matrix = new Matrix( 1,0, 0,1, 0,0 );

				for( var i = 0; i < eTransform.length; i++ ){
					ct = eTransform[ i ];
					cm = ct.matrix;

					matrix.concatenate(
								new Matrix( cm.a, cm.b, cm.c, 
										cm.d, cm.e, cm.f ) );
				}
			}
			return matrix;
		}

		function canAppend( itemStack, e ){
			var can = true;
			var item;
			for( var i = 0; i < itemStack.length; i++ ){
				item = itemStack[ i ];
				if( list[ item.nodeName ][ "categories" ]
					[ "container" ] 
					== false ){
					can = false;
					break;
				}
			}
			return can;
		}

		function processDefs( e ){
			
		}

		function processGroup( e ){
			var transform = getTransformMatrix.call( this, e );
			var group = new Group();
			group.transform = transform;
			return group;
		}

		function processRect( e ){
			
		}

		function processPath( e ){
			
		}
	}
);