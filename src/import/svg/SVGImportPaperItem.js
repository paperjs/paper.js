var SVGImportPaperItem = SVGImportItem.extend( new function(){
	this.initialize = function( element, importer ){
		this.base( element, importer );
		this.context = "item";
		
		var list = SVGImporter.list;
		this.paperitem = 
			this[ list[ this.e.nodeName ][ "method" ] ].call( this );

		if( this.transform != null ){
			this.paperitem.transform( this.transform );
		}

		this.paperitem.style = 
				SVGImporter.getPathStyle( this.e );
	}

	this.toString = function(){
		return "[Object SVGImportPaperItem]";
	}

	this.addChild = function( c ){
		this.base( c );
		this.paperitem.addChild( c.paperitem );
		return c;
	}

	this.getImports = function(){
		return this.paperitem;
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