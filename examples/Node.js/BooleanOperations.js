var http = require('http');
var paper = require('paper');

http.createServer(function(request, response) {
	var canvas = new paper.Canvas(800, 800);
	paper.setup(canvas);
	with(paper) {
		var style = {
			fillColor: new Color(1, 1, 0, 0.5),
			strokeColor: new Color(0, 0, 0),
			strokeWidth: 1.5
		};

		var first = new Path.Rectangle([50, 50], [150, 150]);
		first.style = style;
		var second = first.clone().translate(50, 50);
		second.style = style;

		var intersection = first.subtract(second);
		intersection.style = style;
		intersection.translate(250, 0);
		view.draw();
	}
	var stream = canvas.createPNGStream();
	stream.on('data', function(chunk) {
		response.write(chunk);
	});
	stream.on('end', function() {
		response.end();
	});
}).listen(3000);

console.log('Server running at http://127.0.0.1:3000/');