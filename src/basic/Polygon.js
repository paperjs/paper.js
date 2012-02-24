/**
 * @name Polygon
 *
 * @class Defines a basic Polygon Object
 *
 * @classexample
 * <example here>
 */
var Polygon = this.Polygon = Base.extend(/** @lends Polygon# */ 
new function(){
		
	this.initialize = function( vertices /*, indizes*/ ){
		this.vertices = null;
		this.indizes = null;
		this.isValid = true;
	
		if( vertices == null || 
		  !( vertices instanceof Array ) ||
		  vertices.length < 3	) {
		  	this.isValid = false;
		  	throw new Error( "Polygon::needs at least"+
		  		" three vertices to construct" );
		} else {
			this.vertices = new Array();
			for (var i = 0; i < vertices.length; i++) {				
				if( ! ( vertices[ i ] instanceof Point ) ){
					throw new Error( "Polygon::index "+i+
					" is not a Point" );
				} else {
					this.vertices[ i ] = vertices[ i ];
				}
			};
		}

		if( arguments[ 1 ] ){
			if( arguments[ 1 ] instanceof Array && 
				arguments[ 1 ].length >= 3 ){
				this.indizes = arguments[ 1 ];

			} else {
				throw new Error( "Polygon::given indizes"+
				" either no Array or less than 3" );
			}
		}

		if( this.indizes == null ){
			this.indizes = new Array();
			for( var i = 0; i < this.vertices.length; i++ ){
				this.indizes[ i ] = i;		
			}
		}

		if( this.vertices[ this.indizes[ 0 ]].equals( 
				this.vertices[ 
						this.indizes[ this.indizes.length - 1 ]
					] ) ){
			if( this.indizes.length === 3 ){
				throw new Error( "Polygon::first and last"+
				" vertex of three are equal" );
			}
			this.vertices.pop();
			this.indizes.pop();
		}

		if( getIsClockwise.call( this ) ){
			reverse.call( this );
		}

		if( getIsSelfIntersecting.call( this ) ){
			this.isValid = false;
		}
	}

	this.getIsConvex = function(){
		return getIsConvex.call( this ); 	
	};

	this.getIsClockwise = function(){
		return getIsClockwise.call( this );
	};

	this.getVertexCount = function(){
		return this.indizes.length;
	}

	this.clone = function( /*notFlatten*/ ){
		var vertices = cloneVertices.call( this );
		var indizes = cloneIndizes.call( this );

		return ( arguments[ 0 ] ) ? 
			new Polygon( vertices, indizes ) : 

			flattenVertices.call( 
				new Polygon( vertices, indizes ) );
	}

	this.triangulate = function(){
		var ret = null;
		var triangles, triangle;

		if( this.indizes.length == 3 ){
			ret = [this.clone()];
		
		} else if( this.isValid ){
			ret = new Array();
			triangles = triangulate.call( this );
				
			for( var i = 0; i < triangles.length; i++ ){
				triangle = triangles[ i ];
				ret[ i ] = new Polygon( [ triangle.A, 
						triangle.B, triangle.C ] );
			}
		}
		return ret;
	};

	this.decompose = function( maxEdges ){
		var ret = null;	
		var me = maxEdges || 10;
		
		if( this.indizes.length == 3 ) {
			ret = [this.clone()];
		} else if( this.isValid ){
			ret = decompose.call( this, me );
		}
		return ret;
	};

	this.getConvexHull = function(){
		var indizes = convexHull.call( this );
		var poly = flattenVertices.call( 
					new Polygon( cloneVertices.call( this ), 
						indizes ) );
		return poly;
	};

	

/*
	implementation follows
*/	
/*
		this.getPosition = function(){}
		this.setPosition = function(){}
		this.getBounds = function(){}
*/
	/*
		
	*/
	function getIsConvex(){
		if( this.indizes.length == 3 ){
			return true;

		} else if( this.indizes.length > 3 ) {
			var i, j, k, z;
			var pi, pj, pk;
			var flag = 0;
		
			for( i = 0; i < this.indizes.length; i++ ){
				pi = this.vertices[ this.indizes[ i ] ];
			
				j = ( i + 1 ) % this.indizes.length;
				pj = this.vertices[ this.indizes[ j ] ];
				
				k = ( i + 2 ) % this.indizes.length;
				pk = this.vertices[ this.indizes[ k ] ];
				
				z = ( pj.x - pi.x ) * ( pk.y - pj.y );
				z -= ( pj.y - pi.y ) * ( pk.x - pj.x );
			
				if ( z < 0 ){
					flag = flag | 1;

				} else if ( z > 0 ) {
					flag = flag | 2;
				}
				
				if ( flag == 3 ) {
					return false;
					
				}			
			}
		}

		if ( flag != 0 ){
   			return true;
		}
		return isConvex;
	}

	function getIsClockwise(){
		var sum = 0;
		var p1, p2;
		for( var i = 0; i < this.indizes.length; i++ ){
			p1 = this.vertices[ this.indizes[ i ] ];
			p2 = this.vertices[ this.indizes[ ( i + 1 ) % 
						this.indizes.length ] ];
			sum += ( p1.x - p2.x ) * ( p2.y + p1.y );
		}
		return sum > 0;
	}

	function cloneVertices(){
		var vertices = new Array();
		for( var i = 0; i < this.vertices.length; i++ ){
			vertices[ i ] = this.vertices[ i ].clone();
		}
		return vertices;
	}

	function cloneIndizes(){
		var indizes = new Array();
		for( var i = 0; i < this.indizes.length; i++ ){
			indizes[ i ] = this.indizes[ i ];
		}
		return indizes;
	}

	function reverse(){
		var afterVertices = new Array();
		var afterIndizes = new Array();
		
		for( var bi = 0, ai = this.vertices.length - 1; 
					bi < this.vertices.length; bi++, ai-- ){
			afterVertices[ ai ] = this.vertices[ bi ];
			
			for( var c = 0; c < this.indizes.length; c++ ){
				if( this.indizes[ c ]  == bi ){
					afterIndizes.push( ai );
					break;
				}
			}
		}
		afterIndizes.reverse();
		this.vertices = afterVertices;
		this.indizes = afterIndizes;
	}

	function flattenVertices(){
		var nVertices = new Array();
		var nIndizes = new Array();
		
		for( var i=0; i < this.indizes.length; i++ ) {
			var vertex = this.vertices[ this.indizes[ i ] ];
			nVertices[ i ] = vertex;
			nIndizes[ i ] = i;
		}
		
		this.vertices = nVertices;
		this.indizes = nIndizes;
		
		return this;
	}

	/*
		this is a brut force approach, a sweep line algorythm
		is planned, with the fixing of self-intersections
	*/

	function getIsSelfIntersecting(){
		var p1, p2, p3, p4, l1, l2, ip;
		var intersects = false;

		outer :
		for( var i = 0; i < this.indizes.length; i++ ){
			p1 = this.vertices[ this.indizes[ i ] ];
			p2 = this.vertices[ this.indizes[ ( i + 1 ) % 
						this.indizes.length ] ];

			l1 = new Line( p1, p2, false );

			for( var j = 0; j < this.indizes.length; j++ ){
				p3 = this.vertices[ this.indizes[ j ] ];
				p4 = this.vertices[ this.indizes[ ( j + 1 ) %
							this.indizes.length ] ];
							
				l2 = new Line( p3, p4, false );
				
				if( p1 === p3 && p2 === p4 ){
					continue;
				} else {
					ip = l1.intersect( l2 );
					if( ip !== null ) {
						if( !( p1.equals( ip ) ) && 
								!( p2.equals( ip ) ) && 
								!( p3.equals( ip ) ) &&
								!( p4.equals( ip ) ) ) {
							intersects = true;
							break outer;
						}
					}
				}
			}
		}
		return intersects;
	}

	function triangulate(){
		var triangles = new Array();
		var vertices = cloneVertices.call( this );
		var indizes = cloneIndizes.call( this );
		var lastIndizes = new Array();
		var discovered = new Array();

		for( var i = 0; i < indizes.length; i++ ){
			discovered[ i ] = false;
		}
	
		var ear;
		var detectCount = indizes.length;
	
		while( detectCount > 3 ){
			try{
				ear = getEar.call( this, vertices, indizes,
								discovered );

				discovered[ ear.ib ] = true;
				triangles.push( ear );
				detectCount--;
			} catch( error ) {
				if( window.console ){
					console.error( "Error while triangulation"+
									"could not find an ear" );
					console.error( error );
				}
			}
		}
	
		
		for( var li = 0; li < discovered.length; li++ ) {
			if( discovered[ li ] == false ) {
				lastIndizes.push( indizes[ li ] );
			}
		}
	
		triangles.push( new Triangle( vertices, 
			lastIndizes[ 0 ], lastIndizes[ 1 ], 
				lastIndizes[ 2 ] ) );

		return triangles;
	}
	
	function getEar( vertices, indizes, discovered ) {
		var iterate = new Array()
		for( var m = 0; m < indizes.length; m++ ) {
			if(  discovered[ m ] == false ) {
				iterate.push( indizes[ m ] );
			}
		}
		
		var ear, i, k, l;
		
		for( var i = 0; i < iterate.length; i++ ) {
			k = ( i + 1 ) % iterate.length;
			l = ( i + 2 ) % iterate.length;
		
			ear = new Triangle( vertices, iterate[ i ], 
					iterate[ k ], iterate[ l ] );
			if( isEar.call( this, ear, indizes, iterate[ i ],
						iterate[ k ], iterate[ l ] ) ) {
				return ear;
			}
		}
		return null;
	}

	function isEar( triangle, indizes, i, k, l ) {
		if( triangle.isClockwise() ) {
			return false;
		}
		
		for( var d = 0; d < indizes.length; d++ ) {
		
			if( indizes[ d ] == i || 
					indizes[ d ] == k || 
					indizes[ d ] == l ) {
				continue;
			}
		
			if( triangle.contains( indizes[ d ] ) ) {
				return false;
			}
		}
		return true;
	}

	function decompose( maxEdges ){
		var triangles = triangulate.call( this );
		var polys = new Array();	
		var current = null;
		var candidate, neighbours, neighbour, ni;
		var canAdd = false;
		
		while( triangles.length > 0 ) {
			if( current == null ) {
				current = triangles.shift().toPolygon();
			}
			
			neighbours = getNeighbours.call( this, current, 
					triangles );
			
			if( neighbours.length == 0 ) {
				polys.push( flattenVertices.call( current ) );
				current = null;

			} else {
				while( neighbours.length > 0 && 
						current != null ) {

					ni = neighbours.shift();
					neighbour = triangles[ ni ];
					
					if( neighbour == null ) {
						continue;
					}
					
					candidate = current.clone( true );
					candidate = addTriangle.call( candidate, neighbour );
					
					if( candidate.isConvex && 
							candidate.vertexCount <= maxEdges &&
							candidate.isValid ) {
						current = candidate;
						triangles.splice( ni, 1 );

					} else {
						polys.push( flattenVertices.call( current ) );
						current = null;
					}
				}			
			}
		}
		
		if( current != null ) {
			polys.push( flattenVertices.call( current ) );
		}

		return polys;
	}
	
	function getNeighbours( polygon, triangles ) {
		var matchCount;
		var triangle;
		var vertex;
		var neighbours = new Array();
		
		for( var i = 0; i < triangles.length; i++ ) {
			triangle = triangles[ i ];
			matchCount = 0;
			
			for( var v = 0; v < polygon.indizes.length; v++ ) {
				vertex = polygon.indizes[ v ];
				if( vertex == triangle.ia ||
						vertex == triangle.ib ||
						vertex == triangle.ic ) {
					matchCount++;
				}

				if( matchCount == 2 ) {
					neighbours.push( i );
					break;
				}
			}
		}
		return neighbours;
	}
	
	function addTriangle( triangle ) {
		this.indizes.push( triangle.ia, triangle.ib, 
				triangle.ic );

		this.indizes.sort( function( a, b ) {
				return a - b;
			}
		);
		
		for( var i = 1; i < this.indizes.length; i++ ) {
			if( this.indizes[ i - 1 ] == this.indizes[ i ] ) {
				this.indizes.splice( i--, 1 );
			}
		}
		return this;
	}

	/*
		@return Array of vertexIndizes that represent the
		convex hull of the Polygon
	*/
	function convexHull(){
		var that = this;
		var indizes = cloneIndizes.call( this );
		var hullIndizes = new Array();
		var matrix = new PolygonMatrix().setValues({
			a1 : 1, a2 : 0, a3 : 0,
			b1 : 1, b2 : 0, b3 : 0,
			c1 : 1, c2 : 0, c3 : 0
		});

		indizes.sort( function( a, b ){
			return sortForConvexHull.call( that, a, b );
		});

		/*
			the polygon haas only three vertices, so the
			convex Hull must be the polygon itself
		*/
		if	( indizes.length <= 3 ) {
			return indizes;
		}

		var rightTurn = true;
		var p1, p2, p3;

		/*
			scanning from left to right, finding the "upper" hull
		*/

		hullIndizes.push( indizes[ 0 ] );
		hullIndizes.push( indizes[ 1 ] );

		for	( var i = 2; i < indizes.length; i++ ) {
			rightTurn = true;
			hullIndizes.push( indizes[ i ] );	
			
			while	( hullIndizes.length > 2 && rightTurn ) {
				p1 = this.vertices[ 
					hullIndizes[ hullIndizes.length - 3 ] ];

				p2 = this.vertices[ 
					hullIndizes[ hullIndizes.length - 2 ] ];

				p3 = this.vertices[ hullIndizes[ 
					hullIndizes.length - 1 ] ];
					
				matrix.setValues({
					 "a2" : p1.x, "a3" : p1.y,
					 "b2" : p2.x, "b3" : p2.y,
					 "c2" : p3.x, "c3" : p3.y 
				});
					
				if	( matrix.determinant < 0 ) {
					hullIndizes.splice( hullIndizes.length - 2, 1 );
					
				} else {
					rightTurn = false;
					
				}
			}
		}
		hullIndizes.splice( hullIndizes.length - 1, 1 );

		/*
			scanning from right to left, finding the "lower"
			hull
		*/

		hullIndizes.push( indizes[ indizes.length - 1 ] );
		hullIndizes.push( indizes[ indizes.length - 2 ] );
	
		for	( var j = indizes.length - 3; j >= 0; j-- ) {
			hullIndizes.push( indizes[ j ] );
			rightTurn = true;
			
			while( hullIndizes.length > 2 && rightTurn ) {
				p1 = this.vertices[
					hullIndizes[ hullIndizes.length - 3 ] ];

				p2 = this.vertices[
					hullIndizes[ hullIndizes.length - 2 ] ];

				p3 = this.vertices[
					hullIndizes[ hullIndizes.length - 1 ] ];
					
				matrix.setValues({
					 "a2" : p1.x, "a3" : p1.y,
					 "b2" : p2.x, "b3" : p2.y,
					 "c2" : p3.x, "c3" : p3.y 
				});
					
				if	( matrix.determinant < 0 ) {
					hullIndizes.splice( hullIndizes.length - 2, 1 );
					
				} else {
					rightTurn = false;
				}
			}
		}

		hullIndizes.splice( hullIndizes.length - 1, 1 );
		/*
			this algorythm was developed for clockwise
			polygons, so reversing solves the problem.
		*/
		hullIndizes.reverse();
		return hullIndizes;
	}

	function sortForConvexHull( a, b ){
		var v1 = this.vertices[ a ];
		var v2 = this.vertices[ b ];

		if	( v1.x < v2.x) {
			return -1;
		
		} else if ( v1.x > v2.x ){
			return 1;
			
		} else {
			if	( v1.y < v2.y ) {
				return -1;
			
			} else {
				return 1;
			}
		}
	}

	/**
		this is a helper class only needed for Polygon
		calculations. The methods are optimized for
		fast triangulation of polygons. This Kind of
		Triangle is useless out of this context.
	*/

	function Triangle( vertices, ia, ib, ic ) {
		this.vertices = vertices;
		this.ia = ia;
		this.A 	= this.vertices[ this.ia ];
		this.ib = ib;
		this.B	= this.vertices[ this.ib ];
		this.ic = ic;
		this.C	= this.vertices[ this.ic ];
		this.BA = this.B.subtract( this.A );
		this.CA = this.C.subtract( this.A );
	}
	
	Triangle.prototype.toString = function() {
		return "[Object Triangle]";
	}
	
	/**
		test wheater a given vertex lies inside the triangle
		this function is triggered very often while triangulation
	*/
	Triangle.prototype.contains = function( ip ) {
		var PA 			= this.vertices[ ip ].subtract( this.A );
		
		var dotCACA = this.CA.x * this.CA.x + this.CA.y * this.CA.y;
		var dotCABA = this.CA.x * this.BA.x + this.CA.y * this.BA.y;
		var dotCAPA = this.CA.x *      PA.x + this.CA.y *      PA.y;
		var dotBABA = this.BA.x * this.BA.x + this.BA.y * this.BA.y;
		var dotBAPA = this.BA.x *      PA.x + this.BA.y *      PA.y;
		
		var invDenom = 1 / ( dotCACA * dotBABA - dotCABA * dotCABA );
		
		var u = ( dotBABA * dotCAPA - dotCABA * dotBAPA ) * invDenom;
		var v = ( dotCACA * dotBAPA - dotCABA * dotCAPA ) * invDenom;
		
		return ( u >= 0 ) && ( v >= 0 ) && ( u + v < 1 );
	}

	/**
		this is an optimized function for triangles

		@ return Boolean if true the Triangle is Clockwise
	*/
	Triangle.prototype.isClockwise = function() {
		var det = this.A.x * this.B.y + 
							this.B.x * this.C.y + 
							this.C.x * this.A.y - 
							this.A.x * this.C.y - 
							this.B.x * this.A.y - 
							this.C.x * this.B.y;
							
		if( det > 0 ) {
			return true;
		} else {
			return false;
		}
	}
	
	/**
		@return a new Polygon with the vertexlist and the 
		triangles indizes
	*/
	Triangle.prototype.toPolygon = function() {
		return new Polygon( this.vertices, 
				[ this.ia, this.ib, this.ic ] );
	}

/*
a 3*3 matrix for vertex processing
 _        _
| a1 a2 a3 |
| b1 b2 b3 |
|_c1 c2 c3_|

default:
 _     _
| 1 0 0 |
| 0 1 0 |
|_0 0 1_|

*/
	var PolygonMatrix = Base.extend( 
		new function(){ 
			this.initialize = function(){
				this.values = {
					a1 :  1, a2 :  0, a3 : 0,
					b1 :  0, b2 :  1, b3 : 0,
					c1 :  0, c2 :  0, c3 : 1 };
		}

		this.toString = function(){
			return "[Object PolygonMatrix]";
		}

		/*
			@param newValues Object
				an Object containing the new Values to set
				i.e.:
				{ a1 : 100, a2:300, c3 : 900 }

			@ return the PolygonMatrix Object
		*/
		this.setValues = function( newValues ){
			for( var key in newValues ){
				this.values[ key ] = newValues[ key ];
			}
			return this;
		}

		/*
			@return the determinat of the matrix
		*/
		this.getDeterminant = function(){
				var v = this.values;
			return	v[ "a1" ] * v[ "b2" ] * v[ "c3" ] +
							v[ "a2" ] * v[ "b3" ] * v[ "c1" ] +
							v[ "a3" ] * v[ "b1" ] * v[ "c2" ] -
				
							v[ "a3" ] * v[ "b2" ] * v[ "c1" ] -
							v[ "a2" ] * v[ "b1" ] * v[ "c3" ] -
							v[ "a1" ] * v[ "b3" ] * v[ "c2" ];
		}

	});
});