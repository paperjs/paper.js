window.onload = function(){


	var canvas = document.getElementById( "canvas" );
	paper.setup( canvas );

	var polygon = new paper.Polygon([
						new paper.Point( 10, 10 ),
						new paper.Point( 20, 20 ),
						new paper.Point( 50, 50 ) ],
						[0, 1, 2 ] );

}