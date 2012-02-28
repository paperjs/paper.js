
module( "Font" );
test( "new Font( url )", function(){
	var f = new Font( "../examples/Font/fonts/linlibertine_abl-libertine1.svg" );
	raises(function(){
		var f = new Font();

	}, function( e ){
		return e == "Error: Font::no url given";

	}, "Font cannot be constructed if no url is given");


	(function(){
		var urls = [ "$$%%//", "dsjvhsbdjvbsjdv", "foo.sdj/asdasdv"];

		for( var i = 0; i < urls.length; i++ ){
			raises(function(){
				new Font( urls[i] );

			}, function( e ){
				return e == "Error: Font::not valid Font-url given";

			}, "Font cannot be constructed if: "+urls[i]+" is given as url");
		}
	})();

	(function(){
		var urls = [
			"test.svg",
			"test/test.svg",
			"/test/test.svg", 
			"../test/test.svg", "http://www.domain.de/test.test/test/test.svg" ];
		for( var i=0; i < urls.length; i++ ){
			var f = new Font( urls[i] );
			equals( f.url, urls[i], "right url" );
		}	
	})();

	(function(){
		var urls = [ [ "test.tff", "tff" ], [ "../test/test.otf", "otf"] ];
		for( var i = 0; i < urls.length; i++ ){
			raises(function(){
				new Font( urls[ i ][ 0 ] );

			}, function( e ){
				return e == "Error: Font::Format: "+urls[i][1]+
						" not supported!"

			}, "Font cannot be constructed if the format ("+urls[i][1]+") is not supported" );	

		}
	})()
});