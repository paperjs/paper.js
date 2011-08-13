require('../../index.js');
var scope = require('./Tadpoles');
scope.view.exportFrames({
	amount: 200,
	directory: __dirname,
	onComplete: function() {
		console.log('Done exporting.');
	},
	onProgress: function(event) {
		console.log(event.percentage + '% complete, frame took: ' + event.delta);
	}
});