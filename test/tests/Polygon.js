module('Polygon');
test( 'new Polygon', function(){
	
	raises( function(){
		var vertices = null;
		var p = new Polygon( vertices );

	}, function( e ){
			return e == "Error: Polygon::needs at least three vertices to construct"

	}, "throws errors if vertices.length is null" );

	raises( function(){
		var vertices = [ new Point( 0, 10 ) ];
		var p = new Polygon( vertices );

	}, function( e ){
			return e == "Error: Polygon::needs at least three vertices to construct"
	}, "throws erros if vertices.length is less than 3" );

	raises( function(){
		var vertices = [ new Point( 0, 10 ), { x : 0, y : 0 }, new Point( 1,0 ) ];
		var p = new Polygon( vertices );

	}, function( e ){
			return ! ( e.message.match( /Polygon::index \d+ is not a Point/ ) == null );
	}, "throws erros if a vertex is not a Point" );

	raises( function(){
		var vertices = [ new Point( 0, 10 ), new Point( 0, 0 ), new Point( 1,0 ) ];
		var indizes = [ 1 ];
		var polygon = new Polygon( vertices, indizes );
	
	}, function( e ){
		var p = /Polygon::given indizes either no Array or less than 3/;
		var r = e.message.match( p );
		return ! ( r == null );	

	}, "throws Error if given indizes are no Array or less than 3");

	raises(function(){
		var vertices = [new Point( 0, 0 ), new Point(1 , 1 ), new Point(0, 0)];
		var polygon = new Polygon( vertices );

	}, function( e ){
		var p = /Polygon::first and last vertex of three are equal/;
		var r = e.message.match( p );
		return !( r == null );

	}, "throws an error if first and last of three vertices are equal");

	(function(){
		var vertices = [new Point( 0, 0 ), new Point(1 , 1 ), new Point( 2,2 ), new Point(0, 0)];
		var polygon = new Polygon( vertices );
		equals( polygon.vertexCount, 3, "last vertex removed, because it equals the first" );
	})();

	/*
		test if polygon clockwise works well and
		reverses vertices if they are given in
		clockwise order

		1-----2
		 \   /
      \ /
       3
     
     clockwise
     1 : 0,0
     2 : 10,0
     3 : 5,5
	*/

	(function(){
		var vertices = [new Point(0,0), new Point(10,0), new Point( 5,5 )];
		var polygon = new Polygon( vertices );
		ok( !polygon.isClockwise, "polygon not clockwise" );

		vertices.reverse();
		polygon = new Polygon( vertices );
		ok( !polygon.isClockwise, "polygon is not clockwise after vertex reverse" );	

	})();

	/*
		test if self-intersections are found

		+(0,0)---3       
		|       / \
		|      /   \
		1-----+-----+-----5
		 \   /       \   /
		  \ /         \ /
		   2           4
		   
		two intersection could be detected
		for now the test will stop if it finds one
		in the future these Intersections will be fixed
		
		1: 0,2,
		2: 1,4,
		3: 3,0,
		4: 4,4,
		5: 5,2 
	*/
	(function(){
		var p = new Polygon([
				new Point( 0, 2 ),
				new Point( 1, 4 ),
				new Point( 3, 0 ),
				new Point( 4, 4 ),
				new Point( 5, 2 )
			]);
		ok( !p.isValid, 'self-intersecting Polygon is not valid' );
	})();

	/*
		test if no wrong intersections are found
	*/
	/**
	 *	polygon 2:
	 *	1     3
	 *	|\   /|
	 *	| \ / |
	 *	|  2  |
	 *  |     |
	 *  5-----4
	 *  
	 *	1: 0,0
	 *	2: 5,5
	 *	3: 10,0
	 *  4: 10,10
	 *	5: 0, 10
	 */
	(function(){
		var p = new Polygon([
	 			new Point( 0,0 ),
	 			new Point( 5,5 ),
	 			new Point( 10, 0 ),
	 			new Point( 10, 10 ),
	 			new Point( 0, 10 )
		]);
		ok( p.isValid, 'simple convex Polygon does noe self intersect' );
	})()
	
});

test( 'Polygon.clone', function(){
	var p1 = new Polygon([
		new Point( 0,0 ),
		new Point( 10, 0 ),
		new Point( 10, 10 ),
		new Point( 0, 10 )]);

	var p2 = p1.clone();
	equals( p2.vertices.length, p1.vertices.length, 'cloned polygon has the same amout of vertices' );
	//deepEqual( p2.vertices, p1.vertices, 'cloned vertices are deep equal' );
	var p1Str = "";
	var p2Str = "";
	for( var i=0; i < p1.vertices.length; i++ ){
		p1Str += p1.vertices[ i ].toString();
		p2Str += p2.vertices[ i ].toString();
	}
	equals( p2Str, p1Str, 'vertices toString are equal' );
	equals( p2.indizes.length, p1.indizes.length, 'cloned polygon has the same amout of indizes' );
	deepEqual( p2.indizes, p1.indizes, 'cloned polygon has the same indizes' );

});

