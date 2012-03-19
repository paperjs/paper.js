$( document ).ready( function(){

	var FONT_URL = "php/GetSvgList.php?dir=fonts";
	var input = $( "input#sample-text-input" );
	var doc, list;
	var fonts = [];
	var currentLayer = null;
	var files = {};
	var canvas = $( "canvas#paper-canvas" );
	var title = $( "title" ).html();
	var layers = {};
	var FONT_SIZE = 70;
	var LINE_HEIGHT = 1.3;
	paper.setup( canvas[ 0 ] );

	input.keypress( function( e ){
		
	});

	$.ajax({
		"url" : FONT_URL,
		"dataType" : "xml",
		"header" : { "Cache-Control" : "no-cache" },
		"success" : function( e ){ 
			getFonts( e, "font-select-list" ) }
	});

	function getFonts( e ){
		doc = e;
		var fileList = doc.getElementsByTagName( "file" );
		var current = 0;

		canvas.attr( "height", fileList.length * FONT_SIZE * LINE_HEIGHT );

		importOnce( 0, fileList );
	}

	function importOnce( current, fileList ){
		paper.project.import( 
			$( fileList[ current ] ).attr( "path" ), function( result ){
				if( result.hasOwnProperty( "fonts" ) ){
					$.each( result.fonts, function( index, value ){
						fonts[ $( fileList[ current ] ).attr( "path" )+"::"+index ]
							= value;
						showFont( 
							$( fileList[ current ] ).attr( "path" )+"::"+index, 
							current, fileList );
					});
				}
			});
		}

	function showFont( key, index, list ){
		var textFied = new paper.TextField( 
			fonts[ key ], FONT_SIZE,
			new paper.Rectangle( 
				new paper.Point( 20, LINE_HEIGHT * FONT_SIZE * index ),
				new paper.Point( 900,LINE_HEIGHT * FONT_SIZE * ( index + 1 ) ) ) );

		textFied.text = "The lazy dog jumps over the quick brown fox";

		textFied.translate( 0, FONT_SIZE * LINE_HEIGHT * index);

		paper.project.activeLayer.addChild( textFied );

		index++
		if( index < list.length ){
			window.setTimeout( function(){ importOnce( index,list ); }, 3000 );
			
		}

	}

/*
	function onListChange( e ){
		if( !files.hasOwnProperty( e.target.value ) ){
			$.ajax({
				"url" : e.target.value,
				"dataType" : "xml",
				"header" : { "Cache-Control" : "no-cache" },
				"success" : function( d ){
					files[ this.url ] = d;
					paperImport( this.url  );
				}
			});
		} else {
			paperImport( e.target.value );
		}
	}

	function paperImport( url ){
	
		if( currentLayer != null ){
			currentLayer.visible = false;	
		}
	
		if( !layers.hasOwnProperty( url ) ){
			layers[ url ] = new paper.Layer();
			paper.project.import( url, function( e ){ 
				if( e.hasOwnProperty( "fonts" ) ){
					for( var i = 0; i < e.fonts.length; i++ ){
						makeFontTable( e.fonts[ i ], layers[ url ] );
						switchLayers( layers[ url ] );
					}
				}
			});
		} else {
			switchLayers( layers[ url ] );
		}
	}

	function makeFontTable( font, layer ){
		var tf = new paper.TextField( font, 30, 
			new paper.Rectangle( 10, 10, 800, 300 ) );
		tf.text = testString;
		layer.addChild( tf );
	}

	function switchLayers( layer ){
		currentLayer = layer
		currentLayer.visible = true;
		paper.view.draw();
	}
	*/
});