$( document ).ready( function(){
	
	var LIST_URL = "php/GetSvgList.php?dir=svg";
	var FONT_URL = "php/GetSvgList.php?dir=fonts";
	var doc, list;
	var currentLayer = null;
	var files = {};
	var svgCanvas = $( "div#svg-canvas" );
	var canvas = $( "canvas#paper-canvas" );
	var title = $( "title" ).html();
	var layers = {};
	paper.setup( canvas[ 0 ] );

	$.ajax({
		"url" : LIST_URL,
		"dataType" : "xml",
		"header" : { "Cache-Control" : "no-cache" },
		"success" : makeList
	});

	function makeList( e ){
		doc = e;
		list = $( "<select id=\"svg-select-list\"></select>" );
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
					showSVG(this.url  );
				}
			});
		} else {
			showSVG( e.target.value );
		}
	}

	function showSVG( url ){
		$( "title" ).html( title + url );
		var c = $( files[ url ].documentElement ).clone( false );
		svgCanvas.empty();
		svgCanvas.append( c );
		paperImport( url );
	}

	function paperImport( url ){
	
		if( currentLayer != null ){
			currentLayer.visible = false;	
		}
	
		if( !layers.hasOwnProperty( url ) ){
			layers[ url ] = new paper.Layer();
			paper.project.import( url, function( e ){ 
				console.log( e );
				if( e.hasOwnProperty( "items" ) ){
					for( var i = 0; i < e.items.length; i++ ){
						currentLayer.addChild( e.items[ i ] );
					}
					paper.view.draw();
				}
			});
		}
		currentLayer = layers[ url ];
		currentLayer.visible = true;
		paper.view.draw();
	}
});