test( 'Polygon.isConvex',function(){
	/**
	 *	polygon 1 :
	 *
	 *	1------2
	 *	|      |
	 *	|      |
	 *	4------3
	 *
	 *	1: 0,0
	 *	2: 10,0
	 *	3: 10, 10
	 *  4: 0, 10
	 */

	var p1 = new Polygon([
		new Point( 0, 0 ),
		new Point( 10, 0 ),
		new Point( 10, 10 ),
		new Point( 0, 10 ) ]);

	ok( p1.isConvex, "convex polygon is convex" );
	/**
	 *	polygon 2:
	 *	1     3
	 *	|\   /|
	 *	| \ / |
	 *	|  2  |
	 *  |     |
	 *  5-----4
	 *  
	 *	1: 0,0
	 *	2: 5,5
	 *	3: 10,0
	 *  4: 10,10
	 *	5: 0, 10
	 */

	var p2 = new Polygon([
	 			new Point( 0,0 ),
	 			new Point( 5,5 ),
	 			new Point( 10, 0 ),
	 			new Point( 10, 10 ),
	 			new Point( 0, 10 )
		]);
	
	ok( !p2.isConvex, "concav polygon is not convex" );
});

/*
	the tests for triangulation and decomposition are not
	concidered to be complete. Degenerated cases may
	appear while processing complex Shapes. Best practice
	might be a robust constructor that prevents this
	routines to run, what will prevent from infinite loops.

	Might one of this routines run infinite or breaks cause
	of an error, it is very useful to save the shape that
	should be processed for further debugging.
*/

test( 'Polygon.triangulate',function(){
	/*
		simple test polygon:
		4 vertices, rectangle
	*/	
	(function(){
		var p = new Polygon([
			new Point( 0, 0 ),
			new Point( 10, 0 ),
			new Point( 10, 10 ),
			new Point( 0, 10) ] );

		var triangles = p.triangulate();
		equals( triangles.length, 2, 'simple rectangle polygon is triangulated into two triangles' );

	})();

	/**
	 *	polygon 2:
	 *	1     3
	 *	|\   /|
	 *	| \ / |
	 *	|  2  |
	 *  |     |
	 *  5-----4
	 *  
	 *	1: 0,0
	 *	2: 5,5
	 *	3: 10,0
	 *  4: 10,10
	 *	5: 0, 10
	 */
	(function(){
		
		var p = new Polygon([
		 			new Point( 0,0 ),
		 			new Point( 5,5 ),
		 			new Point( 10, 0 ),
		 			new Point( 10, 10 ),
		 			new Point( 0, 10 )
			]);
		equals( p.triangulate().length, 3, 'simple convex polygon is splittet into 3 triangles' );
		
	})();
});

test( 'polygon.decompose',function(){
	/**
	 *	polygon 1 :
	 *
	 *	1------2
	 *	|      |
	 *	|      |
	 *	4------3
	 *
	 *	1: 0,0
	 *	2: 10,0
	 *	3: 10, 10
	 *  4: 0, 10
	 */

	var p1 = new Polygon([
		new Point( 0, 0 ),
		new Point( 10, 0 ),
		new Point( 10, 10 ),
		new Point( 0, 10 ) ]);
		
	equals( p1.decompose().length, 1, 'simple convex rectangle poly is decomposed to one poly' );	
	equals( p1.decompose( 3 ).length, 2, 'decomposing to triangles' );

	/**
	 *	polygon 2:
	 *	1     3
	 *	|\   /|
	 *	| \ / |
	 *	|  2  |
	 *  |     |
	 *  5-----4
	 *  
	 *	1: 0,0
	 *	2: 5,5
	 *	3: 10,0
	 *  4: 10,10
	 *	5: 0, 10
	 */
	(function(){
		
		var p = new Polygon([
		 			new Point( 0,0 ),
		 			new Point( 5,5 ),
		 			new Point( 10, 0 ),
		 			new Point( 10, 10 ),
		 			new Point( 0, 10 )
			]);
		equals( p.decompose().length, 2, 'simple concav polygon decomposed to 2 polygons' );
		
	})();

});

test( 'Polygon.convexHull',function(){
/*
polygon 1:

1      3
|\   /  \
| \ /    \
|  2      4
|        /
| 6     /
|/ \   /
7   \ /
     5

1: 0,0
2: 2,2
3: 4,0
4: 6,2
5: 4,4
6: 2.3
7: 0,5

*/

var v1 = [
	new Point( 0, 0 ),
	new Point( 2, 2 ),
	new Point( 4, 0 ),
	new Point( 6, 2 ),
	new Point( 4, 4 ),
	new Point( 2, 3 ),
	new Point( 0, 5 )
];

var p1 = new Polygon( v1 );

var c1 = p1.convexHull;

/*
	because the vertices above are in clockwise order
	they will be reversed within the polygon constructor.

	So the resulting convex hull from the polygon above is
	NOT: 0,2,3,4,6! The expected order is 6,4,3,2,0!
*/

equals( c1.indizes.length, 5, 'enough vertices were removed' );

var expectedOrder = [ 6,4,3,2,0 ];
var vertex;
for( var i = 0; i < c1.indizes.length; i++ ){
	vertex = c1.vertices[ c1.indizes[ i ] ];
	//ok( vertex.equals( v1[ i ] ) );

}


});