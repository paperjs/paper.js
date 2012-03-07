var SVGImporter = this.SVGImporter = Importer.extend(
	/*
		an extra scope for the list
	*/
	new function(){
/*
	this maps the processing function to every element.
	Every listed element is of interest
	the function is called with the SVGImporter Object as
	this Object and the element as first parameter
*/
		var elements = {
			"defs" : "processDefs",
			"g" : "processGroup",
			"circle" : "processCircle",
			"ellipse" : null,//function( e ){},
			"line" : null,//function( e ){},
			"path" : "processPath",
			"polyline" : "processPolyline",//function( e ){},
			"polygon" : "processPolygon",//function( e ){},
			"rect" : "processRect",
			"svg" : "processSVG"
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
		all gradients
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
		var paperitem = {
			"circle" : 1,
			"g" : 2,
			"path" : 3,
			"polyline" : 4,
			"polygon" : 5,
			"rect" : 6,
			"svg" : 7 };
	/*
		enumeration of all categories an element can belong to
	*/
		var categories = {
			"container" : container, 
			"shape" : shape, 
			"gradient" : gradient,
			"symbol" : symbol,
			"item" : paperitem 
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
		this.statics = {
			list : (function(){
					var l = {};
					for( var e in elements ){
						if( !l.hasOwnProperty( e ) ){
							l[ e ] = { 
								"method" : elements[ e ],
								"categories" : {} };
						}

						for( var c in categories ){
							l[ e ][ "categories" ][ c ] = 
								categories[ c ].hasOwnProperty( e );
						}
					}
					return l;
				})(),
			
			getTransformMatrix : function( e ){
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
				},


		getPathStyle : function( e ){
				var style = new PathStyle({
					strokeColor : new RgbColor( 0, 255, 0 ),
					strokeWidth : 1 });
				 
				return style;
			}
		}
	},

	new function(){
		this.initialize = function( url, onDone, project ) {
			this.base( url, onDone, project );
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

		//	try{
				importSVG.call( this, doc.documentElement );
				this.onDone.call( this, this.imports );
		//	} catch( importError ){
		//		this.onDone.call( this, "import Error" );	
		//	}
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
			var item = new ImportItem( root, this );
				item.parent = item;
			var transformList = [];

			while( stack.length > 0 ){
				i = null;
				c = stack[ stack.length - 1 ];

				if( ImportItem.isItem( c ) && item.canAppend ){
					i = new ImportItem( c, this );
					item.addChild( i );
				}

				if( c.nodeType == 1 && c.childNodes.length > 0 ){
					stack.push( c.firstChild );
					transformList.push( 
						SVGImporter.getTransformMatrix.call( this, c ) );

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
						//	item.finalize();
							item = item.parent;
						}
			
						if( c.nextSibling != null ){
							stack.push( c.nextSibling );
							break;
						}
					}
				}
			}
			this.imports.items = item.paperitem;
		}
});
/*
	Helper Class for transforming svg-items to paper.Items
	Keeping the hiracical Order alive and tracking the
	transform matrix encapsulating the process functions
*/

