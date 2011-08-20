require('../../node.js/');
var paper = require('./Tadpoles');
paper.view.exportFrames({
	amount: 400,
	directory: __dirname,
	onComplete: function() {
		console.log('Done exporting.');
	},
	onProgress: function(event) {
		console.log(event.percentage + '% complete, frame took: ' + event.delta);
	}
});
