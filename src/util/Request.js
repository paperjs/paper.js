/*
	author philipp schmidt
	this is a basic class for ajax calls
	it just builts up an wrapper arround the native
	request object in order to bridge browser differnces.
*/
var Request = this.Request = Base.extend( new function(){
	
	/*
		getting a suitable constructor for all following 
		requests, done only once.

		this code is borrowed from the web, when find its
		origin i will add it here, but works great
	*/
	var XHR = null;

	if ( typeof XMLHttpRequest != 'undefined' ) {
		XHR = XMLHttpRequest;
		  
	} else if ( window.ActiveXObject ) {
		
		var avers = [	"Microsoft.XmlHttp",
	                "MSXML2.XmlHttp",
	                "MSXML2.XmlHttp.3.0",
	                "MSXML2.XmlHttp.4.0",
	                "MSXML2.XmlHttp.5.0" ];
	    
	    for ( var i = avers.length -1; i >= 0; i-- ) {
	      try {
	    		XHR = function(  ) {
	    			var aver = avers[i];
	    			return ActiveXObject( aver );
	    		}
	    } catch( e ){ }
	  }
	}

	/*
		@PARAM config Object or String
		expects an Object to construct
		{
			url : request url error if not given,
			async : should the request be asyncron defaults to true,
			data : data to send defaults to null,
			success : callback on success defaults to null,
			error : callback on error defaults to null,
			onChange : callback when changes defaults to null,
			method : request method defaults to GET,
			autoSend : wheater the request needs to be 
							triggered manually, defaults to true,
			headers : Array of Objects { name : value }
		}
	*/
	this.initialize = function( config/* | url */ ){
		var that = this;

		if( config == null ){
			throw new Error( "Request::no configuration given" );
		
		} else if( config.constructor === String ){
			config = { url : config };	
		
		} else if( config.url == null ){
			throw new Error( "Request::no url given" )

		}
	//create an request
		var xhr = new XHR();
	//open the request
		xhr.open( 
			( config.method || "GET" ), 
			config. url,
			( config.async != null && config.async == false ) ? 
					false : true
		);
	//set optional headers
		if( config.hasOwnProperty( "headers" ) && 
			config.headers instanceof Array ) {
			for( var i = 0; i < config.headers.length; i++ ){
				for( var name in config.headers[ i ] ){
					xhr.setRequestHeader( 
						name, config.headers[ i ][ name ] );
				}
			}		
		}
	//wrap the xhr interface with this object
		this.send = function( data ){ 
			return xhr.send( data ) };

		this.abort = function(){ 
			return xhr.abort(); };

		this.getAllResponseHeaders = function(){
			return xhr.getAllResponseHeaders(); };

		this.getResponseHeader = function( header ){
			return xhr.getResponseHeader( header ); } ;

		this.setRequestHeader = function( name, value ){
			return xhr.setRequestHeader( name, value ); };
		
		this.onChange = config.onChange || function( e ){}
	//errors are detected via the http status in the 
	//onreadystate event handler
		this.onError = config.onError || function( e ){
			if( window.console ){
				console.log( "error while loading" );
			}
		}

		this.success = config.success || function( e ){}

		xhr.onreadystatechange = function( e ){
			if( this.readyState < 4 ){
				that.onChange.call( this, e );
			} else {
				if( this.status != 200 ){
					that.onError.call( this, e );
				} else {
					that.success.call( this, e );
				}
			}
		}
		
		if( !config.hasOwnProperty( "autoSend" ) ) {
			this.send( ( config.data || null ) );
		} else if( config.autoSend == true ) {
			this.send( ( config.data || null ) );
		}
	}
});