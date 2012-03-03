module( 'importer' );
test( 'new Importer', function(){

	var i = paper.project.import( "../examples/Font/svg/rect.svg",
		function( assets ) {
			console.log( assets )		
	} );

});