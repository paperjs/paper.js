var paper = require('paper');
paper.setup(new paper.Canvas(1024, 768));
var scope = {};
paper.install(scope);
with (scope) {
	var circle = new Path.Circle({
		center: [100, 100],
		radius: 50,
		fillColor: 'red'
	});
	var svg = project.exportSVG();
	console.log(svg.outerHTML);
};