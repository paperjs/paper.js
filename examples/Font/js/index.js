$( document ).ready( function(){

	var FONT_URL = "php/GetSvgList.php?dir=fonts";
	var doc, list;
	var currentLayer = null;
	var files = {};
	var canvas = $( "canvas#paper-canvas" );
	var title = $( "title" ).html();
	var layers = {};
	var testString = "ABCDEFRGHIJKLMNOPQRSTUVWXYZ";
	paper.setup( canvas[ 0 ] );

	$.ajax({
		"url" : FONT_URL,
		"dataType" : "xml",
		"header" : { "Cache-Control" : "no-cache" },
		"success" : function( e ){ 
			makeList( e, "font-select-list" ) }
	});

	function makeList( e, id ){
		doc = e;
		list = $( "<select id=\""+id+"\"></select>" );
		$( "#list-container" ).append( list );
		var svgs = doc.getElementsByTagName( "file" );
		$.each( svgs, function( index, value ){
			list.append( $( "<option value=\""+
					value.getAttribute( "path" )+
					"\">"+
					value.getAttribute( "name" )+
					"</option>" ) )
		});
		list.change( onListChange ); 
		list.trigger( "change" );
		list.focus();
	}

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
		var tf = new paper.TextField( font, 3, 
			new paper.Rectangle( 10, 10, 800, 300 ) );
		tf.text = testString;
		layer.addChild( tf );
	}

	function switchLayers( layer ){
		currentLayer = layer
		currentLayer.visible = true;
		paper.view.draw();
	}
});