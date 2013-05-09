var paper = require('paper'),
	path = require('path'),
	fs = require('fs');

paper.setup(new paper.Canvas(300, 600));
with (paper) {
	fs.readFile('./in.svg', { encoding: 'utf8' }, function (err, data) {
		if (err)
			throw err; 
		project.importSVG(data);
		paper.view.exportFrames({
			amount: 1,
			directory: __dirname,
			onComplete: function() {
				console.log('Done exporting.');
			},
			onProgress: function(event) {
				console.log(event.percentage + '% complete, frame took: ' + event.delta);
			}
		});
	});
}
