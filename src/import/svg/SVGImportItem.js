var SVGImportItem = Base.extend( new function(){
	this.initialize = function( element, importer ){
		var list = SVGImporter.list;
		this.e = element;
		this.importer = importer;
		this.children = [];
		this.parent = null;
		this.context = null;

		this.transform = SVGImporter.getTransformMatrix( this.e );
		this.canAppend = list[ this.e.nodeName ][ "categories" ]
				[ "container" ];

		this.currentPosition = new Point( 0, 0 );
		this.startPosition = new Point( 0, 0 );
		this.lastControlPoint = null;
	}

	this.toString = function(){
		return "[Object SVGImportItem]";
	}

	this.addChild = function( c ){
		this.children.push( c );
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

	this.getImports = function(){
		return null;
	}

	this.statics = {
		isItem : function( e ){
			return getBoolFromList.call( 
				this, e.nodeName, "item" );	
		},
		
		isFont : function( e ){
			return getBoolFromList.call( 
				this, e.nodeName, "font" );
		}
	}

	function getBoolFromList( nodeName, type ){
		var list = SVGImporter.list;
		if( list.hasOwnProperty( nodeName ) &&
			list[ nodeName ]["categories"][ type ] == true ){
				return true;
		}
		return false;
	}
},
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
});