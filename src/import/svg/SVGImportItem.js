var SVGImportItem = Base.extend( new function(){

	var elements = {
		"alt-glyph" : "processAltGlyph",
		"circle" : "processCircle",
		"defs" : "processDefs",
		"ellipse" : "processEllipse",
		"font" : "processFont",
		"font-face" : "processFontFace",
		"font-face-format" : "processFontFaceFormat",
		"font-face-name" : "processFontFaceName",
		"font-face-src" : "processFontFaceSrc",
		"font-face-uri" : "processFontFaceUri",
		"g" : "processGroup",
		"glyph" : "processGlyph",
		"hkern" : "processHKern",
		"line" : "processLine",
		"missing-glyph" : "processMissingGlyph",
		"path" : "processPath",
		"polyline" : "processPolyline",
		"polygon" : "processPolygon",
		"rect" : "processRect",
		"svg" : "processSVG",
		"vkern" : "processVKern"
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

	var shapes = {
		"circle" : 1, 
		"ellipse" : 2, 
		"line" : 3,
		"path" : 4,	
		"polyline" : 5, 
		"polygon" : 6, 
		"rect" : 7 }

	var container = {
		"alt-glyph" : 2, 
		"defs" : 2, 
		"g"	 : 3,
		"glyph" : 3,
		"font" : 3,
		"missing-glyph" : 3,
		/*,
		"a",  
		"marker",
		"mask",
		,
		"pattern",
		*/
		"svg" : 4
		/*
		"switch",
		"symbol" */
	}

	var font = {
		"alt-glyph" : 0,
		"font" : 1,
		"font-face" : 2,
		"font-face-format" : 3,
		"font-face-name" : 4,
		"font-face-src" : 5,
		"font-face-uri" : 6,
		"glyph" : 7,
		"hkern" : 8,
		"missing-glyph" : 9,
		"vkern" : 10
	}
	
	var paperitem = {
		"circle" : 1,
		"ellipse" : 2,
		"g" : 3,
		"line" : 4,
		"path" : 5,
		"polyline" : 6,
		"polygon" : 7,
		"rect" : 8,
		"svg" : 9 
	};

	var categories = {
		"shapes" : shapes,
		"container" : container,
		"item" : paperitem,
		"font" : font
	}

	var list = (function(){
		var l = {};
		for( var e in elements ){
			if( !l.hasOwnProperty( e ) ){
				l[ e ] = {
					"processor" : elements[ e ],
					"categories" : {}
				};
			}

			for( var c in categories ){
				l[ e ][ "categories" ][ c ] =
					categories[ c ].hasOwnProperty( e );		
			}
		}
		return l;
	})()

	this.initialize = function( element, importer ){
		this.e = element;
		this.list = list;
		this.importer = importer;
		this.children = [];
		this.parent = null;

		this.transform = this.getTransformMatrix( this.e );
		this.canAppend = 
			this.list[ this.e.nodeName ].categories.container;

		this.currentPosition = new Point( 0, 0 );
		this.startPosition = new Point( 0, 0 );
		this.lastControlPoint = null;
	}

	this.toString = function(){
		return "[Object SVGImportItem]";
	}

	this.getCategory = function(){
		return "abstract";
	}

	this.isOfCategory = function( e ){
		if( this.list.hasOwnProperty( e.nodeName ) &&
				this.list[ e.nodeName ].categories[ this.category ] == true ) {
			return true;
		}
		return false;
	}

	this.addChild = function( c ){
		this.children.push( c );
		c.setParent( this );
		return c;
	}

	this.removeChild = function( c ){
		for( var i = 0; i < this.children.length; i++ ){
			if( c === this.children[ i ] );
			this.children.splice( i, 1 );
			break;
		}
		return c;
	}

	this.setParent = function( p ){
			this.parent = p;
			return p;
	}

	this.finalize = function(){
		return;
	}

	this.getImports = function(){
		return null;
	}

	this.traverse = function(){
		var stack = [ this.e ];
		var c, i;
		var current = this;

		while( stack.length > 0 ){
			c = stack[ stack.length - 1 ];
			i = this.getNextItem( c );

			if( i != null ){
				current.addChild( i );
			}
			
			if( c.nodeType == 1 && c.childNodes.length > 0 ){
				stack.push( c.firstChild );
				if( i != null ){
					current = i;
				}
				
				} else if( c.nextSibling != null ){
					stack[ stack.length - 1 ] = c.nextSibling;
	 			 
				}	else {
					while( stack.length > 0 ){

						c = stack.pop();
						if( c === current.e ){
							current.finalize();
							current = current.parent;
						}
			
					if( c.nextSibling != null && c !== this.e ){
						stack.push( c.nextSibling );
						break;
					}
				}
			}
		}
	}

	this.getNextItem = function( e ){
		if( this.isOfCategory( e ) ){
			return new this.constructor( e, this.importer );
		}
		return null;
	}

	this.getTransformMatrix = function( e ){
		var eTransform = ( e.transform == null ) ? 
			null : e.transform.baseVal;
	
		var matrix = null;
		var cm, ct;

		if( eTransform != null ){

			matrix = new Matrix( 1,0, 0,1, 0,0 );

			for( var i = 0; i < eTransform.numberOfItems; i++ ){
				ct = eTransform.getItem( i );
				cm = ct.matrix;

				matrix.concatenate(
							new Matrix( cm.a, cm.b, cm.c, 
									cm.d, cm.e, cm.f ) );
			}
		}
		return matrix;			
	}

	this.getPathStyle = function( e ){
		var style = new PathStyle({
			strokeColor : new RgbColor( 0, 255, 0 ),
			fillColor : new RgbColor( 0, 0, 255, 0.1 ),
			strokeWidth : 1 });
				 
			return style;
		}
	},
//},
new function(){
	/*
		this is the collection of all possible (execpt arc) drawing
		commands. In general this works in the following way:
		every drawing command that is at least executed on a 
		path is working with absolute coordinates. If we have
		an relative command, the coordinates are converted to
		absolute one by the function and passed to the on for
		the absolute ones. If we have smooth commands (these
		depend on a reflected controlpoint of the previous
		command), they are converted to complete command before.
		So worst case is a relative and smooth curve command,
		which is processed in these steps:
		1.: convert smooth relativ coordinates to absolute
		smooth coordinates
		2.: convert smooth absolute coordinates to absolute
		coordinates
		3.: execute the draw commands.
		Best case are allways coordinates given in absolute
		values
		conclusion:
		Importtime depends on the graphic itself. Highly
		compressed SVG graphic need more time to render, but
		this scales linear.
	*/
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
			this.smoothQuadraticCurveToAbsolute( [stack[ i ]] )
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

	this.smoothCubicBezierToRelative = function( stack ){
		var seg, point;
		for ( var i = 0; i < stack.length; i += 2 ) {
			seg = [];
			for( var p = 0; p < 2; p++  ){
				point = stack[ i+p ].add( this.currentPosition );
				seg.push( point );
			}
			this.smoothCubicBezierToAbsolute( seg );
		};
	}

	this.smoothCubicBezierToAbsolute = function( stack ){
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

	/*
		Helper function needed for smooth curve commands only
	*/
	function getReflectedControlPoint(){
		return new Point(
			2 * this.currentPosition.x - this.lastControlPoint.x,
			2 * this.currentPosition.y - this.lastControlPoint.y
		);
	}
},
/*
	scope for element processing functions
*/
new function(){
	/*
		this is the collection of functions which convert
		an element to a paper.Path. Each element is converted
		to a path, either by executing post-script commands
		on it, or simply by using the paper.Path.* api.
		If it is not possible to use the paper.Path.* api,
		than the "post-script-command-convert" functions of
		the scope below are used.
	*/
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

	this.processEllipse = function(){
		var p = getBaseValProps.call( this, 
			{ "cx" : 0, "cy" : 0, "rx" : 0, "ry" : 0 } );
		
		return new Path.Oval( new Rectangle( 
				new Point( p.cx - p.rx, p.cy - p.ry ),
				new Point( p.cx + p.rx, p.cy + p.ry ) ) );
	}

	this.processLine = function(){
		var props = getBaseValProps.call( this, 
			{ "x1" : 0, "y1" : 0, "x2" : 0, "y2" : 0 } );
		
		return new Path.Line( 
			new Point( props.x1, props.y1 ),
			new Point( props.x2, props.y2 ) );
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

	/*
		this is the most complex element to process.
		this function acts as "big switch" of all post-script
		commands a path might have and maps it to the suitable
		function to execute the drawing.
		In order to manage relative and/or smooth commands
		in the right way this is done in two steps:
		1.: collecting all commands of the same type in a
		list (that is what i called stack but is a queue)
		2.: executing all commands from that "queue" in order
		of appearance.
	*/
	this.processPath = function(){
		var seg, point, command, nextCommand, prevCommand;
		var paths = [];
		var segs = this.e.pathSegList;
		var stack = [];

		for( var i = 0; i < segs.numberOfItems; i++ ){
			seg = segs.getItem( i );
			command = seg.pathSegTypeAsLetter;

			nextCommand = ( i <= segs.numberOfItems - 2 ) ? 
				segs.getItem( i + 1 ).pathSegTypeAsLetter : "";

			prevCommand = ( i > 0 ) ? 
				segs.getItem( i - 1 ).pathSegTypeAsLetter : "";
		
			stack.push( seg );

			if( command !== nextCommand ) {	
			
				if( prevCommand.match( /[scqt]/mi ) == null ){
					this.lastControlPoint = null;
				}
			
				switch( command ){
				
				case "M" :
					this.currentPath = new Path();
					paths.push( this.currentPath );
					this.moveToAbsolute( toPoints.call( 
						this, stack, [ ["x","y"] ] )[ 0 ] );
					break;
		
				case "m" :
					this.currentPath = new Path();
					paths.push( this.currentPath );
					this.moveToRelative( toPoints.call( 
						this, stack, [ ["x","y"] ] )[ 0 ] );
					break;
				/*
					these cases are still missing just because
					the paper.Path.arc api is totally not
					compatible to the svg-arc specification.
					svg-arc have to be convertet to curves what
					is a big deal -- too big for now.

					case "a" :
						break;

					case "A" :
						break;
				*/
				case "L" :
					this.lineToAbsolute( toPoints.call( 
						this, stack, [ ["x","y"] ] ) );
					break;

				case "l" :
					this.lineToRelative( toPoints.call( 
						this, stack, [ ["x","y"] ] ) );
					break;
			
				case "h" :
					this.horizontalLineToRelative( toPoints.call( 
						this, stack, [ ["x","y"] ] ) );
					break;

				case "H" :
					this.horizontalLineToAbsolute( toPoints.call( 
						this, stack, [ ["x","y"] ] ) );
					break;

				case "v" :
					this.verticalLineToRelative( toPoints.call( 
						this, stack, [ ["x","y"] ] ) );
					break;

				case "V" :
					this.verticalLineToAbsolute( toPoints.call( 
						this, stack, [ ["x","y"] ] ) );
					break;

				case "q" :
					this.qudraticCurveToRelative( toPoints.call(
						this, stack, [ [ "x1", "y1" ], [ "x", "y" ] ] ) );
					break;

				case "Q" :
					this.qudraticCurveToAbsolute( toPoints.call(
						this, stack, [ [ "x1", "y1" ], [ "x", "y" ] ] ) ); 
					break;

				case "t" :
					this.smoothQuadraticCurveToRelative( 
						toPoints.call( this, stack, [ ["x","y"] ] ) );
					break;

				case "T" :
					this.smoothQuadraticCurveToAbsolute( 
						toPoints.call( this, stack, [ ["x","y"] ] ) );
					break;
			
				case "c" :
					this.cubicCurveToRelative( toPoints.call( this, stack, 
							[ [ "x1", "y1" ], [ "x2", "y2" ], [ "x", "y" ] ] ) );
					break;

				case "C" :
					this.cubicCurveToAbsolute( toPoints.call( this, stack, 
							[ [ "x1", "y1" ], [ "x2", "y2" ], [ "x", "y" ] ] ) );
					break;
				
				case "s" :
					this.smoothCubicBezierToRelative( 
						toPoints.call( this, stack, 
							[ [ "x2", "y2" ], [ "x", "y" ] ] ) );
					break;

				case "S" :
					this.smoothCubicBezierToAbsolute(
						toPoints.call( this, stack, 
							[ [ "x2", "y2" ], [ "x", "y" ] ] ) );
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


	/*
		this is a helper function which converts the orginal
		the svg element's commandlist to paper.Points
		This is needed to convert a PathSegList of a path to
		a correct Array of Points in the same way as, for
		example: the point list of a polygon-element. While
		Firefox adds a <length> property to all these lists,
		all other browers don't and depend on the
		<numberOfItems> property plus the <getItem> mehtod
		instead of the >[ ]< operator.
	*/
	function toPoints( stack, props ){
		var points = [];
		var seg, prop;

		var count = ( "numberOfItems" in stack ) ?
			stack.numberOfItems : 
			stack.length;

		var getter = (  "getItem" in stack ) ?

			function( s, indx ){ 
				return s.getItem( indx ) } :

			function( s, indx ){
				return s[ indx ] };

		for (var i = 0; i < count; i++) {
			seg = getter.call( this, stack, i );

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

	/*
		a helper function to get the base values of arbitary
		properties. That is needed as long as we do not decide
		to implement the animation module which is specified
		for SVG.
	*/
	function getBaseValProps( props ){
		for( var p in props ){
			props[ p ] = this.e[ p ]["baseVal"]["value"];
		}
		return props;
	}
});