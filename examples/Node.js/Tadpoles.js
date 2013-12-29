var paper = require('paper');
var scope = require('./Tadpoles.pjs')(new paper.Size(1024, 768));

scope.view.exportFrames({
	amount: 400,
	directory: __dirname,
	onComplete: function() {
		console.log('Done exporting.');
	},
	onProgress: function(event) {
		console.log(event.percentage + '% complete, frame took: ' + event.delta);
	}
});
