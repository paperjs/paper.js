var Font = this.Font = Base.extend(
	new function(){
		var formats = {
			"svg" : initFromSVG

		}

		/*
		@param String url the url of the font file to load.
		*/
		
		this.initialize = function( url ){
			
			var urlTestPattern = /\.((\d|\w)+)$/gm;
			var result = url.match( urlTestPattern );

			this.glyphs = [];
			this.kerning = {};
		};

		function initFromSVG(){
			

		}
	}
);