var ImportItem = Base.extend( new function(){
	this.initialize = function( e, importer ){
		var list = SVGImporter.list;
		this.e = e;
		this.importer = importer;
		this.children = [];
		this.parent = null;
		this.transform = SVGImporter.getTransformMatrix( e );
		this.canAppend = list[ e.nodeName ][ "categories" ]
				[ "container" ];

		this.currentPosition = new Point( 0, 0 );
		this.startPosition = new Point( 0, 0 );
		this.lastControlPoint = null;

		this.paperitem = 
			this[ list[ e.nodeName ][ "method" ] ].call( this );

		if( this.transform != null ){
			this.paperitem.transform( this.transform );
		}

		this.paperitem.style = 
				SVGImporter.getPathStyle( this.e );
	}

	this.toString = function(){
		return "[Object ImportItem]";
	}

	this.addChild = function( c ){
		this.children.push( c );
		this.paperitem.addChild( c.paperitem );
		c.setParent( this );
		return c;
	}

	this.setParent = function( p ){
			this.parent = p;
			return p;
	}

	this.finalize = function(){
		console.log( "finalize" );
	}

	this.statics = {
		isItem : function( e ){
			var list = SVGImporter.list;
			if( list.hasOwnProperty( e.nodeName ) &&
					list[ e.nodeName ][ "categories" ][ "item" ]
					 == true ){
					return true;
			}
			return false;	
		}
	}
},
/*
	scope for element processing functions
*/
new function(){
	this.processDefs = function(){
		
	}

	this.processSVG = function(){
		return new Group();
	}

	this.processGroup = function(){
		return new Group();
	}

	this.processCircle = function(){
		props = getBaseValProps.call( this, 
			{ "cx" : 0, "cy" : 0, "r" : 0 } );
		return new Path.Circle( 
			new Point( props.cx, props.cy ), props.r );
	}

	this.processRect = function(){
		var props = { "x" : 0, "y" : 0, 
			"width" : 0, "height" : 0 };

		props = getBaseValProps.call( this, props );
		return new Path.Rectangle( 
				new Point( props.x, props.y ), 
				new Size( props.width, props.height ) );
	}

	this.processPolyline = function(){
		this.currentPath = new Path();
		this.currentPath.closed = false;

		var points = toPoints.call( 
			this, this.e.points, [ ["x","y"] ] );

		this.moveToAbsolute( points.shift() );
		this.lineToAbsolute( points );

		return this.currentPath;
	}

	this.processPolygon = function(){
		this.processPolyline();
		this.closePath();
		return this.currentPath;
	}

	this.processPath = function(){
		var seg, point;
		var paths = [];
		var segs = this.e.pathSegList;
		var stack = [];
		var command, nextCommand, prevCommand;

		for( var i = 0; i < segs.length; i++ ){
			seg = segs[ i ];
			command = seg.pathSegTypeAsLetter;

			nextCommand = ( i <= segs.length - 2 ) ? 
				segs[ i + 1 ].pathSegTypeAsLetter : "";

			prevCommand = ( i > 0 ) ? 
				segs[ i - 1 ].pathSegTypeAsLetter : "";

			stack.push( seg );

			if( command !== nextCommand ) {	
			
				if( prevCommand.match( /[scqt]/mi ) == null ){
					this.lastControlPoint = null;
				}
			
				switch( command ){
				
				case "M" :
					this.currentPath = new Path();
					paths.push( this.currentPath );
					this.moveToAbsolute(
						toLinearPoints( stack )[ 0 ] );
					break;
		
				case "m" :
					this.currentPath = new Path();
					paths.push( this.currentPath );
					this.moveToRelative( 
						toLinearPoints( stack )[ 0 ] );
					break;

				case "L" :
					this.lineToAbsolute( 
						toLinearPoints( stack ) );
					break;

				case "l" :
					this.lineToRelative( 
						toLinearPoints( stack ) );
					break;
			
				case "h" :
					this.horizontalLineToRelative( 
						toLinearPoints( stack ) );
					break;

				case "H" :
					this.horizontalLineToAbsolute( 
						toLinearPoints( stack ) );
					break;

				case "v" :
					this.verticalLineToRelative( 
						toLinearPoints( stack ) );
					break;

				case "V" :
					this.verticalLineToAbsolute( 
						toLinearPoints( stack ) );
					break;

				case "q" :
					this.qudraticCurveToRelative(
						toQuadraticPoints( stack ) );
					break;

				case "Q" :
					this.qudraticCurveToAbsolute( 
						toQuadraticPoints( stack ) );
					break;

				case "t" :
					this.smoothQuadraticCurveToRelative(
						toLinearPoints( stack ) );
					break;

				case "T" :
					this.smoothQuadraticCurveToAbsolute(
						toLinearPoints( stack ) );
					break;
			
				case "c" :
					this.cubicCurveToRelative( 
						toCubicPoints( stack ) );
					break;

				case "C" :
					this.cubicCurveToAbsolute( 
							toCubicPoints( stack ) );
					break;
				
				case "s" :
					this.smoothCubicBezierToRelative(
						toSmoothCubicPoints( stack ),  prevCommand );
					break;

				case "S" :
					this.smoothCubicBezierToAbsolute(
						toSmoothCubicPoints( stack ), prevCommand );
					break;
				
				case "Z" :
				case "z" :
					this.closePath();
					break;

				default :
					console.log( command+"\tnot yet implemented" );
					
				}
				stack = [];
			}
		}
		return new CompoundPath( paths ).simplify();
	}

	function toPoints( stack, props ){
		var points = [];
		var seg, prop;
		for (var i = 0; i < stack.length; i++) {
			seg = stack[ i ];
			for( var p = 0; p < props.length; p++ ){
				prop = props[ p ];
				points.push( 
					new Point( 
						seg[ prop[ 0 ] ], 
						seg[ prop[ 1 ] ]) );
			};
		};
		return points;
	};

	function getBaseValProps( props ){
		for( var p in props ){
			props[ p ] = this.e[ p ]["baseVal"]["value"];
		}
		return props;
	}

	function toLinearPoints( stack ){
		for( var i = 0; i < stack.length; i++ ){
			stack[ i ] = new Point( stack[ i ].x, stack[ i ].y );
		}
		return stack;
	}

	function toQuadraticPoints( stack ){
		var points = [];
		var seg;
		for (var i = 0; i < stack.length; i++) {
			seg = stack[ i ];
			points.push( new Point( seg.x1, seg.y1 ) );
			points.push( new Point( seg.x, seg.y ) );
		};
		return points;
	}

	function toCubicPoints( stack ){
		var points = [];
		var seg;
		for ( var i = 0; i < stack.length; i++ ) {
			seg = stack[ i ];
			points.push( new Point( seg.x1, seg.y1 ) );
			points.push( new Point( seg.x2, seg.y2 ) );
			points.push( new Point( seg.x, seg.y ) );
		};
		return points;
	}

	function toSmoothCubicPoints( stack ){
		var points = [];
		var seg;
		for (var i = 0; i < stack.length; i++) {
			seg = stack[ i ];
			points.push( new Point( seg.x2, seg.y2 ) );
			points.push( new Point( seg.x, seg.y ) );
		};
		return points;
	}
},
new function(){

this.moveToRelative = function( point ){
	point = point.add( this.currentPosition );
	this.moveToAbsolute( point );
}

this.moveToAbsolute = function( point ){
	this.currentPosition = point.clone();
	if( this.transform != null ){
		this.currentPosition.transform( this.transform );
	}
	this.startPosition = this.currentPosition.clone();
	this.currentPath.moveTo( this.currentPosition );
}

this.lineToRelative = function( stack ){
	var lastPosition = this.currentPosition.clone();
	for( var i = 0; i < stack.length; i++ ){
		stack[ i ] = stack[ i ].add( lastPosition );
		lastPosition = stack[ i ].clone();
	}
	this.lineToAbsolute( stack );
}

this.lineToAbsolute = function( stack ){
	for( var i = 0; i < stack.length; i++ ){
		if( this.transform != null ){
			stack[ i ].transform( this.transform );
		}
		this.currentPath.lineTo( stack[ i ] );
		this.currentPosition = stack[ i ].clone();
	}
}

this.horizontalLineToRelative = function( stack ){
	for( var i = 0; i < stack.length; i++ ){
		stack[ i ] = stack[ i ].add( this.currentPosition );
	}
	this.horizontalLineToAbsolute( stack );
}

this.horizontalLineToAbsolute = function( stack ){
	for( var i = 0; i < stack.length; i++ ){
		stack[ i ] = new Point( stack[ i ].x,
			this.currentPosition.y );
	}
	this.lineToAbsolute( stack );
}

this.verticalLineToRelative = function( stack ){
	for (var i = 0; i < stack.length; i++) {
		stack[ i ] = stack[ i ].add( this.currentPosition );
	};
	this.verticalLineToAbsolute( stack );
}

this.verticalLineToAbsolute = function( stack ){
	for (var i = 0; i < stack.length; i++) {
		stack[ i ] = 
		new Point( this.currentPosition.x, stack[ i ].y );
	};
	this.lineToAbsolute( stack );
}

this.qudraticCurveToRelative = function( stack ){
	var seg, point;
	for (var i = 0; i < stack.length; i += 2 ) {
		seg = [];
		for( var p = 0; p < 2; p++ ){
			point = stack[ i+p ].add( this.currentPosition );
			seg.push( point );
		}
		this.qudraticCurveToAbsolute( seg );
	};
}

this.qudraticCurveToAbsolute = function( stack ){
	for( var i = 0; i < stack.length; i += 2 ){
		if( this.transform != null ){
			stack[  i  ].transform( this.transform );
			stack[ i+1 ].transform( this.transform );
		}
		this.currentPath.quadraticCurveTo( stack[ i ], 
			stack[ i+1 ] );
		this.currentPosition = stack[ i+1 ].clone();
		this.lastControlPoint = stack[ i ].clone();
	}
}

this.smoothQuadraticCurveToRelative = function( stack ){
	for ( var i = 0; i < stack.length; i++ ) {
		stack[ i ] = stack[ i ].add( this.currentPosition );
		this.smoothCubicBezierToAbsolute( [stack[ i ]] )
	};
}

this.smoothQuadraticCurveToAbsolute = function( stack ){
	var p;
	for ( var i = 0; i < stack.length; i++ ){
		if( this.lastControlPoint == null ){
			p = this.currentPosition.clone();
		} else {
			p = getReflectedControlPoint.call( this );
		}
		this.qudraticCurveToAbsolute( [p, stack[ i ]] );
	};
}

this.cubicCurveToRelative = function( stack ){
	var seg, point;
	for ( var i = 0; i < stack.length; i += 3 ){
		seg = [];
		for ( var p = 0; p < 3; p++) {
			point = stack[ i + p ].add( this.currentPosition );
			seg.push( point );
		};
		this.cubicCurveToAbsolute( seg );
	};
}

this.cubicCurveToAbsolute = function( stack ){
	for (var i = 0; i < stack.length; i += 3 ) {
		if( this.transform != null ){
			stack[  i  ].transform( this.transform );
			stack[ i+1 ].transform( this.transform );
			stack[ i+2 ].transform( this.transform );
		};
		this.currentPath.cubicCurveTo( stack[ i ], 
			stack[ i+1 ], stack[ i+2 ] );

		this.currentPosition = stack[ i+2 ].clone();
		this.lastControlPoint = stack[ i+1 ].clone();
	};
}

this.smoothCubicBezierToRelative = function( stack, prevCommand ){
	var seg, point;
	for ( var i = 0; i < stack.length; i += 2 ) {
		seg = [];
		for( var p = 0; p < 2; p++  ){
			point = stack[ i+p ].add( this.currentPosition );
			seg.push( point );
		}
		this.smoothCubicBezierToAbsolute( seg, prevCommand );
	};
}

this.smoothCubicBezierToAbsolute = function( stack, prevCommand ){
	var points, p1;
	for ( var i = 0; i < stack.length; i += 2 ) {
		points = [];
		if( this.lastControlPoint == null ){
			p1 = this.currentPosition.clone();
		} else {
			p1 = getReflectedControlPoint.call( this );
		}
		points.push( p1 );
		points.push( stack[  i  ] );
		points.push( stack[ i+1 ] );
		this.cubicCurveToAbsolute( points );
	}
}

this.closePath = function(){
	this.currentPosition = this.startPosition.clone();
	this.currentPath.closePath();
}

function getReflectedControlPoint(){
	return new Point(
		2 * this.currentPosition.x - this.lastControlPoint.x,
		2 * this.currentPosition.y - this.lastControlPoint.y
	);
}

});
