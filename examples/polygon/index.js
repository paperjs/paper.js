window.onload = function(){
	var MAX_EDGES = 8;

	var maxEdgeInput = document.getElementById( "max-edges" );
		maxEdgeInput.addEventListener( "onchange", onMaxEdgesSet,false );

	function onMaxEdgesSet( e ){
		console.log( e );
	}
	
	var canvas = document.getElementById( "paper-canvas" );
	var ctx = canvas.getContext( "2d" );
		paper.setup( canvas );
		paper.view.onFrame = onFrame;

	var points = new Array();
	var clickPoints = new Array();
	var polygon;
	
	var areas = 
		{
			'input' : 
				{
					area: { x:2,y:2,width:446,height:296 },
					title : "input",
					children : [],
					action : function( poly ){ return [poly]; }
				},
			'triangles' : 
				{
					area : { x:452,y:2,width:446,height:296 },
					title : "ear clipped triangles",
					children : [],
					action : function( poly ){  
							return poly.triangulate(); }
				},
			'decompose' : 
				{
					area : { x:2,y:302,width:446,height:296 },
					title : "decomposed polygons",
					children : [],
					action : function( poly ){
						return poly.decompose( MAX_EDGES );
					}
				},
			'convexHull' : 
				{
					area : { x:452,y:302,width:446,height:296 },
					title : "convex hull of polygon",
					children : [],
					action : function( poly ){
						return [poly.convexHull];
					}
				}
		};

	var inputArea;
	var canClick = false;
	var mouseIsDown = false;

	var tool = new paper.Tool();
		tool.onMouseDown = onMouseDown;
		tool.onMouseMove = onMouseMove;
		tool.onMouseUp = onMouseUp;
		tool.onKeyDown = onKeyDown;
		tool.onKeyUp = onKeyUp;	

	(function(){
		var area, path, p1, p2, text, textBack;
		for( var a in areas ){
			area = areas[ a ].area;
			p1 = new paper.Point( area.x, area.y );
			p2 = p1.add( area.width, area.height );
			path = new paper.Path.Rectangle( p1, p2 );
			path.strokeColor = new paper.RGBColor( 0, 255, 0 );
			path.strokeWidth = 1;
			areas[ a ].frame = path;

			text = new paper.PointText( p1.clone() );
			text.content = areas[ a ].title;
			text.characterStyle = {
    		fontSize: 11,
    		font : "Courier",
    		fillColor : 'black'
			};

			areas[ a ].label = text;

			text.bounds.y += text.bounds.height;
			text.bounds.x += 4;


			textBack = new paper.Path.Rectangle( 
				new paper.Point( text.bounds.x - 4, 
						text.bounds.y - 4 ),
				new paper.Point( 
					text.bounds.x - 4 + text.bounds.width + 8,
					text.bounds.y + text.bounds.height + 6 ) );
			
			textBack.strokeWidth = 0;
			textBack.fillColor = new paper.RGBColor( 0, 255, 0 );

			areas[ a ].labelBackground = textBack;

			text.moveAbove( textBack );

			if( a == 'input' ){
				inputArea = areas[ a ];
			}
		}
	})();

	function onFrame(){

	}

	function onKeyDown( e ){
		canClick = false;
		if( e.key == "escape" ){
			for( var a in areas ){
				clearArea( areas[ a ] );
			}
			polygon = null;
			points = new Array();

			for( var i=0; i < clickPoints.length; i++ ){
				clickPoints[ i ].remove();
			}
			clickPoints = new Array();
		}
	}

	function onKeyUp( e ){
		canClick = true;
	}

	function onMouseDown( e ){
		if( !canClick ){
			return;
		}
		if( !mouseIsDown ){
			mouseIsDown = true;
		} else {
			return;
		}
		if( mouseIsDown ){
			insertPoint( e.point.clone() );	
		}
	}

	function onMouseMove( e ){
		var p = e.point;
		var a = inputArea.area;
		if( p.x > a.x && p.y > a.y && 
				p.x < a.x + a.width && p.y < a.y + a.height ){
			canClick = true;					
		} else {
			canClick = false;
		}
	}

	function onMouseUp( e ){
		if( mouseIsDown ){
			mouseIsDown = false;
		}
	}

	function insertPoint( point ){
		points.push( point );
		drawClickPoint( point );

		if( points.length >= 3 ){
			polygon = new paper.Polygon( points );
			
			var area;
			for( var a in areas ){
				area = areas[ a ];
			//clear children
				clearArea( area );	

			//draw new paths
				drawPolys( area.action.call( null, polygon ), 
										area )
			}
		}
	}

	function clearArea( area ){
		for( var c = 0; c < area.children.length; c++ ){
			area.children[ c ].remove();
		}
		area.children = new Array();
	}

	function drawClickPoint( point ){
		var circle = new paper.Path.Circle( point.clone(), 2 );
			circle.strokeColor = new paper.RGBColor( 0, 1, 0 );
			circle.strokeWidth = 1;
		clickPoints.push( circle );
	}


	function drawPolys( polys, area ){
		if( polys == null ){ 
			return
		}

		for( var i=0; i < polys.length; i++ ){
			drawPoly( polys[ i ], area );
		}
	}

	function drawPoly( poly, area ){
		var path = new paper.Path();
			path.strokeColor = new paper.RGBColor( 0, 1, 0 );
			path.strokeWidth = 1;
		var vertex;
		var offset = new paper.Point( area.area.x, 
				area.area.y );

		for( var i=0; i < poly.indizes.length; i++ ){
			vertex = poly.vertices[ poly.indizes[ i ] ];
			vertex = vertex.add( offset );
			if( i == 0 ){
				path.moveTo( vertex );
				continue;
			}
			path.lineTo( vertex );
		}
		path.closePath();
		area.children.push( path );
	}
}